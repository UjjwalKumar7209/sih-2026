import pandas as pd

df = pd.read_csv("firms_persistence.csv")

# One row per thermal location
locations = (
    df.sort_values(
        "persistence_count",
        ascending=False
    )
    .drop_duplicates(
        ["latitude", "longitude"]
    )
)

print("Unique locations:", len(locations))

# High persistence
high = locations[
    locations["persistence_count"] >= 10
].sample(
    n=min(
        1000,
        len(
            locations[
                locations["persistence_count"] >= 10
            ]
        )
    ),
    random_state=42
)

# Low persistence
low_pool = locations[
    locations["persistence_count"] <= 2
]

low = low_pool.sample(
    n=min(1000, len(low_pool)),
    random_state=42
)

# Middle/random cases
remaining = locations[
    ~locations.index.isin(
        high.index
    )
    &
    ~locations.index.isin(
        low.index
    )
]

middle = remaining.sample(
    n=min(1000, len(remaining)),
    random_state=42
)

sample = pd.concat(
    [high, low, middle]
)

sample = sample.sample(
    frac=1,
    random_state=42
)

sample.to_csv(
    "training_candidates.csv",
    index=False
)

print()
print("==============================")
print("TRAINING SAMPLE CREATED")
print("==============================")
print("High persistence:", len(high))
print("Low persistence:", len(low))
print("Middle/random:", len(middle))
print("Total:", len(sample))

print()
print(
    "Saved as: training_candidates.csv"
)