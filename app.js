const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#ffffff' }}]
    },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom,
    maxZoom: 22
});

map.on('load', () => {
    // 1. Add all sources
    map.addSource('src-vector', MAP_SOURCES.vector);
    map.addSource('src-sat-esri', MAP_SOURCES.satellite_esri);
    map.addSource('src-sat-google', MAP_SOURCES.satellite_google);
    map.addSource('src-sat-2014', MAP_SOURCES.satellite_2014);

    // 2. Add all layers
    map.addLayer({ id: 'layer-vector', type: 'raster', source: 'src-vector', layout: { visibility: 'visible' }});
    map.addLayer({ id: 'layer-sat-esri', type: 'raster', source: 'src-sat-esri', layout: { visibility: 'none' }});
    map.addLayer({ id: 'layer-sat-google', type: 'raster', source: 'src-sat-google', layout: { visibility: 'none' }});
    map.addLayer({ id: 'layer-sat-2014', type: 'raster', source: 'src-sat-2014', layout: { visibility: 'none' }});

    const layerSelector = document.getElementById('layer-selector');
    const satProviderSelector = document.getElementById('sat-provider-selector');
    const satGroup = document.getElementById('sat-options-group');

    function syncLayers() {
        const mode = layerSelector.value;
        const activeSatLayer = satProviderSelector.value;

        if (mode === 'vector') {
            satGroup.style.display = 'none';
            map.setLayoutProperty('layer-vector', 'visibility', 'visible');
            map.setLayoutProperty('layer-sat-esri', 'visibility', 'none');
            map.setLayoutProperty('layer-sat-google', 'visibility', 'none');
            map.setLayoutProperty('layer-sat-2014', 'visibility', 'none');
        } else {
            satGroup.style.display = 'block';
            map.setLayoutProperty('layer-vector', 'visibility', 'none');
            
            // Toggle satellite providers
            map.setLayoutProperty('layer-sat-esri', 'visibility', activeSatLayer === 'layer-sat-esri' ? 'visible' : 'none');
            map.setLayoutProperty('layer-sat-google', 'visibility', activeSatLayer === 'layer-sat-google' ? 'visible' : 'none');
            map.setLayoutProperty('layer-sat-2014', 'visibility', activeSatLayer === 'layer-sat-2014' ? 'visible' : 'none');
        }
    }

    layerSelector.addEventListener('change', syncLayers);
    satProviderSelector.addEventListener('change', syncLayers);

    map.on('zoom', () => {
        document.getElementById('zoom-val').innerText = map.getZoom().toFixed(1);
    });
});
