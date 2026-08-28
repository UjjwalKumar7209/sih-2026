import pandas as pd
import rasterio
import glob

df = pd.read_csv("training_candidates.csv")

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

# Open each tile only once
opened_tiles = []

for tile in tiles:
    src = rasterio.open(tile)
    opened_tiles.append((tile, src))

for i, point in df.iterrows():

    lat = point["latitude"]
    lon = point["longitude"]

    found = False

    for tile, src in opened_tiles:

        if not (
            src.bounds.left <= lon <= src.bounds.right
            and
            src.bounds.bottom <= lat <= src.bounds.top
        ):
            continue

        # Read only the pixel we need
        value = next(
            src.sample([(lon, lat)])
        )[0]

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

    if (i + 1) % 100 == 0:
        print(f"Processed {i + 1}/{len(df)}")


# Close files
for tile, src in opened_tiles:
    src.close()


land_df = pd.DataFrame(results)

final_df = pd.concat(
    [
        df.reset_index(drop=True),
        land_df
    ],
    axis=1
)

final_df.to_csv(
    "training_with_landcover.csv",
    index=False
)

print()
print("==============================")
print("DONE")
print("==============================")
print("Rows:", len(final_df))
print("Saved as: training_with_landcover.csv")