const map = new maplibregl.Map({
  container: 'map',
  // Using a very minimal style so grid lines are clear
  style: {
    "version": 8,
    "sources": {},
    "layers": [
      {
        "id": "background",
        "type": "background",
        "paint": { "background-color": "#f8f8f8" }
      }
    ]
  },
  center: [-9.135, 38.725], // Arroios, Lisbon
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

  // 1. Add Satellite Source
  map.addSource('satellite-source', {
    type: 'raster',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256,
    attribution: 'Tiles &copy; Esri'
  });

  // 2. Add Satellite Layer (Hidden by default, placed at the bottom)
  map.addLayer({
    id: 'satellite-layer',
    type: 'raster',
    source: 'satellite-source',
    layout: { visibility: 'none' }
  }, 'background'); // 'background' ensures it's at the very bottom

  // 3. Add Grid Source
  map.addSource('grid-source', {
    type: 'geojson',
    data: cellsToGeoJSON()
  });

  // 4. Add Grid Fill (for clicking)
  map.addLayer({
    id: 'grid-fill',
    type: 'fill',
    source: 'grid-source',
    paint: {
      'fill-color': '#ff0000',
      'fill-opacity': [
        'case',
        ['in', ['get', 'id'], ['literal', Array.from(selected)]],
        0.3,
        0 // Transparent if not selected
      ]
    }
  });

  // 5. Add Grid Lines
  map.addLayer({
    id: 'grid-lines',
    type: 'line',
    source: 'grid-source',
    paint: {
      'line-color': '#333333',
      'line-width': 1
    }
  });

  // Interactivity: Selection
  map.on('click', 'grid-fill', (e) => {
    const id = e.features[0].properties.id;
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    
    // Efficiently update the paint property without reloading the whole GeoJSON
    map.setPaintProperty('grid-fill', 'fill-opacity', [
      'case',
      ['in', ['get', 'id'], ['literal', Array.from(selected)]],
      0.3,
      0
    ]);
  });

  map.on('mouseenter', 'grid-fill', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'grid-fill', () => map.getCanvas().style.cursor = '');
});

// Satellite Toggle
document.getElementById('satellite-toggle').addEventListener('change', (e) => {
  const visibility = e.target.checked ? 'visible' : 'none';
  map.setLayoutProperty('satellite-layer', 'visibility', visibility);
});

// Subdivide Selected
document.getElementById('subdivide').onclick = () => {
  if (selected.size === 0) {
    alert("Please click a cell to select it first!");
    return;
  }

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
  
  // Refresh the map data and reset the visual selection state
  map.getSource('grid-source').setData(cellsToGeoJSON());
  map.setPaintProperty('grid-fill', 'fill-opacity', [
    'case',
    ['in', ['get', 'id'], ['literal', []]],
    0.3,
    0
  ]);
};
