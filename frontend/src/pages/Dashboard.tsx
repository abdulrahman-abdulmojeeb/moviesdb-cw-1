import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { moviesApi, genresApi } from "../services/api"
import type { Movie, PaginatedResponse } from "../types"
import MovieCard from "../components/MovieCard"
import SearchFilters from "../components/SearchFilters"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"

export default function Dashboard() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    title: "",
    genre: "",
    year_from: undefined as number | undefined,
    year_to: undefined as number | undefined,
    min_rating: undefined as number | undefined,
    sort_by: "title",
    sort_order: "asc",
  })

  const { data: genres } = useQuery({
    queryKey: ["genres"],
    queryFn: () => genresApi.getGenres().then((res) => res.data),
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ["movies", filters],
    queryFn: () =>
      moviesApi.getMovies(filters).then((res) => res.data as PaginatedResponse<Movie>),
  })

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Movie Catalogue</h1>
        <p className="text-muted-foreground">Browse and search the film catalogue</p>
      </div>

      <SearchFilters
        filters={filters}
        genres={genres || []}
        onFilterChange={handleFilterChange}
      />

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load movies. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {data && (
        <>
          <div className="text-sm text-muted-foreground">
            Showing {data.movies.length} of {data.total} movies
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {data.movies.map((movie) => (
              <MovieCard key={movie.movie_id} movie={movie} />
            ))}
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="px-4 py-2 text-sm text-muted-foreground">
                Page {filters.page} of {data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page === data.pages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
