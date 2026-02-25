import { useQuery } from "@tanstack/react-query"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { genresApi } from "../services/api"
import type { GenrePopularity, GenrePolarisation } from "../types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

export default function GenreReports() {
  const { data: popularity, isLoading: loadingPopularity } = useQuery({
    queryKey: ["genre-popularity"],
    queryFn: () => genresApi.getPopularity().then((res) => res.data as GenrePopularity[]),
  })

  const { data: polarisation, isLoading: loadingPolarisation } = useQuery({
    queryKey: ["genre-polarisation"],
    queryFn: () => genresApi.getPolarisation().then((res) => res.data as GenrePolarisation[]),
  })

  const isLoading = loadingPopularity || loadingPolarisation

  const getBarColor = (value: number) => {
    if (value >= 4) return "#22c55e"
    if (value >= 3.5) return "#30bfc2"
    if (value >= 3) return "#eab308"
    return "#ef4444"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Genre Reports</h1>
        <p className="text-muted-foreground">
          Analyze genre popularity and polarisation
        </p>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Genre Popularity */}
      {popularity && (
        <Card>
          <CardHeader>
            <CardTitle>Genre Popularity by Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80 md:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={popularity} layout="vertical" margin={{ left: 60, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 5]} />
                  <YAxis type="category" dataKey="genre" width={80} />
                  <Tooltip
                    formatter={(value?: number) => [value?.toFixed(2) ?? "", "Avg Rating"]}
                  />
                  <Bar dataKey="avg_rating">
                    {popularity.map((entry, index) => (
                      <Cell key={index} fill={getBarColor(entry.avg_rating)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Genre Polarisation */}
      {polarisation && (
        <Card>
          <CardHeader>
            <CardTitle>Genre Polarisation Analysis</CardTitle>
            <CardDescription>
              Polarisation score indicates genres with more extreme ratings (love
              it or hate it).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Genre</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Low (%)</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Mid (%)</TableHead>
                  <TableHead className="text-right whitespace-nowrap">High (%)</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Polarisation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {polarisation.map((genre) => (
                  <TableRow key={genre.genre}>
                    <TableCell className="font-medium">{genre.genre}</TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">
                      {genre.low_pct}%
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {genre.mid_pct}%
                    </TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">
                      {genre.high_pct}%
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "font-bold",
                          genre.polarisation_score > 70
                            ? "text-purple-600 dark:text-purple-400"
                            : genre.polarisation_score > 50
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-muted-foreground"
                        )}
                      >
                        {genre.polarisation_score}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Source Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Data Source:</strong> Genre statistics are derived from the{" "}
                <a href="https://grouplens.org/datasets/movielens/" target="_blank" rel="noopener noreferrer" className="underline">
                  MovieLens ml-latest-small dataset
                </a>{" "}
                containing 100,000 ratings from 600 users across 9,700 movies.
              </p>
              <p>
                <strong>Methodology:</strong> Popularity is measured by average rating across all movies in each genre.
                Polarisation score indicates how divisive a genre is — calculated as the percentage of ratings that are
                either very low (≤2) or very high (≥4), excluding middle ratings. Higher polarisation means viewers tend
                to either love or hate movies in that genre.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
