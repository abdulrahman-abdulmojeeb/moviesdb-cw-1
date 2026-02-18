# Database Documentation

## Entity Relationship Overview

The database consists of 11 core tables organised into four groups:

### Movie Data (MovieLens)
- **movies** — Core movie records with title, release year, and external IDs (IMDb, TMDB)
- **genres** — 20 standardised genre categories
- **movie_genres** — Many-to-many junction table linking movies to genres
- **users** — MovieLens user records (anonymised)
- **ratings** — User ratings on a 0.5–5.0 scale with timestamps
- **tags** — Free-text user-generated tags with timestamps
- **links** — External database identifiers (IMDb, TMDB)

### External Enrichment
- **movie_details** — TMDB data: posters, backdrops, overviews, runtime, budget, revenue, cast, crew
- **external_ratings** — Aggregated scores from IMDb, Rotten Tomatoes, and Metacritic

### Personality Data
- **personality_users** — Big Five personality traits (openness, agreeableness, emotional stability, conscientiousness, extraversion) mapped to MovieLens users

### Application Data
- **app_users** — Application user accounts with bcrypt password hashes
- **collections** — User-created movie lists with public/private visibility
- **collection_items** — Movies within collections, with optional notes

## Index Strategy

30+ indexes are defined in `init/02-indexes.sql` covering:

- **Primary lookups**: movie title search, user ratings, genre filtering
- **Full-text search**: GIN index on tag text for keyword queries
- **Composite indexes**: `(user_id, movie_id)` for unique rating lookups
- **Personality queries**: Individual trait indexes for correlation analysis
- **External data**: IMDb ID lookups, TMDB ID lookups

## Query Patterns

### Movie Search (paginated)
Filters by title (ILIKE), genre, year range, and minimum rating. Uses whitelist-based ORDER BY to prevent SQL injection.

### Genre Popularity
Aggregates average ratings per genre with movie counts. Used by the genre reports page.

### Genre Polarisation
Classifies ratings into low (< 2.5), mid (2.5–3.5), and high (> 3.5) buckets per genre to measure audience division.

### Rating Predictions
Finds similar movies by genre overlap (>= 50% match), then aggregates their ratings to predict scores for new titles.

### Personality Correlations
Joins personality traits with user ratings to find correlations between Big Five dimensions and genre preferences.

## Schema Files

| File                     | Description                                      |
|--------------------------|--------------------------------------------------|
| `init/01-schema.sql`    | Core table definitions with constraints           |
| `init/02-indexes.sql`   | Performance indexes                               |
| `init/03-external-ratings.sql` | External ratings table and TMDB details    |
