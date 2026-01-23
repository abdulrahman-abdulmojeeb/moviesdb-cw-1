"""
Quick data profiling for MovieLens CSVs.
Reports nulls, value ranges, and distribution summaries.
"""
import csv
import sys
import os
from collections import Counter

def profile_ratings(filepath):
    """Profile the ratings distribution."""
    ratings = []
    with open(filepath, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ratings.append(float(row["rating"]))
    
    counter = Counter(ratings)
    total = len(ratings)
    unique_users = set()
    unique_movies = set()
    
    with open(filepath, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            unique_users.add(row["userId"])
            unique_movies.add(row["movieId"])
    
    print(f"  Total ratings: {total:,}")
    print(f"  Unique users: {len(unique_users):,}")
    print(f"  Unique movies: {len(unique_movies):,}")
    print(f"  Rating range: {min(ratings)} - {max(ratings)}")
    print(f"  Mean rating: {sum(ratings)/len(ratings):.2f}")
    print(f"  Distribution:")
    for rating in sorted(counter.keys()):
        pct = counter[rating] / total * 100
        print(f"    {rating:.1f}: {counter[rating]:>6,} ({pct:5.1f}%)")

def main():
    data_dir = sys.argv[1] if len(sys.argv) > 1 else "data/ml-latest-small"
    ratings_path = os.path.join(data_dir, "ratings.csv")
    if os.path.exists(ratings_path):
        print(f"Profiling {ratings_path}...")
        profile_ratings(ratings_path)

if __name__ == "__main__":
    main()
