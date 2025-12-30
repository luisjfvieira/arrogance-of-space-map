let gridData = { type: 'FeatureCollection', features: [] };
let activeLandUse = 'cars';

const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#f0f0f0' }}]
    },
    center: INITIAL_STATE.center,
    zoom: 13,
    maxZoom: INITIAL_STATE.maxZoom
});

// Logic to generate the grid
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
                properties: { 
                    landUse: 'unassigned', 
                    color: LAND_USE_COLORS['unassigned'] 
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[x, y], [x + lonStep, y], [x + lonStep, y + latStep], [x, y + latStep], [x, y]]]
                }
            });
        }
    }
    if (map.getSource('grid-source')) {
        map.getSource('grid-source').setData(gridData);
    }
}

map.on('load', () => {
    // 1. Setup Base Layers
    Object.keys(MAP_SOURCES).forEach(id => {
        map.addSource(`src-${id}`, MAP_SOURCES[id]);
        map.addLayer({
            id: `layer-${id}`,
            type: 'raster',
            source: `src-${id}`,
            layout: { visibility: id === 'vector' ? 'visible' : 'none' }
        });
    });

    // 2. Setup Grid Source and Layer
    map.addSource('grid-source', { type: 'geojson', data: gridData });
    map.addLayer({
        id: 'grid-fill',
        type: 'fill',
        source: 'grid-source',
        paint: {
            'fill-color': ['get', 'color'],
            'fill-outline-color': '#ffffff',
            'fill-opacity': 0.5
        }
    });

    // 3. Create INITIAL 200m GRID around Lisbon
    const center = INITIAL_STATE.center;
    const offset = 0.02; // Roughly 2km area
    generateGrid([center[0]-offset, center[1]-offset, center[0]+offset, center[1]+offset], 200);

    // 4. UI Handlers
    const layerSelector = document.getElementById('layer-selector');
    const satProvider = document.getElementById('sat-provider-selector');
    const satGroup = document.getElementById('sat-options-group');
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityVal = document.getElementById('opacity-val');

    layerSelector.addEventListener('change', () => {
        const isSat = layerSelector.value === 'satellite';
        satGroup.style.display = isSat ? 'block' : 'none';
        map.setLayoutProperty('layer-vector', 'visibility', !isSat ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite_google', 'visibility', (isSat && satProvider.value === 'satellite_google') ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite_esri', 'visibility', (isSat && satProvider.value === 'satellite_esri') ? 'visible' : 'none');
    });

    opacitySlider.addEventListener('input', (e) => {
        const opacity = e.target.value / 100;
        opacityVal.innerText = e.target.value;
        map.setPaintProperty('grid-fill', 'fill-opacity', opacity);
    });

    // Manual Draw (Shift + Drag)
    map.on('boxzoomend', (e) => {
        const resMeters = parseFloat(document.getElementById('res-slider').value);
        generateGrid(e.boxZoomBounds, resMeters);
    });

    // Painting Logic
    map.on('click', 'grid-fill', (e) => {
        const coords = e.features[0].geometry.coordinates[0][0];
        const feature = gridData.features.find(f => 
            Math.abs(f.geometry.coordinates[0][0][0] - coords[0]) < 0.000001 && 
            Math.abs(f.geometry.coordinates[0][0][1] - coords[1]) < 0.000001
        );
        if (feature) {
            feature.properties.landUse = activeLandUse;
            feature.properties.color = LAND_USE_COLORS[activeLandUse];
            map.getSource('grid-source').setData(gridData);
        }
    });

    // Legend Click
    document.querySelectorAll('.legend-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            activeLandUse = item.getAttribute('data-use');
        };
    });

    document.getElementById('btn-clear').onclick = () => {
        gridData.features = [];
        map.getSource('grid-source').setData(gridData);
    };
});
