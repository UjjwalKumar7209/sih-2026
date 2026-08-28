import pandas as pd

df = pd.read_csv("firms_india.csv")

print("Shape:", df.shape)

print("\nFirst 5 rows:")
print(df.head())

print("\nLatitude range:")
print(df["latitude"].min(), "to", df["latitude"].max())

print("\nLongitude range:")
print(df["longitude"].min(), "to", df["longitude"].max())

print("\nConfidence:")
print(df["confidence"].value_counts())

print("\nFRP:")
print(df["frp"].describe())