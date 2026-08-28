import requests
from math import radians, sin, cos, sqrt, atan2

lat = 9.38904
lon = 78.88414
radius = 5000

query = f"""
[out:json][timeout:30];
(
  nwr["industrial"](around:{radius},{lat},{lon});
  nwr["landuse"="industrial"](around:{radius},{lat},{lon});
  nwr["man_made"="works"](around:{radius},{lat},{lon});
  nwr["power"="plant"](around:{radius},{lat},{lon});
  nwr["man_made"="storage_tank"](around:{radius},{lat},{lon});
);
out center tags;
"""

url = "https://overpass-api.de/api/interpreter"

response = requests.post(
    url,
    data={"data": query},
    headers={"User-Agent": "SIH-Industrial-Fire-AI/1.0"},
    timeout=60
)

print("HTTP status:", response.status_code)

if not response.ok:
    print(response.text[:1000])
    exit()

data = response.json()


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


print("Number of OSM objects found:", len(data["elements"]))

for element in data["elements"]:

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

    tags = element.get("tags", {})

    print("\n--------------------")
    print("Name:", tags.get("name", "Unknown"))
    print("Type:", element["type"])
    print("Power:", tags.get("power", "N/A"))
    print("Industrial:", tags.get("industrial", "N/A"))
    print("Landuse:", tags.get("landuse", "N/A"))
    print("Distance:", round(distance, 2), "km")