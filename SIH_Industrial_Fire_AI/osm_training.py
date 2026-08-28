import pandas as pd
import requests
import time
from math import radians, sin, cos, sqrt, atan2

df = pd.read_csv("training_with_landcover.csv")

URL = "https://overpass-api.de/api/interpreter"

HEADERS = {
    "User-Agent": "SIH-Industrial-Fire-AI/1.0"
}


def distance_km(lat1, lon1, lat2, lon2):

    R = 6371

    a1 = radians(lat1)
    a2 = radians(lat2)

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = (
        sin(dlat / 2) ** 2
        + cos(a1) * cos(a2)
        * sin(dlon / 2) ** 2
    )

    return R * 2 * atan2(
        sqrt(a),
        sqrt(1 - a)
    )


def query_osm(points):

    queries = []

    for lat, lon in points:

        queries.append(
            f'''
            nwr["industrial"](around:3000,{lat},{lon});
            nwr["landuse"="industrial"](around:3000,{lat},{lon});
            nwr["power"="plant"](around:3000,{lat},{lon});
            nwr["man_made"="works"](around:3000,{lat},{lon});
            '''
        )

    query = f"""
    [out:json][timeout:120];
    (
        {"".join(queries)}
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

            if response.status_code == 200:
                return response.json()

            print(
                "OSM status:",
                response.status_code
            )

            if response.status_code == 429:
                time.sleep(30)

            else:
                time.sleep(15)

        except Exception as e:

            print("OSM error:", e)
            time.sleep(15)

    return None


results = []

batch_size = 25

for start in range(
    0,
    len(df),
    batch_size
):

    end = min(
        start + batch_size,
        len(df)
    )

    batch = df.iloc[start:end]

    print(
        f"\nProcessing {start + 1}-{end}"
        f"/{len(df)}"
    )

    points = list(
        zip(
            batch["latitude"],
            batch["longitude"]
        )
    )

    data = query_osm(points)

    if data is None:

        print("Batch failed")

        for _ in range(len(batch)):

            results.append({
                "osm_status": "failed",
                "industrial_nearby": None,
                "nearest_industrial_km": None,
                "nearest_industrial_type": None
            })

    else:

        elements = data.get(
            "elements",
            []
        )

        for _, row in batch.iterrows():

            lat = row["latitude"]
            lon = row["longitude"]

            nearest = None
            nearest_type = None

            for element in elements:

                if element["type"] == "node":

                    elat = element["lat"]
                    elon = element["lon"]

                else:

                    center = element.get("center")

                    if not center:
                        continue

                    elat = center["lat"]
                    elon = center["lon"]

                distance = distance_km(
                    lat,
                    lon,
                    elat,
                    elon
                )

                if distance <= 3:

                    if (
                        nearest is None
                        or distance < nearest
                    ):

                        nearest = distance

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

            results.append({
                "osm_status": "success",
                "industrial_nearby": (
                    1 if nearest is not None else 0
                ),
                "nearest_industrial_km": (
                    round(nearest, 3)
                    if nearest is not None
                    else None
                ),
                "nearest_industrial_type": nearest_type
            })

    if end < len(df):

        print("Waiting 15 seconds...")
        time.sleep(15)


osm_df = pd.DataFrame(results)

final_df = pd.concat(
    [
        df.reset_index(drop=True),
        osm_df
    ],
    axis=1
)

final_df.to_csv(
    "training_features.csv",
    index=False
)

print()
print("==============================")
print("OSM TRAINING FEATURES DONE")
print("==============================")
print("Rows:", len(final_df))
print(
    "Successful:",
    (final_df["osm_status"] == "success").sum()
)
print(
    "Failed:",
    (final_df["osm_status"] == "failed").sum()
)
print("Saved: training_features.csv")