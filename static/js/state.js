// /static/js/state.js

const State = {
    map: null,
    geojsonLayer: null,
    timeSeriesData: [],
    currentTimeIndex: 0,
    animationTimer: null,
    isAnimationStarted: false,

    // Properties for map controls
    zoneLayers: {},
    legendControl: null,     
    priceTypeControl: null,

    currentFilter: {
        startDate: new Date(CONFIG.DEFAULT_FILTER.startDate),
        endDate: new Date(CONFIG.DEFAULT_FILTER.endDate),
        startTime: CONFIG.DEFAULT_FILTER.startTime,
        endTime: CONFIG.DEFAULT_FILTER.endTime,
        daysOfWeek: [...CONFIG.DEFAULT_FILTER.daysOfWeek],
        price_type: CONFIG.DEFAULT_FILTER.price_type
    },
    
    savedFilters: []
};
