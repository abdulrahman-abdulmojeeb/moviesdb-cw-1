import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Collections() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Collections</h1>
      <Card>
        <CardHeader>
          <CardTitle>Movie Collections</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Create and manage your movie collections. Login required.</p>
        </CardContent>
      </Card>
    </div>
  )
}
