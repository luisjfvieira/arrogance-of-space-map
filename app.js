let gridData = { type: 'FeatureCollection', features: [] };
let activeLandUse = 'cars';
let isSubdivideMode = false;

const map = new maplibregl.Map({
    container: 'map',
    style: { version: 8, sources: {}, layers: [] },
    center: [-9.139, 38.722],
    zoom: 14
});

// Helper to create a single square feature
function createSquareFeature(lon, lat, lonStep, latStep, props = {}) {
    return {
        type: 'Feature',
        properties: { 
            landUse: 'unassigned', 
            color: LAND_USE_COLORS['unassigned'],
            ...props 
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[[lon, lat], [lon + lonStep, lat], [lon + lonStep, lat + latStep], [lon, lat + latStep], [lon, lat]]]
        }
    };
}

// Generates squares for the current viewport
function generateGlobalGrid() {
    if (isSubdivideMode || map.getZoom() < 12) return;

    const bounds = map.getBounds();
    const resMeters = parseFloat(document.getElementById('res-slider').value);
    
    const latStep = resMeters / 111320;
    const lonStep = resMeters / (111320 * Math.cos(bounds.getCenter().lat * Math.PI / 180));

    const startLat = Math.floor(bounds.getSouth() / latStep) * latStep;
    const startLon = Math.floor(bounds.getWest() / lonStep) * lonStep;

    const newFeatures = [];
    for (let x = startLon; x < bounds.getEast(); x += lonStep) {
        for (let y = startLat; y < bounds.getNorth(); y += latStep) {
            // Only add if it doesn't already exist (to preserve painted squares)
            const exists = gridData.features.some(f => 
                Math.abs(f.geometry.coordinates[0][0][0] - x) < 0.000001 &&
                Math.abs(f.geometry.coordinates[0][0][1] - y) < 0.000001
            );
            if (!exists) {
                newFeatures.push(createSquareFeature(x, y, lonStep, latStep, { level: 'parent' }));
            }
        }
    }
    gridData.features = [...gridData.features, ...newFeatures];
    map.getSource('grid-source').setData(gridData);
}

map.on('load', () => {
    // Add Sources & Base Layers (OSM/Satellite)
    Object.keys(MAP_SOURCES).forEach(id => {
        map.addSource(`src-${id}`, MAP_SOURCES[id]);
        map.addLayer({ id: `layer-${id}`, type: 'raster', source: `src-${id}`, layout: { visibility: id === 'vector' ? 'visible' : 'none' }});
    });

    map.addSource('grid-source', { type: 'geojson', data: gridData });
    map.addLayer({
        id: 'grid-fill', type: 'fill', source: 'grid-source',
        paint: { 'fill-color': ['get', 'color'], 'fill-outline-color': '#fff', 'fill-opacity': 0.5 }
    });

    generateGlobalGrid();
    map.on('moveend', generateGlobalGrid);

    // SUBDIVIDE LOGIC
    map.on('click', 'grid-fill', (e) => {
        const feature = e.features[0];
        const coords = feature.geometry.coordinates[0][0]; // SW Corner
        
        if (isSubdivideMode) {
            // 1. Remove the parent square
            gridData.features = gridData.features.filter(f => 
                !(f.geometry.coordinates[0][0][0] === coords[0] && f.geometry.coordinates[0][0][1] === coords[1])
            );

            // 2. Calculate child dimensions (e.g., split into 10x10 = 100 smaller squares)
            const parentRes = parseFloat(document.getElementById('res-slider').value);
            const childRes = parentRes / 10;
            const latStep = childRes / 111320;
            const lonStep = childRes / (111320 * Math.cos(coords[1] * Math.PI / 180));

            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                    gridData.features.push(createSquareFeature(
                        coords[0] + (i * lonStep), 
                        coords[1] + (j * latStep), 
                        lonStep, latStep, 
                        { level: 'child' }
                    ));
                }
            }
        } else {
            // PAINT LOGIC
            const feat = gridData.features.find(f => 
                Math.abs(f.geometry.coordinates[0][0][0] - coords[0]) < 0.000001
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
        e.target.innerText = isSubdivideMode ? "Mode: Subdividing" : "Mode: Painting";
        e.target.style.background = isSubdivideMode ? "#e67e22" : "#3498db";
    };
});
