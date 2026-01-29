import type { Genre } from "../types"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface FilterState {
  title: string
  genre: string
  year_from: number | undefined
  year_to: number | undefined
  min_rating: number | undefined
  sort_by: string
  sort_order: string
}

interface SearchFiltersProps {
  filters: FilterState
  genres: Genre[]
  onFilterChange: (filters: Partial<FilterState>) => void
}

export default function SearchFilters({
  filters,
  genres,
  onFilterChange,
}: SearchFiltersProps) {
  return (
    <Card className="mb-6" role="search" aria-label="Filter movies">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Title Search */}
          <div className="space-y-2">
            <Label htmlFor="title-search">Search Title</Label>
            <Input
              id="title-search"
              placeholder="Enter movie title..."
              value={filters.title}
              onChange={(e) => onFilterChange({ title: e.target.value })}
            />
          </div>

          {/* Genre Filter */}
          <div className="space-y-2">
            <Label>Genre</Label>
            <Select
              value={filters.genre || "all"}
              onValueChange={(value) =>
                onFilterChange({ genre: value === "all" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {genres.map((genre) => (
                  <SelectItem key={genre.genre_id} value={genre.name}>
                    {genre.name} ({genre.movie_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Range */}
          <div className="space-y-2">
            <Label id="year-range-label">Release Year</Label>
            <div className="flex gap-2" role="group" aria-labelledby="year-range-label">
              <Input
                type="number"
                placeholder="From"
                aria-label="Year from"
                value={filters.year_from || ""}
                onChange={(e) =>
                  onFilterChange({
                    year_from: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
              />
              <Input
                type="number"
                placeholder="To"
                aria-label="Year to"
                value={filters.year_to || ""}
                onChange={(e) =>
                  onFilterChange({
                    year_to: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>

          {/* Min Rating */}
          <div className="space-y-2">
            <Label>Minimum Rating</Label>
            <Select
              value={filters.min_rating?.toString() || "any"}
              onValueChange={(value) =>
                onFilterChange({
                  min_rating: value === "any" ? undefined : parseFloat(value),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Rating</SelectItem>
                <SelectItem value="4">4+ Stars</SelectItem>
                <SelectItem value="3.5">3.5+ Stars</SelectItem>
                <SelectItem value="3">3+ Stars</SelectItem>
                <SelectItem value="2.5">2.5+ Stars</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Sort Options */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="space-y-2 flex-1 sm:flex-none">
            <Label>Sort By</Label>
            <Select
              value={filters.sort_by}
              onValueChange={(value) => onFilterChange({ sort_by: value })}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex-1 sm:flex-none">
            <Label>Order</Label>
            <Select
              value={filters.sort_order}
              onValueChange={(value) => onFilterChange({ sort_order: value })}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
