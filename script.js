// Initialize MapLibre map
const map = new maplibregl.Map({
  container: 'map',
  center: [0, 0], // global center
  zoom: 2,
  style: {
    version: 8,
    sources: {},
    layers: []
  }
});

const CELL_SIZE = 50; // max cell size in meters
let cells = [];
let selected = new Set();

// Convert meters to approximate degrees
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

// Update the grid source on the map
function updateGridSource() {
  if (map.getSource('grid')) {
    map.getSource('grid').setData(cellsToGeoJSON());
  }
}

// Map load
map.on('load', () => {
  // Add global NASA Blue Marble satellite tiles (public domain, keyless)
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

  // Generate initial grid for current view
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

  // Click to select/unselect a cell
  map.on('click', 'grid', e => {
    const id = e.features[0].properties.id;
    selected.has(id) ? selected.delete(id) : selected.add(id);
    updateGridSource();
  });

  // Dynamically generate new grid cells when panning or zooming
  map.on('moveend', generateGridForView);
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
