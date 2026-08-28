import pandas as pd
import rasterio
import glob
import os

df = pd.read_csv("firms_osm_features.csv")

tiles = glob.glob("landcover/*.tif")

classes = {
    10: "Tree cover",
    20: "Shrubland",
    30: "Grassland",
    40: "Cropland",
    50: "Built-up",
    60: "Bare/sparse vegetation",
    70: "Snow/ice",
    80: "Permanent water",
    90: "Herbaceous wetland",
    95: "Mangroves",
    100: "Moss/lichen"
}

results = []

for i, row in df.iterrows():

    lat = row["latitude"]
    lon = row["longitude"]

    print(f"Processing {i + 1}/{len(df)}")

    found = False

    for tile in tiles:

        with rasterio.open(tile) as src:

            # Check whether this point falls inside this tile
            if not (
                src.bounds.left <= lon <= src.bounds.right
                and
                src.bounds.bottom <= lat <= src.bounds.top
            ):
                continue

            # Convert latitude/longitude to raster row/column
            row_col = src.index(lon, lat)

            value = src.read(1)[row_col]

            land_class = int(value)

            results.append({
                "land_cover_class": land_class,
                "land_cover_name": classes.get(
                    land_class,
                    "Unknown"
                )
            })

            found = True
            break

    if not found:

        results.append({
            "land_cover_class": None,
            "land_cover_name": "Unknown"
        })


land_df = pd.DataFrame(results)

final_df = pd.concat(
    [
        df.reset_index(drop=True),
        land_df
    ],
    axis=1
)

final_df.to_csv(
    "firms_landcover_features.csv",
    index=False
)

print()
print("Done!")
print("Saved as: firms_landcover_features.csv")