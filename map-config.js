const MAP_SOURCES = {
    vector: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 },
    satellite_google: { type: 'raster', tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'], tileSize: 256 }
};

const LAND_USE_COLORS = {
    'unassigned': '#666666',      // Neutral Grey
    'cars': '#e74c3c',            // Red (The Arrogance of Car Space)
    'pedestrians': '#2ecc71',     // Green (Walking)
    'cyclists': '#3498db',        // Blue (Biking)
    'public transit': '#f1c40f',  // Yellow (Buses/Trams)
    'buildings': '#2c3e50',       // Dark Navy (Built Environment)
    'green': '#27ae60',           // Forest Green (Parks/Nature)
    'dead space': '#9b59b6'       // Purple (Wasted/Residual Space)
};

const INITIAL_STATE = {
    center: [-9.139, 38.722],
    zoom: 14
};
