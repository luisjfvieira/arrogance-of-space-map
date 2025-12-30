const MAP_SOURCES = {
    vector: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19
    },
    satellite_esri: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 22
    },
    satellite_google: {
        type: 'raster',
        tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
        tileSize: 256,
        maxzoom: 22
    }
};

const LAND_USE_COLORS = {
    'unassigned': '#555555', // Solid Dark Grey
    'cars': '#e74c3c',
    'pedestrians': '#2ecc71',
    'cycling': '#3498db',
    'transit': '#f1c40f'
};

const INITIAL_STATE = {
    center: [-9.135, 38.725],
    zoom: 15,
    maxZoom: 22
};
