import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function BuildDetails() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Build Details</h1>
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            MoviesDB - COMP0022 Database and Web Application Coursework
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Built with React, TypeScript, FastAPI, and PostgreSQL.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
