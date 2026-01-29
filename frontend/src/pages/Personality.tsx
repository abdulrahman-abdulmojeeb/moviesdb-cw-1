import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Personality() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Personality Analysis</h1>
      <Card>
        <CardHeader>
          <CardTitle>Big Five Personality Traits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Personality trait correlations with movie preferences coming soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}
