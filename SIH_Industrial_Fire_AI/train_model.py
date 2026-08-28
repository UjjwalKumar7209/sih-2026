import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
import joblib

df = pd.read_csv("training_dataset.csv")

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

X = df[features].copy()
y = df["label"]

# Convert confidence to numbers
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

# Remove rows with missing values
valid = X.notna().all(axis=1)

X = X[valid]
y = y[valid]

print("Samples used:", len(X))
print("Features:", features)

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced"
)

model.fit(X_train, y_train)

predictions = model.predict(X_test)

print()
print("==============================")
print("MODEL RESULTS")
print("==============================")

print(
    classification_report(
        y_test,
        predictions
    )
)

print("Confusion Matrix:")
print(
    confusion_matrix(
        y_test,
        predictions
    )
)

joblib.dump(
    model,
    "industrial_fire_model.joblib"
)

print()
print("Model saved as:")
print("industrial_fire_model.joblib")