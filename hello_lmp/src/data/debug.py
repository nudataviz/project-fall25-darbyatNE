import os
import requests
from datetime import date
import json
from dotenv import load_dotenv

load_dotenv()

PJM_API_KEY = os.getenv("PJM_API_KEY")

PJM_API_ENDPOINT = 'https://api.pjm.com/api/v1/da_hrl_lmps'
TEST_PNODE_ID = 51217
START_DATE = date(2024, 1, 1)
END_DATE = date(2024, 1, 1)

def fetch_pjm_api_with_selected_fields():
    """
    Fetches PJM DA LMP data with specific fields selected.
    """
    if not PJM_API_KEY:
        print("Error: 'PJM_API_KEY' not found in your .env file.")
        return

    date_range_str = f"{START_DATE.strftime('%Y-%m-%d')}T00:00:00 to {END_DATE.strftime('%Y-%m-%d')}T23:59:59"
    desired_fields = [
        "datetime_beginning_ept",
        "pnode_id",
        "pnode_name",
        "type",
        "system_energy_price_da",
        "total_lmp_da",
        "congestion_price_da",
        "marginal_loss_price_da"
    ]

    print(f"--- Querying PJM API for PNode ID: {TEST_PNODE_ID} with selected fields ---")

    params = {
        'rowCount': 5,
        'order': 'Asc',
        'startRow': 1,
        'datetime_beginning_ept': date_range_str,
        'pnode_id': TEST_PNODE_ID,
        'fields': ",".join(desired_fields)
    }
    headers = {'Ocp-Apim-Subscription-Key': PJM_API_KEY}

    try:
        response = requests.get(PJM_API_ENDPOINT, headers=headers, params=params)
        response.raise_for_status()
        
        response_data = response.json()
        items = response_data.get('items', [])
        
        if not items:
            print("No data returned from the API.")
            return

        print("\n--- Sample Record from API Response (Selected Fields) ---")
        print(json.dumps(items[0], indent=4))

    except requests.exceptions.RequestException as e:
        print(f"An error occurred during the API call: {e}")
    except ValueError:
        print(f"Failed to decode JSON. Response text: {response.text}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == '__main__':
    fetch_pjm_api_with_selected_fields()
