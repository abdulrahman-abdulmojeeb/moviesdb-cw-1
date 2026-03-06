import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { recommendationsApi } from "../services/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Film, Star, Sparkles, User, Info } from "lucide-react"

interface Recommendation {
  movie_id: number
  title: string
  release_year: number | null
  predicted_rating?: number
  relevance_score?: number
  vote_count?: number
  poster_path: string | null
  genres: string[]
  method: "collaborative" | "content_based"
}

interface RecommendationsResponse {
  method: "collaborative" | "content_based"
  ratings_count: number
  recommendations: Recommendation[]
}

export default function Recommendations() {
  const isLoggedIn = !!localStorage.getItem("access_token")

  const { data, isLoading, error } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => recommendationsApi.get().then((res) => res.data as RecommendationsResponse),
    enabled: isLoggedIn,
  })

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <User className="h-12 w-12 mx-auto text-muted-foreground" />
            <CardTitle>Login Required</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/login">Login / Register</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-yellow-400" />
          Recommended For You
        </h1>
        <p className="text-muted-foreground mt-1">
          {data?.method === "collaborative"
            ? `Based on your ${data.ratings_count} ratings and users with similar taste`
            : "Based on genres you enjoy — rate more movies for personalised picks"}
        </p>
      </div>

      {/* Method banner */}
      {data && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {data.method === "collaborative" ? (
              <>
                Using <strong>collaborative filtering</strong> across MovieLens and app user ratings.
                Showing movies rated highly by users with similar taste to yours.
              </>
            ) : (
              <>
                Using <strong>content-based</strong> recommendations — rate at least{" "}
                <strong>5 movies</strong> to unlock personalised collaborative filtering.
                You've rated <strong>{data.ratings_count}</strong> so far.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>Failed to load recommendations.</AlertDescription>
        </Alert>
      )}

      {data?.recommendations.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No recommendations yet. Try rating some movies on the{" "}
            <Link to="/" className="text-primary hover:underline">Dashboard</Link>.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {data?.recommendations.map((movie) => (
          <Link key={movie.movie_id} to={`/movies/${movie.movie_id}`} className="group">
            <div className="space-y-2">
              <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden relative">
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                {/* Predicted score badge */}
                {movie.predicted_rating && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    {(movie.predicted_rating / 2).toFixed(1)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {movie.title}
                </p>
                <p className="text-xs text-muted-foreground">{movie.release_year ?? "N/A"}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {movie.genres.slice(0, 2).map((genre) => (
                    <Badge key={genre} variant="secondary" className="text-xs px-1 py-0">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}