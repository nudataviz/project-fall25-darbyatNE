// Global state management
const State = {
    map: null,
    geojsonLayer: null,
    timeSeriesData: [],
    labelMarkers: {},
    currentTimeIndex: 0,
    animationTimer: null,
    
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
