import { Link } from "react-router-dom"
import { Plus, Film } from "lucide-react"
import type { Movie } from "../types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MovieCardProps {
  movie: Movie
  onAddToCollection?: (movieId: number) => void
}

export default function MovieCard({ movie, onAddToCollection }: MovieCardProps) {
  // Prefer TMDB rating, fallback to IMDb
  const displayRating = movie.vote_average ?? movie.imdb_rating
  const ratingSource = movie.vote_average ? "TMDB" : movie.imdb_rating ? "IMDb" : null

  // Color thresholds for 1-10 scale
  const ratingColor = displayRating
    ? displayRating >= 7
      ? "text-green-600 dark:text-green-400"
      : displayRating >= 5
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400"
    : "text-muted-foreground"

  return (
    <Link
      to={`/movies/${movie.movie_id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
      aria-label={`View details for ${movie.title}${movie.release_year ? ` (${movie.release_year})` : ''}`}
    >
      <Card className="hover:shadow-lg hover:ring-2 hover:ring-primary/20 transition-all overflow-hidden cursor-pointer" role="article">
      <div className="flex">
        {/* Poster */}
        <div className="w-20 sm:w-24 flex-shrink-0">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt={`Movie poster for ${movie.title}`}
              className="w-full h-28 sm:h-36 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-28 sm:h-36 bg-muted flex items-center justify-center" aria-label="No poster available">
              <Film className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="flex-1 p-2 sm:p-3 flex flex-col">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-sm line-clamp-2">{movie.title}</h3>
            {movie.release_year && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {movie.release_year}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {movie.genres?.slice(0, 2).map((genre) => (
              <Badge key={genre} variant="secondary" className="text-xs">
                {genre}
              </Badge>
            ))}
            {movie.genres?.length > 2 && (
              <span className="text-xs text-muted-foreground px-1">
                +{movie.genres.length - 2}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto pt-2">
            <div className="flex items-center gap-1">
              {ratingSource && (
                <span className="text-xs text-muted-foreground">{ratingSource}:</span>
              )}
              <span className={cn("font-bold text-sm", ratingColor)}>
                {displayRating ? `${displayRating.toFixed(1)}/10` : "N/A"}
              </span>
            </div>

            {onAddToCollection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onAddToCollection(movie.movie_id)
                }}
                className="h-7 px-2"
                aria-label={`Add ${movie.title} to collection`}
              >
                <Plus className="h-3 w-3 mr-1" aria-hidden="true" />
                Add
              </Button>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
    </Link>
  )
}
