// Mapeo básico de nombres de color en español a un tono aproximado para el detalle visual.
const COLOR_MAP = {
  'BLANCO': '#f4f4f2', 'NEGRO': '#1c1c1c', 'AZUL': '#2563eb',
  'VERDE MANZANA': '#7cb518', 'VERDE': '#2f9e60', 'ROJO': '#d9553f',
  'AMARILLO': '#e8c547', 'GRIS': '#9ca3af', 'BEIGE': '#d8c3a5',
  'NARANJA': '#e8772e', 'VIOLETA': '#8b5cf6', 'ROSA': '#ec4899',
  'MARRON': '#7a5230', 'DORADO': '#c9a227', 'PLATEADO': '#c0c4c9'
};

function colorSwatch(nombre) {
  const key = (nombre || '').toUpperCase().trim();
  return COLOR_MAP[key] || '#b8bcb6';
}

const fmtMoney = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');

// ---------- Estado del carrito ----------
// Clave: Marca|Tipo|Color -> { marca, tipo, color, precio, disponible, cantidad }
const cart = {};

function itemKey(item) {
  return [item.Marca, item.Tipo, item.Color].join('|');
}

function cartCount() {
  return Object.values(cart).reduce((sum, i) => sum + i.cantidad, 0);
}

function cartTotal() {
  return Object.values(cart).reduce((sum, i) => sum + i.cantidad * i.precio, 0);
}

function updateCartBar() {
  const bar = document.getElementById('cartBar');
  const count = cartCount();
  if (count === 0) {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  document.getElementById('cartCount').textContent = count === 1 ? '1 producto' : count + ' productos';
  document.getElementById('cartTotal').textContent = fmtMoney(cartTotal());
}

function changeQty(item, delta) {
  const key = itemKey(item);
  const current = cart[key] ? cart[key].cantidad : 0;
  let next = current + delta;
  if (next < 0) next = 0;
  if (next > item.Disponible) next = item.Disponible;

  if (next === 0) {
    delete cart[key];
  } else {
    cart[key] = {
      marca: item.Marca, tipo: item.Tipo, color: item.Color,
      precio: Number(item.Precio) || 0, disponible: item.Disponible,
      cantidad: next
    };
  }

  const safeId = key.replace(/[^a-zA-Z0-9]/g, '_');
  const qtyEl = document.getElementById('qtyValue-' + safeId);
  if (qtyEl) qtyEl.textContent = next;
  const cardEl = document.querySelector('.filament-card[data-key="' + key + '"]');
  if (cardEl) cardEl.classList.toggle('in-cart', next > 0);
  updateCartBar();
}

// ---------- Catálogo ----------
async function cargarCatalogo() {
  const cont = document.getElementById('catalogo');

  if (!SCRIPT_URL || SCRIPT_URL.includes('PEGA_ACA')) {
    cont.innerHTML = '<p class="empty-state">El catálogo todavía no está configurado.</p>';
    return;
  }

  try {
    const res = await fetch(SCRIPT_URL + '?action=publico');
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error desconocido');

    if (!data.catalogo || data.catalogo.length === 0) {
      cont.innerHTML = '<p class="empty-state">Todavía no hay productos cargados.</p>';
      return;
    }

    cont.innerHTML = data.catalogo.map(item => {
      const key = itemKey(item);
      const safeId = key.replace(/[^a-zA-Z0-9]/g, '_');
      const sinStock = item.Disponible <= 0;
      const badge = sinStock
        ? '<span class="badge out">SIN STOCK</span>'
        : (item.Disponible <= 2 ? '<span class="badge low">POCAS UNIDADES</span>' : '<span class="badge ok">DISPONIBLE</span>');

      return `
        <div class="filament-card" data-key="${key}">
          <div class="filament-swatch" style="--swatch:${colorSwatch(item.Color)}"></div>
          <div class="filament-name">${item.Color}</div>
          <div class="filament-meta">${item.Marca} · ${item.Tipo}</div>
          <div class="filament-bottom">
            <span class="filament-price">${item.Precio ? fmtMoney(item.Precio) : '—'}</span>
            ${badge}
          </div>
          ${sinStock ? '' : `
          <div class="filament-qty">
            <button class="qty-btn" data-action="minus" data-key="${key}" type="button">−</button>
            <span class="qty-value" id="qtyValue-${safeId}">0</span>
            <button class="qty-btn" data-action="plus" data-key="${key}" type="button">+</button>
          </div>`}
        </div>`;
    }).join('');

    // Guardamos los items en un mapa accesible por key para los botones +/-
    window.__catalogo = {};
    data.catalogo.forEach(item => { window.__catalogo[itemKey(item)] = item; });

    cont.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = window.__catalogo[btn.dataset.key];
        changeQty(item, btn.dataset.action === 'plus' ? 1 : -1);
      });
    });

  } catch (err) {
    console.error(err);
    cont.innerHTML = '<p class="empty-state">No se pudo cargar el catálogo. Intentá de nuevo más tarde.</p>';
  }
}

// ---------- Modal del carrito ----------
function renderCartModal() {
  const itemsEl = document.getElementById('cartItems');
  const items = Object.values(cart);

  if (items.length === 0) {
    itemsEl.innerHTML = '<p class="empty-state">Todavía no agregaste productos.</p>';
  } else {
    itemsEl.innerHTML = items.map(i => `
      <div class="cart-item-row">
        <div>
          <div class="cart-item-name">${i.color} <span class="cart-item-meta">× ${i.cantidad}</span></div>
          <div class="cart-item-meta">${i.marca} · ${i.tipo}</div>
        </div>
        <div class="cart-item-price">${fmtMoney(i.precio * i.cantidad)}</div>
      </div>`).join('');
  }

  document.getElementById('cartModalTotal').textContent = fmtMoney(cartTotal());
}

document.getElementById('openCartBtn').addEventListener('click', () => {
  renderCartModal();
  document.getElementById('cartModal').classList.remove('hidden');
});

document.getElementById('closeCartBtn').addEventListener('click', () => {
  document.getElementById('cartModal').classList.add('hidden');
});

document.getElementById('cartModal').addEventListener('click', (e) => {
  if (e.target.id === 'cartModal') e.currentTarget.classList.add('hidden');
});

// ---------- Envío por WhatsApp ----------
document.getElementById('cartForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const items = Object.values(cart);
  if (items.length === 0) return;

  const fd = new FormData(e.target);
  const nombre = fd.get('nombre');
  const notas = fd.get('notas');

  let msg = `Hola! Soy ${nombre} y quiero hacer este pedido de filamento:\n\n`;
  items.forEach(i => {
    msg += `• ${i.color} (${i.marca} ${i.tipo}) x${i.cantidad} — ${fmtMoney(i.precio * i.cantidad)}\n`;
  });
  msg += `\nTotal estimado: ${fmtMoney(cartTotal())}`;
  if (notas) msg += `\n\nNotas: ${notas}`;
  msg += `\n\n(Pedido generado desde el catálogo web)`;

  if (!WHATSAPP_NUMBER || WHATSAPP_NUMBER.includes('PEGA_TU')) {
    alert('El número de WhatsApp del negocio todavía no está configurado.');
    return;
  }

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
});

cargarCatalogo();
