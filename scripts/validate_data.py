"""
Data validation checks for MovieLens CSV files.
Run before loading to catch schema issues early.
"""
import csv
import sys
import os

EXPECTED_SCHEMAS = {
    "movies.csv": ["movieId", "title", "genres"],
    "ratings.csv": ["userId", "movieId", "rating", "timestamp"],
    "tags.csv": ["userId", "movieId", "tag", "timestamp"],
    "links.csv": ["movieId", "imdbId", "tmdbId"],
}

def validate_file(filepath, expected_cols):
    """Check CSV headers match expected schema."""
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        headers = next(reader)
        if headers != expected_cols:
            print(f"  FAIL: {os.path.basename(filepath)}")
            print(f"    Expected: {expected_cols}")
            print(f"    Got:      {headers}")
            return False
        row_count = sum(1 for _ in reader)
        print(f"  OK: {os.path.basename(filepath)} ({row_count:,} rows)")
        return True

def main():
    data_dir = sys.argv[1] if len(sys.argv) > 1 else "data/ml-latest-small"
    print(f"Validating MovieLens data in {data_dir}...")
    all_ok = True
    for filename, cols in EXPECTED_SCHEMAS.items():
        path = os.path.join(data_dir, filename)
        if not os.path.exists(path):
            print(f"  MISSING: {filename}")
            all_ok = False
            continue
        if not validate_file(path, cols):
            all_ok = False
    sys.exit(0 if all_ok else 1)

if __name__ == "__main__":
    main()
