import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { predictionsApi, genresApi } from "../services/api"
import type { PredictionResult } from "../types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Predictions() {
  const [title, setTitle] = useState("")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [year, setYear] = useState<number | undefined>()

  const { data: genres } = useQuery({
    queryKey: ["genres"],
    queryFn: () => genresApi.getGenres().then((res) => res.data),
  })

  const predictMutation = useMutation({
    mutationFn: () =>
      predictionsApi
        .predict({ title, genres: selectedGenres, year })
        .then((res) => res.data as PredictionResult),
  })

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    )
  }

  const handlePredict = () => {
    if (title && selectedGenres.length > 0) {
      predictMutation.mutate()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Predictive Ratings</h1>
        <p className="text-muted-foreground">
          Predict viewer ratings for new or upcoming titles
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>New Title Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Movie Title</Label>
              <Input
                id="title"
                placeholder="Enter the movie title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Release Year (optional)</Label>
              <Input
                id="year"
                type="number"
                placeholder="e.g., 2024"
                value={year || ""}
                onChange={(e) =>
                  setYear(e.target.value ? parseInt(e.target.value) : undefined)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Genres (select at least one)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {genres?.map((genre: { genre_id: number; name: string }) => (
                  <Badge
                    key={genre.genre_id}
                    variant={
                      selectedGenres.includes(genre.name) ? "default" : "outline"
                    }
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedGenres.includes(genre.name)
                        ? ""
                        : "hover:bg-secondary"
                    )}
                    onClick={() => handleGenreToggle(genre.name)}
                  >
                    {genre.name}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={handlePredict}
              disabled={
                !title || selectedGenres.length === 0 || predictMutation.isPending
              }
              className="w-full"
            >
              {predictMutation.isPending ? "Predicting..." : "Generate Prediction"}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Prediction Results</CardTitle>
          </CardHeader>
          <CardContent>
            {!predictMutation.data && !predictMutation.isPending && (
              <div className="py-12 text-center text-muted-foreground">
                Enter movie details and click "Generate Prediction" to see results
              </div>
            )}

            {predictMutation.isPending && (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            )}

            {predictMutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to generate prediction. Please try different genres.
                </AlertDescription>
              </Alert>
            )}

            {predictMutation.data && (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Predicted Rating</p>
                  <p className="text-5xl font-bold text-primary">
                    {predictMutation.data.prediction.mean_rating}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Confidence:{" "}
                    {predictMutation.data.prediction.confidence_interval.low.toFixed(
                      1
                    )}{" "}
                    -{" "}
                    {predictMutation.data.prediction.confidence_interval.high.toFixed(
                      1
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Weighted Rating</p>
                    <p className="text-xl font-semibold">
                      {predictMutation.data.prediction.weighted_rating}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Based On</p>
                    <p className="text-xl font-semibold">
                      {predictMutation.data.prediction.based_on_ratings.toLocaleString()}{" "}
                      ratings
                    </p>
                  </div>
                </div>

                {/* Rating Distribution */}
                <div>
                  <p className="text-sm font-medium mb-2">
                    Predicted Rating Distribution
                  </p>
                  <div className="h-40 sm:h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={predictMutation.data.distribution} margin={{ left: -10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="rating" />
                        <YAxis />
                        <Tooltip
                          formatter={(value?: number) => [`${value ?? 0}%`, "Percentage"]}
                        />
                        <Bar dataKey="percentage" fill="var(--primary)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Source Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Data Source:</strong> Predictions are based on the{" "}
                <a href="https://grouplens.org/datasets/movielens/" target="_blank" rel="noopener noreferrer" className="underline">
                  MovieLens ml-latest-small dataset
                </a>{" "}
                containing 100,000 ratings from 600 users across 9,700 movies.
              </p>
              <p>
                <strong>Methodology:</strong> The prediction algorithm calculates genre similarity between your input and existing movies,
                then computes a weighted average rating based on similar titles. The confidence interval reflects the variance in ratings
                for movies with matching genre profiles. Higher genre overlap with well-rated films yields more confident predictions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
