let gridData = { type: 'FeatureCollection', features: [] };
let activeLandUse = 'cars';
let isSubdivideMode = false;

// 1. Initialize Map with a default background
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [
            { id: 'background', type: 'background', paint: { 'background-color': '#222222' } }
        ]
    },
    center: INITIAL_STATE.center,
    zoom: INITIAL_STATE.zoom
});

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

function generateGrid() {
    // Only generate if we are zoomed in enough to see streets
    if (map.getZoom() < 12) return;
    
    const bounds = map.getBounds();
    const resMeters = parseFloat(document.getElementById('res-slider').value);
    
    // Calculate geographic steps based on meters
    const latStep = resMeters / 111320;
    const lonStep = resMeters / (111320 * Math.cos(bounds.getCenter().lat * Math.PI / 180));

    // Align to global grid (snapping)
    const startLat = Math.floor(bounds.getSouth() / latStep) * latStep;
    const startLon = Math.floor(bounds.getWest() / lonStep) * lonStep;

    const newFeatures = [];
    for (let x = startLon; x < bounds.getEast(); x += lonStep) {
        for (let y = startLat; y < bounds.getNorth(); y += latStep) {
            // Avoid duplicates
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
        if (map.getSource('grid-source')) {
            map.getSource('grid-source').setData(gridData);
        }
    }
}

map.on('load', () => {
    // 2. Add Base Sources (OSM and Satellite)
    Object.keys(MAP_SOURCES).forEach(id => {
        map.addSource(`src-${id}`, MAP_SOURCES[id]);
        map.addLayer({
            id: `layer-${id}`,
            type: 'raster',
            source: `src-${id}`,
            layout: { visibility: id === 'vector' ? 'visible' : 'none' }
        }, 'background'); // Place them above background
    });

    // 3. Add Grid Source and Layer
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

    // Start grid generation
    generateGrid();
    map.on('moveend', generateGrid);

    // 4. Click Interaction (Paint or Subdivide)
    map.on('click', 'grid-fill', (e) => {
        const feature = e.features[0];
        const coords = feature.geometry.coordinates[0][0]; 
        const sizeLon = feature.properties.sizeLon;
        const sizeLat = feature.properties.sizeLat;

        if (isSubdivideMode) {
            // Remove the parent square
            gridData.features = gridData.features.filter(f => 
                !(Math.abs(f.geometry.coordinates[0][0][0] - coords[0]) < 0.0000001 && 
                  Math.abs(f.geometry.coordinates[0][0][1] - coords[1]) < 0.0000001)
            );

            // Split into 4x4 children
            const div = 4;
            const cLon = sizeLon / div;
            const cLat = sizeLat / div;
            for (let i = 0; i < div; i++) {
                for (let j = 0; j < div; j++) {
                    gridData.features.push(createSquare(coords[0] + (i * cLon), coords[1] + (j * cLat), cLon, cLat));
                }
            }
        } else {
            // Color the square
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

    // UI Controls
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

    document.getElementById('layer-selector').addEventListener('change', (e) => {
        const mode = e.target.value;
        const isBaseOn = document.getElementById('toggle-basemap').checked;
        map.setLayoutProperty('layer-vector', 'visibility', (isBaseOn && mode === 'vector') ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite', 'visibility', (isBaseOn && mode === 'satellite') ? 'visible' : 'none');
    });

    document.getElementById('toggle-basemap').addEventListener('change', (e) => {
        const mode = document.getElementById('layer-selector').value;
        const isBaseOn = e.target.checked;
        map.setLayoutProperty('layer-vector', 'visibility', (isBaseOn && mode === 'vector') ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite', 'visibility', (isBaseOn && mode === 'satellite') ? 'visible' : 'none');
    });

    document.getElementById('opacity-slider').oninput = (e) => {
        map.setPaintProperty('grid-fill', 'fill-opacity', e.target.value / 100);
        document.getElementById('opacity-val').innerText = e.target.value;
    };
});
