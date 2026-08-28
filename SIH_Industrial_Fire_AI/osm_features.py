import pandas as pd
import requests
import time
from math import radians, sin, cos, sqrt, atan2

df = pd.read_csv("firms_india.csv")

URL = "https://overpass-api.de/api/interpreter"

HEADERS = {
    "User-Agent": "SIH-Industrial-Fire-AI/1.0"
}


def distance_km(lat1, lon1, lat2, lon2):

    R = 6371

    lat1 = radians(lat1)
    lon1 = radians(lon1)
    lat2 = radians(lat2)
    lon2 = radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1) * cos(lat2)
        * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c


def get_osm_data(points):

    parts = []

    for lat, lon in points:

        parts.append(
            f'''
            nwr["industrial"](around:5000,{lat},{lon});
            nwr["landuse"="industrial"](around:5000,{lat},{lon});
            nwr["man_made"="works"](around:5000,{lat},{lon});
            nwr["power"="plant"](around:5000,{lat},{lon});
            nwr["man_made"="storage_tank"](around:5000,{lat},{lon});
            '''
        )

    query = f"""
    [out:json][timeout:120];
    (
        {"".join(parts)}
    );
    out center tags;
    """

    for attempt in range(3):

        try:

            response = requests.post(
                URL,
                data={"data": query},
                headers=HEADERS,
                timeout=150
            )

            print("HTTP status:", response.status_code)

            if response.status_code == 200:
                return response.json()

            if response.status_code == 429:
                print("Rate limited. Waiting 35 seconds...")
                time.sleep(35)

            elif response.status_code in [502, 503, 504]:
                print("Server busy. Waiting 20 seconds...")
                time.sleep(20)

            else:
                print("OSM error:", response.text[:300])
                return None

        except requests.exceptions.RequestException as e:

            print("Connection error:", e)
            print("Waiting 20 seconds...")
            time.sleep(20)

    return None


# --------------------------------
# Process data in batches
# --------------------------------

batch_size = 5

all_results = []

for start in range(0, len(df), batch_size):

    end = min(start + batch_size, len(df))

    batch = df.iloc[start:end]

    print()
    print("=" * 50)
    print(f"Processing FIRMS points {start + 1}-{end}")
    print("=" * 50)

    points = list(
        zip(
            batch["latitude"],
            batch["longitude"]
        )
    )

    data = get_osm_data(points)

    if data is None:

        print("OSM request failed for this batch.")

        for _ in range(len(batch)):

            all_results.append({
                "osm_status": "failed",
                "osm_objects_found": None,
                "industrial_nearby": None,
                "nearest_industrial_km": None,
                "nearest_industrial_type": None,
                "nearest_industrial_name": None
            })

    else:

        elements = data.get("elements", [])

        print(
            "OSM objects found:",
            len(elements)
        )

        for _, row in batch.iterrows():

            lat = row["latitude"]
            lon = row["longitude"]

            nearest_distance = None
            nearest_type = None
            nearest_name = None

            for element in elements:

                if element["type"] == "node":

                    facility_lat = element["lat"]
                    facility_lon = element["lon"]

                else:

                    center = element.get("center")

                    if not center:
                        continue

                    facility_lat = center["lat"]
                    facility_lon = center["lon"]

                distance = distance_km(
                    lat,
                    lon,
                    facility_lat,
                    facility_lon
                )

                if distance <= 5:

                    if (
                        nearest_distance is None
                        or distance < nearest_distance
                    ):

                        nearest_distance = distance

                        tags = element.get(
                            "tags",
                            {}
                        )

                        nearest_type = (
                            tags.get("power")
                            or tags.get("industrial")
                            or tags.get("landuse")
                            or tags.get("man_made")
                            or "unknown"
                        )

                        nearest_name = tags.get(
                            "name:en"
                        ) or tags.get(
                            "name"
                        )

            all_results.append({
                "osm_status": "success",
                "osm_objects_found": len(elements),
                "industrial_nearby": (
                    1
                    if nearest_distance is not None
                    else 0
                ),
                "nearest_industrial_km": (
                    round(nearest_distance, 3)
                    if nearest_distance is not None
                    else None
                ),
                "nearest_industrial_type": nearest_type,
                "nearest_industrial_name": nearest_name
            })

    # Wait before next batch
    if end < len(df):
        print("Waiting 35 seconds before next batch...")
        time.sleep(35)


# --------------------------------
# Save final dataset
# --------------------------------

osm_df = pd.DataFrame(all_results)

final_df = pd.concat(
    [
        df.reset_index(drop=True),
        osm_df
    ],
    axis=1
)

final_df.to_csv(
    "firms_osm_features.csv",
    index=False
)

print()
print("=" * 50)
print("DONE")
print("=" * 50)

print(
    "Saved as: firms_osm_features.csv"
)

print(
    "Total FIRMS points:",
    len(final_df)
)

print(
    "Successful OSM queries:",
    (final_df["osm_status"] == "success").sum()
)

print(
    "Failed OSM queries:",
    (final_df["osm_status"] == "failed").sum()
)