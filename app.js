const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e0e0e0' }}]
    },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom,
    maxZoom: INITIAL_STATE.maxZoom // Critical: enables zooming to level 21
});

map.on('load', () => {
    // Add Sources
    map.addSource('src-vector', MAP_SOURCES.vector);
    map.addSource('src-sat-now', MAP_SOURCES.satellite_current);
    map.addSource('src-sat-2014', MAP_SOURCES.satellite_2014);

    // Add Layers in specific stack order
    map.addLayer({ id: 'layer-vector', type: 'raster', source: 'src-vector', layout: { visibility: 'visible' }});
    map.addLayer({ id: 'layer-sat-now', type: 'raster', source: 'src-sat-now', layout: { visibility: 'none' }});
    map.addLayer({ id: 'layer-sat-2014', type: 'raster', source: 'src-sat-2014', layout: { visibility: 'none' }});

    // Toggle between Vector and Satellite mode
    document.getElementById('layer-selector').addEventListener('change', (e) => {
        const isSat = e.target.value === 'satellite';
        const timeVal = document.getElementById('time-selector').value;
        
        if (isSat) {
            map.setLayoutProperty('layer-vector', 'visibility', 'none');
            // Show only the selected time period
            map.setLayoutProperty('layer-sat-now', 'visibility', timeVal === 'satellite_current' ? 'visible' : 'none');
            map.setLayoutProperty('layer-sat-2014', 'visibility', timeVal === 'satellite_2014' ? 'visible' : 'none');
        } else {
            map.setLayoutProperty('layer-vector', 'visibility', 'visible');
            map.setLayoutProperty('layer-sat-now', 'visibility', 'none');
            map.setLayoutProperty('layer-sat-2014', 'visibility', 'none');
        }
    });

    // Handle Time Period Change
    document.getElementById('time-selector').addEventListener('change', (e) => {
        if (document.getElementById('layer-selector').value !== 'satellite') return;
        
        const val = e.target.value;
        map.setLayoutProperty('layer-sat-now', 'visibility', val === 'satellite_current' ? 'visible' : 'none');
        map.setLayoutProperty('layer-sat-2014', 'visibility', val === 'satellite_2014' ? 'visible' : 'none');
    });

    map.on('zoom', () => {
        document.getElementById('zoom-val').innerText = map.getZoom().toFixed(1);
    });
});
