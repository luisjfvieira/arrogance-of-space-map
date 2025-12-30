let gridData = { type: 'FeatureCollection', features: [] };
let activeLandUse = 'cars';
let isSubdivideMode = false;
const existingSquares = new Set();

const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#222222' } }]
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
    if (map.getZoom() < 12) return;
    
    const bounds = map.getBounds();
    const resMeters = parseFloat(document.getElementById('res-slider').value);
    
    // 1. Calculate fixed steps based on the Equator/Prime Meridian anchor
    const latStep = resMeters / 111320;
    const lonStep = resMeters / (111320 * Math.cos(bounds.getCenter().lat * Math.PI / 180));

    // 2. Buffer Logic: Get current width/height and multiply by 3 (5x total area)
    const latSpan = bounds.getNorth() - bounds.getSouth();
    const lonSpan = bounds.getEast() - bounds.getWest();
    
    const bufferSouth = bounds.getSouth() - latSpan;
    const bufferNorth = bounds.getNorth() + latSpan;
    const bufferWest = bounds.getWest() - lonSpan;
    const bufferEast = bounds.getEast() + lonSpan;

    // 3. IMPORTANT: Snap start coordinates to the Global Anchor (0,0)
    // This ensures that no matter where you pan, the "start" of the grid calculation is the same.
    const startLat = Math.floor(bufferSouth / latStep) * latStep;
    const startLon = Math.floor(bufferWest / lonStep) * lonStep;

    const newFeatures = [];
    // Limit generation to prevent browser crash (max 5000 squares per pan)
    let count = 0;
    for (let x = startLon; x < bufferEast && count < 5000; x += lonStep) {
        for (let y = startLat; y < bufferNorth; y += latStep) {
            const key = `${x.toFixed(7)}|${y.toFixed(7)}`;
            
            if (!existingSquares.has(key)) {
                existingSquares.add(key);
                newFeatures.push(createSquare(x, y, lonStep, latStep));
                count++;
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
    // Add Base Maps
    Object.keys(MAP_SOURCES).forEach(id => {
        map.addSource(`src-${id}`, MAP_SOURCES[id]);
        map.addLayer({
            id: `layer-${id}`,
            type: 'raster',
            source: `src-${id}`,
            layout: { visibility: id === 'vector' ? 'visible' : 'none' }
        });
    });

    // Add Grid Layer
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

    generateGrid();
    map.on('moveend', generateGrid);

    // CLICK HANDLER
    map.on('click', 'grid-fill', (e) => {
        const feature = e.features[0];
        const coords = feature.geometry.coordinates[0][0];
        const lon = coords[0];
        const lat = coords[1];

        if (isSubdivideMode) {
            const sizeLon = feature.properties.sizeLon;
            const sizeLat = feature.properties.sizeLat;

            // Remove parent
            gridData.features = gridData.features.filter(f => 
                !(Math.abs(f.geometry.coordinates[0][0][0] - lon) < 0.0000001 && 
                  Math.abs(f.geometry.coordinates[0][0][1] - lat) < 0.0000001)
            );
            existingSquares.delete(`${lon.toFixed(7)}|${lat.toFixed(7)}`);

            const div = 4;
            const cLon = sizeLon / div;
            const cLat = sizeLat / div;
            for (let i = 0; i < div; i++) {
                for (let j = 0; j < div; j++) {
                    const nx = lon + (i * cLon);
                    const ny = lat + (j * cLat);
                    existingSquares.add(`${nx.toFixed(7)}|${ny.toFixed(7)}`);
                    gridData.features.push(createSquare(nx, ny, cLon, cLat));
                }
            }
        } else {
            const feat = gridData.features.find(f => 
                Math.abs(f.geometry.coordinates[0][0][0] - lon) < 0.0000001 &&
                Math.abs(f.geometry.coordinates[0][0][1] - lat) < 0.0000001
            );
            if (feat) {
                feat.properties.landUse = activeLandUse;
                feat.properties.color = LAND_USE_COLORS[activeLandUse];
            }
        }
        map.getSource('grid-source').setData(gridData);
    });

    // UI Updates
    document.getElementById('opacity-slider').oninput = (e) => {
        const val = parseFloat(e.target.value) / 100;
        map.setPaintProperty('grid-fill', 'fill-opacity', val);
        document.getElementById('opacity-val').innerText = e.target.value;
    };

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

    const updateBase = () => {
        const isBaseOn = document.getElementById('toggle-basemap').checked;
        const mode = document.getElementById('layer-selector').value;
        map.setLayoutProperty('layer-vector', 'visibility', (isBaseOn && mode === 'vector') ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite', 'visibility', (isBaseOn && mode === 'satellite') ? 'visible' : 'none');
    };
    document.getElementById('toggle-basemap').onchange = updateBase;
    document.getElementById('layer-selector').onchange = updateBase;

    document.getElementById('btn-clear').onclick = () => {
        if(confirm("Clear all?")) {
            gridData.features = [];
            existingSquares.clear();
            generateGrid();
        }
    };
});
