// Initialize map with a blank style to avoid external dependency issues
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
    zoom: INITIAL_STATE.zoom
});

map.on('load', () => {
    console.log("Map engine loaded. Initializing layers...");

    // 1. Add both sources to the map
    map.addSource('src-vector', MAP_SOURCES.vector);
    map.addSource('src-satellite', MAP_SOURCES.satellite);

    // 2. Add the Layers
    // We add them in order. The one added LAST is on TOP.
    map.addLayer({
        id: 'layer-vector',
        type: 'raster',
        source: 'src-vector',
        layout: { visibility: 'visible' } // Start with Vector
    });

    map.addLayer({
        id: 'layer-satellite',
        type: 'raster',
        source: 'src-satellite',
        layout: { visibility: 'none' } // Hidden initially
    });

    // 3. Setup the Switcher Logic
    const selector = document.getElementById('layer-selector');
    selector.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'satellite') {
            map.setLayoutProperty('layer-satellite', 'visibility', 'visible');
            map.setLayoutProperty('layer-vector', 'visibility', 'none');
        } else {
            map.setLayoutProperty('layer-satellite', 'visibility', 'none');
            map.setLayoutProperty('layer-vector', 'visibility', 'visible');
        }
    });

    // 4. Update Zoom UI
    map.on('zoom', () => {
        document.getElementById('zoom-val').innerText = map.getZoom().toFixed(1);
    });
});
