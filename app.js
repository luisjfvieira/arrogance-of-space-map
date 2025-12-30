// Initialize map with a base style and high-zoom capability
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [
            {
                id: 'background',
                type: 'background',
                paint: { 'background-color': '#f0f0f0' }
            }
        ]
    },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom,
    maxZoom: 22 // Allows the camera to go deep beyond the standard level 18
});

map.on('load', () => {
    console.log("Map engine loaded. Initializing sources and layers...");

    // 1. Add All Sources from map-config.js
    map.addSource('src-vector', MAP_SOURCES.vector);
    map.addSource('src-sat-esri', MAP_SOURCES.satellite_esri);
    map.addSource('src-sat-google', MAP_SOURCES.satellite_google);
    map.addSource('src-sat-2014', MAP_SOURCES.satellite_2014);

    // 2. Add All Layers
    // Order matters: lower layers first.
    map.addLayer({
        id: 'layer-vector',
        type: 'raster',
        source: 'src-vector',
        layout: { visibility: 'visible' }
    });

    map.addLayer({
        id: 'layer-sat-esri',
        type: 'raster',
        source: 'src-sat-esri',
        layout: { visibility: 'none' }
    });

    map.addLayer({
        id: 'layer-sat-google',
        type: 'raster',
        source: 'src-sat-google',
        layout: { visibility: 'none' }
    });

    map.addLayer({
        id: 'layer-sat-2014',
        type: 'raster',
        source: 'src-sat-2014',
        layout: { visibility: 'none' }
    });

    // 3. UI Element References
    const layerSelector = document.getElementById('layer-selector');
    const satProviderSelector = document.getElementById('sat-provider-selector');
    const satGroup = document.getElementById('sat-options-group');
    const zoomVal = document.getElementById('zoom-val');

    /**
     * Core Layer Management Function
     * Handles visibility for vector vs satellite and specific satellite providers
     */
    function syncLayers() {
        const mode = layerSelector.value; // 'vector' or 'satellite'
        const activeSatLayer = satProviderSelector.value; // the ID of the chosen sat layer

        if (mode === 'vector') {
            satGroup.style.display = 'none';
            map.setLayoutProperty('layer-vector', 'visibility', 'visible');
            map.setLayoutProperty('layer-sat-esri', 'visibility', 'none');
            map.setLayoutProperty('layer-sat-google', 'visibility', 'none');
            map.setLayoutProperty('layer-sat-2014', 'visibility', 'none');
        } else {
            satGroup.style.display = 'block';
            map.setLayoutProperty('layer-vector', 'visibility', 'none');
            
            // Toggle satellite providers based on the secondary dropdown
            map.setLayoutProperty('layer-sat-esri', 'visibility', activeSatLayer === 'layer-sat-esri' ? 'visible' : 'none');
