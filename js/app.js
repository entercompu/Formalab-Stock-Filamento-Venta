// ---------- Navegación entre vistas ----------
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
  });
});

const subtabBtns = document.querySelectorAll('.subtab-btn');
subtabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    subtabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('ingresosTable').classList.toggle('hidden', btn.dataset.sub !== 'ingresos');
    document.getElementById('ventasTable').classList.toggle('hidden', btn.dataset.sub !== 'ventas');
  });
});

// ---------- Estado de conexión ----------
function setStatus(state, text) {
  const el = document.getElementById('connStatus');
  el.querySelector('.dot').className = 'dot ' + state;
  el.lastChild.textContent = ' ' + text;
}

// ---------- Formato ----------
const fmtMoney = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');

function estadoBadge(disponible) {
  if (disponible <= 0) return '<span class="badge out">SIN STOCK</span>';
  if (disponible <= 2) return '<span class="badge low">STOCK BAJO</span>';
  return '<span class="badge ok">OK</span>';
}

// ---------- Carga de datos ----------
async function cargarDatos() {
  if (!SCRIPT_URL || SCRIPT_URL.includes('PEGA_ACA')) {
    setStatus('err', 'Falta configurar js/config.js');
    return;
  }
  try {
    setStatus('warn', 'Actualizando…');
    const res = await fetch(SCRIPT_URL + '?action=all');
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error desconocido');

    renderStock(data.stock);
    renderHistorial(data.ingresos, data.ventas);
    renderPrecios(data.precios);
    setStatus('ok', 'Conectado');
  } catch (err) {
    console.error(err);
    setStatus('err', 'Sin conexión con la planilla');
  }
}

function renderStock(stock) {
  const tbody = document.querySelector('#stockTable tbody');
  tbody.innerHTML = '';

  let totalDisponible = 0, sinStock = 0, stockBajo = 0;

  stock.forEach(row => {
    totalDisponible += row.Disponible;
    if (row.Disponible <= 0) sinStock++;
    else if (row.Disponible <= 2) stockBajo++;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.Marca}</td><td>${row.Tipo}</td><td>${row.Color}</td>
      <td class="num">${row.Ingresado}</td><td class="num">${row.Vendido}</td>
      <td class="num">${row.Disponible}</td><td>${estadoBadge(row.Disponible)}</td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('summaryCards').innerHTML = `
    <div class="summary-card"><div class="label">Rollos disponibles</div><div class="value">${totalDisponible}</div></div>
    <div class="summary-card"><div class="label">Colores sin stock</div><div class="value">${sinStock}</div></div>
    <div class="summary-card"><div class="label">Colores con stock bajo</div><div class="value">${stockBajo}</div></div>
  `;
}

function renderHistorial(ingresos, ventas) {
  const ingBody = document.querySelector('#ingresosTable tbody');
  ingBody.innerHTML = ingresos.slice().reverse().map(r => `
    <tr>
      <td>${r.Fecha}</td><td>${r.Proveedor || ''}</td><td>${r.NumeroRemito || ''}</td>
      <td>${r.Marca}</td><td>${r.Tipo}</td><td>${r.Color}</td>
      <td class="num">${r.Cantidad}</td><td class="num">${fmtMoney(r.PrecioUnitario)}</td>
      <td class="num">${fmtMoney(r.Total)}</td><td>${r.Notas || ''}</td>
    </tr>`).join('');

  const ventBody = document.querySelector('#ventasTable tbody');
  ventBody.innerHTML = ventas.slice().reverse().map(r => `
    <tr>
      <td>${r.Fecha}</td><td>${r.Marca}</td><td>${r.Tipo}</td><td>${r.Color}</td>
      <td class="num">${r.Cantidad}</td><td class="num">${fmtMoney(r.PrecioUnitario)}</td>
      <td class="num">${fmtMoney(r.Total)}</td><td>${r.Cliente || ''}</td><td>${r.Notas || ''}</td>
    </tr>`).join('');
}

function renderPrecios(precios) {
  const tbody = document.querySelector('#preciosTable tbody');
  if (!tbody) return;
  tbody.innerHTML = (precios || []).slice().reverse().map(r => `
    <tr>
      <td>${r.Marca}</td><td>${r.Tipo}</td><td>${r.Color}</td>
      <td class="num">${fmtMoney(r.Precio)}</td>
    </tr>`).join('');
}

// Link real al catálogo público (vive en la misma carpeta que index.html)
const publicLinkEl = document.getElementById('publicLinkText');
if (publicLinkEl) {
  const base = window.location.href.replace(/index\.html?$/, '').replace(/\/$/, '') + '/';
  publicLinkEl.textContent = base + 'public.html';
}

// ---------- Envío de formularios ----------
async function enviarDatos(payload, btn, feedbackEl) {
  btn.disabled = true;
  feedbackEl.textContent = 'Guardando…';
  feedbackEl.className = 'form-feedback';
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    feedbackEl.textContent = 'Guardado correctamente.';
    feedbackEl.className = 'form-feedback ok';
    return true;
  } catch (err) {
    console.error(err);
    feedbackEl.textContent = 'No se pudo guardar. Revisá tu conexión o la URL en config.js.';
    feedbackEl.className = 'form-feedback err';
    return false;
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('formIngreso').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const btn = form.querySelector('button');
  const feedback = document.getElementById('feedbackIngreso');

  const payload = {
    tipo: 'ingreso',
    fecha: fd.get('fecha'),
    proveedor: fd.get('proveedor'),
    numeroRemito: fd.get('numeroRemito'),
    marca: fd.get('marca'),
    tipo2: fd.get('tipo2'),
    color: fd.get('color'),
    cantidad: fd.get('cantidad'),
    precioUnitario: fd.get('precioUnitario') || 0,
    notas: fd.get('notas')
  };

  const ok = await enviarDatos(payload, btn, feedback);
  if (ok) { form.reset(); setTimeout(cargarDatos, 600); }
});

document.getElementById('formVenta').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const btn = form.querySelector('button');
  const feedback = document.getElementById('feedbackVenta');

  const payload = {
    tipo: 'venta',
    fecha: fd.get('fecha'),
    marca: fd.get('marca'),
    tipo2: fd.get('tipo2'),
    color: fd.get('color'),
    cantidad: fd.get('cantidad'),
    precioUnitario: fd.get('precioUnitario'),
    cliente: fd.get('cliente'),
    notas: fd.get('notas')
  };

  const ok = await enviarDatos(payload, btn, feedback);
  if (ok) { form.reset(); form.precioUnitario.value = 24000; setTimeout(cargarDatos, 600); }
});

document.getElementById('formPrecio').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const btn = form.querySelector('button');
  const feedback = document.getElementById('feedbackPrecio');

  const payload = {
    tipo: 'precio',
    marca: fd.get('marca'),
    tipo2: fd.get('tipo2'),
    color: fd.get('color'),
    precio: fd.get('precio')
  };

  const ok = await enviarDatos(payload, btn, feedback);
  if (ok) { setTimeout(cargarDatos, 600); }
});

// Fecha de hoy por defecto en ambos formularios
document.querySelectorAll('input[type="date"]').forEach(inp => {
  inp.valueAsDate = new Date();
});

cargarDatos();
