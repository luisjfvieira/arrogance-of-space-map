const map = new maplibregl.Map({
  container: 'map',
  style: 'https://api.maptiler.com/maps/satellite/style.json?key=YOUR_MAPTILER_KEY', // satellite basemap
  center: [0, 0], // global center
  zoom: 2
});

const CELL_SIZE = 50; // max size in meters
let cells = [];
let selected = new Set();

// Helper: meters -> degrees approximation
function metersToDegrees(m) {
  return m / 111320;
}

// Generate grid dynamically for the current view
function generateGridForView() {
  const bounds = map.getBounds();
  const minX = bounds.getWest();
  const minY = bounds.getSouth();
  const maxX = bounds.getEast();
  const maxY = bounds.getNorth();
  const sizeDeg = metersToDegrees(CELL_SIZE);

  const newCells = [];
  for (let x = Math.floor(minX/sizeDeg); x <= Math.ceil(maxX/sizeDeg); x++) {
    for (let y = Math.floor(minY/sizeDeg); y <= Math.ceil(maxY/sizeDeg); y++) {
      const id = `${x}_${y}`;
      if (!cells.some(c => c.id === id)) {
        newCells.push({
          id: id,
          minX: x * sizeDeg,
          minY: y * sizeDeg,
          maxX: (x+1) * sizeDeg,
          maxY: (y+1) * sizeDeg
        });
      }
    }
  }
  cells = cells.concat(newCells);
  updateGridSource();
}

// Convert cells to GeoJSON
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

function updateGridSource() {
  if (map.getSource('grid')) {
    map.getSource('grid').setData(cellsToGeoJSON());
  }
}

map.on('load', () => {
  // Initial grid generation
  generateGridForView();

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
        '#ffffff'
      ],
      'line-width': 1
    }
  });

  // Click to select cells
  map.on('click', 'grid', e => {
    const id = e.features[0].properties.id;
    selected.has(id) ? selected.delete(id) : selected.add(id);
    updateGridSource();
  });

  // Dynamically generate grid when moving the map
  map.on('moveend', generateGridForView);
});

// Subdivide selected cells
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
          id: `${c.id}_${i}_${j}`,
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
  updateGridSource();
};
