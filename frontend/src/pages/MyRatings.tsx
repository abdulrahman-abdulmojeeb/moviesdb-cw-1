import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { appRatingsApi } from "../services/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Star, Trash2, User, ArrowUpDown } from "lucide-react"

interface MyRating {
  movie_id: number
  title: string
  release_year: number
  rating: number
  timestamp: number
}

type SortOption = "recent" | "highest" | "lowest" | "title"

const SORT_LABELS: Record<SortOption, string> = {
  recent: "Most Recent",
  highest: "Highest Rated",
  lowest: "Lowest Rated",
  title: "Title (A-Z)",
}

export default function MyRatings() {
  const queryClient = useQueryClient()
  const [sort, setSort] = useState<SortOption>("recent")
  const isLoggedIn = !!localStorage.getItem("access_token")

  const { data: ratings, isLoading, error } = useQuery({
    queryKey: ["my-ratings"],
    queryFn: () => appRatingsApi.getAll().then((res) => res.data as MyRating[]),
    enabled: isLoggedIn,
  })

  const deleteMutation = useMutation({
    mutationFn: (movieId: number) => appRatingsApi.delete(movieId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-ratings"] }),
  })

  const sorted = [...(ratings ?? [])].sort((a, b) => {
    if (sort === "recent") return b.timestamp - a.timestamp
    if (sort === "highest") return b.rating - a.rating
    if (sort === "lowest") return a.rating - b.rating
    return a.title.localeCompare(b.title)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Ratings</h1>
          <p className="text-muted-foreground">
            {ratings ? `${ratings.length} movie${ratings.length !== 1 ? "s" : ""} rated` : ""}
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
            <Button
              key={option}
              variant={sort === option ? "default" : "outline"}
              size="sm"
              onClick={() => setSort(option)}
            >
              {SORT_LABELS[option]}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>Failed to load ratings.</AlertDescription>
        </Alert>
      )}

      {!isLoading && sorted.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            You haven't rated any movies yet. Browse the{" "}
            <Link to="/" className="text-primary hover:underline">Dashboard</Link>{" "}
            to get started.
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {sorted.map((item) => (
          <div
            key={item.movie_id}
            className="flex items-center justify-between p-4 bg-muted rounded-lg gap-4"
          >
            <div className="flex-1 min-w-0">
              <Link
                to={`/movies/${item.movie_id}`}
                className="font-medium hover:text-primary transition-colors"
              >
                {item.title}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                {item.release_year && (
                  <span className="text-sm text-muted-foreground">({item.release_year})</span>
                )}
                <span className="text-xs text-muted-foreground">
                  Rated {new Date(item.timestamp * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Star display */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    item.rating >= star
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
              <Badge variant="secondary" className="ml-2">
                {item.rating}/5
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive flex-shrink-0"
              onClick={() => deleteMutation.mutate(item.movie_id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}