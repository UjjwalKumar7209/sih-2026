import pandas as pd
import geopandas as gpd

df = pd.read_csv("firms_raw.csv")

shp_file = "ne_110m_admin_0_countries.shp"

countries = gpd.read_file(shp_file)

india = countries[countries["ADMIN"] == "India"]

points = gpd.GeoDataFrame(
    df,
    geometry=gpd.points_from_xy(
        df["longitude"],
        df["latitude"]
    ),
    crs="EPSG:4326"
)

india = india.to_crs("EPSG:4326")

india_points = gpd.sjoin(
    points,
    india[["geometry"]],
    predicate="within",
    how="inner"
)

india_points = india_points.drop(
    columns=["geometry", "index_right"]
)

india_points.to_csv(
    "firms_india.csv",
    index=False
)

print("Original detections:", len(df))
print("Detections inside India:", len(india_points))
print("Removed:", len(df) - len(india_points))
print("\nSaved as firms_india.csv")