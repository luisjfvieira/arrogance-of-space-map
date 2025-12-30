let gridData = { type: 'FeatureCollection', features: [] };
let existingSquares = new Set();
let activeLandUse = 'cars';
let isSubdivideMode = false;

// We multiply by this to turn 0.0001 into 1000000. 
// This makes coordinate comparison 100% accurate.
const PRECISION = 10000000; 

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

// Helper to create a unique ID for a coordinate
const getCoordKey = (lon, lat) => `${Math.round(lon * PRECISION)}|${Math.round(lat * PRECISION)}`;

function createSquare(lon, lat, lonStep, latStep, props = {}) {
    return {
        type: 'Feature',
        id: getCoordKey(lon, lat), // Unique ID for the feature
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

    // SNAP to global grid
    const startLat = Math.floor(bounds.getSouth() / latStep) * latStep;
    const startLon = Math.floor(bounds.getWest() / lonStep) * lonStep;
    
    const endLat = bounds.getNorth() + latStep;
    const endLon = bounds.getEast() + lonStep;

    let addedNew = false;

    for (let x = startLon; x <= endLon; x += lonStep) {
        for (let y = startLat; y <= endLat; y += latStep) {
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
    Object.keys(MAP_SOURCES).forEach(id => {
        map.addSource(`src-${id}`, MAP_SOURCES[id]);
        map.addLayer({
            id: `layer-${id}`,
            type: 'raster',
            source: `src-${id}`,
            layout: { visibility: id === 'vector' ? 'visible' : 'none' }
        });
    });

    map.addSource('grid-source', { type: 'geojson', data: gridData });
    map.addLayer({
        id: 'grid-fill',
        type: 'fill',
        source: 'grid-source',
        paint: {
            'fill-color': ['get', 'color'],
            'fill-outline-color': 'rgba(255, 255, 255, 0.3)',
            'fill-opacity': 0.6 
        }
    });

    generateGrid();
});

map.on('moveend', generateGrid);

// THE FIXED INTERACTION HANDLER
map.on('click', 'grid-fill', (e) => {
    // Get coordinates from the clicked geometry exactly
    const coords = e.features[0].geometry.coordinates[0][0];
    const lon = coords[0];
    const lat = coords[1];
    const clickedKey = getCoordKey(lon, lat);

    // Find the feature by its unique ID
    const targetIdx = gridData.features.findIndex(f => getCoordKey(f.geometry.coordinates[0][0][0], f.geometry.coordinates[0][0][1]) === clickedKey);

    if (targetIdx === -1) return;

    if (isSubdivideMode) {
        const parent = gridData.features[targetIdx];
        const pProps = parent.properties;
        
        // Remove parent
        gridData.features.splice(targetIdx, 1);
        existingSquares.delete(clickedKey);

        const cLon = pProps.sizeLon / 4;
        const cLat = pProps.sizeLat / 4;
        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const nx = lon + (i * cLon);
                const ny = lat + (j * cLat);
                existingSquares.add(getCoordKey(nx, ny));
                gridData.features.push(createSquare(nx, ny, cLon, cLat, {
                    landUse: pProps.landUse,
                    color: pProps.color
                }));
            }
        }
    } else {
        // Update painting
        gridData.features[targetIdx].properties.landUse = activeLandUse;
        gridData.features[targetIdx].properties.color = LAND_USE_COLORS[activeLandUse];
    }
    
    map.getSource('grid-source').setData(gridData);
});

// UI Event Listeners (Keep as they were)
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
    map.setPaintProperty('grid-fill', 'fill-opacity', parseFloat(e.target.value) / 100);
    document.getElementById('opacity-val').innerText = e.target.value;
};

const updateBase = () => {
    const isBaseOn = document.getElementById('toggle-basemap').checked;
    const mode = document.getElementById('layer-selector').value;
    map.setLayoutProperty('layer-vector', 'visibility', (isBaseOn && mode === 'vector') ? 'visible' : 'none');
    map.setLayoutProperty('layer-satellite', 'visibility', (isBaseOn && mode === 'satellite') ? 'visible' : 'none');
};
document.getElementById('toggle-basemap').onchange = updateBase;
document.getElementById('layer-selector').onchange = updateBase;
