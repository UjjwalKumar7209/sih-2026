import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score
)

# Load data
features = pd.read_csv(
    "training_with_landcover.csv"
)

labels = pd.read_csv(
    "osm_verified_labels.csv"
)

# Match labels with original data
data = features.merge(
    labels[
        [
            "latitude",
            "longitude",
            "label"
        ]
    ],
    on=["latitude", "longitude"],
    how="inner"
)

print("Matched samples:", len(data))

# Model features
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
y = data["label"]

# Convert confidence
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

# Handle missing values
X = X.fillna(0)

print("Industrial:", (y == 1).sum())
print("Other:", (y == 0).sum())

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.25,
    random_state=42,
    stratify=y
)

# Model
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=8,
    random_state=42,
    class_weight="balanced"
)

model.fit(
    X_train,
    y_train
)

# Test
predictions = model.predict(X_test)

print()
print("==============================")
print("FINAL MODEL RESULTS")
print("==============================")

print(
    "Accuracy:",
    round(
        accuracy_score(
            y_test,
            predictions
        ),
        4
    )
)

print()
print(
    classification_report(
        y_test,
        predictions,
        target_names=[
            "Other",
            "Industrial"
        ]
    )
)

print("Confusion Matrix:")
print(
    confusion_matrix(
        y_test,
        predictions
    )
)

# Feature importance
print()
print("Feature Importance:")

importance = pd.Series(
    model.feature_importances_,
    index=feature_names
).sort_values(
    ascending=False
)

print(importance)

# Save model
joblib.dump(
    model,
    "industrial_fire_model_final.joblib"
)

print()
print("==============================")
print("FINAL MODEL SAVED")
print("==============================")
print(
    "industrial_fire_model_final.joblib"
)