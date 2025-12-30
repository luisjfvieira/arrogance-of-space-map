let gridData = { type: 'FeatureCollection', features: [] };
let activeLandUse = 'cars';

const map = new maplibregl.Map({
    container: 'map',
    style: { version: 8, sources: {}, layers: [] },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom
});

function generateGrid(bounds, resMeters) {
    const sw = bounds.getSouthWest ? bounds.getSouthWest() : { lng: bounds[0], lat: bounds[1] };
    const ne = bounds.getNorthEast ? bounds.getNorthEast() : { lng: bounds[2], lat: bounds[3] };

    const latStep = resMeters / 111320;
    const lonStep = resMeters / (111320 * Math.cos(sw.lat * Math.PI / 180));

    const startLat = Math.floor(sw.lat / latStep) * latStep;
    const startLon = Math.floor(sw.lng / lonStep) * lonStep;

    for (let x = startLon; x < ne.lng; x += lonStep) {
        for (let y = startLat; y < ne.lat; y += latStep) {
            gridData.features.push({
                type: 'Feature',
                properties: { landUse: 'unassigned', color: LAND_USE_COLORS['unassigned'] },
                geometry: { type: 'Polygon', coordinates: [[[x,y],[x+lonStep,y],[x+lonStep,y+latStep],[x,y+latStep],[x,y]]] }
            });
        }
    }
    if (map.getSource('grid-source')) map.getSource('grid-source').setData(gridData);
}

map.on('load', () => {
    // 1. Add Sources
    Object.keys(MAP_SOURCES).forEach(id => map.addSource(`src-${id}`, MAP_SOURCES[id]));

    // 2. Base Layers
    map.addLayer({ id: 'layer-vector', type: 'raster', source: 'src-vector', layout: { visibility: 'visible' }});
    map.addLayer({ id: 'layer-satellite_google', type: 'raster', source: 'src-satellite_google', layout: { visibility: 'none' }});
    map.addLayer({ id: 'layer-satellite_esri', type: 'raster', source: 'src-satellite_esri', layout: { visibility: 'none' }});

    // 3. Grid Source & Layer
    map.addSource('grid-source', { type: 'geojson', data: gridData });
    map.addLayer({
        id: 'grid-fill', type: 'fill', source: 'grid-source',
        paint: { 'fill-color': ['get', 'color'], 'fill-outline-color': '#fff', 'fill-opacity': 0.5 }
    });

    // Generate initial 200m grid
    generateGrid([-9.15, 38.71, -9.12, 38.74], 200);

    // 4. Toggle Logic
    const baseToggle = document.getElementById('toggle-basemap');
    const gridToggle = document.getElementById('toggle-grid');
    const layerSel = document.getElementById('layer-selector');
    const satProvider = document.getElementById('sat-provider-selector');
    const opacitySlider = document.getElementById('opacity-slider');

    function updateVisibility() {
        const isBaseOn = baseToggle.checked;
        const isGridOn = gridToggle.checked;
        const mode = layerSel.value;

        // Base Layer Visibility
        map.setLayoutProperty('layer-vector', 'visibility', (isBaseOn && mode === 'vector') ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite_google', 'visibility', (isBaseOn && mode === 'satellite' && satProvider.value === 'satellite_google') ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite_esri', 'visibility', (isBaseOn && mode === 'satellite' && satProvider.value === 'satellite_esri') ? 'visible' : 'none');

        // Grid Visibility
        map.setLayoutProperty('grid-fill', 'visibility', isGridOn ? 'visible' : 'none');
    }

    [baseToggle, gridToggle, layerSel, satProvider].forEach(el => el.addEventListener('change', updateVisibility));

    opacitySlider.oninput = (e) => {
        map.setPaintProperty('grid-fill', 'fill-opacity', e.target.value / 100);
        document.getElementById('opacity-val').innerText = e.target.value;
    };

    // Paint & Grid Generation
    map.on('boxzoomend', (e) => generateGrid(e.boxZoomBounds, parseFloat(document.getElementById('res-slider').value)));
    
    map.on('click', 'grid-fill', (e) => {
        const coords = e.features[0].geometry.coordinates[0][0];
        const feat = gridData.features.find(f => Math.abs(f.geometry.coordinates[0][0][0] - coords[0]) < 0.00001);
        if (feat) {
            feat.properties.landUse = activeLandUse;
            feat.properties.color = LAND_USE_COLORS[activeLandUse];
            map.getSource('grid-source').setData(gridData);
        }
    });

    document.querySelectorAll('.legend-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            activeLandUse = item.dataset.use;
        };
    });

    document.getElementById('btn-clear').onclick = () => { gridData.features = []; map.getSource('grid-source').setData(gridData); };
});
