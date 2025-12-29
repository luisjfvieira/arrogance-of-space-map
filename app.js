const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [
            {
                id: 'background',
                type: 'background',
                paint: { 'background-color': '#e0e0e0' }
            }
        ]
    },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom,
    maxZoom: INITIAL_STATE.maxZoom
});

map.on('load', () => {
    // 1. Add all sources
    map.addSource('src-vector', MAP_SOURCES.vector);
    map.addSource('src-satellite-now', MAP_SOURCES.satellite_now);
    map.addSource('src-satellite-2014', MAP_SOURCES.satellite_2014);

    // 2. Add all layers (Vector on top by default)
    map.addLayer({ id: 'layer-vector', type: 'raster', source: 'src-vector', layout: { visibility: 'visible' }});
    map.addLayer({ id: 'layer-satellite-now', type: 'raster', source: 'src-satellite-now', layout: { visibility: 'none' }});
    map.addLayer({ id: 'layer-satellite-2014', type: 'raster', source: 'src-satellite-2014', layout: { visibility: 'none' }});

    const layerSelector = document.getElementById('layer-selector');
    const timeSelector = document.getElementById('time-selector');
    const timeGroup = document.getElementById('time-selector-group');

    function syncLayers() {
        const mode = layerSelector.value; // 'vector' or 'satellite'
        const time = timeSelector.value;  // 'src-satellite-now' or 'src-satellite-2014'

        if (mode === 'vector') {
            timeGroup.style.display = 'none';
            map.setLayoutProperty('layer-vector', 'visibility', 'visible');
            map.setLayoutProperty('layer-satellite-now', 'visibility', 'none');
            map.setLayoutProperty('layer-satellite-2014', 'visibility', 'none');
        } else {
            timeGroup.style.display = 'block';
            map.setLayoutProperty('layer-vector', 'visibility', 'none');
            // Toggle between the two satellite time periods
            map.setLayoutProperty('layer-satellite-now', 'visibility', time === 'src-satellite-now' ? 'visible' : 'none');
            map.setLayoutProperty('layer-satellite-2014', 'visibility', time === 'src-satellite-2014' ? 'visible' : 'none');
        }
    }

    layerSelector.addEventListener('change', syncLayers);
    timeSelector.addEventListener('change', syncLayers);

    map.on('zoom', () => {
        document.getElementById('zoom-val').innerText = map.getZoom().toFixed(1);
    });
});
