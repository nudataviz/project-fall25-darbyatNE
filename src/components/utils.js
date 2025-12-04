// src/components/utils.js

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

            const rawVals = reading.lmp_values || {};            
            dataByTimestamp[timestamp].readings[zoneName] = {
                da: rawVals.da !== null ? Number(rawVals.da) : null,
                rt: rawVals.rt !== null ? Number(rawVals.rt) : null,
                net: rawVals.net !== null ? Number(rawVals.net) : null,
                congestion: rawVals.congestion !== null ? Number(rawVals.congestion) : null
            };
        }
    }
    
    return Object.keys(dataByTimestamp).sort().map(ts => dataByTimestamp[ts]);
}
