// IMPORTANTE: reemplazá este valor por el WhatsApp de FormaLab con código de país,
// sin +, espacios ni guiones. Ejemplo Argentina: 5492966XXXXXX
const WHATSAPP_NUMBER = '5492966474022';

const COLOR_MAP = {
  'BLANCO': '#f4f4f2', 'NEGRO': '#1c1c1c', 'AZUL': '#2563eb',
  'VERDE MANZANA': '#7cb518', 'VERDE': '#2f9e60', 'ROJO': '#d9553f',
  'AMARILLO': '#e8c547', 'GRIS': '#9ca3af', 'BEIGE': '#d8c3a5',
  'NARANJA': '#e8772e', 'VIOLETA': '#8b5cf6', 'ROSA': '#ec4899',
  'MARRON': '#7a5230', 'MARRÓN': '#7a5230', 'DORADO': '#c9a227',
  'PLATEADO': '#c0c4c9', 'CELESTE': '#55b8e8', 'FUCSIA': '#d9469f'
};

const STORAGE_KEY = 'formalab_filamento_cart_v1';
let catalogo = [];
let carrito = cargarCarrito();

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function colorSwatch(name) {
  const key = String(name || '').toUpperCase().trim();
  return COLOR_MAP[key] || '#b8bcb6';
}

function formatMoney(value) {
  return '$' + Math.round(Number(value) || 0).toLocaleString('es-AR');
}

function productKey(item) {
  return [item.Marca, item.Tipo, item.Color]
    .map(value => String(value || '').trim().toUpperCase())
    .join('|');
}

function cargarCarrito() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (_) {
    return [];
  }
}

function guardarCarrito() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(carrito));
  actualizarIndicadores();
}

function mostrarToast(message) {
  const toast = document.getElementById('cartToast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(mostrarToast.timer);
  mostrarToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

async function cargarCatalogo() {
  const container = document.getElementById('catalogo');

  if (!SCRIPT_URL || SCRIPT_URL.includes('PEGA_ACA')) {
    container.innerHTML = '<p class="empty-state">El catálogo todavía no está configurado.</p>';
    return;
  }

  try {
    const response = await fetch(SCRIPT_URL + '?action=publico', { cache: 'no-store' });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'Error desconocido');

    if (!Array.isArray(data.catalogo) || data.catalogo.length === 0) {
      container.innerHTML = '<p class="empty-state">Todavía no hay productos cargados.</p>';
      return;
    }

    catalogo = data.catalogo.map(item => ({
      Marca: String(item.Marca || ''),
      Tipo: String(item.Tipo || ''),
      Color: String(item.Color || ''),
      Disponible: Math.max(0, Number(item.Disponible) || 0),
      Precio: Math.max(0, Number(item.Precio) || 0)
    }));

    sincronizarCarritoConStock();
    renderCatalogo();
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="empty-state">No se pudo cargar el catálogo. Intentá de nuevo más tarde.</p>';
  }
}

function sincronizarCarritoConStock() {
  carrito = carrito
    .map(item => {
      const current = catalogo.find(product => productKey(product) === item.key);
      if (!current || current.Disponible <= 0) return null;
      return {
        ...item,
        marca: current.Marca,
        tipo: current.Tipo,
        color: current.Color,
        precio: current.Precio,
        stock: current.Disponible,
        cantidad: Math.min(Math.max(1, Number(item.cantidad) || 1), current.Disponible)
      };
    })
    .filter(Boolean);
  guardarCarrito();
}

function renderCatalogo() {
  const container = document.getElementById('catalogo');

  container.innerHTML = catalogo.map((item, index) => {
    const disponible = item.Disponible;
    const sinStock = disponible <= 0;
    const badge = sinStock
      ? '<span class="badge out">SIN STOCK</span>'
      : (disponible <= 2
        ? '<span class="badge low">POCAS UNIDADES</span>'
        : '<span class="badge ok">DISPONIBLE</span>');

    return `
      <article class="filament-card ${sinStock ? 'is-out' : ''}">
        <div class="filament-swatch" style="--swatch:${colorSwatch(item.Color)}"></div>
        <div class="filament-name">${escapeHtml(item.Color)}</div>
        <div class="filament-meta">${escapeHtml(item.Marca)} · ${escapeHtml(item.Tipo)}</div>
        <div class="filament-stock">Stock disponible: <strong>${disponible}</strong> ${disponible === 1 ? 'unidad' : 'unidades'}</div>
        <div class="filament-bottom">
          <span class="filament-price">${item.Precio ? formatMoney(item.Precio) : 'Consultar'}</span>
          ${badge}
        </div>
        <button type="button" class="add-cart-btn" data-product-index="${index}" ${sinStock ? 'disabled' : ''}>
          ${sinStock ? 'Sin stock' : 'Agregar al pedido'}
        </button>
      </article>`;
  }).join('');
}

function agregarAlCarrito(productIndex) {
  const product = catalogo[productIndex];
  if (!product || product.Disponible <= 0) return;

  const key = productKey(product);
  const existing = carrito.find(item => item.key === key);

  if (existing) {
    if (existing.cantidad >= product.Disponible) {
      mostrarToast('Ya agregaste todo el stock disponible.');
      return;
    }
    existing.cantidad += 1;
    existing.stock = product.Disponible;
    existing.precio = product.Precio;
  } else {
    carrito.push({
      key,
      marca: product.Marca,
      tipo: product.Tipo,
      color: product.Color,
      precio: product.Precio,
      stock: product.Disponible,
      cantidad: 1
    });
  }

  guardarCarrito();
  mostrarToast(`${product.Color} agregado al pedido.`);
}

function cambiarCantidad(key, delta) {
  const item = carrito.find(product => product.key === key);
  if (!item) return;

  const next = item.cantidad + delta;
  if (next <= 0) {
    carrito = carrito.filter(product => product.key !== key);
  } else if (next <= item.stock) {
    item.cantidad = next;
  } else {
    mostrarToast(`Solo hay ${item.stock} unidades disponibles.`);
  }

  guardarCarrito();
  renderCarrito();
}

function eliminarProducto(key) {
  carrito = carrito.filter(item => item.key !== key);
  guardarCarrito();
  renderCarrito();
}

function calcularResumen() {
  const unidades = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const sinPrecio = carrito.some(item => !item.precio);
  return { unidades, total, sinPrecio };
}

function actualizarIndicadores() {
  const { unidades, total } = calcularResumen();
  document.getElementById('cartCountTop').textContent = unidades;
  document.getElementById('cartFabTotal').textContent = unidades === 1 ? '1 producto' : `${unidades} productos`;
  document.getElementById('openCart').classList.toggle('visible', unidades > 0);
  document.getElementById('cartTotal').textContent = formatMoney(total);
}

function renderCarrito() {
  const container = document.getElementById('cartItems');
  const { total, sinPrecio } = calcularResumen();

  if (carrito.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <strong>Tu pedido está vacío</strong>
        <span>Agregá uno o varios filamentos desde el catálogo.</span>
      </div>`;
  } else {
    container.innerHTML = carrito.map(item => `
      <div class="cart-item">
        <div class="cart-item-main">
          <strong>${escapeHtml(item.color)}</strong>
          <span>${escapeHtml(item.marca)} · ${escapeHtml(item.tipo)}</span>
          <small>${item.precio ? `${formatMoney(item.precio)} c/u` : 'Precio a confirmar'}</small>
        </div>
        <div class="cart-item-controls">
          <button type="button" data-cart-action="decrease" data-key="${escapeHtml(item.key)}" aria-label="Restar">−</button>
          <span>${item.cantidad}</span>
          <button type="button" data-cart-action="increase" data-key="${escapeHtml(item.key)}" aria-label="Sumar">+</button>
        </div>
        <div class="cart-item-subtotal">${item.precio ? formatMoney(item.precio * item.cantidad) : 'A confirmar'}</div>
        <button type="button" class="cart-remove" data-cart-action="remove" data-key="${escapeHtml(item.key)}">Eliminar</button>
      </div>`).join('');
  }

  document.getElementById('cartTotal').textContent = sinPrecio && total === 0
    ? 'A confirmar'
    : `${formatMoney(total)}${sinPrecio ? ' +' : ''}`;

  document.getElementById('sendWhatsApp').disabled = carrito.length === 0;
  document.getElementById('clearCart').disabled = carrito.length === 0;
}

function abrirCarrito() {
  renderCarrito();
  const overlay = document.getElementById('cartOverlay');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cart-open');
}

function cerrarCarrito() {
  const overlay = document.getElementById('cartOverlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('cart-open');
}

function construirMensajeWhatsApp() {
  const name = document.getElementById('customerName').value.trim();
  const location = document.getElementById('customerLocation').value.trim();
  const { total, sinPrecio } = calcularResumen();

  const lines = [
    'Hola FormaLab 3D, quiero realizar el siguiente pedido de filamento:',
    ''
  ];

  carrito.forEach(item => {
    const subtotal = item.precio ? ` — ${formatMoney(item.precio * item.cantidad)}` : ' — precio a confirmar';
    lines.push(`• ${item.cantidad} x ${item.marca} ${item.tipo} - ${item.color}${subtotal}`);
  });

  lines.push('');
  if (total > 0) lines.push(`Total estimado: ${formatMoney(total)}${sinPrecio ? ' + productos a confirmar' : ''}`);
  else lines.push('Total estimado: a confirmar');
  if (name) lines.push(`Nombre: ${name}`);
  if (location) lines.push(`Localidad / entrega: ${location}`);
  lines.push('');
  lines.push('¿Me confirman stock, precio final, forma de pago y entrega?');

  return lines.join('\n');
}

function enviarWhatsApp() {
  if (carrito.length === 0) return;

  const number = String(WHATSAPP_NUMBER || '').replace(/\D/g, '');
  if (number.length < 10 || number.includes('XXXXXXXX')) {
    mostrarToast('Primero configurá el número de WhatsApp en js/public.js.');
    return;
  }

  const message = construirMensajeWhatsApp();
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

document.getElementById('catalogo').addEventListener('click', event => {
  const button = event.target.closest('[data-product-index]');
  if (!button) return;
  agregarAlCarrito(Number(button.dataset.productIndex));
});

document.getElementById('cartItems').addEventListener('click', event => {
  const button = event.target.closest('[data-cart-action]');
  if (!button) return;
  const key = button.dataset.key;
  const action = button.dataset.cartAction;
  if (action === 'increase') cambiarCantidad(key, 1);
  if (action === 'decrease') cambiarCantidad(key, -1);
  if (action === 'remove') eliminarProducto(key);
});

document.getElementById('openCart').addEventListener('click', abrirCarrito);
document.getElementById('openCartTop').addEventListener('click', abrirCarrito);
document.getElementById('closeCart').addEventListener('click', cerrarCarrito);
document.getElementById('sendWhatsApp').addEventListener('click', enviarWhatsApp);
document.getElementById('clearCart').addEventListener('click', () => {
  if (!carrito.length) return;
  carrito = [];
  guardarCarrito();
  renderCarrito();
});

document.getElementById('cartOverlay').addEventListener('click', event => {
  if (event.target.id === 'cartOverlay') cerrarCarrito();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') cerrarCarrito();
});

actualizarIndicadores();
cargarCatalogo();
