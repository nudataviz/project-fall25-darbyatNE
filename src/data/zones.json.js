// Direct MySQL data loader for PJM zone shapes
// File: src/data/zones.json.js

import mysql from "mysql2/promise";

const DB_CONFIG = {
    host: process.env.DB_HOST || "aws-mysql.c61okoae04u4.us-east-1.rds.amazonaws.com",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "bdarby",
    password: process.env.DB_PASSWORD || "Dataviz7250!!",
    database: process.env.DB_NAME || "electric_data"
};

async function fetchZoneShapes() {
    console.error(`Connecting to database: ${DB_CONFIG.host}/${DB_CONFIG.database}`);
    
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.error("Database connected");
        
        const [rows] = await connection.execute(`
            SELECT 
                Transact_Z,
                ST_AsGeoJSON(ST_GeomFromText(WKT)) as geometry_geojson
            FROM pjm_zone_shapes
            WHERE WKT IS NOT NULL
        `);
        
        console.error(`Retrieved ${rows.length} zones from database`);
        
        // Convert to GeoJSON FeatureCollection with Zone_Name property
        const features = rows.map(row => {
            let geometry;
            if (typeof row.geometry_geojson === 'string') {
                geometry = JSON.parse(row.geometry_geojson);
            } else {
                geometry = row.geometry_geojson;
            }
            
            return {
                type: "Feature",
                geometry: geometry,
                properties: {
                    Zone_Name: row.Transact_Z  // Use Zone_Name to match your working example
                }
            };
        });
        
        const geojson = {
            type: "FeatureCollection",
            features: features
        };
        
        return geojson;
        
    } catch (error) {
        console.error(`Database error:`, error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.error("Database connection closed");
        }
    }
}

try {
    const zones = await fetchZoneShapes();
    process.stdout.write(JSON.stringify(zones, null, 2));
    console.error(`Zones data loader complete: ${zones.features.length} zones`);
} catch (error) {
    console.error(`Zones data loader failed:`, error.message);
    process.exit(1);
}
