const MAP_SOURCES = {
    // Esri World Imagery (High-res Satellite)
    satellite: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri'
    },
    // OpenStreetMap Standard (Vector/Street)
    vector: {
        type: 'raster', 
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap'
    }
};

const INITIAL_STATE = {
    center: [-9.135, 38.725], // Arroios, Lisbon
    zoom: 13
};
