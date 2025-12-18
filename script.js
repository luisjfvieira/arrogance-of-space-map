// Map initialization with valid style
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    name: 'Satellite with grid',
    sources: {},
    layers: []
  },
  center: [0, 0],
  zoom: 2
});

const CELL_SIZE = 50; // max cell size in meters
let cells = [];
let selected = new Set();

// Drag-box variables
let dragStart = null;
const dragBox = document.getElementById('drag-box');

// Helper: meters -> degrees
function metersToDegrees(m) {
  return m / 111320;
}

// Generate grid dynamically for current map viewport
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

// Convert cells array to GeoJSON
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

// Map load
map.on('load', () => {
  // Add NASA Blue Marble satellite tiles (keyless, commercial use)
  map.addSource('basemap', {
    type: 'raster',
    tiles: [
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief/default/2000/{z}/{y}/{x}.jpg'
    ],
    tileSize: 256
  });

  map.addLayer({
    id: 'basemap',
    type: 'raster',
    source: 'basemap'
  });

  // Generate initial grid
  generateGridForView();

  // Add grid source and layer
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

  // Dynamically generate grid when moving map
  map.on('moveend', generateGridForView);

  // Enable drag-box selection
  map.getCanvas().addEventListener('mousedown', e => {
    if (e.button !== 0) return; // only left button
    dragStart = { x: e.clientX, y: e.clientY };
    dragBox.style.left = dragStart.x + 'px';
    dragBox.style.top = dragStart.y + 'px';
    dragBox.style.width = '0px';
    dragBox.style.height = '0px';
    dragBox.style.display = 'block';
  });

  map.getCanvas().addEventListener('mousemove', e => {
    if (!dragStart) return;
    const x = Math.min(e.clientX, dragStart.x);
    const y = Math.min(e.clientY, dragStart.y);
    const w = Math.abs(e.clientX - dragStart.x);
    const h = Math.abs(e.clientY - dragStart.y);
    dragBox.style.left = x + 'px';
    dragBox.style.top = y + 'px';
    dragBox.style.width = w + 'px';
    dragBox.style.height = h + 'px';
  });

  map.getCanvas().addEventListener('mouseup', e => {
    if (!dragStart) return;
    const bounds = [
      map.unproject([dragStart.x, dragStart.y]),
      map.unproject([e.clientX, e.clientY])
    ];
    const minLon = Math.min(bounds[0].lng, bounds[1].lng);
    const maxLon = Math.max(bounds[0].lng, bounds[1].lng);
    const minLat = Math.min(bounds[0].lat, bounds[1].lat);
    const maxLat = Math.max(bounds[0].lat, bounds[1].lat);

    // Select all cells within drag box
    cells.forEach(c => {
      if (c.minX <= maxLon && c.maxX >= minLon &&
          c.minY <= maxLat && c.maxY >= minLat) {
        selected.add(c.id);
      }
    });
    updateGridSource();
    dragStart = null;
    dragBox.style.display = 'none';
  });
});

// Subdivide selected cells by ratio
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
