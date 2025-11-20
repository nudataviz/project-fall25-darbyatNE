// Configuration constants
const CONFIG = {
    MAP: {
        initialView: [39.8283, -98.5795],
        initialZoom: 6,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        minLabelAreaThreshold: 10000
    },
    
    API: {
        zones: '/api/zones',
        lmpRange: '/api/lmp/range'
    },
    
    ANIMATION: {
        interval: 1000 // milliseconds between frames
    },
    
    COLOR_SCALE: [
        // Very High: Deep, saturated reds
        { threshold: 100, color: '#b30000', label: '> $100' },
        { threshold: 75, color: '#dc3545', label: '$75.01 – $100' },

        // High: Bright, clear oranges
        { threshold: 62, color: '#ff5500', label: '$62.01 – $75' },
        { threshold: 52, color: '#ff7b00', label: '$52.01 – $62' },
        { threshold: 44, color: '#ff9900', label: '$44.01 – $52' },

        // Mid: Vibrant yellow and green
        { threshold: 37, color: '#ffc107', label: '$37.01 – $44' },
        { threshold: 30, color: '#99cc33', label: '$30.01 – $37' },
        { threshold: 25, color: '#00cc66', label: '$25.01 – $30' },

        // Low: Crisp blues
        { threshold: 20, color: '#00aaff', label: '$20.01 – $25' },
        { threshold: 0, color: '#007bff', label: '$0 – $20' },
        
        // Negative: Maintained as purple
        { threshold: -Infinity, color: '#800080', label: '< $0' }
    ],

    
    NO_DATA_COLOR: '#808080',

    // --- custom coordinates for split or irregular shaped zones ---
    ZONE_LABEL_OVERRIDES: {
        "AEP": [
            [40.9, -84.4], // [lat, lng] for the first territory
            [39.03, -82.55]  // [lat, lng] for the second territory
        ],
        "APS": [
            [39.14, -79.8], 
            [41.46, -78.2]  
        ],
        "COMED": [
            [41.95, -88.67]
        ],
        "DAY": [
            [40.02, -84.42], 
            [41.46, -78.2]  
        ],
        "DPL": [
            [38.74, -75.68]
        ],
        "DOM": [
            [37.52, -77.65]
        ],
        "DUQ": [
            [40.44, -79.96]
        ],
        "EKPC": [
            [37.19, -85.17], 
            [38.25, -83.60] 
        ],
        "FE-ATSI": [
            [41.2, -81.52]
        ],
        "METED": [
            [40.37, -76.45], 
            [40.86, -75.25]  
        ],
        "LGE": [
            [38.00, -85.06]
        ],
        "PECO": [
            [40.10, -75.39]
        ],
        "RECO": [
            [41.13, -74.34]
        ],
        "JCPL": [
            [40.13, -74.24],
            [40.97, -74.6]
        ],

    },
    DEFAULT_FILTER: {
        startDate: new Date('2025-07-13'),
        endDate: new Date('2025-07-19'),
        startTime: 15,
        endTime: 20,
        daysOfWeek: [false, true, true, true, true, true, false],
        price_type: "DA"
    }
};
