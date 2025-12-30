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
    },
    satellite_2014: {
        type: 'raster',
        tiles: ['https://wayback.arcgisonline.com/arcgis/rest/services/World_Imagery_2014_02_20/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 22
    }
};

const INITIAL_STATE = {
    center: [-9.135, 38.725],
    zoom: 15,
    maxZoom: 22 
};
