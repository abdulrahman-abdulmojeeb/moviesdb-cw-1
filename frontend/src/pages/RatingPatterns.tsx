import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { ratingsApi, genresApi } from "../services/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Info } from "lucide-react"

const COLORS = ["#ef4444", "#f59e0b", "#22c55e"]

export default function RatingPatterns() {
  const [selectedGenre, setSelectedGenre] = useState("")

  const { data: genres } = useQuery({
    queryKey: ["genres"],
    queryFn: () => genresApi.getGenres().then((res) => res.data),
  })

  const { data: patterns, isLoading: loadingPatterns } = useQuery({
    queryKey: ["rating-patterns"],
    queryFn: () => ratingsApi.getPatterns().then((res) => res.data),
  })

  const { data: lowRaters, isLoading: loadingLowRaters } = useQuery({
    queryKey: ["low-raters"],
    queryFn: () => ratingsApi.getLowRaterPatterns().then((res) => res.data),
  })

  const { data: crossGenre, isLoading: loadingCrossGenre } = useQuery({
    queryKey: ["cross-genre", selectedGenre],
    queryFn: () => ratingsApi.getCrossGenre(selectedGenre).then((res) => res.data),
    enabled: !!selectedGenre,
  })

  const isLoading = loadingPatterns || loadingLowRaters

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rating Patterns Analysis</h1>
        <p className="text-muted-foreground">
          Understand viewer rating behaviors and preferences
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* Rating Patterns by Genre */}
        {patterns && (
          <Card>
            <CardHeader>
              <CardTitle>Average User Ratings by Genre</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={patterns} layout="vertical" margin={{ left: 60, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 5]} />
                    <YAxis type="category" dataKey="genre" width={80} />
                    <Tooltip />
                    <Bar dataKey="mean_user_avg" fill="var(--primary)" name="Mean Rating" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Low Rater Analysis */}
        {lowRaters && (
          <Card>
            <CardHeader>
              <CardTitle>Viewer Rating Categories</CardTitle>
              <CardDescription>
                Distribution of harsh critics vs generous raters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={lowRaters}
                      dataKey="user_count"
                      nameKey="rater_type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {lowRaters.map((_: unknown, index: number) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-sm">
                {lowRaters.map(
                  (
                    rater: {
                      rater_type: string
                      avg_rating: number
                      user_count: number
                    },
                    index: number
                  ) => (
                    <div key={rater.rater_type} className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="capitalize">
                        {rater.rater_type.replace("_", " ")}
                      </span>
                      <span className="text-muted-foreground">
                        (avg: {rater.avg_rating}, count: {rater.user_count})
                      </span>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cross-Genre Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Cross-Genre Preferences</CardTitle>
          <CardDescription>
            Select a genre to see what other genres its fans also enjoy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 max-w-xs space-y-2">
            <Label>Genre</Label>
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger>
                <SelectValue placeholder="Select a genre..." />
              </SelectTrigger>
              <SelectContent>
                {genres?.map((genre: { genre_id: number; name: string }) => (
                  <SelectItem key={genre.genre_id} value={genre.name}>
                    {genre.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingCrossGenre && (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          )}

          {crossGenre && crossGenre.length > 0 && (
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={crossGenre} layout="vertical" margin={{ left: 60, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 5]} />
                  <YAxis type="category" dataKey="genre" width={100} />
                  <Tooltip />
                  <Bar dataKey="avg_rating" fill="var(--primary)" name="Avg Rating" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {crossGenre && crossGenre.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No cross-genre data available for this selection
            </div>
          )}

          {!selectedGenre && !loadingCrossGenre && (
            <div className="py-8 text-center text-muted-foreground">
              Select a genre to see cross-genre preferences
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Source Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Data Source:</strong> Analysis is based on the{" "}
                <a href="https://grouplens.org/datasets/movielens/" target="_blank" rel="noopener noreferrer" className="underline">
                  MovieLens ml-latest-small dataset
                </a>{" "}
                containing 100,000 ratings from 600 users across 9,700 movies.
              </p>
              <p>
                <strong>Methodology:</strong> Rating patterns are calculated by aggregating individual user ratings per genre.
                Viewer categories (harsh critics, moderate raters, generous raters) are determined by each user's average rating
                across all their reviews. Cross-genre preferences show how fans of one genre rate movies in other genres.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
