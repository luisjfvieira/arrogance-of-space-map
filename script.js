const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [-9.14, 38.72], // Lisbon
  zoom: 15
});

const CELL_SIZE = 50; // meters
let cells = [];
let selected = new Set();

function metersToDegrees(m) {
  return m / 111320;
}

function generateInitialGrid(center, sizeMeters, extent = 10) {
  const sizeDeg = metersToDegrees(sizeMeters);
  const [cx, cy] = center;
  for (let x = -extent; x <= extent; x++) {
    for (let y = -extent; y <= extent; y++) {
      cells.push({
        id: crypto.randomUUID(),
        minX: cx + x * sizeDeg,
        minY: cy + y * sizeDeg,
        maxX: cx + (x + 1) * sizeDeg,
        maxY: cy + (y + 1) * sizeDeg
      });
    }
  }
}

function cellsToGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: cells.map(c => ({
      type: 'Feature',
      properties: { id: c.id },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [c.minX, c.minY],
          [c.maxX, c.minY],
          [c.maxX, c.maxY],
          [c.minX, c.maxY],
          [c.minX, c.minY]
        ]]
      }
    }))
  };
}

map.on('load', () => {
  generateInitialGrid(map.getCenter().toArray(), CELL_SIZE);

  map.addSource('grid', {
    type: 'geojson',
    data: cellsToGeoJSON()
  });

  map.addLayer({
    id: 'grid',
    type: 'line',
    source: 'grid',
    paint: {
      'line-color': [
        'case',
        ['in', ['get', 'id'], ['literal', Array.from(selected)]],
        '#ff0000',
        '#000000'
      ],
      'line-width': 1
    }
  });

  map.on('click', 'grid', e => {
    const id = e.features[0].properties.id;
    selected.has(id) ? selected.delete(id) : selected.add(id);
    map.getSource('grid').setData(cellsToGeoJSON());
  });
});

document.getElementById('subdivide').onclick = () => {
  const ratio = parseInt(document.getElementById('ratio').value);
  const newCells = [];

  cells.forEach(c => {
    if (!selected.has(c.id)) {
      newCells.push(c);
      return;
    }

    const dx = (c.maxX - c.minX) / ratio;
    const dy = (c.maxY - c.minY) / ratio;

    for (let i = 0; i < ratio; i++) {
      for (let j = 0; j < ratio; j++) {
        newCells.push({
          id: crypto.randomUUID(),
          minX: c.minX + i * dx,
          minY: c.minY + j * dy,
          maxX: c.minX + (i + 1) * dx,
          maxY: c.minY + (j + 1) * dy
        });
      }
    }
  });

  cells = newCells;
  selected.clear();
  map.getSource('grid').setData(cellsToGeoJSON());
};
