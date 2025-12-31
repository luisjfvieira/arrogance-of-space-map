// 1. GLOBAL STATE & CONFIG
let gridData = { type: 'FeatureCollection', features: [] };
let existingSquares = new Set();
let history = []; // Stack for Undo functionality
const MAX_HISTORY = 20;

let activeLandUse = 'cars';
let currentMode = 'pan'; 
let subdivisionFactor = 10;
const PRECISION = 1000000;

let startPoint, currentPoint, boxElement;
let isShiftPainting = false;

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

map.boxZoom.disable();

// 3. CORE FUNCTIONS
const getCoordKey = (lon, lat) => `${Math.round(lon * PRECISION)}|${Math.round(lat * PRECISION)}`;

// Save current state to history before any change
function saveHistory() {
    history.push(JSON.stringify(gridData));
    if (history.length > MAX_HISTORY) history.shift();
}

// Undo Function
function undo() {
    if (history.length === 0) return;
    const lastState = JSON.parse(history.pop());
    gridData = lastState;
    
    // Rebuild existingSquares Set
    existingSquares.clear();
    gridData.features.forEach(f => {
        const c = f.geometry.coordinates[0][0];
        existingSquares.add(getCoordKey(c[0], c[1]));
    });
    
    map.getSource('grid-source').setData(gridData);
}

// Listen for Ctrl+Z
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
    }
});

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
    const lonStep = resMeters / (111320 * Math.cos(38.7 * Math.PI / 180));

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

function paintAtPoint(point) {
    const features = map.queryRenderedFeatures(point, { layers: ['grid-fill'] });
    if (features.length > 0) {
        const feature = features[0];
        const coords = feature.geometry.coordinates[0][0];
        const key = getCoordKey(coords[0], coords[1]);

        const targetIdx = gridData.features.findIndex(f => 
            getCoordKey(f.geometry.coordinates[0][0][0], f.geometry.coordinates[0][0][1]) === key
        );

        if (targetIdx !== -1 && gridData.features[targetIdx].properties.landUse !== activeLandUse) {
            saveHistory(); // Save before brush stroke starts
            gridData.features[targetIdx].properties.landUse = activeLandUse;
            gridData.features[targetIdx].properties.color = LAND_USE_COLORS[activeLandUse];
            map.getSource('grid-source').setData(gridData);
        }
    }
}

// 4. MAP LOADING
map.on('load', () => {
    Object.keys(MAP_SOURCES).forEach(id => {
        map.addSource(`src-${id}`, MAP_SOURCES[id]);
        map.addLayer({
            id: `layer-${id}`, type: 'raster', source: `src-${id}`,
            layout: { visibility: id === 'vector' ? 'visible' : 'none' }
        });
    });
    
    map.addSource('grid-source', { type: 'geojson', data: gridData });
    map.addLayer({
        id: 'grid-fill', type: 'fill', source: 'grid-source',
        paint: {
            'fill-color': ['get', 'color'],
            'fill-outline-color': 'rgba(0, 0, 139, 0.4)',
            'fill-opacity': 0.6 
        }
    });
    generateGrid();
});

map.on('moveend', generateGrid);

// 5. INTERACTION LOGIC
map.on('mousedown', (e) => {
    if (currentMode === 'pan') return;

    if (currentMode === 'paint' && e.originalEvent.shiftKey) {
        isShiftPainting = true;
        paintAtPoint(e.point);
    } else {
        // Selection Box for both Paint and Split
        startPoint = e.point;
        boxElement = document.createElement('div');
        boxElement.classList.add('box-draw');
        document.body.appendChild(boxElement);
    }
});

map.on('mousemove', (e) => {
    if (isShiftPainting) { paintAtPoint(e.point); return; }
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
    isShiftPainting = false;
    if (!boxElement) return;

    saveHistory(); // Save snapshot before mass change

    const p1 = map.unproject(startPoint);
    const p2 = map.unproject(e.point);
    const b = {
        minLon: Math.min(p1.lng, p2.lng),
        maxLon: Math.max(p1.lng, p2.lng),
        minLat: Math.min(p1.lat, p2.lat),
        maxLat: Math.max(p1.lat, p2.lat)
    };

    if (currentMode === 'paint') {
        gridData.features.forEach(f => {
            const c = f.geometry.coordinates[0][0];
            const isInside = c[0] >= b.minLon && (c[0] + f.properties.sizeLon) <= b.maxLon &&
                             c[1] >= b.minLat && (c[1] + f.properties.sizeLat) <= b.maxLat;
            if (isInside) {
                f.properties.landUse = activeLandUse;
                f.properties.color = LAND_USE_COLORS[activeLandUse];
            }
        });
    } else if (currentMode === 'subdivide') {
        let newFeatures = [];
        let toRemove = new Set();

        gridData.features.forEach((f, idx) => {
            const c = f.geometry.coordinates[0][0];
            const isInside = c[0] >= b.minLon && (c[0] + f.properties.sizeLon) <= b.maxLon &&
                             c[1] >= b.minLat && (c[1] + f.properties.sizeLat) <= b.maxLat;
            
            if (isInside) {
                toRemove.add(idx);
                existingSquares.delete(getCoordKey(c[0], c[1]));
                
                const div = subdivisionFactor;
                const sLon = f.properties.sizeLon / div;
                const sLat = f.properties.sizeLat / div;
                
                for (let i = 0; i < div; i++) {
                    for (let j = 0; j < div; j++) {
                        const nx = c[0] + (i * sLon);
                        const ny = c[1] + (j * sLat);
                        existingSquares.add(getCoordKey(nx, ny));
                        newFeatures.push(createSquare(nx, ny, sLon, sLat, f.properties));
                    }
                }
            }
        });

        // Filter out old features and add new ones
        gridData.features = gridData.features.filter((_, idx) => !toRemove.has(idx)).concat(newFeatures);
    }

    map.getSource('grid-source').setData(gridData);
    boxElement.remove();
    boxElement = null;
});

// 6. UI LOGIC (Remains same as previous, ensured event listeners match HTML)
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-mode-${mode}`).classList.add('active');
    map.dragPan[mode === 'pan' ? 'enable' : 'disable']();
    map.getCanvas().style.cursor = mode === 'pan' ? '' : 'crosshair';
}

document.getElementById('subdiv-slider').oninput = (e) => {
    subdivisionFactor = parseInt(e.target.value);
    document.getElementById('subdiv-val').innerText = subdivisionFactor;
    document.getElementById('subdiv-val-2').innerText = subdivisionFactor;
};
document.getElementById('opacity-slider').oninput = (e) => {
    map.setPaintProperty('grid-fill', 'fill-opacity', parseFloat(e.target.value) / 100);
    document.getElementById('opacity-val').innerText = e.target.value;
};
document.getElementById('btn-mode-pan').onclick = () => setMode('pan');
document.getElementById('btn-mode-paint').onclick = () => setMode('paint');
document.getElementById('btn-mode-subdivide').onclick = () => setMode('subdivide');

document.querySelectorAll('.legend-item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        activeLandUse = item.dataset.use;
    };
});

// 7. BASEMAP CONTROLS
const updateBase = () => {
    const isBaseOn = document.getElementById('toggle-basemap').checked;
    const selectedMode = document.getElementById('layer-selector').value;

    ['vector', 'satellite'].forEach(id => {
        if (map.getLayer(`layer-${id}`)) {
            const isVisible = (isBaseOn && selectedMode === id);
            map.setLayoutProperty(`layer-${id}`, 'visibility', isVisible ? 'visible' : 'none');
        }
    });
};

// Listeners for the Basemap UI
document.getElementById('toggle-basemap').onchange = updateBase;
document.getElementById('layer-selector').onchange = updateBase;
