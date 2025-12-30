const MAP_SOURCES = {
    // Standard OSM Street Map
    vector: {
        type: 'raster', 
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    },
    // Esri World Imagery - Reliable continental coverage
    satellite_esri: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 22, // Critical for high-res access
        attribution: 'Tiles &copy; Esri'
    },
    // Google Satellite - Often the highest resolution available
    satellite_google: {
        type: 'raster',
        tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
        tileSize: 256,
        maxzoom: 22,
        attribution: 'Google'
    },
    // Esri Wayback - Historical imagery from Feb 2014
    satellite_2014: {
        type: 'raster',
        tiles: ['https://wayback.arcgisonline.com/arcgis/rest/services/World_Imagery_2014_02_20/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 22,
        attribution: 'Esri Wayback (2014)'
    }
};

const INITIAL_STATE = {
    center: [-9.135, 38.725], // Arroios, Lisbon
    zoom: 15,
    maxZoom: 22 // Enables the map engine to go past level 18
};
