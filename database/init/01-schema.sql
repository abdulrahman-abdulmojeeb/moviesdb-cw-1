-- MovieLens Database Schema
-- COMP0022 Database and Information Systems Coursework

-- ============================================
-- Core Tables (MovieLens Data)
-- ============================================

-- Movies table
CREATE TABLE IF NOT EXISTS movies (
    movie_id INTEGER PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    release_year INTEGER,
    imdb_id VARCHAR(20),
    tmdb_id INTEGER
);

COMMENT ON TABLE movies IS 'Core movie information from MovieLens dataset';

-- Genres table (normalized from pipe-separated genre string)
CREATE TABLE IF NOT EXISTS genres (
    genre_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

COMMENT ON TABLE genres IS 'Distinct genre categories';

-- Movie-Genre junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS movie_genres (
    movie_id INTEGER NOT NULL REFERENCES movies(movie_id) ON DELETE CASCADE,
    genre_id INTEGER NOT NULL REFERENCES genres(genre_id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

COMMENT ON TABLE movie_genres IS 'Many-to-many relationship between movies and genres';

-- Users table (MovieLens users who provide ratings)
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS 'MovieLens users who have provided ratings';

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
    rating_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL REFERENCES movies(movie_id) ON DELETE CASCADE,
    rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0),
    timestamp BIGINT NOT NULL,
    UNIQUE (user_id, movie_id)
);

COMMENT ON TABLE ratings IS 'User ratings for movies (0.5-5.0 scale)';

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    tag_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL REFERENCES movies(movie_id) ON DELETE CASCADE,
    tag_text VARCHAR(500) NOT NULL,
    timestamp BIGINT NOT NULL
);

COMMENT ON TABLE tags IS 'User-generated tags for movies';

-- ============================================
-- Personality Data Tables (Requirement 5)
-- ============================================

-- Personality traits for users (Big Five model)
CREATE TABLE IF NOT EXISTS personality_users (
    user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    openness DECIMAL(4,2) CHECK (openness >= 1.0 AND openness <= 5.0),
    agreeableness DECIMAL(4,2) CHECK (agreeableness >= 1.0 AND agreeableness <= 5.0),
    emotional_stability DECIMAL(4,2) CHECK (emotional_stability >= 1.0 AND emotional_stability <= 5.0),
    conscientiousness DECIMAL(4,2) CHECK (conscientiousness >= 1.0 AND conscientiousness <= 5.0),
    extraversion DECIMAL(4,2) CHECK (extraversion >= 1.0 AND extraversion <= 5.0)
);

COMMENT ON TABLE personality_users IS 'Big Five personality traits for users (Requirement 5)';


CREATE TABLE IF NOT EXISTS personality_app_users (
    user_id INTEGER PRIMARY KEY REFERENCES app_users(user_id) ON DELETE CASCADE,
    openness DECIMAL(4,2) CHECK (openness >= 1.0 AND openness <= 5.0),
    agreeableness DECIMAL(4,2) CHECK (agreeableness >= 1.0 AND agreeableness <= 5.0),
    emotional_stability DECIMAL(4,2) CHECK (emotional_stability >= 1.0 AND emotional_stability <= 5.0),
    conscientiousness DECIMAL(4,2) CHECK (conscientiousness >= 1.0 AND conscientiousness <= 5.0),
    extraversion DECIMAL(4,2) CHECK (extraversion >= 1.0 AND extraversion <= 5.0)
);

-- ============================================
-- Application User Tables (Requirement 6)
-- ============================================

-- Application users (for collection feature - separate from MovieLens users)
CREATE TABLE IF NOT EXISTS app_users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

COMMENT ON TABLE app_users IS 'Application users for the collection planner feature';

-- Personality traits for app users
CREATE TABLE IF NOT EXISTS personality_app_users (
    user_id INTEGER PRIMARY KEY REFERENCES app_users(user_id) ON DELETE CASCADE,
    openness DECIMAL(4,2) CHECK (openness >= 1.0 AND openness <= 5.0),
    agreeableness DECIMAL(4,2) CHECK (agreeableness >= 1.0 AND agreeableness <= 5.0),
    emotional_stability DECIMAL(4,2) CHECK (emotional_stability >= 1.0 AND emotional_stability <= 5.0),
    conscientiousness DECIMAL(4,2) CHECK (conscientiousness >= 1.0 AND conscientiousness <= 5.0),
    extraversion DECIMAL(4,2) CHECK (extraversion >= 1.0 AND extraversion <= 5.0)
);

-- App user ratings table
CREATE TABLE IF NOT EXISTS app_user_ratings (
    rating_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL REFERENCES movies(movie_id) ON DELETE CASCADE,
    rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0),
    timestamp BIGINT NOT NULL,
    UNIQUE (user_id, movie_id)
);

-- Collections (curated lists of movies)
CREATE TABLE IF NOT EXISTS collections (
    collection_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE collections IS 'User-created movie collection lists (Requirement 6)';

-- Collection items (movies in a collection)
CREATE TABLE IF NOT EXISTS collection_items (
    item_id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES collections(collection_id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL REFERENCES movies(movie_id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (collection_id, movie_id)
);

COMMENT ON TABLE collection_items IS 'Movies added to collections';

-- ============================================
-- Optional Enhancement Tables
-- ============================================

-- Extended movie details (from TMDB API)
CREATE TABLE IF NOT EXISTS movie_details (
    movie_id INTEGER PRIMARY KEY REFERENCES movies(movie_id) ON DELETE CASCADE,
    poster_path VARCHAR(255),
    backdrop_path VARCHAR(255),
    overview TEXT,
    runtime INTEGER,
    budget BIGINT,
    revenue BIGINT,
    popularity DECIMAL(10,3),
    vote_average DECIMAL(3,1),
    vote_count INTEGER,
    director VARCHAR(255),
    lead_actors TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE movie_details IS 'Extended movie metadata from TMDB API';

-- Movie links (for external references)
CREATE TABLE IF NOT EXISTS links (
    movie_id INTEGER PRIMARY KEY REFERENCES movies(movie_id) ON DELETE CASCADE,
    imdb_id VARCHAR(20),
    tmdb_id INTEGER
);

COMMENT ON TABLE links IS 'External movie database identifiers';

-- Data integrity notes:
-- ratings.rating: CHECK (rating >= 0.5 AND rating <= 5.0) enforces MovieLens scale
-- app_user_ratings.rating: same CHECK constraint for application users
-- All FK columns are NOT NULL to prevent orphaned associations
-- UNIQUE(user_id, movie_id) on ratings prevents duplicate ratings per user
