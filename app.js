// 1. Configuration (Moved inside to ensure it's always available)
const CONFIG = {
    center: [-9.135, 38.725], // Lisbon
    zoom: 15,
    maxZoom: 22
};

const SOURCES = {
    vector: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite_google: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    satellite_esri: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    satellite_2014: 'https://wayback.arcgisonline.com/arcgis/rest/services/World_Imagery_2014_02_20/MapServer/tile/{z}/{y}/{x}'
};

// 2. Initialize Map
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#333' }}]
    },
    center: CONFIG.center,
    zoom: CONFIG.zoom,
    maxZoom: CONFIG.maxZoom
});

map.on('load', () => {
    console.log("Map Engine Loaded");

    // Add all sources
    Object.keys(SOURCES).forEach(id => {
        map.addSource(`src-${id}`, {
            type: 'raster',
            tiles: [SOURCES[id]],
            tileSize: 256,
            maxzoom: 22
        });
    });

    // Add all layers (Vector visible by default)
    map.addLayer({ id: 'layer-vector', type: 'raster', source: 'src-vector', layout: { visibility: 'visible' }});
    map.addLayer({ id: 'layer-satellite_google', type: 'raster', source: 'src-satellite_google', layout: { visibility: 'none' }});
    map.addLayer({ id: 'layer-satellite_esri', type: 'raster', source: 'src-satellite_esri', layout: { visibility: 'none' }});
    map.addLayer({ id: 'layer-satellite_2014', type: 'raster', source: 'src-satellite_2014', layout: { visibility: 'none' }});

    // 3. Logic for UI selectors
    const layerSel = document.getElementById('layer-selector');
    const satSel = document.getElementById('sat-provider-selector');
    const satGroup = document.getElementById('sat-options-group');

    function sync() {
        const isSat = layerSel.value === 'satellite';
        const activeSatId = `layer-${satSel.value}`;

        satGroup.style.display = isSat ? 'block' : 'none';

        // Toggle visibility
        map.setLayoutProperty('layer-vector', 'visibility', !isSat ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite_google', 'visibility', (isSat && activeSatId === 'layer-satellite_google') ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite_esri', 'visibility', (isSat && activeSatId === 'layer-satellite_esri') ? 'visible' : 'none');
        map.setLayoutProperty('layer-satellite_2014', 'visibility', (isSat && activeSatId === 'layer-satellite_2014') ? 'visible' : 'none');
    }

    layerSel.addEventListener('change', sync);
    satSel.addEventListener('change', sync);

    map.on('zoom', () => {
        document.getElementById('zoom-val').innerText = map.getZoom().toFixed(1);
    });
});
