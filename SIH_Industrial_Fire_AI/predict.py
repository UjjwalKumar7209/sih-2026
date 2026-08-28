import pandas as pd
import joblib

model = joblib.load(
    "industrial_fire_model.joblib"
)

data = pd.read_csv(
    "training_with_landcover.csv"
)

features = [
    "bright_ti4",
    "bright_ti5",
    "frp",
    "confidence",
    "scan",
    "track",
    "persistence_count",
    "land_cover_class"
]

X = data[features].copy()

confidence_map = {
    "l": 0,
    "n": 1,
    "h": 2
}

X["confidence"] = (
    X["confidence"]
    .map(confidence_map)
    .fillna(0)
)

X = X.fillna(0)

predictions = model.predict(X)

data["prediction"] = predictions

data["prediction_name"] = data[
    "prediction"
].map({
    0: "Other",
    1: "Industrial"
})

print(
    data[
        [
            "latitude",
            "longitude",
            "frp",
            "persistence_count",
            "land_cover_name",
            "prediction_name"
        ]
    ].head(30).to_string(index=False)
)