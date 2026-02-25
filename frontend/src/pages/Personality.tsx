import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { personalityApi, genresApi } from "../services/api"
import type { PersonalityTrait } from "../types"
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
import { Badge } from "@/components/ui/badge"
import { Info } from "lucide-react"

const TRAITS = [
  "openness",
  "agreeableness",
  "emotional_stability",
  "conscientiousness",
  "extraversion",
]

export default function Personality() {
  const [selectedTrait, setSelectedTrait] = useState("openness")
  const [selectedGenre, setSelectedGenre] = useState("")
  const [threshold, setThreshold] = useState<"high" | "low">("high")

  const { data: genres } = useQuery({
    queryKey: ["genres"],
    queryFn: () => genresApi.getGenres().then((res) => res.data),
  })

  const { data: traits, isLoading: loadingTraits } = useQuery({
    queryKey: ["personality-traits"],
    queryFn: () =>
      personalityApi.getTraits().then((res) => res.data as PersonalityTrait[]),
  })

  const { data: correlation, isLoading: loadingCorrelation } = useQuery({
    queryKey: ["genre-correlation", selectedTrait, threshold],
    queryFn: () =>
      personalityApi
        .getGenreCorrelation(selectedTrait, threshold)
        .then((res) => res.data),
  })

  const { data: genreProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ["genre-profile", selectedGenre],
    queryFn: () =>
      personalityApi.getGenreTraits(selectedGenre).then((res) => res.data),
    enabled: !!selectedGenre,
  })

  const { data: segments } = useQuery({
    queryKey: ["personality-segments"],
    queryFn: () => personalityApi.getSegments().then((res) => res.data),
  })

  // Format traits for radar chart
  const radarData = traits?.map((t) => ({
    trait: t.trait.replace("_", " "),
    value: t.mean,
  }))

  // Format genre profile for comparison radar
  const profileRadarData =
    genreProfile?.genre_lovers_profile && genreProfile?.overall_average
      ? TRAITS.map((trait) => ({
          trait: trait.replace("_", " "),
          genreLovers: genreProfile.genre_lovers_profile[`avg_${trait}`] || 0,
          overall: genreProfile.overall_average[`avg_${trait}`] || 0,
        }))
      : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Personality Traits & Viewing Preferences</h1>
        <p className="text-muted-foreground">
          Explore correlations between personality traits and film preferences
        </p>
      </div>

      {loadingTraits && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* Traits Overview */}
        {radarData && (
          <Card>
            <CardHeader>
              <CardTitle>Personality Traits Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="trait" />
                    <PolarRadiusAxis domain={[0, 5]} />
                    <Radar
                      name="Average"
                      dataKey="value"
                      stroke="var(--primary)"
                      fill="var(--primary)"
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trait-Genre Correlation */}
        <Card>
          <CardHeader>
            <CardTitle>Trait-Genre Correlation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="space-y-2 flex-1">
                <Label>Trait</Label>
                <Select value={selectedTrait} onValueChange={setSelectedTrait}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAITS.map((trait) => (
                      <SelectItem key={trait} value={trait}>
                        {trait.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1">
                <Label>Threshold</Label>
                <Select
                  value={threshold}
                  onValueChange={(v) => setThreshold(v as "high" | "low")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Trait (4+)</SelectItem>
                    <SelectItem value="low">Low Trait (2-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loadingCorrelation && (
              <div className="py-8 text-center text-muted-foreground">
                Loading...
              </div>
            )}

            {correlation?.correlations && (
              <div className="h-64 overflow-y-auto">
                <ResponsiveContainer
                  width="100%"
                  height={correlation.correlations.length * 30}
                >
                  <BarChart
                    data={correlation.correlations.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 60, right: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 5]} />
                    <YAxis type="category" dataKey="genre" width={80} />
                    <Tooltip />
                    <Bar dataKey="avg_rating" fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Genre Profile Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Genre Personality Profile</CardTitle>
          <CardDescription>
            Compare personality profiles of genre enthusiasts vs overall average
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

          {loadingProfile && (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          )}

          {profileRadarData.length > 0 && (
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={profileRadarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="trait" />
                  <PolarRadiusAxis domain={[0, 5]} />
                  <Radar
                    name="Genre Lovers"
                    dataKey="genreLovers"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.5}
                  />
                  <Radar
                    name="Overall Average"
                    dataKey="overall"
                    stroke="var(--muted-foreground)"
                    fill="var(--muted-foreground)"
                    fillOpacity={0.3}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {!selectedGenre && !loadingProfile && (
            <div className="py-8 text-center text-muted-foreground">
              Select a genre to see the personality profile comparison
            </div>
          )}
        </CardContent>
      </Card>

      {/* Viewer Segments */}
      {segments && Object.keys(segments).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Viewer Segments</CardTitle>
            <CardDescription>
              Personality-based audience segments and their top genres
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(segments).map(([segment, genres]) => (
                <div key={segment} className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium capitalize mb-3">
                    {segment.replace("_", " ")}
                  </h3>
                  <ul className="text-sm space-y-2">
                    {(genres as Array<{ genre: string; avg_rating: number }>)
                      .slice(0, 5)
                      .map((g) => (
                        <li key={g.genre} className="flex justify-between items-center">
                          <span>{g.genre}</span>
                          <Badge variant="secondary">{g.avg_rating}</Badge>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
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
                <strong>Data Source:</strong> The personality data on this page is{" "}
                <strong>synthetically generated</strong> for demonstration purposes.
                It simulates Big Five personality traits (OCEAN model) for the 610 users in the MovieLens dataset.
              </p>
              <p>
                <strong>Methodology:</strong> Each user is assigned randomized personality scores (1-5 scale) for
                openness, conscientiousness, extraversion, agreeableness, and emotional stability. Correlations
                between traits and genre preferences are computed by aggregating ratings from users with similar
                personality profiles.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
