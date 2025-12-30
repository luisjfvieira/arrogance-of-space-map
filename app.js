let gridData = { type: 'FeatureCollection', features: [] };
let existingSquares = new Set();
let activeLandUse = 'cars';
let isSubdivideMode = false;
const PRECISION = 1000000;

// Initialize Map
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [
            { id: 'background', type: 'background', paint: { 'background-color': '#1a1a1a' } }
        ]
    },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom
});

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

function generateGrid() {
    // CRITICAL: Grid only generates at Zoom 12 or higher
    if (map.getZoom() < 12) return;

    const bounds = map.getBounds();
    const resSlider = document.getElementById('res-slider');
    const resMeters = resSlider ? parseFloat(resSlider.value) : 200;
    
    const latStep = resMeters / 111320;
    const lonStep = resMeters / (111320 * Math.cos(map.getCenter().lat * Math.PI / 180));

    // Anchor to global 0,0
    const startLat = Math.floor(bounds.getSouth() / latStep) * latStep;
    const startLon = Math.floor(bounds.getWest() / lonStep) * lonStep;

    let addedNew = false;
    // Generate for slightly more than the view
    for (let x = startLon; x < bounds.getEast() + lonStep; x += lonStep) {
        for (let y = startLat; y < bounds.getNorth() + latStep; y += latStep) {
            const key = `${Math.round(x * PRECISION)}|${Math.round(y * PRECISION)}`;
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
    // 1. Add Sources
    Object.keys(MAP_SOURCES).forEach(id => {
        map.addSource(`src-${id}`, MAP_SOURCES[id]);
        map.addLayer({
            id: `layer-${id}`,
            type: 'raster',
            source: `src-${id}`,
            layout: { visibility: id === 'vector' ? 'visible' : 'none' }
        });
    });

    // 2. Add Grid Layer
    map.addSource('grid-source', { type: 'geojson', data: gridData });
    map.addLayer({
        id: 'grid-fill',
        type: 'fill',
        source: 'grid-source',
        paint: {
            'fill-color': ['get', 'color'],
            'fill-outline-color': 'rgba(255, 255, 255, 0.3)',
            'fill-opacity': 0.5
        }
    });

    // 3. Initial Run
    generateGrid();
});

// Move events
map.on('moveend', generateGrid);

// Click interaction
map.on('click', 'grid-fill', (e) => {
    const feature = e.features[0];
    const coords = feature.geometry.coordinates[0][0];
    const lon = coords[0];
    const lat = coords[1];

    if (isSubdivideMode) {
        const sizeLon = feature.properties.sizeLon;
        const sizeLat = feature.properties.sizeLat;
        
        // Remove parent
        gridData.features = gridData.features.filter(f => 
            !(Math.abs(f.geometry.coordinates[0][0][0] - lon) < 0.0000001 && 
              Math.abs(f.geometry.coordinates[0][0][1] - lat) < 0.0000001)
        );
        existingSquares.delete(`${Math.round(lon * PRECISION)}|${Math.round(lat * PRECISION)}`);

        // Create children
        const div = 4;
        const cLon = sizeLon / div;
        const cLat = sizeLat / div;
        for (let i = 0; i < div; i++) {
            for (let j = 0; j < div; j++) {
                const nx = lon + (i * cLon);
                const ny = lat + (j * cLat);
                existingSquares.add(`${Math.round(nx * PRECISION)}|${Math.round(ny * PRECISION)}`);
                gridData.features.push(createSquare(nx, ny, cLon, cLat));
            }
        }
    } else {
        // Find and paint
        const feat = gridData.features.find(f => 
            Math.abs(f.geometry.coordinates[0][0][0] - lon) < 0.0000001 &&
            Math.abs(f.geometry.coordinates[0][0][1] - lat) < 0.0000001
        );
        if (feat) {
            feat.properties.landUse = activeLandUse;
            feat.properties.color = LAND_USE_COLORS[activeLandUse];
        }
    }
    map.getSource('grid-source').setData(gridData);
});

// UI Listeners
document.getElementById('btn-subdivide').onclick = (e) => {
    isSubdivideMode = !isSubdivideMode;
    e.target.innerText = isSubdivideMode ? "MODE: SUBDIVIDING" : "MODE: PAINTING";
    e.target.classList.toggle('subdivide-active');
};

document.querySelectorAll('.legend-item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        activeLandUse = item.dataset.use;
    };
});

document.getElementById('opacity-slider').oninput = (e) => {
    const val = parseFloat(e.target.value) / 100;
    map.setPaintProperty('grid-fill', 'fill-opacity', val);
    document.getElementById('opacity-val').innerText = e.target.value;
};

const updateBaseMap = () => {
    const isBaseOn = document.getElementById('toggle-basemap').checked;
    const mode = document.getElementById('layer-selector').value;
    map.setLayoutProperty('layer-vector', 'visibility', (isBaseOn && mode === 'vector') ? 'visible' : 'none');
    map.setLayoutProperty('layer-satellite', 'visibility', (isBaseOn && mode === 'satellite') ? 'visible' : 'none');
};
document.getElementById('toggle-basemap').onchange = updateBaseMap;
document.getElementById('layer-selector').onchange = updateBaseMap;
