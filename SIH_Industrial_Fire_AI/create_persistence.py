import pandas as pd
import numpy as np

df = pd.read_csv("firms_historical_india.csv")

print("Total records:", len(df))

# Convert date
df["acq_date"] = pd.to_datetime(df["acq_date"])

# Create a spatial grid
# Approximately 1 km grid
df["lat_grid"] = np.round(df["latitude"], 2)
df["lon_grid"] = np.round(df["longitude"], 2)

# Count how many detections occurred
# in each grid cell
persistence = (
    df.groupby(
        ["lat_grid", "lon_grid"]
    )
    .size()
    .reset_index(
        name="persistence_count"
    )
)

# Attach persistence count to every detection
df = df.merge(
    persistence,
    on=["lat_grid", "lon_grid"],
    how="left"
)

# Remove helper columns
df = df.drop(
    columns=["lat_grid", "lon_grid"]
)

df.to_csv(
    "firms_persistence.csv",
    index=False
)

print()
print("================================")
print("PERSISTENCE CREATED")
print("================================")

print(
    "Total records:",
    len(df)
)

print(
    "Unique thermal locations:",
    len(persistence)
)

print()
print("Persistence statistics:")
print(
    df["persistence_count"].describe()
)

print()
print(
    "Saved as: firms_persistence.csv"
)