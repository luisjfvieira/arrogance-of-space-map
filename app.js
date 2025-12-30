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
    zoom: INITIAL_STATE.zoom,
    maxZoom: INITIAL_STATE.maxZoom
});

map.on('load', () => {
    // 1. Initialize Base Sources & Layers
    Object.keys(MAP_SOURCES).forEach(id => {
        map.addSource(`src-${id}`, MAP_SOURCES[id]);
        map.addLayer({
            id: `layer-${id}`,
            type: 'raster',
            source: `src-${id}`,
            layout: { visibility: id === 'vector' ? 'visible' : 'none' }
        });
    });

    // 2. Initialize Grid Source & Layer (Must be added last to stay on top)
    map.addSource('grid-source', { type: 'geojson', data: gridData });
    map.addLayer({
        id: 'grid-fill',
        type: 'fill',
        source: 'grid-source',
        paint: {
            'fill-color': ['get', 'color'],
            'fill-outline-color': '#ffffff',
            'fill-opacity': 0.5 // Initial opacity
        }
    });

    // 3. UI Selectors
    const layerSelector = document.getElementById('layer-selector');
    const satProvider = document.getElementById('sat-provider-selector');
    const satGroup = document.getElementById('sat-options-group');
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityVal = document.getElementById('opacity-val');

    // Sync Base Maps
    function syncLayers() {
        const isSat = layerSelector.value === 'satellite';
        satGroup.style.display = isSat ? 'block' : 'none';
        
        map.setLayoutProperty('layer-vector', 'visibility', !isSat ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite_google', 'visibility', (isSat && satProvider.value === 'satellite_google') ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite_esri', 'visibility', (isSat && satProvider.value === 'satellite_esri') ? 'visible' : 'none');
    }

    layerSelector.addEventListener('change', syncLayers);
    satProvider.addEventListener('change', syncLayers);

    // Opacity Control
    opacitySlider.addEventListener('input', (e) => {
        const opacity = e.target.value / 100;
        opacityVal.innerText = e.target.value;
        map.setPaintProperty('grid-fill', 'fill-opacity', opacity);
    });

    // 4. Snap-to-Grid Generation
    map.on('boxzoomend', (e) => {
        const resMeters = parseFloat(document.getElementById('res-slider').value);
        const bounds = e.boxZoomBounds;
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        const latStep = resMeters / 111320;
        const lonStep = resMeters / (111320 * Math.cos(sw.lat * Math.PI / 180));

        // Snap coordinates to absolute global grid
        const startLat = Math.floor(sw.lat / latStep) * latStep;
        const startLon = Math.floor(sw.lng / lonStep) * lonStep;

        for (let x = startLon; x < ne.lng; x += lonStep) {
            for (let y = startLat; y < ne.lat; y += latStep) {
                gridData.features.push({
                    type: 'Feature',
                    properties: { 
                        landUse: 'unassigned', 
                        color: LAND_USE_COLORS['unassigned'],
                        res: resMeters 
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[[x, y], [x + lonStep, y], [x + lonStep, y + latStep], [x, y + latStep], [x, y]]]
                    }
                });
            }
        }
        map.getSource('grid-source').setData(gridData);
    });

    // Interaction: Painting cells
    map.on('click', 'grid-fill', (e) => {
        const coords = e.features[0].geometry.coordinates[0][0];
        // Find feature by coordinate match
        const feature = gridData.features.find(f => 
            f.geometry.coordinates[0][0][0] === coords[0] && 
            f.geometry.coordinates[0][0][1] === coords[1]
        );
        
        if (feature) {
            feature.properties.landUse = activeLandUse;
            feature.properties.color = LAND_USE_COLORS[activeLandUse];
            map.getSource('grid-source').setData(gridData);
        }
    });

    // Legend Selection
    document.querySelectorAll('.legend-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            activeLandUse = item.getAttribute('data-use');
        };
    });

    // Export & Clear
    document.getElementById('btn-export').onclick = () => {
        const blob = new Blob([JSON.stringify(gridData)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "arrogance_of_space_data.geojson";
        a.click();
    };

    document.getElementById('btn-clear').onclick = () => {
        gridData.features = [];
        map.getSource('grid-source').setData(gridData);
    };

    map.on('zoom', () => { document.getElementById('zoom-val').innerText = map.getZoom().toFixed(1); });
});
