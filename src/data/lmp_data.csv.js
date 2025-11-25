// LMP data loader - reads filter from params.json
import mysql from "mysql2/promise";
import { readFileSync, existsSync } from "fs";


const DB_CONFIG = {
    host: process.env.DB_HOST || "aws-mysql.c61okoae04u4.us-east-1.rds.amazonaws.com",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "bdarby",
    password: process.env.DB_PASSWORD || "Dataviz7250!!",
    database: process.env.DB_NAME || "electric_data"
};


let filter = {
    start_date: "2025-07-13",
    end_date: "2025-07-19",
    days: [2, 3, 4, 5, 6],  // Mon-Fri
    hours: [15, 16, 17, 18, 19],
    price_type: "DA"
};

// Try to read filter from .observablehq/cache/_filterParams.json
const paramsPath = ".observablehq/cache/_filterParams.json";
if (existsSync(paramsPath)) {
    try {
        const fileContent = readFileSync(paramsPath, 'utf-8');
        const loadedFilter = JSON.parse(fileContent);
        filter = { ...filter, ...loadedFilter };
        console.error("Loaded filter from file:", filter);
    } catch (error) {
        console.error("Could not read filter file, using defaults");
    }
} else {
    console.error("No filter file found, using defaults");
}

console.error("Using filter:", JSON.stringify(filter, null, 2));

function formatAsCSV(rows) {
    if (rows.length === 0) {
        return "zone,datetime,date,hour,lmp\n";
    }
    
    const headers = Object.keys(rows[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of rows) {
        const values = headers.map(header => {
            const value = row[header];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

async function fetchData() {
    console.error(`Connecting to ${DB_CONFIG.host}/${DB_CONFIG.database}...`);
    
    const connection = await mysql.createConnection(DB_CONFIG);
    console.error("Connected");
    
    try {
        // Build query
        let query;
        const priceType = filter.price_type.toUpperCase();
        
        if (priceType === 'RT') {
            query = `
                SELECT z.Transact_Z as zone, l.datetime_beginning_ept as datetime, l.total_lmp_rt as lmp_value
                FROM pjm_rt_hrl_lmps AS l
                JOIN pjm_lat_long AS ll ON l.pnode_name = ll.Alt_Name
                JOIN pjm_zone_shapes AS z ON ll.Transact_Z = z.Transact_Z
                WHERE l.datetime_beginning_ept >= ? AND l.datetime_beginning_ept < ?
            `;
        } else if (priceType === 'DA') {
            query = `
                SELECT z.Transact_Z as zone, l.datetime_beginning_ept as datetime, l.total_lmp_da as lmp_value
                FROM pjm_da_hrl_lmps AS l
                JOIN pjm_lat_long AS ll ON l.pnode_name = ll.Alt_Name
                JOIN pjm_zone_shapes AS z ON ll.Transact_Z = z.Transact_Z
                WHERE l.datetime_beginning_ept >= ? AND l.datetime_beginning_ept < ?
            `;
        } else {
            query = `
                SELECT z.Transact_Z as zone, da.datetime_beginning_ept as datetime, 
                       (da.total_lmp_da - rt.total_lmp_rt) as lmp_value
                FROM pjm_da_hrl_lmps AS da
                JOIN pjm_rt_hrl_lmps AS rt ON da.pnode_name = rt.pnode_name 
                    AND da.datetime_beginning_ept = rt.datetime_beginning_ept
                JOIN pjm_lat_long AS ll ON da.pnode_name = ll.Alt_Name
                JOIN pjm_zone_shapes AS z ON ll.Transact_Z = z.Transact_Z
                WHERE da.datetime_beginning_ept >= ? AND da.datetime_beginning_ept < ?
            `;
        }
        
        const queryParams = [
            filter.start_date + ' 00:00:00',
            filter.end_date + ' 23:59:59'
        ];
        
        // Add day filter
        if (filter.days.length > 0 && filter.days.length < 7) {
            const placeholders = filter.days.map(() => '?').join(',');
            query += ` AND DAYOFWEEK(${priceType === 'NET' ? 'da' : 'l'}.datetime_beginning_ept) IN (${placeholders})`;
            queryParams.push(...filter.days);
        }
        
        // Add hour filter
        if (filter.hours.length > 0 && filter.hours.length < 24) {
            const placeholders = filter.hours.map(() => '?').join(',');
            query += ` AND EXTRACT(HOUR FROM ${priceType === 'NET' ? 'da' : 'l'}.datetime_beginning_ept) IN (${placeholders})`;
            queryParams.push(...filter.hours);
        }
        
        query += ` ORDER BY zone, datetime`;
        
        console.error("Executing query...");
        console.error("Query params:", queryParams);
        
        const [rows] = await connection.execute(query, queryParams);
        
        console.error(`Retrieved ${rows.length} records`);
        
        // Format data
        const data = rows.map(row => ({
            zone: row.zone,
            datetime: new Date(row.datetime).toISOString(),
            date: new Date(row.datetime).toISOString().split('T')[0],
            hour: new Date(row.datetime).getHours(),
            lmp: row.lmp_value
        }));
        
        return data;
        
    } finally {
        await connection.end();
        console.error("Database connection closed");
    }
}

try {
    const data = await fetchData();
    process.stdout.write(formatAsCSV(data));
    console.error(`Complete: ${data.length} records`);
} catch (error) {
    console.error(`Error:`, error.message);
    console.error(error.stack);
    // Output empty CSV on error
    process.stdout.write("zone,datetime,date,hour,lmp\n");
    process.exit(1);
}
