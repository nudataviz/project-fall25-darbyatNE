// src/controller/utils.js

import { COLOR_SCALE } from './config.js';

export function getColorForLmp(value, scale = COLOR_SCALE) {
    if (value === null || value === undefined) {
        return '#cccccc';
    }
    
    for (const item of scale) {
        if (value >= item.threshold) {
            return item.color;
        }
    }
    
    return scale[scale.length - 1].color;
}

export function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}
export function transformApiData(apiData) {
    const dataByTimestamp = {};
    for (const zoneName in apiData) {
        for (const reading of apiData[zoneName]) {
            const timestamp = reading.datetime_beginning_ept;
            if (!dataByTimestamp[timestamp]) {
                dataByTimestamp[timestamp] = { datetime: timestamp, readings: {} };
            }
            // all price types
            dataByTimestamp[timestamp].readings[zoneName] = reading.lmp_values;
        }
    }
    return Object.keys(dataByTimestamp).sort().map(ts => dataByTimestamp[ts]);
}