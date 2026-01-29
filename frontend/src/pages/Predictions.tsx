import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Predictions() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Predictions</h1>
      <Card>
        <CardHeader>
          <CardTitle>Rating Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Predictive rating analysis for new titles coming soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}
