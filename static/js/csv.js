function convertLmpDataToCSV(lmpDataByZone) {
    const headers = ['zone', 'date', 'hour', 'lmp'];
    const rows = Object.keys(lmpDataByZone).flatMap(zoneName => {
        const readings = lmpDataByZone[zoneName];
        return readings.map(reading => {
            const [date, time] = reading.datetime_beginning_ept.split('T');
            const hour = time.substring(0, 2);
            return [zoneName, date, parseInt(hour), reading.lmp_value].join(','); // csv magic here "," :)
        });
    });
    return [headers.join(','), ...rows].join('\n');
}

window.convertLmpDataToCSV = convertLmpDataToCSV;