let gridData = { type: 'FeatureCollection', features: [] };
let activeLandUse = 'cars';
let isSubdivideMode = false;

const map = new maplibregl.Map({
    container: 'map',
    style: { version: 8, sources: {}, layers: [] },
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
    
    const latStep = resMeters / 111320;
    const lonStep = resMeters / (111320 * Math.cos(bounds.getCenter().lat * Math.PI / 180));

    const startLat = Math.floor(bounds.getSouth() / latStep) * latStep;
    const startLon = Math.floor(bounds.getWest() / lonStep) * lonStep;

    const newFeatures = [];
    for (let x = startLon; x < bounds.getEast(); x += lonStep) {
        for (let y = startLat; y < bounds.getNorth(); y += latStep) {
            const exists = gridData.features.some(f => 
                Math.abs(f.geometry.coordinates[0][0][0] - x) < 0.0000001 &&
                Math.abs(f.geometry.coordinates[0][0][1] - y) < 0.0000001
            );
            if (!exists) {
                newFeatures.push(createSquare(x, y, lonStep, latStep));
            }
        }
    }
    gridData.features = [...gridData.features, ...newFeatures];
    map.getSource('grid-source').setData(gridData);
}

map.on('load', () => {
    Object.keys(MAP_SOURCES).forEach(id => {
        map.addSource(`src-${id}`, MAP_SOURCES[id]);
        map.addLayer({ id: `layer-${id}`, type: 'raster', source: `src-${id}`, layout: { visibility: id === 'vector' ? 'visible' : 'none' }});
    });

    map.addSource('grid-source', { type: 'geojson', data: gridData });
    map.addLayer({
        id: 'grid-fill', type: 'fill', source: 'grid-source',
        paint: { 'fill-color': ['get', 'color'], 'fill-outline-color': '#fff', 'fill-opacity': 0.5 }
    });

    generateGrid();
    map.on('moveend', generateGrid);

    map.on('click', 'grid-fill', (e) => {
        const feature = e.features[0];
        const coords = feature.geometry.coordinates[0][0];
        const sizeLon = feature.properties.sizeLon;
        const sizeLat = feature.properties.sizeLat;

        if (isSubdivideMode) {
            gridData.features = gridData.features.filter(f => 
                !(Math.abs(f.geometry.coordinates[0][0][0] - coords[0]) < 0.0000001 && 
                  Math.abs(f.geometry.coordinates[0][0][1] - coords[1]) < 0.0000001)
            );
            const div = 4;
            const cLon = sizeLon / div;
            const cLat = sizeLat / div;
            for (let i = 0; i < div; i++) {
                for (let j = 0; j < div; j++) {
                    gridData.features.push(createSquare(coords[0] + (i * cLon), coords[1] + (j * cLat), cLon, cLat));
                }
            }
        } else {
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

    document.getElementById('opacity-slider').oninput = (e) => {
        map.setPaintProperty('grid-fill', 'fill-opacity', e.target.value / 100);
        document.getElementById('opacity-val').innerText = e.target.value;
    };

    document.getElementById('layer-selector').addEventListener('change', (e) => {
        const mode = e.target.value;
        map.setLayoutProperty('layer-vector', 'visibility', mode === 'vector' ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite', 'visibility', mode === 'satellite' ? 'visible' : 'none');
    });

    document.getElementById('btn-clear').onclick = () => {
        if(confirm("Clear all data?")) { gridData.features = []; generateGrid(); }
    };

    document.getElementById('btn-export').onclick = () => {
        const blob = new Blob([JSON.stringify(gridData)], {type: "application/json"});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "arrogance_map.geojson";
        a.click();
    };
});
