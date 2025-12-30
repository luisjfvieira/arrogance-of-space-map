/**
 * ARROGANCE OF SPACE EXPLORER - CORE ENGINE
 * Features: Global Snapping, Persistence, Hierarchical Subdivision
 */

// 1. STATE MANAGEMENT
let gridData = { type: 'FeatureCollection', features: [] };
let existingSquares = new Set(); // Stores "x|y" coordinate keys
let activeLandUse = 'cars';
let isSubdivideMode = false;
const PRECISION = 1000000; // Multiplier to solve floating point superposition errors

// 2. INITIALIZATION
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#222222' } }]
    },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom
});

// Load saved data from browser storage on startup
const savedData = localStorage.getItem('arrogance_map_data');
if (savedData) {
    gridData = JSON.parse(savedData);
    gridData.features.forEach(f => {
        const x = f.geometry.coordinates[0][0][0];
        const y = f.geometry.coordinates[0][0][1];
        existingSquares.add(`${Math.round(x * PRECISION)}|${Math.round(y * PRECISION)}`);
    });
}

// 3. UTILITY FUNCTIONS
function createSquare(lon, lat, lonStep, latStep, props = {}) {
    return {
        type: 'Feature',
        properties: { 
            landUse: 'unassigned', 
            color: LAND_USE_COLORS['unassigned'],
            sizeLon: lonStep,
            sizeLat: latStep,
            ...props 
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[[lon, lat], [lon + lonStep, lat], [lon + lonStep, lat + latStep], [lon, lat + latStep], [lon, lat]]]
        }
    };
}

function saveToDisk() {
    localStorage.setItem('arrogance_map_data', JSON.stringify(gridData));
}

// 4. GRID GENERATION ENGINE
function generateGrid() {
    if (map.getZoom() < 12) return;

    const bounds = map.getBounds();
    const resMeters = parseFloat(document.getElementById('res-slider').value);
    
    // Calculate fixed steps based on global projection
    const latStep = resMeters / 111320;
    const lonStep = resMeters / (111320 * Math.cos(bounds.getCenter().lat * Math.PI / 180));

    // Buffer: Generate area 3x larger than viewport to prevent superposition during pan
    const latSpan = bounds.getNorth() - bounds.getSouth();
    const lonSpan = bounds.getEast() - bounds.getWest();
    const bufferSouth = bounds.getSouth() - latSpan;
    const bufferNorth = bounds.getNorth() + latSpan;
    const bufferWest = bounds.getWest() - lonSpan;
    const bufferEast = bounds.getEast() + lonSpan;

    // ANCHOR:
