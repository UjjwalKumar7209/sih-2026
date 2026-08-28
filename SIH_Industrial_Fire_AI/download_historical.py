import pandas as pd
import requests
import time
from datetime import datetime, timedelta
from config import MAP_KEY

BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

SOURCE = "VIIRS_SNPP_SP"

# Rough India bounding box
AREA = "68,6,98,37"

START_DATE = datetime(2025, 1, 1)
END_DATE = datetime(2025, 3, 31)

all_data = []

current = START_DATE

while current <= END_DATE:

    remaining = (END_DATE - current).days + 1
    days = min(5, remaining)

    date = current.strftime("%Y-%m-%d")

    url = (
        f"{BASE_URL}/{MAP_KEY}/"
        f"{SOURCE}/{AREA}/{days}/{date}"
    )

    print(f"Downloading {date} ({days} days)...")

    try:

        response = requests.get(
            url,
            timeout=120
        )

        if response.status_code != 200:

            print(
                "Error:",
                response.status_code,
                response.text[:200]
            )

        else:

            from io import StringIO

            data = pd.read_csv(
                StringIO(response.text)
            )

            print(
                "Records:",
                len(data)
            )

            all_data.append(data)

    except Exception as e:

        print("Request error:", e)

    current += timedelta(days=days)

    time.sleep(2)


if all_data:

    final_df = pd.concat(
        all_data,
        ignore_index=True
    )

    # Remove duplicate detections
    final_df = final_df.drop_duplicates()

    final_df.to_csv(
        "firms_historical_raw.csv",
        index=False
    )

    print()
    print("================================")
    print("DONE")
    print("================================")
    print(
        "Total records:",
        len(final_df)
    )
    print(
        "Saved as: firms_historical_raw.csv"
    )

else:

    print("No data downloaded.")