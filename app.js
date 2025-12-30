let gridData = { type: 'FeatureCollection', features: [] };
let existingSquares = new Set();
let activeLandUse = 'cars';
let currentMode = 'pan'; // Modes: 'pan', 'paint', 'subdivide'

const PRECISION = 1000000;

const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#ffffff' } }]
    },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom
});

// Helper for coordinates
const getCoordKey = (lon, lat) => `${Math.round(lon * PRECISION)}|${Math.round(lat * PRECISION)}`;

function createSquare(lon, lat, lonStep, latStep, props = {}) {
    return {
        type: 'Feature',
        properties: { 
            landUse: props.landUse || 'unassigned', 
            color: props.color || LAND_USE_COLORS[props.landUse || 'unassigned'],
            sizeLon: lonStep,
            sizeLat: latStep
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[[lon, lat], [lon + lonStep, lat], [lon + lonStep, lat + latStep], [lon, lat + latStep], [lon, lat]]]
        }
    };
}

function generateGrid() {
    if (map.getZoom() < 12) return;
    const bounds = map.getBounds();
    
    // CONSTANT GRID FIX: 
    // We anchor measurements to the world origin to stop "sliding" grids.
    const resMeters = 200; 
    const latStep = resMeters / 111320;
    const lonStep = resMeters / (111320 * Math.cos(0)); // Fixed at Equator for global alignment

    // SNAP: Anchor the start coordinates to a multiple of the step
    const startLat = Math.floor(bounds.getSouth() / latStep) * latStep;
    const startLon = Math.floor(bounds.getWest() / lonStep) * lonStep;

    let addedNew = false;
    // Buffer the loop slightly (2 extra steps) to ensure full screen coverage
    for (let x = startLon; x <= bounds.getEast() + (lonStep * 2); x += lonStep) {
        for (let y = startLat; y <= bounds.getNorth() + (latStep * 2); y += latStep) {
            const key = getCoordKey(x, y);
            if (!existingSquares.has(key)) {
                existingSquares.add(key);
                gridData.features.push(createSquare(x, y, lonStep, latStep));
                addedNew = true;
            }
        }
    }

    if (addedNew && map.getSource('grid-source')) {
        map.getSource('grid-source').setData(gridData);
    }
}

map.on('load', () => {
    // 1. Add both sources and layers
    Object.keys(MAP_SOURCES).forEach(id => {
        map.addSource(`src-${id}`, MAP_SOURCES[id]);
        map.addLayer({
            id: `layer-${id}`, // This creates 'layer-vector' and 'layer-satellite'
            type: 'raster',
            source: `src-${id}`,
            layout: { 
                // Only show vector (OSM) on start, hide satellite
                visibility: id === 'vector' ? 'visible' : 'none' 
            }
        });
    });
    
    map.addSource('grid-source', { type: 'geojson', data: gridData });
    map.addLayer({
        id: 'grid-fill',
        type: 'fill',
        source: 'grid-source',
        paint: {
            'fill-color': ['get', 'color'],
            'fill-outline-color': 'rgba(0, 0, 139, 0.6)',
            'fill-opacity': 0.6 
        }
    });

    generateGrid();
});

map.on('moveend', generateGrid);

// INTERACTION LOGIC
map.on('click', 'grid-fill', (e) => {
    if (currentMode === 'pan') return;

    const feature = e.features[0];
    const coords = feature.geometry.coordinates[0][0];
    const lon = coords[0];
    const lat = coords[1];
    
    const targetIdx = gridData.features.findIndex(f => 
        getCoordKey(f.geometry.coordinates[0][0][0], f.geometry.coordinates[0][0][1]) === getCoordKey(lon, lat)
    );

    if (targetIdx === -1) return;

    if (currentMode === 'subdivide') {
        const parentProps = gridData.features[targetIdx].properties;
        const sizeLon = parentProps.sizeLon;
        const sizeLat = parentProps.sizeLat;

        // REMOVE PARENT: Prevents transparency overlap darkening
        gridData.features.splice(targetIdx, 1);
        existingSquares.delete(getCoordKey(lon, lat));

        const div = 4;
        const cLon = sizeLon / div;
        const cLat = sizeLat / div;
        for (let i = 0; i < div; i++) {
            for (let j = 0; j < div; j++) {
                const nx = lon + (i * cLon);
                const ny = lat + (j * cLat);
                existingSquares.add(getCoordKey(nx, ny));
                gridData.features.push(createSquare(nx, ny, cLon, cLat, {
                    landUse: parentProps.landUse,
                    color: parentProps.color
                }));
            }
        }
    } else if (currentMode === 'paint') {
        gridData.features[targetIdx].properties.landUse = activeLandUse;
        gridData.features[targetIdx].properties.color = LAND_USE_COLORS[activeLandUse];
    }
    
    map.getSource('grid-source').setData(gridData);
});

// Variable to track the selection box
let startPoint, currentPoint, boxElement;

// Disable default box zoom to use Shift+Drag for painting
map.boxZoom.disable();

map.on('mousedown', (e) => {
    // Only trigger if in PAINT mode and Shift key is held
    if (currentMode !== 'paint' || !e.originalEvent.shiftKey) return;

    // Prevent map panning while drawing the box
    map.dragPan.disable();

    startPoint = e.point;
    boxElement = document.createElement('div');
    boxElement.classList.add('box-draw');
    document.body.appendChild(boxElement);
});

map.on('mousemove', (e) => {
    if (!boxElement) return;

    currentPoint = e.point;

    const minX = Math.min(startPoint.x, currentPoint.x);
    const maxX = Math.max(startPoint.x, currentPoint.x);
    const minY = Math.min(startPoint.y, currentPoint.y);
    const maxY = Math.max(startPoint.y, currentPoint.y);

    boxElement.style.left = minX + 'px';
    boxElement.style.top = minY + 'px';
    boxElement.style.width = (maxX - minX) + 'px';
    boxElement.style.height = (maxY - minY) + 'px';
});

map.on('mouseup', (e) => {
    if (!boxElement) return;

    // Capture the bounding box in screen coordinates
    const bbox = [
        [Math.min(startPoint.x, e.point.x), Math.min(startPoint.y, e.point.y)],
        [Math.max(startPoint.x, e.point.x), Math.max(startPoint.y, e.point.y)]
    ];

    // Find all features from 'grid-fill' that fall inside this box
    const selectedFeatures = map.queryRenderedFeatures(bbox, { layers: ['grid-fill'] });

    if (selectedFeatures.length > 0) {
        selectedFeatures.forEach(feature => {
            const coords = feature.geometry.coordinates[0][0];
            const lon = coords[0];
            const lat = coords[1];
            
            // Find the square in our main data object
            const targetIdx = gridData.features.findIndex(f => 
                getCoordKey(f.geometry.coordinates[0][0][0], f.geometry.coordinates[0][0][1]) === getCoordKey(lon, lat)
            );

            if (targetIdx !== -1) {
                gridData.features[targetIdx].properties.landUse = activeLandUse;
                gridData.features[targetIdx].properties.color = LAND_USE_COLORS[activeLandUse];
            }
        });

        // Update the map source once
        map.getSource('grid-source').setData(gridData);
    }

    // Cleanup
    boxElement.remove();
    boxElement = null;
    map.dragPan.enable();
});

// MODE SWITCHER
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-mode-${mode}`).classList.add('active');

    // Change cursor: Crosshair for editing, default for pan
    map.getCanvas().style.cursor = (mode === 'pan') ? '' : 'crosshair';
}

document.getElementById('btn-mode-pan').onclick = () => setMode('pan');
document.getElementById('btn-mode-paint').onclick = () => setMode('paint');
document.getElementById('btn-mode-subdivide').onclick = () => setMode('subdivide');

// UI UPDATES
document.getElementById('opacity-slider').oninput = (e) => {
    map.setPaintProperty('grid-fill', 'fill-opacity', parseFloat(e.target.value) / 100);
    document.getElementById('opacity-val').innerText = e.target.value;
};

document.querySelectorAll('.legend-item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        activeLandUse = item.dataset.use;
    };
});

// Function to sync the map with the UI settings
const updateBase = () => {
    const isBaseOn = document.getElementById('toggle-basemap').checked;
    const selectedMode = document.getElementById('layer-selector').value;

    // Toggle Vector Layer (OSM)
    map.setLayoutProperty(
        'layer-vector', 
        'visibility', 
        (isBaseOn && selectedMode === 'vector') ? 'visible' : 'none'
    );

    // Toggle Satellite Layer (Google)
    map.setLayoutProperty(
        'layer-satellite', 
        'visibility', 
        (isBaseOn && selectedMode === 'satellite') ? 'visible' : 'none'
    );
};

// Attach listeners to the HTML elements
document.getElementById('toggle-basemap').onchange = updateBase;
document.getElementById('layer-selector').onchange = updateBase;
