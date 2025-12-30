let gridData = { type: 'FeatureCollection', features: [] };
let existingSquares = new Set();
let activeLandUse = 'cars';
let isSubdivideMode = false;
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
    const lonStep = resMeters / (111320 * Math.cos(0)); 

    const startLat = Math.floor(bounds.getSouth() / latStep) * latStep;
    const startLon = Math.floor(bounds.getWest() / lonStep) * lonStep;
    const endLat = Math.ceil(bounds.getNorth() / latStep) * latStep + (latStep * 2);
    const endLon = Math.ceil(bounds.getEast() / lonStep) * lonStep + (lonStep * 2);

    let addedNew = false;
    for (let x = startLon; x <= endLon; x += lonStep) {
        for (let y = startLat; y <= endLat; y += latStep) {
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
            'fill-outline-color': 'rgba(255, 255, 255, 0.4)',
            // Opacity is now consistent across all squares
            'fill-opacity': 0.6 
        }
    });

    generateGrid();
});

map.on('moveend', generateGrid);

map.on('click', 'grid-fill', (e) => {
    const feature = e.features[0];
    const coords = feature.geometry.coordinates[0][0];
    const lon = coords[0];
    const lat = coords[1];
    
    // Use Math.abs subtraction for robust finding in the array
    const findIndex = () => gridData.features.findIndex(f => 
        Math.abs(f.geometry.coordinates[0][0][0] - lon) < 0.00000001 && 
        Math.abs(f.geometry.coordinates[0][0][1] - lat) < 0.00000001
    );

    const targetIdx = findIndex();
    if (targetIdx === -1) return;

    if (isSubdivideMode) {
        const parentProps = gridData.features[targetIdx].properties;
        const sizeLon = parentProps.sizeLon;
        const sizeLat = parentProps.sizeLat;

        // 1. Remove the parent from data and the ID set
        gridData.features.splice(targetIdx, 1);
        existingSquares.delete(`${Math.round(lon * PRECISION)}|${Math.round(lat * PRECISION)}`);

        // 2. Add 16 children with inherited color/use
        const
