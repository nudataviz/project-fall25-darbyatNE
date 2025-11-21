// In /static/js/main.js

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
        ViewToggle.init(); // Initialize view toggle

        // 3. Load initial data based on the default filter state.
        API.fetchZoneShapes().then(() => {
            // Now that shapes are loaded, fetch the initial LMP data.
            // Pass the initialized State.currentFilter to the API.
            API.fetchLmpData(State.currentFilter); 
            
            // Initialize zone selection after zones are loaded
            ZoneSelection.init();
        });
    }
};

// =================================================================================
// SCRIPT EXECUTION
// =================================================================================

// This is the ONLY event listener that should be in main.js.
// It ensures that NO code runs until the entire HTML page is ready.
document.addEventListener('DOMContentLoaded', App.init);
