// Initialize the map
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [ ]
    },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom,
    maxZoom: INITIAL_STATE.maxZoom
});

map.on('load', () => {
    // 1. Add Sources
    Object.keys(MAP_SOURCES).forEach(key => {
        map.addSource(`src-${key}`, MAP_SOURCES[key]);
    });

    // 2. Add Layers
    map.addLayer({ id: 'layer-vector', type: 'raster', source: 'src-vector', layout: { visibility: 'visible' }});
    map.addLayer({ id: 'layer-satellite_esri', type: 'raster', source: 'src-satellite_esri', layout: { visibility: 'none' }});
    map.addLayer({ id: 'layer-satellite_google', type: 'raster', source: 'src-satellite_google', layout: { visibility: 'none' }});
    map.addLayer({ id: 'layer-satellite_2014', type: 'raster', source: 'src-satellite_2014', layout: { visibility: 'none' }});

    // 3. Logic for selectors
    const layerSelector = document.getElementById('layer-selector');
    const satProviderSelector = document.getElementById('sat-provider-selector');
    const satGroup = document.getElementById('sat-options-group');

    function updateMap() {
        const isSat = layerSelector.value === 'satellite';
        const activeSat = `layer-${satProviderSelector.value}`;

        satGroup.style.display = isSat ? 'block' : 'none';

        // Set visibility for all layers
        ['layer-vector', 'layer-satellite_esri', 'layer-satellite_google', 'layer-satellite_2014'].forEach(id => {
            let visibility = 'none';
            if (!isSat && id === 'layer-vector') visibility = 'visible';
            if (isSat && id === activeSat) visibility = 'visible';
            
            map.setLayoutProperty(id, 'visibility', visibility);
        });
    }

    layerSelector.addEventListener('change', updateMap);
    satProviderSelector.addEventListener('change', updateMap);

    map.on('zoom', () => {
        document.getElementById('zoom-val').innerText = map.getZoom().toFixed(1);
    });
});
