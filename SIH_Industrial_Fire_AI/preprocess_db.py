import pandas as pd
import numpy as np
import joblib
import json
import os

# Load training data with landcover (3000 rows)
features = pd.read_csv("training_with_landcover.csv")

# Load OSM verified labels (200 rows)
labels = pd.read_csv("osm_verified_labels.csv")

# Merge features and labels on lat/lon (left join so we keep all 3000 rows)
data = features.merge(
    labels[["latitude", "longitude", "osm_industrial_nearby", "osm_distance_km", "osm_type", "label"]],
    on=["latitude", "longitude"],
    how="left"
)

# Load the trained Random Forest model
model = joblib.load("industrial_fire_model_final.joblib")

# Prepare features for prediction
feature_names = [
    "bright_ti4",
    "bright_ti5",
    "frp",
    "confidence",
    "scan",
    "track",
    "persistence_count",
    "land_cover_class"
]

X = data[feature_names].copy()

# Confidence mapping
confidence_map = {"l": 0, "n": 1, "h": 2}
X["confidence"] = X["confidence"].map(confidence_map).fillna(0)

# Fill NaNs with 0
X = X.fillna(0)

# Predict labels and probabilities
predictions = model.predict(X)
probabilities = model.predict_proba(X) # Shape: [3000, 2]

# Add prediction columns
data["prediction"] = predictions.tolist()
data["probability"] = probabilities[:, 1].tolist() # Probability of class 1 (Industrial)

# Clean up NaN values for JSON serialization (convert to None/null)
data = data.replace({np.nan: None})

# Construct final list of records
records = []
for _, row in data.iterrows():
    record = {
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
        "bright_ti4": float(row["bright_ti4"]) if row["bright_ti4"] is not None else 0.0,
        "bright_ti5": float(row["bright_ti5"]) if row["bright_ti5"] is not None else 0.0,
        "frp": float(row["frp"]) if row["frp"] is not None else 0.0,
        "confidence": str(row["confidence"]) if row["confidence"] is not None else "n",
        "scan": float(row["scan"]) if row["scan"] is not None else 0.5,
        "track": float(row["track"]) if row["track"] is not None else 0.5,
        "acq_date": str(row["acq_date"]),
        "acq_time": int(row["acq_time"]) if row["acq_time"] is not None else 0,
        "satellite": str(row["satellite"]) if row["satellite"] is not None else "N",
        "instrument": str(row["instrument"]) if row["instrument"] is not None else "VIIRS",
        "daynight": str(row["daynight"]) if row["daynight"] is not None else "D",
        "persistence_count": int(row["persistence_count"]) if row["persistence_count"] is not None else 0,
        "land_cover_class": int(row["land_cover_class"]) if row["land_cover_class"] is not None else 0,
        "land_cover_name": str(row["land_cover_name"]) if row["land_cover_name"] is not None else "Unknown",
        
        # OSM details
        "osm_industrial_nearby": int(row["osm_industrial_nearby"]) if row["osm_industrial_nearby"] is not None else None,
        "osm_distance_km": float(row["osm_distance_km"]) if row["osm_distance_km"] is not None else None,
        "osm_type": str(row["osm_type"]) if row["osm_type"] is not None else None,
        
        # True label (if matched on OSM verified labels)
        "true_label": int(row["label"]) if row["label"] is not None else None,
        
        # Predictions
        "prediction": int(row["prediction"]),
        "probability": float(row["probability"])
    }
    records.append(record)

# Create output folder inside Next.js project
os.makedirs("../src/data", exist_ok=True)

# Save as JSON
output_path = "../src/data/detections.json"
with open(output_path, "w") as f:
    json.dump(records, f, indent=2)

print(f"Preprocessed {len(records)} records. Saved to {output_path}")
