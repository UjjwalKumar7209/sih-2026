import pandas as pd

df = pd.read_csv("training_with_landcover.csv")

print("Total candidates:", len(df))

# -----------------------------
# Positive class:
# likely industrial thermal source
# -----------------------------

positive = df[
    (
        (df["land_cover_class"] == 50)
        &
        (df["persistence_count"] >= 5)
    )
    |
    (
        (df["persistence_count"] >= 15)
        &
        (df["frp"] >= 5)
    )
].copy()

# -----------------------------
# Negative class:
# likely natural/agricultural
# -----------------------------

negative = df[
    (
        df["land_cover_class"].isin([10, 20, 30, 40])
    )
    &
    (df["persistence_count"] <= 2)
].copy()

print("Potential positive:", len(positive))
print("Potential negative:", len(negative))

# Keep balanced classes
n = min(
    len(positive),
    len(negative),
    1000
)

positive = positive.sample(
    n=n,
    random_state=42
)

negative = negative.sample(
    n=n,
    random_state=42
)

positive["label"] = 1
negative["label"] = 0

data = pd.concat(
    [positive, negative],
    ignore_index=True
)

# Shuffle
data = data.sample(
    frac=1,
    random_state=42
).reset_index(drop=True)

data.to_csv(
    "training_dataset.csv",
    index=False
)

print()
print("==============================")
print("TRAINING DATASET CREATED")
print("==============================")
print("Industrial:", (data["label"] == 1).sum())
print("Other:", (data["label"] == 0).sum())
print("Total:", len(data))
print()
print("Saved as: training_dataset.csv")