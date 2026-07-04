// WhatsApp de FormaLab 3D, con código de país y sin +, espacios ni guiones.
const WHATSAPP_NUMBER = '5492966474022';

const COLOR_MAP = {
  'BLANCO': '#f4f4f2', 'NEGRO': '#1c1c1c', 'AZUL': '#2563eb',
  'VERDE MANZANA': '#7cb518', 'VERDE': '#2f9e60', 'ROJO': '#d9553f',
  'AMARILLO': '#e8c547', 'GRIS': '#9ca3af', 'BEIGE': '#d8c3a5',
  'NARANJA': '#e8772e', 'VIOLETA': '#8b5cf6', 'ROSA': '#ec4899',
  'MARRON': '#7a5230', 'MARRÓN': '#7a5230', 'DORADO': '#c9a227',
  'PLATEADO': '#c0c4c9', 'CELESTE': '#55b8e8', 'FUCSIA': '#d9469f'
};

const STORAGE_KEY = 'formalab_filamento_cart_v2';
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
  return COLOR_MAP[String(name || '').toUpperCase().trim()] || '#b8bcb6';
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
  mostrarToast.timer = setTimeout(() => toast.classList.remove('show'), 2300);
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
    container.innerHTML = '<p class="empty-state">No se pudo cargar el catálogo. Intentá nuevamente más tarde.</p>';
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
      : disponible <= 2
        ? '<span class="badge low">POCAS UNIDADES</span>'
        : '<span class="badge ok">DISPONIBLE</span>';

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

        <div class="product-order-row">
          <div class="quantity-picker" aria-label="Cantidad de ${escapeHtml(item.Color)}">
            <button type="button" data-qty-action="minus" data-product-index="${index}" ${sinStock ? 'disabled' : ''}>−</button>
            <input type="number" min="1" max="${Math.max(1, disponible)}" value="1" data-qty-input="${index}" ${sinStock ? 'disabled' : ''}>
            <button type="button" data-qty-action="plus" data-product-index="${index}" ${sinStock ? 'disabled' : ''}>+</button>
          </div>
          <button type="button" class="add-cart-btn" data-add-product="${index}" ${sinStock ? 'disabled' : ''}>
            ${sinStock ? 'Sin stock' : 'Agregar'}
          </button>
        </div>
      </article>`;
  }).join('');
}

function ajustarCantidadTarjeta(index, delta) {
  const input = document.querySelector(`[data-qty-input="${index}"]`);
  const product = catalogo[index];
  if (!input || !product) return;

  const current = Number(input.value) || 1;
  input.value = Math.min(product.Disponible, Math.max(1, current + delta));
}

function normalizarCantidadTarjeta(index) {
  const input = document.querySelector(`[data-qty-input="${index}"]`);
  const product = catalogo[index];
  if (!input || !product) return 1;

  const normalized = Math.min(product.Disponible, Math.max(1, Number(input.value) || 1));
  input.value = normalized;
  return normalized;
}

function agregarAlCarrito(productIndex) {
  const product = catalogo[productIndex];
  if (!product || product.Disponible <= 0) return;

  const cantidadElegida = normalizarCantidadTarjeta(productIndex);
  const key = productKey(product);
  const existing = carrito.find(item => item.key === key);
  const cantidadActual = existing ? existing.cantidad : 0;
  const nuevaCantidad = Math.min(product.Disponible, cantidadActual + cantidadElegida);

  if (nuevaCantidad === cantidadActual) {
    mostrarToast(`Ya agregaste todo el stock disponible de ${product.Color}.`);
    return;
  }

  if (existing) {
    existing.cantidad = nuevaCantidad;
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
      cantidad: nuevaCantidad
    });
  }

  guardarCarrito();
  mostrarToast(`${nuevaCantidad - cantidadActual} ${product.Color} agregado al pedido.`);
}

function cambiarCantidadCarrito(key, delta) {
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
  const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const sinPrecio = carrito.some(item => !item.precio);
  return { unidades, total, sinPrecio };
}

function actualizarIndicadores() {
  const { unidades, total } = calcularResumen();
  document.getElementById('cartCountTop').textContent = unidades;
  document.getElementById('cartFabInfo').textContent = unidades === 1
    ? `1 producto · ${formatMoney(total)}`
    : `${unidades} productos · ${formatMoney(total)}`;
  document.getElementById('openCart').classList.toggle('visible', unidades > 0);
  document.getElementById('cartTotal').textContent = formatMoney(total);
  document.getElementById('finalCartTotal').textContent = formatMoney(total);
}

function renderCarrito() {
  const container = document.getElementById('cartItems');
  const { total, sinPrecio } = calcularResumen();

  if (carrito.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <strong>Tu pedido está vacío</strong>
        <span>Elegí una cantidad y agregá uno o varios filamentos.</span>
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

  const displayedTotal = sinPrecio && total === 0
    ? 'A confirmar'
    : `${formatMoney(total)}${sinPrecio ? ' +' : ''}`;

  document.getElementById('cartTotal').textContent = displayedTotal;
  document.getElementById('finalCartTotal').textContent = displayedTotal;
  document.getElementById('continueCheckout').disabled = carrito.length === 0;
  document.getElementById('clearCart').disabled = carrito.length === 0;
}

function mostrarPaso(step) {
  const isStep1 = step === 1;
  document.getElementById('checkoutStep1').classList.toggle('is-hidden', !isStep1);
  document.getElementById('checkoutStep2').classList.toggle('is-hidden', isStep1);
  document.getElementById('progressStep1').classList.toggle('active', isStep1);
  document.getElementById('progressStep2').classList.toggle('active', !isStep1);
  document.getElementById('checkoutError').classList.add('is-hidden');
}

function abrirCarrito() {
  renderCarrito();
  mostrarPaso(1);
  const overlay = document.getElementById('cartOverlay');
  overlay.classList.remove('is-hidden');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cart-open');
}

function cerrarCarrito() {
  const overlay = document.getElementById('cartOverlay');
  overlay.classList.add('is-hidden');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('cart-open');
}

function continuarCheckout() {
  if (carrito.length === 0) {
    mostrarToast('Primero agregá al menos un producto.');
    return;
  }
  mostrarPaso(2);
  document.getElementById('customerName').focus();
}

function mostrarErrorCheckout(message) {
  const error = document.getElementById('checkoutError');
  error.textContent = message;
  error.classList.remove('is-hidden');
}

function enviarWhatsApp() {
  if (carrito.length === 0) {
    mostrarPaso(1);
    return;
  }

  const name = document.getElementById('customerName').value.trim();
  const location = document.getElementById('customerLocation').value.trim();
  const delivery = document.getElementById('deliveryMethod').value;
  const notes = document.getElementById('customerNotes').value.trim();

  if (!name || !location || !delivery) {
    mostrarErrorCheckout('Completá nombre, localidad y forma de entrega para continuar.');
    return;
  }

  const { total, sinPrecio } = calcularResumen();
  const lines = carrito.map(item => {
    const subtotal = item.precio ? ` — ${formatMoney(item.precio * item.cantidad)}` : ' — precio a confirmar';
    return `• ${item.cantidad} x ${item.marca} ${item.tipo} ${item.color}${subtotal}`;
  });

  const message = [
    'Hola FormaLab 3D, quiero realizar este pedido de filamentos:',
    '',
    ...lines,
    '',
    `Total estimado: ${sinPrecio && total === 0 ? 'A confirmar' : formatMoney(total) + (sinPrecio ? ' +' : '')}`,
    '',
    `Nombre: ${name}`,
    `Localidad: ${location}`,
    `Entrega: ${delivery}`,
    notes ? `Observaciones: ${notes}` : '',
    '',
    'Quedo a la espera de la confirmación de stock, precio final y forma de pago.'
  ].filter(Boolean).join('\n');

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
}

document.getElementById('catalogo').addEventListener('click', event => {
  const qtyButton = event.target.closest('[data-qty-action]');
  if (qtyButton) {
    const index = Number(qtyButton.dataset.productIndex);
    ajustarCantidadTarjeta(index, qtyButton.dataset.qtyAction === 'plus' ? 1 : -1);
    return;
  }

  const addButton = event.target.closest('[data-add-product]');
  if (addButton) agregarAlCarrito(Number(addButton.dataset.addProduct));
});

document.getElementById('catalogo').addEventListener('change', event => {
  if (event.target.matches('[data-qty-input]')) {
    normalizarCantidadTarjeta(Number(event.target.dataset.qtyInput));
  }
});

document.getElementById('cartItems').addEventListener('click', event => {
  const button = event.target.closest('[data-cart-action]');
  if (!button) return;

  const key = button.dataset.key;
  if (button.dataset.cartAction === 'increase') cambiarCantidadCarrito(key, 1);
  if (button.dataset.cartAction === 'decrease') cambiarCantidadCarrito(key, -1);
  if (button.dataset.cartAction === 'remove') eliminarProducto(key);
});

document.getElementById('openCart').addEventListener('click', abrirCarrito);
document.getElementById('openCartTop').addEventListener('click', abrirCarrito);
document.getElementById('closeCart').addEventListener('click', cerrarCarrito);
document.getElementById('continueCheckout').addEventListener('click', continuarCheckout);
document.getElementById('backToCart').addEventListener('click', () => mostrarPaso(1));
document.getElementById('sendWhatsApp').addEventListener('click', enviarWhatsApp);

document.getElementById('clearCart').addEventListener('click', () => {
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
