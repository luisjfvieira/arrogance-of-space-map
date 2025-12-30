let gridData = { type: 'FeatureCollection', features: [] };
let activeLandUse = 'cars';
let isSubdivideMode = false;

const map = new maplibregl.Map({
    container: 'map',
    style: { version: 8, sources: {}, layers: [] },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom
});

// Create a GeoJSON Polygon for a grid cell
function createSquare(lon, lat, lonStep, latStep, props = {}) {
    return {
        type: 'Feature',
        properties: { 
            landUse: 'unassigned', 
            color: LAND_USE_COLORS['unassigned'],
            sizeLon: lonStep,
            sizeLat: latStep,
            ...props 
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[[lon, lat], [lon + lonStep, lat], [lon + lonStep, lat + latStep], [lon, lat + latStep], [lon, lat]]]
        }
    };
}

// Generate the initial grid for the current view
function generateGlobalGrid() {
    if (map.getZoom() < 12) return; // Don't generate if zoomed out too far
    
    const bounds = map.getBounds();
    const resMeters = parseFloat(document.getElementById('res-slider').value);
    
    const latStep = resMeters / 111320;
    const lonStep = resMeters / (111320 * Math.cos(bounds.getCenter().lat * Math.PI / 180));

    // Snap to global absolute coordinates
    const startLat = Math.floor(bounds.getSouth() / latStep) * latStep;
    const startLon = Math.floor(bounds.getWest() / lonStep) * lonStep;

    const newFeatures = [];
    for (let x = startLon; x < bounds.getEast(); x += lonStep) {
        for (let y = startLat; y < bounds.getNorth(); y += latStep) {
            // Check if this specific coordinate already exists in memory
            const exists = gridData.features.some(f => 
                Math.abs(f.geometry.coordinates[0][0][0] - x) < 0.0000001 &&
                Math.abs(f.geometry.coordinates[0][0][1] - y) < 0.0000001
            );
            if (!exists) {
                newFeatures.push(createSquare(x, y, lonStep, latStep));
            }
        }
    }
    
    if (newFeatures.length > 0) {
        gridData.features = [...gridData.features, ...newFeatures];
        map.getSource('grid-source').setData(gridData);
    }
}

map.on('load', () => {
    // 1. Setup Base Map Layers
    Object.keys(MAP_SOURCES).forEach(id => {
        map.addSource(`src-${id}`, MAP_SOURCES[id]);
        map.addLayer({
            id: `layer-${id}`,
            type: 'raster',
            source: `src-${id}`,
            layout: { visibility: id === 'vector' ? 'visible' : 'none' }
        });
    });

    // 2. Setup Grid Overlay
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

    generateGlobalGrid();
    map.on('moveend', generateGlobalGrid);

    // 3. Click Logic (Paint or Subdivide)
    map.on('click', 'grid-fill', (e) => {
        const feature = e.features[0];
        const coords = feature.geometry.coordinates[0][0]; // SW corner anchor
        const sizeLon = feature.properties.sizeLon;
        const sizeLat = feature.properties.sizeLat;

        if (isSubdivideMode) {
            // Remove the parent cell
            gridData.features = gridData.features.filter(f => 
                !(Math.abs(f.geometry.coordinates[0][0][0] - coords[0]) < 0.0000001 && 
                  Math.abs(f.geometry.coordinates[0][0][1] - coords[1]) < 0.0000001)
            );

            // Subdivide into a 4x4 child grid (16 squares)
            const div = 4;
            const childLonStep = sizeLon / div;
            const childLatStep = sizeLat / div;

            for (let i = 0; i < div; i++) {
                for (let j = 0; j < div; j++) {
                    gridData.features.push(createSquare(
                        coords[0] + (i * childLonStep), 
                        coords[1] + (j * childLatStep), 
                        childLonStep, childLatStep
                    ));
                }
            }
        } else {
            // Paint Mode
            const feat = gridData.features.find(f => 
                Math.abs(f.geometry.coordinates[0][0][0] - coords[0]) < 0.0000001 &&
                Math.abs(f.geometry.coordinates[0][0][1] - coords[1]) < 0.0000001
            );
            if (feat) {
                feat.properties.landUse = activeLandUse;
                feat.properties.color = LAND_USE_COLORS[activeLandUse];
            }
        }
        map.getSource('grid-source').setData(gridData);
    });

    // 4. UI Event Listeners
    document.getElementById('btn-subdivide').onclick = (e) => {
        isSubdivideMode = !isSubdivideMode;
        e.target.innerText = isSubdivideMode ? "MODE: SUBDIVIDING" : "MODE: PAINTING";
        e.target.classList.toggle('subdivide-active');
    };

    document.querySelectorAll('.legend-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            activeLandUse = item.dataset.use;
        };
    });

    const layerSel = document.getElementById('layer-selector');
    const baseToggle = document.getElementById('toggle-basemap');
    
    function updateBaseMap() {
        const isBaseOn = baseToggle.checked;
        const mode = layerSel.value;
        map.setLayoutProperty('layer-vector', 'visibility', (isBaseOn && mode === 'vector') ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite', 'visibility', (isBaseOn && mode === 'satellite') ? 'visible' : 'none');
    }
    
    layerSel.addEventListener('change', updateBaseMap);
    baseToggle.addEventListener('change', updateBaseMap);

    document.getElementById('opacity-slider').oninput = (e) => {
        map.setPaintProperty('grid-fill', 'fill-opacity', e.target.value / 100);
        document.getElementById('opacity-val').innerText = e.target.value;
    };

    document.getElementById('btn-export').onclick = () => {
        const blob = new Blob([JSON.stringify(gridData)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "global_arrogance_data.geojson";
        a.click();
    };

    document.getElementById('btn-clear').onclick = () => {
        if(confirm("Clear all your mapped data?")) {
            gridData.features = [];
            generateGlobalGrid();
        }
    };
});
