import pandas as pd
from config import MAP_KEY

SOURCE = "VIIRS_SNPP_NRT"
AREA = "68,6,98,36"
DAY_RANGE = 1

url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{AREA}/{DAY_RANGE}"

df = pd.read_csv(url)

print("Number of records:", len(df))
print("\nColumns:")
print(df.columns.tolist())

print("\nFirst 5 rows:")
print(df.head())

df.to_csv("firms_raw.csv", index=False)

print("\nData saved to firms_raw.csv")