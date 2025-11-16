// In /static/js/main.js

// =================================================================================
// GLOBAL STATE AND CONFIGURATION
// =================================================================================

// This is the single source of truth for the application's state.
const State = {
    map: null,
    geojsonLayer: null,
    labelMarkers: {},
    timeSeriesData: [],
    currentTimeIndex: 0,
    savedFilters: [],
    // **CRITICAL FIX**: Initialize currentFilter with default values.
    currentFilter: {
        startDate: new Date('2023-01-01'), // Example default start date
        endDate: new Date('2023-01-07'),   // Example default end date
        startTime: 0,
        endTime: 23.75,
        daysOfWeek: [true, true, true, true, true, true, true] // All days selected by default
    }
};

// =================================================================================
// APPLICATION INITIALIZATION
// =================================================================================

const App = {
    init() {
        // This is the main entry point for the application.
        // It's called only after the DOM is fully loaded.

        // SEQUENCE IS CRITICAL HERE:
        // 1. Initialize the map.
        MapUtils.initializeMap();

        // 2. Initialize UI components. They need the State to be ready.
        Filters.init();
        TimeSlider.init();
        Animation.init();
        MapUtils.createLegend();

        // 3. Load initial data based on the default filter state.
        API.fetchZoneShapes().then(() => {
            // Now that shapes are loaded, fetch the initial LMP data.
            // Pass the initialized State.currentFilter to the API.
            API.fetchLmpData(State.currentFilter); 
        });
    }
};

// =================================================================================
// SCRIPT EXECUTION
// =================================================================================

// This is the ONLY event listener that should be in main.js.
// It ensures that NO code runs until the entire HTML page is ready.
document.addEventListener('DOMContentLoaded', App.init);
