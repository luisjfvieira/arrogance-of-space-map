const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [
            {
                id: 'background',
                type: 'background',
                paint: { 'background-color': '#e0e0e0' } // Light grey background
            }
        ]
    },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom,
    maxZoom: INITIAL_STATE.maxZoom
});

map.on('load', () => {
    console.log("Map Engine Ready");

    // Add Sources with error checking
    try {
        map.addSource('src-vector', MAP_SOURCES.vector);
        map.addSource('src-sat-esri', MAP_SOURCES.satellite_esri);
        map.addSource('src-sat-google', MAP_SOURCES.satellite_google);
        map.addSource('src-sat-2014', MAP_SOURCES.satellite_2014);

        // Add Layers
        map.addLayer({ id: 'layer-vector', type: 'raster', source: 'src-vector', layout: { visibility: 'visible' }});
        map.addLayer({ id: 'layer-sat-esri', type: 'raster', source: 'src-sat-esri', layout: { visibility: 'none' }});
        map.addLayer({ id: 'layer-sat-google', type: 'raster', source: 'src-sat-google', layout: { visibility: 'none' }});
        map.addLayer({ id: 'layer-sat-2014', type: 'raster', source: 'src-sat-2014', layout: { visibility: 'none' }});
    } catch (e) {
        console.error("Error adding map layers:", e);
    }

    const layerSelector = document.getElementById('layer-selector');
    const satProviderSelector = document.getElementById('sat-provider-selector');
    const satGroup = document.getElementById('sat-options-group');

    function sync() {
        const isSat = layerSelector.value === 'satellite';
        const activeSat = satProviderSelector.value;

        satGroup.style.display = isSat ? 'block' : 'none';

        // Update Visibility
        map.setLayoutProperty('layer-vector', 'visibility', isSat ? 'none' : 'visible');
        map.setLayoutProperty('layer-sat-esri', 'visibility', (isSat && activeSat === 'layer-sat-esri') ? 'visible' : 'none');
        map.setLayoutProperty('layer-sat-google', 'visibility', (isSat && activeSat === 'layer-sat-google') ? 'visible' : 'none');
        map.setLayoutProperty('layer-sat-2014', 'visibility', (isSat && activeSat === 'layer-sat-2014') ? 'visible' : 'none');
    }

    layerSelector.addEventListener('change', sync);
    satProviderSelector.addEventListener('change', sync);

    map.on('zoom', () => {
        document.getElementById('zoom-val').innerText = map.getZoom().toFixed(1);
    });
});
