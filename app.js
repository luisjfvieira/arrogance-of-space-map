let gridData = { type: 'FeatureCollection', features: [] };
let existingSquares = new Set();
let activeLandUse = 'cars';

// NEW: Mode state. 'pan', 'paint', or 'subdivide'
let currentMode = 'pan'; 

const PRECISION = 1000000;

const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#1a1a1a' } }]
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
    const resMeters = 200; 
    const latStep = resMeters / 111320;
    const lonStep = resMeters / (111320 * Math.cos(map.getCenter().lat * Math.PI / 180));

    const startLat = Math.floor(bounds.getSouth() / latStep) * latStep;
    const startLon = Math.floor(bounds.getWest() / lonStep) * lonStep;

    let addedNew = false;
    for (let x = startLon; x <= bounds.getEast() + lonStep; x += lonStep) {
        for (let y = startLat; y <= bounds.getNorth() + latStep; y += latStep) {
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
    // ... (Keep your MAP_SOURCES loading logic here)
    
    map.addSource('grid-source', { type: 'geojson', data: gridData });
    map.addLayer({
        id: 'grid-fill',
        type: 'fill',
        source: 'grid-source',
        paint: {
            'fill-color': ['get', 'color'],
            'fill-outline-color': 'rgba(255, 255, 255, 0.4)',
            'fill-opacity': 0.6 
        }
    });

    generateGrid();
});

map.on('moveend', generateGrid);

// THE FIXED INTERACTION LOGIC
map.on('click', 'grid-fill', (e) => {
    // If we are in PAN mode, do nothing and let the map handle drag/pan
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

// UI LOGIC FOR MODES
function setMode(mode) {
    currentMode = mode;
    
    // Visual feedback: Update buttons
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-mode-${mode}`).classList.add('active');

    // Change cursor: Crosshair for editing, Grab for panning
    map.getCanvas().style.cursor = (mode === 'pan') ? '' : 'crosshair';
}

// Add these to your HTML/UI listeners
document.getElementById('btn-mode-pan').onclick = () => setMode('pan');
document.getElementById('btn-mode-paint').onclick = () => setMode('paint');
document.getElementById('btn-mode-subdivide').onclick = () => setMode('subdivide');

// ... (Rest of opacity listeners)
