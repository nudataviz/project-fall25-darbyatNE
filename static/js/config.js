// Configuration constants
const CONFIG = {
    MAP: {
        initialView: [39.8283, -98.5795],
        initialZoom: 6,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    },
    
    API: {
        zones: '/api/zones',
        lmpRange: '/api/lmp/range'
    },
    
    ANIMATION: {
        interval: 1000 // milliseconds between frames
    },
    
    COLOR_SCALE: [
        { threshold: 100, color: '#9e0142', label: '> $100' },
        { threshold: 75, color: '#d53e4f', label: '$75.01 – $100' },
        { threshold: 62, color: '#f46d43', label: '$62.01 – $75' },
        { threshold: 52, color: '#fdae61', label: '$52.01 – $62' },
        { threshold: 44, color: '#fee08b', label: '$44.01 – $52' },
        { threshold: 37, color: '#ffffbf', label: '$37.01 – $44' },
        { threshold: 30, color: '#e6f598', label: '$30.01 – $37' },
        { threshold: 25, color: '#abdda4', label: '$25.01 – $30' },
        { threshold: 20, color: '#66c2a5', label: '$20.01 – $25' },
        { threshold: 0, color: '#3288bd', label: '$0 – $20' },
        { threshold: -Infinity, color: '#5e4fa2', label: '< $0' }
    ],
    
    NO_DATA_COLOR: '#808080',
    
    DEFAULT_FILTER: {
        startDate: new Date('2025-07-13'),
        endDate: new Date('2025-07-19'),
        startTime: 15,
        endTime: 20,
        daysOfWeek: [false, true, true, true, true, true, false]
    }
};