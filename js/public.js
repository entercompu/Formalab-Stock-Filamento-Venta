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
      const sinStock = item.Disponible <= 0;
      return `
        <div class="filament-card" style="${sinStock ? 'opacity:0.55' : ''}">
          <div class="filament-swatch" style="--swatch:${colorSwatch(item.Color)}"></div>
          <div class="filament-name">${item.Color}</div>
          <div class="filament-meta">${item.Marca} · ${item.Tipo}</div>
          <div class="filament-bottom">
            <span class="filament-price">${item.Precio ? '$' + Math.round(item.Precio).toLocaleString('es-AR') : '—'}</span>
            ${sinStock
              ? '<span class="badge out">SIN STOCK</span>'
              : (item.Disponible <= 2 ? '<span class="badge low">POCAS UNIDADES</span>' : '<span class="badge ok">DISPONIBLE</span>')}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    console.error(err);
    cont.innerHTML = '<p class="empty-state">No se pudo cargar el catálogo. Intentá de nuevo más tarde.</p>';
  }
}

cargarCatalogo();
