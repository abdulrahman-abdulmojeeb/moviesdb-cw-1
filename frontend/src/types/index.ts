export interface Movie {
  movie_id: number
  title: string
  release_year: number | null
  imdb_id: string | null
  tmdb_id: number | null
  avg_rating: number
  rating_count: number
  genres: string[]
  tags?: string[]
  // TMDB data
  poster_path?: string | null
  poster_url?: string | null
  overview?: string | null
  backdrop_url?: string | null
  runtime?: number | null
  director?: string | null
  lead_actors?: string | null
  budget?: number | null
  revenue?: number | null
  popularity?: number | null
  vote_average?: number | null
  vote_count?: number | null
  // External ratings (OMDb)
  imdb_rating?: number | null
  imdb_votes?: number | null
  rotten_tomatoes_score?: number | null
  metacritic_score?: number | null
  box_office?: string | null
  awards?: string | null
  rated?: string | null
}

export interface MovieRatingsResponse {
  movie_id: number
  distribution: RatingDistribution[]
  stats: RatingStats
}

export interface Genre {
  genre_id: number
  name: string
  movie_count: number
}

export interface GenrePopularity {
  genre: string
  total_ratings: number
  movie_count: number
  avg_rating: number
  rating_stddev: number
}

export interface GenrePolarisation {
  genre: string
  total_ratings: number
  low_pct: number
  mid_pct: number
  high_pct: number
  polarisation_score: number
}

export interface RatingDistribution {
  rating: number
  count: number
  percentage?: number
}

export interface RatingStats {
  mean: number | null
  stddev: number | null
  min: number | null
  max: number | null
  total: number
}

export interface PredictionResult {
  title: string
  genres: string[]
  prediction: {
    mean_rating: number
    weighted_rating: number
    uncertainty: number
    confidence_interval: {
      low: number
      high: number
    }
    based_on_ratings: number
  }
  distribution: RatingDistribution[]
}

export interface PersonalityTrait {
  trait: string
  mean: number
  stddev: number
  min: number
  max: number
}

export interface Collection {
  collection_id: number
  title: string
  note: string | null
  created_at: string
  movie_count: number
}

export interface CollectionDetail {
  collection_id: number
  title: string
  note?: string
  movies: {
    movie_id: number
    title: string
    release_year: number
    avg_rating: number
    added_at: string
    genres: string[]
  }[]
}

export interface User {
  id: number
  username: string
  email: string | null
  created_at: string
  is_active: boolean
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface PaginatedResponse<T> {
  movies: T[]
  page: number
  limit: number
  total: number
  pages: number
}
