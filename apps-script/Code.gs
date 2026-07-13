/**
 * FormaLab 3D - Control de Filamento
 * Backend en Google Apps Script.
 *
 * INSTRUCCIONES DE INSTALACIÓN (ver README.md para el detalle paso a paso):
 * 1. Crear una planilla nueva en Google Sheets.
 * 2. Extensiones > Apps Script, borrar el contenido y pegar este archivo entero.
 * 3. Implementar > Nueva implementación > Aplicación web.
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier usuario
 * 4. Copiar la URL que te da y pegarla en js/config.js del frontend.
 */

const SHEET_INGRESOS = 'Ingresos';
const SHEET_VENTAS = 'Ventas';
const SHEET_PRECIOS = 'Precios';

const HEADERS_INGRESOS = ['Fecha', 'Proveedor', 'NumeroRemito', 'Marca', 'Tipo', 'Color', 'Cantidad', 'PrecioUnitario', 'Total', 'Notas', 'Timestamp'];
const HEADERS_VENTAS = ['Fecha', 'Marca', 'Tipo', 'Color', 'Cantidad', 'PrecioUnitario', 'Total', 'Cliente', 'Notas', 'Timestamp'];
const HEADERS_PRECIOS = ['Marca', 'Tipo', 'Color', 'Precio', 'Timestamp'];

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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
  const rows = values.slice(1);
  return rows
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map((row, i) => {
      const obj = { _row: i + 2 };
      headers.forEach((h, idx) => {
        let v = row[idx];
        if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        obj[h] = v;
      });
      return obj;
    });
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = (e.parameter.action || 'all');
  const ingresosSheet = getSheet_(SHEET_INGRESOS, HEADERS_INGRESOS);
  const ventasSheet = getSheet_(SHEET_VENTAS, HEADERS_VENTAS);
  const preciosSheet = getSheet_(SHEET_PRECIOS, HEADERS_PRECIOS);
  const ingresos = sheetToObjects_(ingresosSheet);
  const ventas = sheetToObjects_(ventasSheet);
  const precios = sheetToObjects_(preciosSheet);
  const stock = computeStock_(ingresos, ventas, precios);

  if (action === 'stock') {
    return jsonResponse_({ ok: true, stock: stock });
  }

  if (action === 'publico') {
    // Catálogo de solo lectura: nada de proveedores, remitos ni costos.
    const catalogo = stock.map(r => ({
      Marca: r.Marca, Tipo: r.Tipo, Color: r.Color,
      Precio: r.Precio, Disponible: r.Disponible
    }));
    return jsonResponse_({ ok: true, catalogo: catalogo });
  }

  return jsonResponse_({
    ok: true,
    ingresos: ingresos,
    ventas: ventas,
    precios: precios,
    stock: stock
  });
}

function computeStock_(ingresos, ventas, precios) {
  const map = {};
  const key = (r) => [r.Marca, r.Tipo, r.Color].join('|');

  ingresos.forEach(r => {
    const k = key(r);
    if (!map[k]) map[k] = { Marca: r.Marca, Tipo: r.Tipo, Color: r.Color, Ingresado: 0, Vendido: 0, Precio: 0 };
    map[k].Ingresado += Number(r.Cantidad) || 0;
  });
  ventas.forEach(r => {
    const k = key(r);
    if (!map[k]) map[k] = { Marca: r.Marca, Tipo: r.Tipo, Color: r.Color, Ingresado: 0, Vendido: 0, Precio: 0 };
    map[k].Vendido += Number(r.Cantidad) || 0;
  });
  (precios || []).forEach(r => {
    const k = key(r);
    if (!map[k]) map[k] = { Marca: r.Marca, Tipo: r.Tipo, Color: r.Color, Ingresado: 0, Vendido: 0, Precio: 0 };
    map[k].Precio = Number(r.Precio) || 0;
  });

  return Object.keys(map).map(k => {
    const item = map[k];
    item.Disponible = item.Ingresado - item.Vendido;
    return item;
  }).sort((a, b) => (a.Marca + a.Color).localeCompare(b.Marca + b.Color));
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.tipo === 'ingreso') {
      const sheet = getSheet_(SHEET_INGRESOS, HEADERS_INGRESOS);
      const total = (Number(data.cantidad) || 0) * (Number(data.precioUnitario) || 0);
      sheet.appendRow([
        data.fecha, data.proveedor, data.numeroRemito, data.marca, data.tipo2,
        data.color, data.cantidad, data.precioUnitario, total, data.notas || '',
        new Date()
      ]);
      return jsonResponse_({ ok: true });
    }

    if (data.tipo === 'venta') {
      const sheet = getSheet_(SHEET_VENTAS, HEADERS_VENTAS);
      const total = (Number(data.cantidad) || 0) * (Number(data.precioUnitario) || 0);
      sheet.appendRow([
        data.fecha, data.marca, data.tipo2, data.color, data.cantidad,
        data.precioUnitario, total, data.cliente || '', data.notas || '',
        new Date()
      ]);
      return jsonResponse_({ ok: true });
    }

    if (data.tipo === 'precio') {
      const sheet = getSheet_(SHEET_PRECIOS, HEADERS_PRECIOS);
      const values = sheet.getDataRange().getValues();
      let foundRow = -1;
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === data.marca && values[i][1] === data.tipo2 && values[i][2] === data.color) {
          foundRow = i + 1;
          break;
        }
      }
      if (foundRow > -1) {
        sheet.getRange(foundRow, 4).setValue(Number(data.precio) || 0);
        sheet.getRange(foundRow, 5).setValue(new Date());
      } else {
        sheet.appendRow([data.marca, data.tipo2, data.color, Number(data.precio) || 0, new Date()]);
      }
      return jsonResponse_({ ok: true });
    }

    return jsonResponse_({ ok: false, error: 'Tipo de operación no reconocido' });
  } catch (err) {
    return jsonResponse_({ ok: false, error: err.message });
  }
}
