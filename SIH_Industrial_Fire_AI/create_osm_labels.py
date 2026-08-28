import pandas as pd
import requests
import time
from math import radians, sin, cos, sqrt, atan2

df = pd.read_csv("training_with_landcover.csv")

# One row per thermal location
locations = (
    df.sort_values(
        "persistence_count",
        ascending=False
    )
    .drop_duplicates(
        ["latitude", "longitude"]
    )
)

# 100 highly persistent locations
high = locations[
    locations["persistence_count"] >= 10
].head(100)

# 100 low-persistence locations
low = locations[
    locations["persistence_count"] <= 2
].sample(
    n=min(100, len(
        locations[
            locations["persistence_count"] <= 2
        ]
    )),
    random_state=42
)

candidates = pd.concat(
    [high, low],
    ignore_index=True
)

print("Candidates:", len(candidates))

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


def query_osm(batch):

    parts = []

    for _, row in batch.iterrows():

        lat = row["latitude"]
        lon = row["longitude"]

        parts.append(
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

            print(
                "HTTP status:",
                response.status_code
            )

            if response.status_code == 200:
                return response.json().get(
                    "elements",
                    []
                )

            if response.status_code == 429:
                print("Rate limited. Waiting 30 seconds...")
                time.sleep(30)

            else:
                time.sleep(10)

        except Exception as e:

            print("OSM error:", e)
            time.sleep(15)

    return []


results = []

batch_size = 20

for start in range(
    0,
    len(candidates),
    batch_size
):

    end = min(
        start + batch_size,
        len(candidates)
    )

    batch = candidates.iloc[start:end]

    print(
        f"\nProcessing {start + 1}-{end}"
        f"/{len(candidates)}"
    )

    elements = query_osm(batch)

    print(
        "OSM objects found:",
        len(elements)
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

        # OSM-based independent label
        label = (
            1 if nearest is not None else 0
        )

        results.append({
            "latitude": lat,
            "longitude": lon,
            "osm_industrial_nearby":
                1 if nearest is not None else 0,
            "osm_distance_km":
                nearest,
            "osm_type":
                nearest_type,
            "label": label
        })

    if end < len(candidates):
        print("Waiting 10 seconds...")
        time.sleep(10)


labels = pd.DataFrame(results)

labels.to_csv(
    "osm_verified_labels.csv",
    index=False
)

print()
print("==============================")
print("OSM LABELS COMPLETE")
print("==============================")
print("Total:", len(labels))
print(
    "Industrial:",
    (labels["label"] == 1).sum()
)
print(
    "Other:",
    (labels["label"] == 0).sum()
)
print(
    "Saved as: osm_verified_labels.csv"
)