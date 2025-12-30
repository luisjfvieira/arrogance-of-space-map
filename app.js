let gridData = { type: 'FeatureCollection', features: [] };
let activeLandUse = 'cars'; // Default brush

const map = new maplibregl.Map({
    container: 'map',
    style: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#333' }}] },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom,
    maxZoom: INITIAL_STATE.maxZoom
});

map.on('load', () => {
    // 1. Setup Base Map Layers
    Object.keys(MAP_SOURCES).forEach(key => {
        map.addSource(`src-${key}`, MAP_SOURCES[key]);
        map.addLayer({ id: `layer-${key}`, type: 'raster', source: `src-${key}`, layout: { visibility: key === 'vector' ? 'visible' : 'none' }});
    });

    // 2. Setup Grid Layer
    map.addSource('grid-source', { type: 'geojson', data: gridData });
    map.addLayer({
        id: 'grid-fill', type: 'fill', source: 'grid-source',
        paint: { 'fill-color': ['get', 'color'], 'fill-outline-color': '#fff', 'fill-opacity': 0.5 }
    });

    // 3. UI Functionality
    const resSlider = document.getElementById('res-slider');
    const resVal = document.getElementById('res-val');
    const btnDraw = document.getElementById('btn-draw');

    resSlider.oninput = () => resVal.innerText = parseFloat(resSlider.value).toFixed(1);

    // Grid Generation Logic (Snap-to-Grid)
    map.on('boxzoomend', (e) => {
        const resMeters = parseFloat(resSlider.value);
        const bounds = e.boxZoomBounds;
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        // Standardizing deg-per-meter
        const latStep = resMeters / 111320; 
        const lonStep = resMeters / (111320 * Math.cos(sw.lat * Math.PI / 180));

        // THE SNAP: Anchors grid to absolute 0,0
        const startLat = Math.floor(sw.lat / latStep) * latStep;
        const startLon = Math.floor(sw.lng / lonStep) * lonStep;

        for (let x = startLon; x < ne.lng; x += lonStep) {
            for (let y = startLat; y < ne.lat; y += latStep) {
                gridData.features.push({
                    type: 'Feature',
                    properties: { landUse: 'unassigned', color: LAND_USE_COLORS['unassigned'], res: resMeters },
                    geometry: { type: 'Polygon', coordinates: [[[x, y], [x + lonStep, y], [x + lonStep, y + latStep], [x, y + latStep], [x, y]]] }
                });
            }
        }
        map.getSource('grid-source').setData(gridData);
    });

    // Interaction: Click to paint
    map.on('click', 'grid-fill', (e) => {
        const feature = e.features[0];
        const index = gridData.features.findIndex(f => f.geometry.coordinates[0][0][0] === feature.geometry.coordinates[0][0][0] && f.geometry.coordinates[0][0][1] === feature.geometry.coordinates[0][0][1]);
        
        if (index !== -1) {
            gridData.features[index].properties.landUse = activeLandUse;
            gridData.features[index].properties.color = LAND_USE_COLORS[activeLandUse];
            map.getSource('grid-source').setData(gridData);
        }
    });

    // Export Function
    document.getElementById('btn-export').onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gridData));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "arrogance_analysis.geojson");
        downloadAnchorNode.click();
    };

    // UI Toggles
    document.querySelectorAll('.legend-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.legend-item').forEach(i => i.style.border = 'none');
            item.style.border = '1px solid #333';
            activeLandUse = item.getAttribute('data-use');
        };
    });

    document.getElementById('btn-clear').onclick = () => { gridData.features = []; map.getSource('grid-source').setData(gridData); };
});
