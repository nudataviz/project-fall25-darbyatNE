# src/hydrate/update_rt_hrl.py

import os
import sys
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv
from datetime import datetime, date, timedelta

# --- PATH FIX ---
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from update_pjm_db import PNODE_IDS

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "cursorclass": DictCursor
}

def ensure_status_ticker():
    """
    Ensures that the 'pjm_hourly_status' table has rows for the current day 
    initialized as 'm' (Missing).
    """
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # Generate hourly timestamps for Today (00:00 to 23:00)
    today = date.today()
    start_dt = datetime.combine(today, datetime.min.time())
    
    hours_to_check = []
    for i in range(24):
        hours_to_check.append((start_dt + timedelta(hours=i),))
    
    # Insert 'm' only if the hour doesn't exist yet
    sql = "INSERT IGNORE INTO pjm_hourly_status (datetime_beginning_ept, status) VALUES (%s, 'm')"
    
    try:
        cursor.executemany(sql, hours_to_check)
        conn.commit()
        if cursor.rowcount > 0:
            print(f"   -> Ticker: Initialized {cursor.rowcount} hours as 'm' (Missing).")
    except Exception as e:
        print(f"   -> Ticker Error: {e}")
    finally:
        conn.close()

def synthesize_unverified_data():
    """
    1. Checks pjm_hourly_status for hours that are 'm' or 'u'.
    2. Calculates averages from 5-min data for those hours.
    3. Upserts into pjm_rt_hrl_lmps.
    4. Updates pjm_hourly_status to 'u'.
    """
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    try:
        # 1. Find hours that need calculation (Today only, status is NOT 'v')
        # We look for 'm' (missing) or 'u' (unverified - needs refresh as new 5-min intervals arrive)
        today_str = date.today().strftime('%Y-%m-%d')
        
        sql_check = f"""
            SELECT datetime_beginning_ept 
            FROM pjm_hourly_status 
            WHERE datetime_beginning_ept >= '{today_str} 00:00:00'
              AND status IN ('m', 'u')
              AND datetime_beginning_ept <= NOW() -- Don't calculate future hours
        """
        cursor.execute(sql_check)
        target_hours = [row['datetime_beginning_ept'] for row in cursor.fetchall()]
        
        if not target_hours:
            print("   -> Synthesizer: All past hours are Verified ('v'). Nothing to calculate.")
            return

        print(f"   -> Synthesizer: Recalculating {len(target_hours)} unverified hours...")

        # 2. Calculate Averages for these specific hours
        # We format the list of dates for the SQL IN clause
        format_strings = ','.join(['%s'] * len(target_hours))
        
        sql_calc = f"""
            SELECT 
                DATE_FORMAT(datetime_beginning_ept, '%Y-%m-%d %H:00:00') as hour_start,
                pnode_id,
                MAX(pnode_name) as pnode_name,
                AVG(total_lmp_rt) as avg_total,
                AVG(congestion_price_rt) as avg_cong,
                AVG(marginal_loss_price_rt) as avg_loss
            FROM pjm_rt_unverified_fivemin_lmps
            WHERE DATE_FORMAT(datetime_beginning_ept, '%Y-%m-%d %H:00:00') IN ({format_strings})
            GROUP BY 1, 2
        """
        
        cursor.execute(sql_calc, target_hours)
        calculated_rows = cursor.fetchall()
        
        if not calculated_rows:
            print("   -> Synthesizer: No 5-min data found for target hours yet.")
            return

        # 3. Upsert into Main Data Table
        # We use INSERT ... ON DUPLICATE KEY UPDATE to overwrite previous 'u' values
        # NOTE: We assume if status is 'm' or 'u', it is safe to overwrite.
        insert_sql = """
            INSERT INTO pjm_rt_hrl_lmps (
                datetime_beginning_ept, pnode_id, pnode_name, type,
                system_energy_price_rt, total_lmp_rt, congestion_price_rt, marginal_loss_price_rt,
                status
            )
            VALUES (%s, %s, %s, 'Unverified', 0, %s, %s, %s, 'u')
            ON DUPLICATE KEY UPDATE
                total_lmp_rt = VALUES(total_lmp_rt),
                congestion_price_rt = VALUES(congestion_price_rt),
                marginal_loss_price_rt = VALUES(marginal_loss_price_rt),
                status = 'u'
        """
        
        data_to_insert = []
        unique_hours_processed = set()
        
        for row in calculated_rows:
            unique_hours_processed.add(row['hour_start'])
            data_to_insert.append((
                row['hour_start'],
                row['pnode_id'],
                row['pnode_name'],
                row['avg_total'],
                row['avg_cong'],
                row['avg_loss']
            ))

        cursor.executemany(insert_sql, data_to_insert)
        conn.commit()
        print(f"   -> Synthesizer: Upserted {len(data_to_insert)} rows into Data Table.")

        # 4. Update Status Table to 'u'
        if unique_hours_processed:
            status_update_sql = f"""
                UPDATE pjm_hourly_status 
                SET status = 'u' 
                WHERE datetime_beginning_ept IN ({','.join(['%s'] * len(unique_hours_processed))})
            """
            # Convert string dates back to objects or keep as strings depending on cursor
            cursor.execute(status_update_sql, list(unique_hours_processed))
            conn.commit()
            print(f"   -> Synthesizer: Updated status to 'u' for {len(unique_hours_processed)} hours.")

    except Exception as e:
        print(f"   -> Synthesizer Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    ensure_status_ticker()
    synthesize_unverified_data()
