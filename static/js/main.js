// Main application initialization
function initializeApp() {
    // Initialize map
    MapUtils.initializeMap();
    
    // Add legend
    MapUtils.createLegend();
    
    // Initialize UI components
    TimeSlider.init();
    Filters.init();
    Animation.init();
    
    // Load initial data
    API.fetchZoneShapes().then(() => {
        API.fetchLmpData();
    });
}

// Wait for Leaflet and DOM to be ready
if (typeof L !== 'undefined') {
    // Leaflet already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
} else {
    // Wait for window load to ensure all external scripts are loaded
    window.addEventListener('load', initializeApp);
}