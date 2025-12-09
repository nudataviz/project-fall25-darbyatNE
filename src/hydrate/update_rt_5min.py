# src/hydrate/update_rt_5min.py

import time
import subprocess
import sys
import os
from datetime import date, datetime

def run_script(script_relative_path, args=[]):
    """
    Helper to run a python script located relative to this file.
    
    Args:
        script_relative_path (str): Path to script (e.g., 'hydrate/script.py')
        args (list): List of command line arguments (e.g., ['2025-01-01', '2025-01-01'])
    """
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Construct full path to the target script
    script_path = os.path.join(current_dir, script_relative_path)
    
    # Check if file exists
    if not os.path.exists(script_path):
        print(f"   [ERROR] Script not found: {script_path}")
        return

    # Construct command: python /path/to/script.py arg1 arg2
    cmd = [sys.executable, script_path] + args
    
    try:
        # Run the script and wait for it to finish
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"   [ERROR] Execution failed for {script_relative_path}. Exit Code: {e.returncode}")
    except Exception as e:
        print(f"   [ERROR] Unexpected error running {script_relative_path}: {e}")

def main():
    print("==============================================")
    print("   PJM REAL-TIME WATCHDOG STARTED")
    print("   Press Ctrl+C to stop.")
    print("==============================================\n")

    try:
        while True:
            now = datetime.now()
            today_str = date.today().strftime("%Y-%m-%d")
            
            print(f"=== Wake Up: {now.strftime('%Y-%m-%d %H:%M:%S')} ===")
            print(f"--- Target Date: {today_str} ---")
            
            # Step 1: Fetch Latest 5-Minute LMPs
            run_script("pjm_query_rt_5min_unver.py", [today_str, today_str])
            
            # Step 2: Fetch Latest Binding Constraints
            run_script("pjm_query_rt_constraints.py", [today_str, today_str])
            
            # Step 3: Run Real-Time Manager
            run_script("update_rt_5min.py")
            
            # ---------------------------------------------------------
            # Sleep Cycle
            # ---------------------------------------------------------
            print("\n=== Cycle Complete. Sleeping for 5 minutes... ===\n")
            time.sleep(300) # 300 seconds = 5 minutes

    except KeyboardInterrupt:
        print("\n\n[!] Watchdog stopped by user.")
        sys.exit(0)

if __name__ == "__main__":
    main()
