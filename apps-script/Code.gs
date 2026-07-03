/**
 * FormaLab 3D - Control de Filamento
 * Backend protegido para Google Apps Script.
 *
 * Después de pegar este archivo:
 * 1. Ejecutá manualmente generarClaveAdmin() una sola vez.
 * 2. Autorizá los permisos.
 * 3. Copiá la clave mostrada en el registro de ejecución.
 * 4. Implementá como Aplicación web, ejecutando como vos y con acceso "Cualquier usuario".
 *
 * El catálogo público no necesita clave. Las operaciones administrativas sí.
 */

const SHEET_INGRESOS = 'Ingresos';
const SHEET_VENTAS = 'Ventas';
const SHEET_PRECIOS = 'Precios';

const HEADERS_INGRESOS = ['Fecha', 'Proveedor', 'NumeroRemito', 'Marca', 'Tipo', 'Color', 'Cantidad', 'PrecioUnitario', 'Total', 'Notas', 'Timestamp'];
const HEADERS_VENTAS = ['Fecha', 'Marca', 'Tipo', 'Color', 'Cantidad', 'PrecioUnitario', 'Total', 'Cliente', 'Notas', 'Timestamp'];
const HEADERS_PRECIOS = ['Marca', 'Tipo', 'Color', 'Precio', 'Timestamp'];

/**
 * Ejecutar una sola vez desde el editor de Apps Script.
 * La clave se guarda en Propiedades del script y no se publica en GitHub.
 */
function generarClaveAdmin() {
  const key = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', key);
  console.log('CLAVE ADMINISTRATIVA: ' + key);
  return key;
}

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No se encontró la planilla vinculada al proyecto.');

  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map((row, index) => {
      const obj = { _row: index + 2 };
      headers.forEach((header, columnIndex) => {
        let value = row[columnIndex];
        if (value instanceof Date) {
          value = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        obj[header] = value;
      });
      return obj;
    });
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function cleanText_(value, maxLength) {
  let text = String(value == null ? '' : value).trim();
  if (maxLength && text.length > maxLength) text = text.slice(0, maxLength);

  // Evita que textos ingresados se ejecuten como fórmulas dentro de Google Sheets.
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function normalizeProductText_(value) {
  return cleanText_(value, 80).replace(/\s+/g, ' ').toUpperCase();
}

function positiveInteger_(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(fieldName + ' debe ser un número entero mayor que cero.');
  }
  return number;
}

function nonNegativeNumber_(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(fieldName + ' debe ser un número igual o mayor que cero.');
  }
  return number;
}

function validDate_(value) {
  const date = cleanText_(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('La fecha no tiene un formato válido.');
  }
  return date;
}

function requireText_(value, fieldName, maxLength) {
  const text = cleanText_(value, maxLength);
  if (!text) throw new Error('Falta completar: ' + fieldName + '.');
  return text;
}

function getAdminKey_() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || '';
}

function isAuthorized_(providedKey) {
  const storedKey = getAdminKey_();
  return Boolean(storedKey && providedKey && String(providedKey) === storedKey);
}

function loadAllData_() {
  const ingresos = sheetToObjects_(getSheet_(SHEET_INGRESOS, HEADERS_INGRESOS));
  const ventas = sheetToObjects_(getSheet_(SHEET_VENTAS, HEADERS_VENTAS));
  const precios = sheetToObjects_(getSheet_(SHEET_PRECIOS, HEADERS_PRECIOS));
  const stock = computeStock_(ingresos, ventas, precios);
  return { ingresos, ventas, precios, stock };
}

function doGet(e) {
  try {
    const parameters = e && e.parameter ? e.parameter : {};
    const action = String(parameters.action || 'publico').toLowerCase();
    const data = loadAllData_();

    if (action === 'publico') {
      const catalogo = data.stock.map(item => ({
        Marca: item.Marca,
        Tipo: item.Tipo,
        Color: item.Color,
        Precio: item.Precio,
        Disponible: item.Disponible
      }));
      return jsonResponse_({ ok: true, catalogo });
    }

    if (!isAuthorized_(parameters.adminKey)) {
      return jsonResponse_({ ok: false, error: 'No autorizado. Revisá la clave administrativa.' });
    }

    if (action === 'stock') {
      return jsonResponse_({ ok: true, stock: data.stock });
    }

    if (action === 'all') {
      return jsonResponse_({
        ok: true,
        ingresos: data.ingresos,
        ventas: data.ventas,
        precios: data.precios,
        stock: data.stock
      });
    }

    return jsonResponse_({ ok: false, error: 'Acción no reconocida.' });
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message });
  }
}

function computeStock_(ingresos, ventas, precios) {
  const map = {};
  const productKey = row => [
    normalizeProductText_(row.Marca),
    normalizeProductText_(row.Tipo),
    normalizeProductText_(row.Color)
  ].join('|');

  ingresos.forEach(row => {
    const key = productKey(row);
    if (!map[key]) {
      map[key] = {
        Marca: normalizeProductText_(row.Marca),
        Tipo: normalizeProductText_(row.Tipo),
        Color: normalizeProductText_(row.Color),
        Ingresado: 0,
        Vendido: 0,
        Precio: 0
      };
    }
    map[key].Ingresado += Number(row.Cantidad) || 0;
  });

  ventas.forEach(row => {
    const key = productKey(row);
    if (!map[key]) {
      map[key] = {
        Marca: normalizeProductText_(row.Marca),
        Tipo: normalizeProductText_(row.Tipo),
        Color: normalizeProductText_(row.Color),
        Ingresado: 0,
        Vendido: 0,
        Precio: 0
      };
    }
    map[key].Vendido += Number(row.Cantidad) || 0;
  });

  (precios || []).forEach(row => {
    const key = productKey(row);
    if (!map[key]) {
      map[key] = {
        Marca: normalizeProductText_(row.Marca),
        Tipo: normalizeProductText_(row.Tipo),
        Color: normalizeProductText_(row.Color),
        Ingresado: 0,
        Vendido: 0,
        Precio: 0
      };
    }
    map[key].Precio = Number(row.Precio) || 0;
  });

  return Object.values(map)
    .map(item => ({ ...item, Disponible: item.Ingresado - item.Vendido }))
    .sort((a, b) => (a.Marca + a.Tipo + a.Color).localeCompare(b.Marca + b.Tipo + b.Color, 'es'));
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    const rawBody = e && e.postData ? e.postData.contents : '';
    if (!rawBody) throw new Error('La solicitud no contiene datos.');

    const data = JSON.parse(rawBody);
    if (!isAuthorized_(data.adminKey)) {
      return jsonResponse_({ ok: false, error: 'No autorizado. Revisá la clave administrativa.' });
    }

    lock.waitLock(10000);

    const operationType = cleanText_(data.tipo, 20).toLowerCase();

    if (operationType === 'ingreso') {
      const fecha = validDate_(data.fecha);
      const proveedor = requireText_(data.proveedor, 'Proveedor', 120);
      const numeroRemito = cleanText_(data.numeroRemito, 80);
      const marca = requireText_(normalizeProductText_(data.marca), 'Marca', 80);
      const tipo = requireText_(normalizeProductText_(data.tipo2), 'Tipo de filamento', 80);
      const color = requireText_(normalizeProductText_(data.color), 'Color', 80);
      const cantidad = positiveInteger_(data.cantidad, 'Cantidad');
      const precioUnitario = nonNegativeNumber_(data.precioUnitario || 0, 'Precio unitario');
      const notas = cleanText_(data.notas, 500);
      const total = cantidad * precioUnitario;

      getSheet_(SHEET_INGRESOS, HEADERS_INGRESOS).appendRow([
        fecha, proveedor, numeroRemito, marca, tipo, color,
        cantidad, precioUnitario, total, notas, new Date()
      ]);

      return jsonResponse_({ ok: true, message: 'Ingreso registrado.' });
    }

    if (operationType === 'venta') {
      const fecha = validDate_(data.fecha);
      const marca = requireText_(normalizeProductText_(data.marca), 'Marca', 80);
      const tipo = requireText_(normalizeProductText_(data.tipo2), 'Tipo de filamento', 80);
      const color = requireText_(normalizeProductText_(data.color), 'Color', 80);
      const cantidad = positiveInteger_(data.cantidad, 'Cantidad');
      const precioUnitario = nonNegativeNumber_(data.precioUnitario, 'Precio de venta');
      const cliente = cleanText_(data.cliente, 120);
      const notas = cleanText_(data.notas, 500);

      const currentData = loadAllData_();
      const currentItem = currentData.stock.find(item =>
        item.Marca === marca && item.Tipo === tipo && item.Color === color
      );
      const available = currentItem ? Number(currentItem.Disponible) || 0 : 0;

      if (cantidad > available) {
        throw new Error('Stock insuficiente. Disponible: ' + available + '.');
      }

      const total = cantidad * precioUnitario;
      getSheet_(SHEET_VENTAS, HEADERS_VENTAS).appendRow([
        fecha, marca, tipo, color, cantidad, precioUnitario,
        total, cliente, notas, new Date()
      ]);

      return jsonResponse_({ ok: true, message: 'Venta registrada.' });
    }

    if (operationType === 'precio') {
      const marca = requireText_(normalizeProductText_(data.marca), 'Marca', 80);
      const tipo = requireText_(normalizeProductText_(data.tipo2), 'Tipo de filamento', 80);
      const color = requireText_(normalizeProductText_(data.color), 'Color', 80);
      const precio = nonNegativeNumber_(data.precio, 'Precio');
      const sheet = getSheet_(SHEET_PRECIOS, HEADERS_PRECIOS);
      const values = sheet.getDataRange().getValues();
      let foundRow = -1;

      for (let index = 1; index < values.length; index++) {
        const rowMarca = normalizeProductText_(values[index][0]);
        const rowTipo = normalizeProductText_(values[index][1]);
        const rowColor = normalizeProductText_(values[index][2]);
        if (rowMarca === marca && rowTipo === tipo && rowColor === color) {
          foundRow = index + 1;
          break;
        }
      }

      if (foundRow > -1) {
        sheet.getRange(foundRow, 1, 1, 5).setValues([[marca, tipo, color, precio, new Date()]]);
      } else {
        sheet.appendRow([marca, tipo, color, precio, new Date()]);
      }

      return jsonResponse_({ ok: true, message: 'Precio guardado.' });
    }

    return jsonResponse_({ ok: false, error: 'Tipo de operación no reconocido.' });
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {
      // El bloqueo puede no haberse adquirido si la validación falló antes.
    }
  }
}
