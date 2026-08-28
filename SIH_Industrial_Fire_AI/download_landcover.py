import requests
import os

tiles = [
    "N09E075",
    "N09E078",
    "N12E078",
    "N15E075",
    "N15E078",
    "N18E072",
    "N21E081",
    "N30E072",
    "N33E072"
]

os.makedirs("landcover", exist_ok=True)

base_url = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/"

for tile in tiles:

    filename = f"ESA_WorldCover_10m_2021_v200_{tile}_Map.tif"

    url = base_url + filename

    filepath = os.path.join(
        "landcover",
        filename
    )

    if os.path.exists(filepath):
        print(f"Already exists: {filename}")
        continue

    print(f"\nDownloading: {filename}")

    response = requests.get(
        url,
        stream=True,
        timeout=120
    )

    if response.status_code != 200:
        print(
            f"Failed: HTTP {response.status_code}"
        )
        continue

    total = 0

    with open(filepath, "wb") as f:

        for chunk in response.iter_content(
            chunk_size=1024 * 1024
        ):

            if chunk:
                f.write(chunk)
                total += len(chunk)

    print(
        f"Downloaded: {total / (1024**2):.1f} MB"
    )

print("\nFinished.")