const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: []
    },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom
});

map.on('load', () => {
    // 1. Add Sources
    map.addSource('base-satellite', MAP_SOURCES.satellite);
    map.addSource('base-vector', MAP_SOURCES.vector);

    // 2. Add Layers
    // We add vector first, then satellite on top
    map.addLayer({
        id: 'layer-vector',
        type: 'raster',
        source: 'base-vector',
        layout: { visibility: 'visible' }
    });

    map.addLayer({
        id: 'layer-satellite',
        type: 'raster',
        source: 'base-satellite',
        layout: { visibility: 'none' }
    });

    // 3. Setup UI Listeners
    setupControls();
    
    // Update zoom display
    map.on('zoom', () => {
        document.getElementById('zoom-val').innerText = map.getZoom().toFixed(1);
    });
});

function setupControls() {
    // Switch between Vector and Satellite
    document.getElementById('layer-selector').addEventListener('change', (e) => {
        const selected = e.target.value;
        if (selected === 'satellite') {
            map.setLayoutProperty('layer-satellite', 'visibility', 'visible');
            map.setLayoutProperty('layer-vector', 'visibility', 'none');
        } else {
            map.setLayoutProperty('layer-satellite', 'visibility', 'none');
            map.setLayoutProperty('layer-vector', 'visibility', 'visible');
        }
    });

    // Toggle the interactive overlay (Grid)
    document.getElementById('grid-toggle').addEventListener('change', (e) => {
        const visibility = e.target.checked ? 'visible' : 'none';
        // Logic for your grid layer will go here once we define it in the next step
        if (map.getLayer('grid-layer')) {
            map.setLayoutProperty('grid-layer', 'visibility', visibility);
        }
    });
}
