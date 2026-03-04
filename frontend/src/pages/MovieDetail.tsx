import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { moviesApi, predictionsApi } from "../services/api"
import type { Movie, MovieRatingsResponse } from "../types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  Clock,
  Star,
  Users,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Film,
  Award,
  Plus, 
  Check
} from "lucide-react"
import { collectionsApi } from "../services/api";

interface SimilarMovie {
  movie_id: number
  title: string
  release_year: number | null
  poster_url: string | null
  matching_genres: number
  genre_similarity_pct: number
  avg_rating: number | null
  rating_count: number
}

interface SimilarMoviesResponse {
  source_movie: { movie_id: number; title: string }
  similar_movies: SimilarMovie[]
}

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const movieId = parseInt(id || "0", 10)

  const { data: movie, isLoading, error } = useQuery({
    queryKey: ["movie", movieId],
    queryFn: () => moviesApi.getMovie(movieId).then((res) => res.data as Movie),
    enabled: movieId > 0,
  })

  const { data: ratingsData } = useQuery({
    queryKey: ["movie-ratings", movieId],
    queryFn: () => moviesApi.getMovieRatings(movieId).then((res) => res.data as MovieRatingsResponse),
    enabled: movieId > 0,
  })

  const { data: similarData } = useQuery({
    queryKey: ["similar-movies", movieId],
    queryFn: () => predictionsApi.getSimilar(movieId, 6).then((res) => res.data as SimilarMoviesResponse),
    enabled: movieId > 0,
  })

  const queryClient = useQueryClient()

  const { data: collectionsData } = useQuery({
    queryKey: ["collections"],
    queryFn: () => collectionsApi.getCollections().then((res) => res.data),
  })

  const addMovieMutation = useMutation({
    mutationFn: (collectionId: number) =>
      collectionsApi.addMovie(collectionId, movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] })
    },
  })

  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) {
      return `$${(amount / 1_000_000_000).toFixed(1)}B`
    }
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`
    }
    if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(1)}K`
    }
    return `$${amount.toLocaleString()}`
  }

  // Color for 1-10 scale ratings (TMDB/IMDb)
  const getRatingColor = (rating: number) => {
    if (rating >= 7) return "text-green-500"
    if (rating >= 5) return "text-yellow-500"
    return "text-red-500"
  }

  // Normalize all ratings to 0-100 scale for visualization
  const normalizeRating = (value: number, maxValue: number): number => {
    return (value / maxValue) * 100
  }

  // Get color based on normalized score (0-100)
  const getScoreColor = (score: number): string => {
    if (score >= 70) return "bg-green-500"
    if (score >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getScoreTextColor = (score: number): string => {
    if (score >= 70) return "text-green-500"
    if (score >= 50) return "text-yellow-500"
    return "text-red-500"
  }

  // Calculate consensus score from all available ratings
  // Uses equal weighting for each source to get a true consensus
  const calculateConsensusScore = (): { score: number; count: number } | null => {
    if (!movie) return null

    const ratings: number[] = []

    // MovieLens (0.5-5 scale -> 0-10)
    if (movie.avg_rating && movie.rating_count >= 10) {
      ratings.push(movie.avg_rating * 2)
    }

    // IMDb (already 1-10)
    if (movie.imdb_rating) {
      ratings.push(movie.imdb_rating)
    }

    // TMDB (already 1-10)
    if (movie.vote_average && movie.vote_count && movie.vote_count >= 10) {
      ratings.push(movie.vote_average)
    }

    // Rotten Tomatoes (0-100 -> 0-10)
    if (movie.rotten_tomatoes_score !== null && movie.rotten_tomatoes_score !== undefined) {
      ratings.push(movie.rotten_tomatoes_score / 10)
    }

    // Metacritic (0-100 -> 0-10)
    if (movie.metacritic_score !== null && movie.metacritic_score !== undefined) {
      ratings.push(movie.metacritic_score / 10)
    }

    if (ratings.length === 0) return null

    const score = ratings.reduce((sum, r) => sum + r, 0) / ratings.length

    return { score, count: ratings.length }
  }

  // Get verdict text based on consensus score
  const getConsensusVerdict = (score: number): string => {
    if (score >= 8) return "Universal Acclaim"
    if (score >= 7) return "Generally Favorable"
    if (score >= 5) return "Mixed Reviews"
    return "Generally Unfavorable"
  }

  // Format vote count for display
  const formatVoteCount = (count: number): string => {
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`
    }
    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1)}K`
    }
    return count.toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <div className="flex gap-6">
          <Skeleton className="h-72 w-48" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load movie details. The movie may not exist.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section with Backdrop */}
      <div className="relative">
        {movie.backdrop_url ? (
          <div className="absolute inset-0 h-48 sm:h-64 overflow-hidden rounded-lg">
            <img
              src={movie.backdrop_url}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 h-48 sm:h-64 bg-muted rounded-lg" />
        )}

        <div className="relative pt-4 pb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Poster */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-32 sm:w-40 md:w-48 h-48 sm:h-60 md:h-72 object-cover rounded-lg shadow-lg"
                />
              ) : (
                <div className="w-32 sm:w-40 md:w-48 h-48 sm:h-60 md:h-72 bg-muted rounded-lg shadow-lg flex items-center justify-center">
                  <Film className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Movie Info */}
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {movie.title}
                  {movie.release_year && (
                    <span className="text-muted-foreground font-normal ml-2">
                      ({movie.release_year})
                    </span>
                  )}
                </h1>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-sm text-muted-foreground">
                  {(movie.vote_average || movie.imdb_rating) && (
                    <div className="flex items-center gap-1">
                      <Star className={`h-4 w-4 ${getRatingColor(movie.vote_average ?? movie.imdb_rating ?? 0)}`} />
                      <span className={getRatingColor(movie.vote_average ?? movie.imdb_rating ?? 0)}>
                        {(movie.vote_average ?? movie.imdb_rating)?.toFixed(1)}/10
                      </span>
                      <span className="text-xs">
                        ({movie.vote_average ? "TMDB" : "IMDb"})
                      </span>
                    </div>
                  )}
                  {movie.runtime && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatRuntime(movie.runtime)}
                    </div>
                  )}
                  {movie.rated && (
                    <Badge variant="outline" className="text-xs">
                      {movie.rated}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {movie.genres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>

              {collectionsData && collectionsData.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Collection
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Your Collections</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {collectionsData.map((collection: { collection_id: number; title: string }) => (
                      <DropdownMenuItem
                        key={collection.collection_id}
                        onClick={() => addMovieMutation.mutate(collection.collection_id)}
                        disabled={addMovieMutation.isPending}
                      >
                        {addMovieMutation.isPending ? (
                          <Check className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        {collection.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}



              {/* Overview */}
              {movie.overview && (
                <div>
                  <h3 className="font-semibold mb-1">Overview</h3>
                  <p className="text-muted-foreground">{movie.overview}</p>
                </div>
              )}

              {/* Credits */}
              <div className="space-y-1 text-sm">
                {movie.director && (
                  <p>
                    <span className="font-medium">Director:</span>{" "}
                    <span className="text-muted-foreground">{movie.director}</span>
                  </p>
                )}
                {movie.lead_actors && (
                  <p>
                    <span className="font-medium">Cast:</span>{" "}
                    <span className="text-muted-foreground">{movie.lead_actors}</span>
                  </p>
                )}
                {movie.awards && (
                  <p className="flex items-start gap-1">
                    <Award className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                    <span className="text-muted-foreground">{movie.awards}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ratings & TMDB Data - Side by side on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unified Ratings & Statistics Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5" />
              Ratings & Statistics
            </CardTitle>
            <p className="text-xs text-muted-foreground">Aggregated from multiple sources</p>
          </CardHeader>
          <CardContent className="space-y-6">
          {/* Rating Comparison Bars */}
          <div className="space-y-3">
            {/* MovieLens */}
            {movie.avg_rating && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium w-24">MovieLens</span>
                  <div className="flex-1 mx-3">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreColor(normalizeRating(movie.avg_rating, 5))}`}
                        style={{ width: `${normalizeRating(movie.avg_rating, 5)}%` }}
                      />
                    </div>
                  </div>
                  <span className={`font-semibold w-16 text-right ${getScoreTextColor(normalizeRating(movie.avg_rating, 5))}`}>
                    {movie.avg_rating.toFixed(1)}/5
                  </span>
                  <span className="text-muted-foreground text-xs w-24 text-right">
                    ({formatVoteCount(movie.rating_count)} ratings)
                  </span>
                </div>
              </div>
            )}

            {/* IMDb */}
            {movie.imdb_rating && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium w-24">IMDb</span>
                  <div className="flex-1 mx-3">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreColor(normalizeRating(movie.imdb_rating, 10))}`}
                        style={{ width: `${normalizeRating(movie.imdb_rating, 10)}%` }}
                      />
                    </div>
                  </div>
                  <span className={`font-semibold w-16 text-right ${getScoreTextColor(normalizeRating(movie.imdb_rating, 10))}`}>
                    {movie.imdb_rating.toFixed(1)}/10
                  </span>
                  <span className="text-muted-foreground text-xs w-24 text-right">
                    ({movie.imdb_votes ? formatVoteCount(movie.imdb_votes) + " votes" : ""})
                  </span>
                </div>
              </div>
            )}

            {/* TMDB */}
            {movie.vote_average !== null && movie.vote_average !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium w-24">TMDB</span>
                  <div className="flex-1 mx-3">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreColor(normalizeRating(movie.vote_average, 10))}`}
                        style={{ width: `${normalizeRating(movie.vote_average, 10)}%` }}
                      />
                    </div>
                  </div>
                  <span className={`font-semibold w-16 text-right ${getScoreTextColor(normalizeRating(movie.vote_average, 10))}`}>
                    {movie.vote_average.toFixed(1)}/10
                  </span>
                  <span className="text-muted-foreground text-xs w-24 text-right">
                    ({movie.vote_count ? formatVoteCount(movie.vote_count) + " votes" : ""})
                  </span>
                </div>
              </div>
            )}

            {/* Rotten Tomatoes */}
            {movie.rotten_tomatoes_score !== null && movie.rotten_tomatoes_score !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium w-24">RT Critics</span>
                  <div className="flex-1 mx-3">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreColor(movie.rotten_tomatoes_score)}`}
                        style={{ width: `${movie.rotten_tomatoes_score}%` }}
                      />
                    </div>
                  </div>
                  <span className={`font-semibold w-16 text-right ${getScoreTextColor(movie.rotten_tomatoes_score)}`}>
                    {movie.rotten_tomatoes_score}%
                  </span>
                  <span className={`text-xs w-24 text-right ${movie.rotten_tomatoes_score >= 60 ? "text-green-500" : "text-red-500"}`}>
                    {movie.rotten_tomatoes_score >= 60 ? "Fresh" : "Rotten"}
                  </span>
                </div>
              </div>
            )}

            {/* Metacritic */}
            {movie.metacritic_score !== null && movie.metacritic_score !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium w-24">Metacritic</span>
                  <div className="flex-1 mx-3">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreColor(movie.metacritic_score)}`}
                        style={{ width: `${movie.metacritic_score}%` }}
                      />
                    </div>
                  </div>
                  <span className={`font-semibold w-16 text-right ${getScoreTextColor(movie.metacritic_score)}`}>
                    {movie.metacritic_score}
                  </span>
                  <span className={`text-xs w-24 text-right ${movie.metacritic_score >= 61 ? "text-green-500" : movie.metacritic_score >= 40 ? "text-yellow-500" : "text-red-500"}`}>
                    {movie.metacritic_score >= 61 ? "Favorable" : movie.metacritic_score >= 40 ? "Mixed" : "Unfavorable"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer with Consensus Score and Stats */}
          {(() => {
            const consensus = calculateConsensusScore()
            const hasStdDev = ratingsData?.stats?.stddev
            if (!consensus && !hasStdDev) return null
            return (
              <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-sm">
                {consensus && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Consensus:</span>
                    <span className={`font-bold text-lg ${getScoreTextColor(consensus.score * 10)}`}>
                      {consensus.score.toFixed(1)}/10
                    </span>
                    <span className={`text-xs ${getScoreTextColor(consensus.score * 10)}`}>
                      ({getConsensusVerdict(consensus.score)})
                    </span>
                  </div>
                )}
                {hasStdDev && (
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Std Dev:</span>
                    <span className="font-medium">{ratingsData.stats.stddev?.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* TMDB Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            TMDB Data
          </CardTitle>
          <p className="text-xs text-muted-foreground">From The Movie Database</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {movie.budget !== null && movie.budget !== undefined && movie.budget > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget
                </span>
                <span className="font-medium">{formatCurrency(movie.budget)}</span>
              </div>
            )}
            {movie.revenue !== null && movie.revenue !== undefined && movie.revenue > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Revenue
                </span>
                <span className="font-medium">{formatCurrency(movie.revenue)}</span>
              </div>
            )}
            {movie.vote_average !== null && movie.vote_average !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  TMDB Score
                </span>
                <span className="font-medium">{movie.vote_average.toFixed(1)}/10</span>
              </div>
            )}
            {movie.vote_count !== null && movie.vote_count !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  TMDB Votes
                </span>
                <span className="font-medium">{movie.vote_count.toLocaleString()}</span>
              </div>
            )}
            {movie.popularity !== null && movie.popularity !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Popularity
                </span>
                <span className="font-medium">{movie.popularity.toFixed(1)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* User Tags */}
      {movie.tags && movie.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {movie.tags.map((tag, index) => (
                <Badge key={index} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Similar Movies */}
      {similarData && similarData.similar_movies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Similar Movies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {similarData.similar_movies.map((similar) => (
                <Link
                  key={similar.movie_id}
                  to={`/movies/${similar.movie_id}`}
                  className="group"
                >
                  <div className="space-y-2">
                    <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden">
                      {similar.poster_url ? (
                        <img
                          src={similar.poster_url}
                          alt={similar.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {similar.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {similar.release_year || "N/A"}
                        {similar.avg_rating && (
                          <span className="ml-2">
                            <Star className="h-3 w-3 inline" /> {similar.avg_rating.toFixed(1)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* External Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">External Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {movie.imdb_id && (
              <Button variant="outline" asChild>
                <a
                  href={`https://www.imdb.com/title/${movie.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on IMDB
                </a>
              </Button>
            )}
            {movie.tmdb_id && (
              <Button variant="outline" asChild>
                <a
                  href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on TMDB
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
