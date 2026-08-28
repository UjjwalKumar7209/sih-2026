import pandas as pd

df = pd.read_csv("firms_raw.csv")

print("Shape:", df.shape)

print("\nDate:")
print(df["acq_date"].unique())

print("\nSatellites:")
print(df["satellite"].unique())

print("\nLatitude range:")
print(df["latitude"].min(), "to", df["latitude"].max())

print("\nLongitude range:")
print(df["longitude"].min(), "to", df["longitude"].max())

print("\nDay/Night:")
print(df["daynight"].value_counts())

print("\nConfidence:")
print(df["confidence"].value_counts())

print("\nFRP statistics:")
print(df["frp"].describe())