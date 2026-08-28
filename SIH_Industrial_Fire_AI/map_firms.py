import pandas as pd
import folium

df = pd.read_csv("firms_raw.csv")

center_lat = df["latitude"].mean()
center_lon = df["longitude"].mean()

m = folium.Map(
    location=[center_lat, center_lon],
    zoom_start=5
)

for _, row in df.iterrows():

    popup = f"""
    Latitude: {row['latitude']}<br>
    Longitude: {row['longitude']}<br>
    Brightness: {row['bright_ti4']} K<br>
    FRP: {row['frp']} MW<br>
    Confidence: {row['confidence']}<br>
    Date: {row['acq_date']}<br>
    Time: {row['acq_time']}
    """

    folium.CircleMarker(
        location=[row["latitude"], row["longitude"]],
        radius=5,
        popup=popup,
        fill=True
    ).add_to(m)

m.save("firms_map.html")

print("Map saved as firms_map.html")