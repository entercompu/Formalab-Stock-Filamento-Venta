const COLOR_MAP = {
  'BLANCO': '#f4f4f2', 'NEGRO': '#1c1c1c', 'AZUL': '#2563eb',
  'VERDE MANZANA': '#7cb518', 'VERDE': '#2f9e60', 'ROJO': '#d9553f',
  'AMARILLO': '#e8c547', 'GRIS': '#9ca3af', 'BEIGE': '#d8c3a5',
  'NARANJA': '#e8772e', 'VIOLETA': '#8b5cf6', 'ROSA': '#ec4899',
  'MARRON': '#7a5230', 'DORADO': '#c9a227', 'PLATEADO': '#c0c4c9'
};

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

    container.innerHTML = data.catalogo.map(item => {
      const disponible = Number(item.Disponible) || 0;
      const sinStock = disponible <= 0;
      const price = Number(item.Precio) || 0;
      const badge = sinStock
        ? '<span class="badge out">SIN STOCK</span>'
        : (disponible <= 2
          ? '<span class="badge low">POCAS UNIDADES</span>'
          : '<span class="badge ok">DISPONIBLE</span>');

      return `
        <div class="filament-card" style="${sinStock ? 'opacity:0.55' : ''}">
          <div class="filament-swatch" style="--swatch:${colorSwatch(item.Color)}"></div>
          <div class="filament-name">${escapeHtml(item.Color)}</div>
          <div class="filament-meta">${escapeHtml(item.Marca)} · ${escapeHtml(item.Tipo)}</div>
          <div class="filament-stock">
               Stock disponible: ${item.Disponible} ${item.Disponible === 1 ? 'unidad' : 'unidades'}
          </div>
          <div class="filament-bottom">
            <span class="filament-price">${price ? '$' + Math.round(price).toLocaleString('es-AR') : '—'}</span>
            ${badge}
          </div>
        </div>`;
    }).join('');
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="empty-state">No se pudo cargar el catálogo. Intentá de nuevo más tarde.</p>';
  }
}

cargarCatalogo();
