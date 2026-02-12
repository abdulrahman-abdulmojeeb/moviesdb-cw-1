import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { collectionsApi } from "../services/api"
import type { Collection, CollectionDetail } from "../types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertCircle, Plus, Trash2, User, X } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Collections() {
  const queryClient = useQueryClient()
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newNote, setNewNote] = useState("")

  const isLoggedIn = !!localStorage.getItem("access_token")

  const {
    data: collections,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["collections"],
    queryFn: () =>
      collectionsApi.getCollections().then((res) => res.data as Collection[]),
    enabled: isLoggedIn,
  })

  const { data: collectionDetail } = useQuery({
    queryKey: ["collection", selectedCollection],
    queryFn: () =>
      collectionsApi
        .getCollection(selectedCollection!)
        .then((res) => res.data as CollectionDetail),
    enabled: !!selectedCollection,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      collectionsApi.createCollection({ title: newTitle, note: newNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] })
      setShowCreateModal(false)
      setNewTitle("")
      setNewNote("")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => collectionsApi.deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] })
      setSelectedCollection(null)
    },
  })

  const removeMovieMutation = useMutation({
    mutationFn: ({
      collectionId,
      movieId,
    }: {
      collectionId: number
      movieId: number
    }) => collectionsApi.removeMovie(collectionId, movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection", selectedCollection] })
    },
  })

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <User className="h-12 w-12 mx-auto text-muted-foreground" />
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              You need to be logged in to view and manage collections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/login">Login / Register</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Curated Collections</h1>
          <p className="text-muted-foreground">Manage your film collection lists</p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
              <DialogDescription>
                Create a new collection to organize your favorite movies.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., February New Licences"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Input
                  id="note"
                  placeholder="Describe what this list is for..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newTitle || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load collections. Please try again.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Collections List */}
        <div className="space-y-4">
          {collections?.map((collection) => (
            <Card
              key={collection.collection_id}
              className={cn(
                "cursor-pointer transition-colors",
                selectedCollection === collection.collection_id
                  ? "ring-2 ring-primary"
                  : "hover:bg-muted/50"
              )}
              onClick={() => setSelectedCollection(collection.collection_id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{collection.title}</CardTitle>
                {collection.note && (
                  <CardDescription>{collection.note}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>{collection.movie_count} movies</span>
                  <span>
                    {new Date(collection.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {collections?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No collections yet. Create your first one!
            </div>
          )}
        </div>

        {/* Collection Detail */}
        <div className="lg:col-span-2">
          {selectedCollection && collectionDetail ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{collectionDetail.title}</CardTitle>
                    {collectionDetail.note && (
                      <CardDescription>{collectionDetail.note}</CardDescription>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(selectedCollection)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {collectionDetail.movies_by_genre?.length > 0 ? (
                  <div className="space-y-6">
                    {collectionDetail.movies_by_genre.map((group) => (
                      <div key={group.genre}>
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <Badge>{group.genre}</Badge>
                          <span className="text-muted-foreground text-sm">
                            {group.movies.length} movies
                          </span>
                        </h3>
                        <div className="space-y-2">
                          {group.movies.map((movie) => (
                            <div
                              key={movie.movie_id}
                              className="flex justify-between items-center p-2 bg-muted rounded-md"
                            >
                              <div>
                                <span className="font-medium">{movie.title}</span>
                                <span className="text-muted-foreground text-sm ml-2">
                                  ({movie.release_year})
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-muted-foreground">
                                  {movie.avg_rating} stars
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-destructive hover:text-destructive"
                                  onClick={() =>
                                    removeMovieMutation.mutate({
                                      collectionId: selectedCollection,
                                      movieId: movie.movie_id,
                                    })
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No movies in this collection yet. Add movies from the Dashboard!
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a collection to view its contents
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
