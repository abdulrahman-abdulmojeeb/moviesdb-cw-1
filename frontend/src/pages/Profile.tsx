import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { authApi } from "../services/api"
import { useTheme } from "@/hooks/useTheme"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  LogOut,
  Moon,
  Sun,
  User,
  Settings,
  UserCircle,
} from "lucide-react"

function LoginContent() {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [inviteToken, setInviteToken] = useState("")
  const [error, setError] = useState("")

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(username, password),
    onSuccess: (res) => {
      localStorage.setItem("access_token", res.data.access_token)
      localStorage.setItem("refresh_token", res.data.refresh_token)
      navigate("/collections")
    },
    onError: () => {
      setError("Invalid username or password")
    },
  })

  const registerMutation = useMutation({
    mutationFn: () =>
      authApi.register(username, password, inviteToken, email || undefined),
    onSuccess: () => {
      loginMutation.mutate()
    },
    onError: (err: unknown) => {
      const axiosError = err as { response?: { status?: number } }
      if (axiosError.response?.status === 403) {
        setError("Invalid invite token")
      } else {
        setError("Registration failed. Username may already exist.")
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (isRegister) {
      registerMutation.mutate()
    } else {
      loginMutation.mutate()
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {isRegister ? "Create Account" : "Login"}
        </CardTitle>
        <CardDescription className="text-center">
          {isRegister
            ? "Register a new account to access collections"
            : "Sign in to manage your collections"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {isRegister && (
            <>
              <div className="space-y-2">
                <Label htmlFor="inviteToken">Invite Token</Label>
                <Input
                  id="inviteToken"
                  type="text"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  required
                  placeholder="Enter your invite token"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending || registerMutation.isPending}
          >
            {loginMutation.isPending || registerMutation.isPending
              ? "Please wait..."
              : isRegister
                ? "Create Account"
                : "Login"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          {isRegister ? (
            <p>
              Already have an account?{" "}
              <button
                onClick={() => setIsRegister(false)}
                className="text-primary hover:underline"
              >
                Login
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{" "}
              <button
                onClick={() => setIsRegister(true)}
                className="text-primary hover:underline"
              >
                Register
              </button>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function LoggedInContent() {
  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    window.location.reload()
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="h-5 w-5" />
          Account
        </CardTitle>
        <CardDescription>You are currently logged in</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            You have access to Collections and can save your favorite movies.
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="w-full">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </CardContent>
    </Card>
  )
}

function SettingsContent() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize how the application looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme">Theme</Label>
              <p className="text-sm text-muted-foreground">
                Select your preferred color theme
              </p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Display Preferences</CardTitle>
          <CardDescription>
            Configure how data is displayed throughout the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Additional display preferences coming soon.
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>MoviesDB - Film Analytics Dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Course</span>
            <span>COMP0022</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Institution</span>
            <span>UCL</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Profile() {
  const isLoggedIn = !!localStorage.getItem("access_token")

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6" />
          Profile
        </h1>
        <p className="text-muted-foreground">
          Manage your account and application settings
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          {isLoggedIn ? <LoggedInContent /> : <LoginContent />}
        </TabsContent>

        <TabsContent value="settings">
          <SettingsContent />
        </TabsContent>
      </Tabs>
    </div>
  )
}
