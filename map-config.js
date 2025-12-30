const MAP_SOURCES = {
    vector: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 },
    satellite: { type: 'raster', tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'], tileSize: 256 }
};

const LAND_USE_COLORS = {
    'unassigned': '#666666',
    'cars': '#ff0000',           // Red
    'pedestrians': '#0000ff',    // Blue
    'cyclists': '#800080',       // Purple
    'public transit': '#ffa500', // Orange
    'buildings': '#ffff00',      // Yellow
    'green': '#008000',          // Green
    'dead space': '#808080'      // Grey
};

const INITIAL_STATE = {
    center: [-9.139, 38.722],
    zoom: 14
};
