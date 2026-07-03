// ---------- Seguridad local de la administración ----------
const ADMIN_KEY_STORAGE = 'formalab_filamento_admin_key';

function getAdminKey(forceNew = false) {
  if (forceNew) localStorage.removeItem(ADMIN_KEY_STORAGE);

  let key = localStorage.getItem(ADMIN_KEY_STORAGE) || '';
  if (!key) {
    key = window.prompt('Ingresá la clave administrativa de FormaLab:') || '';
    key = key.trim();
    if (key) localStorage.setItem(ADMIN_KEY_STORAGE, key);
  }
  return key;
}

function clearAdminKey() {
  localStorage.removeItem(ADMIN_KEY_STORAGE);
  cargarDatos(true);
}

// ---------- Navegación entre vistas ----------
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(button => button.classList.remove('active'));
    btn.classList.add('active');
    views.forEach(view => view.classList.remove('active'));
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
  });
});

const subtabBtns = document.querySelectorAll('.subtab-btn');
subtabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    subtabBtns.forEach(button => button.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('ingresosTable').classList.toggle('hidden', btn.dataset.sub !== 'ingresos');
    document.getElementById('ventasTable').classList.toggle('hidden', btn.dataset.sub !== 'ventas');
  });
});

const changeKeyButton = document.getElementById('changeKeyBtn');
if (changeKeyButton) changeKeyButton.addEventListener('click', clearAdminKey);

// ---------- Estado de conexión ----------
function setStatus(state, text) {
  const element = document.getElementById('connStatus');
  element.querySelector('.dot').className = 'dot ' + state;
  element.querySelector('.status-text').textContent = text;
}

// ---------- Formato y seguridad visual ----------
const fmtMoney = number => '$' + Math.round(Number(number) || 0).toLocaleString('es-AR');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function estadoBadge(disponible) {
  if (disponible <= 0) return '<span class="badge out">SIN STOCK</span>';
  if (disponible <= 2) return '<span class="badge low">STOCK BAJO</span>';
  return '<span class="badge ok">OK</span>';
}

function setTodayOnDateInputs() {
  const today = new Date();
  document.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.value) input.valueAsDate = today;
  });
}

// ---------- Carga de datos ----------
async function cargarDatos(forceNewKey = false) {
  if (!SCRIPT_URL || SCRIPT_URL.includes('PEGA_ACA')) {
    setStatus('err', 'Falta configurar js/config.js');
    return;
  }

  const adminKey = getAdminKey(forceNewKey);
  if (!adminKey) {
    setStatus('err', 'Falta la clave administrativa');
    return;
  }

  try {
    setStatus('warn', 'Actualizando…');
    const url = SCRIPT_URL + '?action=all&adminKey=' + encodeURIComponent(adminKey);
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (!data.ok) {
      if ((data.error || '').toLowerCase().includes('no autorizado')) {
        localStorage.removeItem(ADMIN_KEY_STORAGE);
      }
      throw new Error(data.error || 'Error desconocido');
    }

    renderStock(data.stock || []);
    renderHistorial(data.ingresos || [], data.ventas || []);
    renderPrecios(data.precios || []);
    setStatus('ok', 'Conectado');
  } catch (error) {
    console.error(error);
    setStatus('err', error.message || 'Sin conexión con la planilla');
  }
}

function renderStock(stock) {
  const tbody = document.querySelector('#stockTable tbody');
  tbody.innerHTML = '';

  let totalDisponible = 0;
  let sinStock = 0;
  let stockBajo = 0;

  stock.forEach(row => {
    const disponible = Number(row.Disponible) || 0;
    totalDisponible += disponible;
    if (disponible <= 0) sinStock++;
    else if (disponible <= 2) stockBajo++;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(row.Marca)}</td>
      <td>${escapeHtml(row.Tipo)}</td>
      <td>${escapeHtml(row.Color)}</td>
      <td class="num">${Number(row.Ingresado) || 0}</td>
      <td class="num">${Number(row.Vendido) || 0}</td>
      <td class="num">${disponible}</td>
      <td>${estadoBadge(disponible)}</td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('summaryCards').innerHTML = `
    <div class="summary-card"><div class="label">Rollos disponibles</div><div class="value">${totalDisponible}</div></div>
    <div class="summary-card"><div class="label">Colores sin stock</div><div class="value">${sinStock}</div></div>
    <div class="summary-card"><div class="label">Colores con stock bajo</div><div class="value">${stockBajo}</div></div>`;
}

function renderHistorial(ingresos, ventas) {
  const ingresoBody = document.querySelector('#ingresosTable tbody');
  ingresoBody.innerHTML = ingresos.slice().reverse().map(row => `
    <tr>
      <td>${escapeHtml(row.Fecha)}</td>
      <td>${escapeHtml(row.Proveedor)}</td>
      <td>${escapeHtml(row.NumeroRemito)}</td>
      <td>${escapeHtml(row.Marca)}</td>
      <td>${escapeHtml(row.Tipo)}</td>
      <td>${escapeHtml(row.Color)}</td>
      <td class="num">${Number(row.Cantidad) || 0}</td>
      <td class="num">${fmtMoney(row.PrecioUnitario)}</td>
      <td class="num">${fmtMoney(row.Total)}</td>
      <td>${escapeHtml(row.Notas)}</td>
    </tr>`).join('');

  const ventaBody = document.querySelector('#ventasTable tbody');
  ventaBody.innerHTML = ventas.slice().reverse().map(row => `
    <tr>
      <td>${escapeHtml(row.Fecha)}</td>
      <td>${escapeHtml(row.Marca)}</td>
      <td>${escapeHtml(row.Tipo)}</td>
      <td>${escapeHtml(row.Color)}</td>
      <td class="num">${Number(row.Cantidad) || 0}</td>
      <td class="num">${fmtMoney(row.PrecioUnitario)}</td>
      <td class="num">${fmtMoney(row.Total)}</td>
      <td>${escapeHtml(row.Cliente)}</td>
      <td>${escapeHtml(row.Notas)}</td>
    </tr>`).join('');
}

function renderPrecios(precios) {
  const tbody = document.querySelector('#preciosTable tbody');
  if (!tbody) return;

  tbody.innerHTML = precios.slice().reverse().map(row => `
    <tr>
      <td>${escapeHtml(row.Marca)}</td>
      <td>${escapeHtml(row.Tipo)}</td>
      <td>${escapeHtml(row.Color)}</td>
      <td class="num">${fmtMoney(row.Precio)}</td>
    </tr>`).join('');
}

const publicLinkElement = document.getElementById('publicLinkText');
if (publicLinkElement) {
  publicLinkElement.textContent = new URL('public.html', window.location.href).href;
}

// ---------- Envío de formularios ----------
async function enviarDatos(payload, button, feedbackElement) {
  const adminKey = getAdminKey();
  if (!adminKey) {
    feedbackElement.textContent = 'Falta la clave administrativa.';
    feedbackElement.className = 'form-feedback err';
    return false;
  }

  button.disabled = true;
  feedbackElement.textContent = 'Guardando…';
  feedbackElement.className = 'form-feedback';

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, adminKey })
    });
    const data = await response.json();

    if (!data.ok) {
      if ((data.error || '').toLowerCase().includes('no autorizado')) {
        localStorage.removeItem(ADMIN_KEY_STORAGE);
      }
      throw new Error(data.error || 'No se pudo guardar.');
    }

    feedbackElement.textContent = data.message || 'Guardado correctamente.';
    feedbackElement.className = 'form-feedback ok';
    return true;
  } catch (error) {
    console.error(error);
    feedbackElement.textContent = error.message || 'No se pudo guardar.';
    feedbackElement.className = 'form-feedback err';
    return false;
  } finally {
    button.disabled = false;
  }
}

document.getElementById('formIngreso').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const button = form.querySelector('button[type="submit"]');
  const feedback = document.getElementById('feedbackIngreso');

  const payload = {
    tipo: 'ingreso',
    fecha: formData.get('fecha'),
    proveedor: formData.get('proveedor'),
    numeroRemito: formData.get('numeroRemito'),
    marca: formData.get('marca'),
    tipo2: formData.get('tipo2'),
    color: formData.get('color'),
    cantidad: formData.get('cantidad'),
    precioUnitario: formData.get('precioUnitario') || 0,
    notas: formData.get('notas')
  };

  if (await enviarDatos(payload, button, feedback)) {
    form.reset();
    setTodayOnDateInputs();
    await cargarDatos();
  }
});

document.getElementById('formVenta').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const button = form.querySelector('button[type="submit"]');
  const feedback = document.getElementById('feedbackVenta');

  const payload = {
    tipo: 'venta',
    fecha: formData.get('fecha'),
    marca: formData.get('marca'),
    tipo2: formData.get('tipo2'),
    color: formData.get('color'),
    cantidad: formData.get('cantidad'),
    precioUnitario: formData.get('precioUnitario'),
    cliente: formData.get('cliente'),
    notas: formData.get('notas')
  };

  if (await enviarDatos(payload, button, feedback)) {
    form.reset();
    form.precioUnitario.value = 24000;
    setTodayOnDateInputs();
    await cargarDatos();
  }
});

document.getElementById('formPrecio').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const button = form.querySelector('button[type="submit"]');
  const feedback = document.getElementById('feedbackPrecio');

  const payload = {
    tipo: 'precio',
    marca: formData.get('marca'),
    tipo2: formData.get('tipo2'),
    color: formData.get('color'),
    precio: formData.get('precio')
  };

  if (await enviarDatos(payload, button, feedback)) {
    await cargarDatos();
  }
});

setTodayOnDateInputs();
cargarDatos();
