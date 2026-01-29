import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RatingPatterns() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Rating Patterns</h1>
      <Card>
        <CardHeader>
          <CardTitle>Rating Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Rating pattern analysis and viewer behaviour reports coming soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}
