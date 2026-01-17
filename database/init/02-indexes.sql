-- Performance Indexes for MovieLens Database
-- These indexes optimize the queries required for the dashboard and reports

-- ============================================
-- Movie Search Indexes
-- ============================================

-- Index for title search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_movies_title_lower ON movies (LOWER(title));

-- Index for year-based filtering
CREATE INDEX IF NOT EXISTS idx_movies_release_year ON movies (release_year);

-- Index for TMDB lookups
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies (tmdb_id);

-- ============================================
-- Rating Indexes (Critical for Performance)
-- ============================================

-- Composite index for movie rating aggregations
CREATE INDEX IF NOT EXISTS idx_ratings_movie_id ON ratings (movie_id);

-- Composite index for user rating history
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings (user_id);

-- Index for rating value filtering
CREATE INDEX IF NOT EXISTS idx_ratings_value ON ratings (rating);

-- Composite index for user-movie lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_ratings_user_movie ON ratings (user_id, movie_id);

-- ============================================
-- Genre Indexes
-- ============================================

-- Index for genre name lookups
CREATE INDEX IF NOT EXISTS idx_genres_name ON genres (name);

-- Indexes for movie-genre junction table
CREATE INDEX IF NOT EXISTS idx_movie_genres_movie ON movie_genres (movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_genres_genre ON movie_genres (genre_id);

-- ============================================
-- Tag Indexes
-- ============================================

-- Index for tag text search
CREATE INDEX IF NOT EXISTS idx_tags_text ON tags USING gin (to_tsvector('english', tag_text));

-- Index for movie tags
CREATE INDEX IF NOT EXISTS idx_tags_movie_id ON tags (movie_id);

-- Index for user tags
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags (user_id);

-- ============================================
-- Personality Analysis Indexes
-- ============================================

-- Indexes for personality trait queries
CREATE INDEX IF NOT EXISTS idx_personality_openness ON personality_users (openness);
CREATE INDEX IF NOT EXISTS idx_personality_extraversion ON personality_users (extraversion);
CREATE INDEX IF NOT EXISTS idx_personality_agreeableness ON personality_users (agreeableness);
CREATE INDEX IF NOT EXISTS idx_personality_conscientiousness ON personality_users (conscientiousness);
CREATE INDEX IF NOT EXISTS idx_personality_stability ON personality_users (emotional_stability);

-- ============================================
-- Collection Indexes
-- ============================================

-- Index for user collections lookup
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections (user_id);

-- Index for collection items
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items (collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_movie ON collection_items (movie_id);

-- ============================================
-- App User Indexes
-- ============================================

-- Index for username lookup (login)
CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users (username);

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users (email);
