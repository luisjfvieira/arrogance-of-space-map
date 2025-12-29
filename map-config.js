const MAP_SOURCES = {
    vector: {
        type: 'raster', 
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap'
    },
    satellite_now: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 22, // Enable high resolution
        attribution: 'Esri'
    },
    satellite_2014: {
        type: 'raster',
        tiles: ['https://wayback.arcgisonline.com/arcgis/rest/services/World_Imagery_2014_02_20/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 22,
        attribution: 'Esri Wayback'
    }
};

const INITIAL_STATE = {
    center: [-9.135, 38.725], // Arroios, Lisbon
    zoom: 13,
    maxZoom: 22 
};
