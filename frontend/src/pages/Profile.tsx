import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Profile() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Login and account management coming soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}
