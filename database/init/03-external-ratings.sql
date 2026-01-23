-- External Ratings from OMDb API (IMDb, Rotten Tomatoes, Metacritic)
-- This table stores aggregated critic and audience scores from external sources

CREATE TABLE IF NOT EXISTS external_ratings (
    movie_id INTEGER PRIMARY KEY REFERENCES movies(movie_id) ON DELETE CASCADE,
    imdb_rating DECIMAL(3,1),        -- e.g., 8.7 (out of 10)
    imdb_votes INTEGER,               -- e.g., 2500000
    rotten_tomatoes_score INTEGER,    -- e.g., 93 (percentage, 0-100)
    metacritic_score INTEGER,         -- e.g., 82 (0-100)
    box_office VARCHAR(50),           -- e.g., "$28,341,469"
    awards TEXT,                      -- e.g., "Won 7 Oscars. 96 wins & 81 nominations total."
    rated VARCHAR(10),                -- e.g., "R", "PG-13", "PG"
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE external_ratings IS 'External ratings from OMDb API (IMDb, Rotten Tomatoes, Metacritic)';
COMMENT ON COLUMN external_ratings.imdb_rating IS 'IMDb user rating out of 10';
COMMENT ON COLUMN external_ratings.imdb_votes IS 'Number of IMDb user votes';
COMMENT ON COLUMN external_ratings.rotten_tomatoes_score IS 'Rotten Tomatoes Tomatometer percentage (0-100)';
COMMENT ON COLUMN external_ratings.metacritic_score IS 'Metacritic score (0-100)';
COMMENT ON COLUMN external_ratings.box_office IS 'Domestic box office earnings';
COMMENT ON COLUMN external_ratings.awards IS 'Awards summary from OMDb';
COMMENT ON COLUMN external_ratings.rated IS 'Content rating (G, PG, PG-13, R, etc.)';

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_external_ratings_imdb ON external_ratings(imdb_rating) WHERE imdb_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_external_ratings_rt ON external_ratings(rotten_tomatoes_score) WHERE rotten_tomatoes_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_external_ratings_meta ON external_ratings(metacritic_score) WHERE metacritic_score IS NOT NULL;
