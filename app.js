// 1. GLOBAL STATE & CONFIG
let gridData = { type: 'FeatureCollection', features: [] };
let existingSquares = new Set();
let activeLandUse = 'cars';
let currentMode = 'pan'; 
const PRECISION = 1000000;

// Variables for the selection box (Window tool)
let startPoint, currentPoint, boxElement;

// 2. INITIALIZE MAP
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [{ 
            id: 'background', 
            type: 'background', 
            paint: { 'background-color': '#ffffff' } 
        }]
    },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom
});

// Disable default box zoom so we can use Shift+Drag for painting
map.boxZoom.disable();

// 3. CORE FUNCTIONS
// Helper for consistent coordinate keys
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
    
    // FIXED GRID CALCULATION
    const resMeters = 200; 
    const latStep = resMeters / 111320;
    const lonStep = resMeters / (111320 * Math.cos(0)); // Fixed at Equator

    const startLat = Math.floor(bounds.getSouth() / latStep) * latStep;
    const startLon = Math.floor(bounds.getWest() / lonStep) * lonStep;

    let addedNew = false;
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

// 4. MAP LOADING
map.on('load', () => {
    // Add Basemaps
    Object.keys(MAP_SOURCES).forEach(id => {
        map.addSource(`src-${id}`, MAP_SOURCES[id]);
        map.addLayer({
            id: `layer-${id}`,
            type: 'raster',
            source: `src-${id}`,
            layout: { visibility: id === 'vector' ? 'visible' : 'none' }
        });
    });
    
    // Add Grid Source and Layer
    map.addSource('grid-source', { type: 'geojson', data: gridData });
    map.addLayer({
        id: 'grid-fill',
        type: 'fill',
        source: 'grid-source',
        paint: {
            'fill-color': ['get', 'color'],
            'fill-outline-color': 'rgba(0, 0, 139, 0.6)', // Your Dark Blue
            'fill-opacity': 0.6 
        }
    });

    generateGrid();
});

map.on('moveend', generateGrid);

// 5. CLICK INTERACTION (Single Cell Paint/Split)
map.on('click', 'grid-fill', (e) => {
    if (currentMode === 'pan') return;

    const feature = e.features[0];
    const coords = feature.geometry.coordinates[0][0];
    const key = getCoordKey(coords[0], coords[1]);
    
    const targetIdx = gridData.features.findIndex(f => 
        getCoordKey(f.geometry.coordinates[0][0][0], f.geometry.coordinates[0][0][1]) === key
    );

    if (targetIdx === -1) return;

    if (currentMode === 'subdivide') {
        const parentProps = gridData.features[targetIdx].properties;
        const sizeLon = parentProps.sizeLon;
        const sizeLat = parentProps.sizeLat;

        gridData.features.splice(targetIdx, 1);
        existingSquares.delete(key);

        const div = 4;
        const cLon = sizeLon / div;
        const cLat = sizeLat / div;
        for (let i = 0; i < div; i++) {
            for (let j = 0; j < div; j++) {
                const nx = coords[0] + (i * cLon);
                const ny = coords[1] + (j * cLat);
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

// 6. WINDOW TOOL (Shift + Drag Selection)
map.on('mousedown', (e) => {
    if (currentMode !== 'paint' || !e.originalEvent.shiftKey) return;
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

    const bbox = [
        [Math.min(startPoint.x, e.point.x), Math.min(startPoint.y, e.point.y)],
        [Math.max(startPoint.x, e.point.x), Math.max(startPoint.y, e.point.y)]
    ];

    const selectedFeatures = map.queryRenderedFeatures(bbox, { layers: ['grid-fill'] });

    if (selectedFeatures.length > 0) {
        const processedKeys = new Set();
        selectedFeatures.forEach(feature => {
            const coords = feature.geometry.coordinates[0][0];
            const key = getCoordKey(coords[0], coords[1]);
            
            if (!processedKeys.has(key)) {
                processedKeys.add(key);
                const targetIdx = gridData.features.findIndex(f => 
                    getCoordKey(f.geometry.coordinates[0][0][0], f.geometry.coordinates[0][0][1]) === key
                );
                if (targetIdx !== -1) {
                    gridData.features[targetIdx].properties.landUse = activeLandUse;
                    gridData.features[targetIdx].properties.color = LAND_USE_COLORS[activeLandUse];
                }
            }
        });
        map.getSource('grid-source').setData(gridData);
    }

    boxElement.remove();
    boxElement = null;
    map.dragPan.enable();
});

// 7. UI LOGIC & CONTROLS
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`btn-mode-${mode}`);
    if (targetBtn) targetBtn.classList.add('active');
    map.getCanvas().style.cursor = (mode === 'pan') ? '' : 'crosshair';
}

document.getElementById('btn-mode-pan').onclick = () => setMode('pan');
document.getElementById('btn-mode-paint').onclick = () => setMode('paint');
document.getElementById('btn-mode-subdivide').onclick = () => setMode('subdivide');

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

const updateBase = () => {
    const isBaseOn = document.getElementById('toggle-basemap').checked;
    const selectedMode = document.getElementById('layer-selector').value;

    if (map.getLayer('layer-vector')) {
        map.setLayoutProperty('layer-vector', 'visibility', (isBaseOn && selectedMode === 'vector') ? 'visible' : 'none');
    }
    if (map.getLayer('layer-satellite')) {
        map.setLayoutProperty('layer-satellite', 'visibility', (isBaseOn && selectedMode === 'satellite') ? 'visible' : 'none');
    }
};

document.getElementById('toggle-basemap').onchange = updateBase;
document.getElementById('layer-selector').onchange = updateBase;
