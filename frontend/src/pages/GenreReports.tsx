import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function GenreReports() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Genre Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Genre Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Genre popularity and polarisation reports coming soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}
