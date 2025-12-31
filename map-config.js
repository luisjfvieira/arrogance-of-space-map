const MAP_SOURCES = {
    vector: { 
        type: 'raster', 
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], 
        tileSize: 256,
        attribution: '&copy; OpenStreetMap'
    },
    satellite: { 
        type: 'raster', 
        tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'], 
        tileSize: 256,
        attribution: '&copy; Google'
    }
};

const LAND_USE_COLORS = {
    'unassigned': 'rgba(102, 102, 102, 0.0)', // Semi-transparent grey
    'cars': '#ff0000',
    'pedestrians': '#0000ff',
    'cyclists': '#800080',
    'public transit': '#ffa500',
    'buildings': '#ffff00',
    'green': '#008000',
    'dead space': '#808080',
    'eraser': 'rgba(102, 102, 102, 0.0)'
};

const INITIAL_STATE = {
    center: [-9.139, 38.722], // Lisbon
    zoom: 14
};
