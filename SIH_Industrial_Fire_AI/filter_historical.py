import pandas as pd
import geopandas as gpd

# Load historical FIRMS data
df = pd.read_csv("firms_historical_raw.csv")

# Create points from FIRMS coordinates
points = gpd.GeoDataFrame(
    df,
    geometry=gpd.points_from_xy(
        df.longitude,
        df.latitude
    ),
    crs="EPSG:4326"
)

# Load India/world boundary
world = gpd.read_file(
    "ne_110m_admin_0_countries.shp"
)

# Select India
india = world[
    world["ADMIN"] == "India"
]

# Make sure same CRS
india = india.to_crs("EPSG:4326")

# Keep only points inside India
india_points = gpd.sjoin(
    points,
    india[["geometry"]],
    predicate="within",
    how="inner"
)

# Remove GIS columns
india_points = india_points.drop(
    columns=["geometry", "index_right"],
    errors="ignore"
)

# Save
india_points.to_csv(
    "firms_historical_india.csv",
    index=False
)

print("================================")
print("HISTORICAL INDIA DATA")
print("================================")
print("Original records:", len(df))
print("India records:", len(india_points))
print(
    "Saved as: firms_historical_india.csv"
)