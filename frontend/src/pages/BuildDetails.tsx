import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Server,
  Database,
  Globe,
  Layout,
  Shield,
  Container,
  Layers,
  Cpu,
  Network,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Code,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================================
// TECH STACK DATA
// ============================================================================

interface TechItem {
  name: string
  version?: string
  description: string
  link?: string
}

interface StackSection {
  title: string
  icon: React.ReactNode
  description: string
  technologies: TechItem[]
}

const stackSections: StackSection[] = [
  {
    title: "Frontend",
    icon: <Layout className="h-5 w-5" />,
    description: "Modern React-based single-page application with TypeScript",
    technologies: [
      { name: "React", version: "18.3", description: "Component-based UI library for building interactive user interfaces", link: "https://react.dev" },
      { name: "TypeScript", version: "5.6", description: "Typed superset of JavaScript for improved developer experience and code quality", link: "https://www.typescriptlang.org" },
      { name: "Vite", version: "6.0", description: "Next-generation frontend build tool with lightning-fast HMR and optimized production builds", link: "https://vitejs.dev" },
      { name: "React Router", version: "7.0", description: "Declarative routing for React applications with nested routes support", link: "https://reactrouter.com" },
      { name: "TanStack Query", version: "5.62", description: "Powerful asynchronous state management for data fetching, caching, and synchronization", link: "https://tanstack.com/query" },
      { name: "Tailwind CSS", version: "3.4", description: "Utility-first CSS framework for rapid UI development", link: "https://tailwindcss.com" },
      { name: "shadcn/ui", version: "latest", description: "Re-usable components built with Radix UI and Tailwind CSS", link: "https://ui.shadcn.com" },
      { name: "Radix UI", version: "latest", description: "Unstyled, accessible component primitives for React", link: "https://www.radix-ui.com" },
      { name: "Recharts", version: "2.15", description: "Composable charting library built on React components for data visualization", link: "https://recharts.org" },
      { name: "Lucide React", version: "0.468", description: "Beautiful and consistent icon library with 1000+ icons", link: "https://lucide.dev" },
      { name: "Axios", version: "1.7", description: "Promise-based HTTP client for API requests", link: "https://axios-http.com" },
    ],
  },
  {
    title: "Backend",
    icon: <Server className="h-5 w-5" />,
    description: "High-performance Python API server with async support",
    technologies: [
      { name: "Python", version: "3.12", description: "Modern Python runtime with performance improvements and better error messages", link: "https://www.python.org" },
      { name: "FastAPI", version: "0.115", description: "Modern, fast web framework for building APIs with automatic OpenAPI documentation", link: "https://fastapi.tiangolo.com" },
      { name: "Uvicorn", version: "0.34", description: "Lightning-fast ASGI server implementation using uvloop and httptools", link: "https://www.uvicorn.org" },
      { name: "Pydantic", version: "2.x", description: "Data validation using Python type annotations with high performance", link: "https://docs.pydantic.dev" },
      { name: "psycopg2", version: "2.9", description: "PostgreSQL database adapter for Python with connection pooling", link: "https://www.psycopg.org" },
      { name: "python-jose", version: "3.3", description: "JavaScript Object Signing and Encryption (JOSE) implementation for JWT tokens", link: "https://python-jose.readthedocs.io" },
      { name: "passlib", version: "1.7", description: "Password hashing library with bcrypt support for secure authentication", link: "https://passlib.readthedocs.io" },
      { name: "httpx", version: "0.28", description: "Async HTTP client for making requests to external APIs (TMDB)", link: "https://www.python-httpx.org" },
    ],
  },
  {
    title: "Database",
    icon: <Database className="h-5 w-5" />,
    description: "Robust relational database with advanced SQL features",
    technologies: [
      { name: "PostgreSQL", version: "16-alpine", description: "Advanced open-source relational database with ACID compliance and JSON support", link: "https://www.postgresql.org" },
      { name: "pgAdmin 4", version: "latest", description: "Web-based PostgreSQL administration and development platform", link: "https://www.pgadmin.org" },
    ],
  },
  {
    title: "Containerization & Orchestration",
    icon: <Container className="h-5 w-5" />,
    description: "Container-based deployment for consistency across environments",
    technologies: [
      { name: "Docker", version: "24.x", description: "Container platform for packaging applications with all dependencies", link: "https://www.docker.com" },
      { name: "Docker Compose", version: "2.x", description: "Multi-container orchestration tool for defining and running applications", link: "https://docs.docker.com/compose" },
      { name: "Alpine Linux", version: "3.x", description: "Minimal Docker base images for reduced container size and attack surface", link: "https://alpinelinux.org" },
    ],
  },
  {
    title: "Web Server & Networking",
    icon: <Network className="h-5 w-5" />,
    description: "Production-grade reverse proxy with SSL termination",
    technologies: [
      { name: "Nginx", version: "alpine", description: "High-performance HTTP server and reverse proxy for load balancing and SSL termination", link: "https://nginx.org" },
      { name: "Let's Encrypt", version: "latest", description: "Free, automated SSL/TLS certificate authority for HTTPS", link: "https://letsencrypt.org" },
      { name: "Certbot", version: "latest", description: "Automatic certificate management and renewal tool", link: "https://certbot.eff.org" },
      { name: "Cloudflare DNS", version: "N/A", description: "DNS management with DDoS protection and CDN capabilities", link: "https://www.cloudflare.com" },
    ],
  },
  {
    title: "Security",
    icon: <Shield className="h-5 w-5" />,
    description: "Multi-layered security implementation",
    technologies: [
      { name: "JWT Authentication", version: "N/A", description: "Stateless authentication using JSON Web Tokens with secure signing" },
      { name: "bcrypt", version: "N/A", description: "Adaptive password hashing algorithm with configurable work factor" },
      { name: "CORS", version: "N/A", description: "Cross-Origin Resource Sharing configuration for API security" },
      { name: "UFW Firewall", version: "N/A", description: "Uncomplicated Firewall for server-level network protection" },
      { name: "Invite Token System", version: "N/A", description: "Registration protection requiring valid invite tokens for new accounts" },
    ],
  },
  {
    title: "External APIs",
    icon: <Globe className="h-5 w-5" />,
    description: "Third-party data sources and integrations",
    technologies: [
      { name: "TMDB API", version: "3", description: "The Movie Database API for movie metadata, posters, and additional information", link: "https://www.themoviedb.org/documentation/api" },
      { name: "MovieLens Dataset", version: "ml-latest-small", description: "Research dataset with 100,000 ratings from 600 users across 9,700 movies", link: "https://grouplens.org/datasets/movielens" },
    ],
  },
  {
    title: "Development Tools",
    icon: <Cpu className="h-5 w-5" />,
    description: "Tools and utilities for development workflow",
    technologies: [
      { name: "Bun", version: "1.x", description: "Fast JavaScript runtime, package manager, and bundler", link: "https://bun.sh" },
      { name: "ESLint", version: "9.x", description: "Static code analysis tool for identifying problematic patterns", link: "https://eslint.org" },
      { name: "Git", version: "2.x", description: "Distributed version control system for source code management", link: "https://git-scm.com" },
    ],
  },
]

const architectureDetails = [
  { layer: "Presentation Layer", components: "React SPA, Tailwind CSS, shadcn/ui components", responsibility: "User interface rendering, client-side routing, form validation" },
  { layer: "API Gateway", components: "Nginx reverse proxy", responsibility: "SSL termination, request routing, static file serving, load balancing" },
  { layer: "Application Layer", components: "FastAPI, Uvicorn ASGI server", responsibility: "Business logic, authentication, request validation, API endpoints" },
  { layer: "Data Access Layer", components: "psycopg2, raw SQL queries", responsibility: "Database connections, query execution, data transformation" },
  { layer: "Persistence Layer", components: "PostgreSQL 16", responsibility: "Data storage, indexing, ACID transactions, referential integrity" },
]

const databaseSchema = [
  { table: "movies", records: "9,742", description: "Core movie catalog with TMDB/IMDB IDs" },
  { table: "movie_details", records: "9,617", description: "Extended metadata from TMDB API" },
  { table: "ratings", records: "100,836", description: "User ratings (0.5-5 scale)" },
  { table: "users", records: "610", description: "MovieLens user accounts" },
  { table: "genres", records: "20", description: "Movie genre categories" },
  { table: "movie_genres", records: "22,084", description: "Movie-genre associations (M:N)" },
  { table: "tags", records: "3,683", description: "User-generated movie tags" },
  { table: "personality_users", records: "610", description: "Synthetic Big Five personality data" },
  { table: "collections", records: "variable", description: "User-created movie collections" },
  { table: "collection_items", records: "variable", description: "Movies in collections" },
  { table: "app_users", records: "variable", description: "Application user accounts" },
]

// ============================================================================
// SQL QUERIES DATA
// ============================================================================

interface QueryInfo {
  name: string
  endpoint: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  description: string
  sql: string
}

interface QueryCategory {
  name: string
  description: string
  queries: QueryInfo[]
}

const queryCategories: QueryCategory[] = [
  {
    name: "Movies",
    description: "Movie catalogue and details endpoints",
    queries: [
      { name: "Get Movies (Paginated)", endpoint: "GET /api/movies", method: "GET", description: "Retrieves paginated list of movies with optional filters for title, genre, year range, and minimum rating.", sql: `SELECT m.movie_id, m.title, m.release_year, m.imdb_id, m.tmdb_id,
    md.poster_path, md.overview,
    COALESCE(AVG(r.rating), 0) as avg_rating,
    COUNT(r.rating_id) as rating_count,
    ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL) as genres
FROM movies m
LEFT JOIN movie_details md ON m.movie_id = md.movie_id
LEFT JOIN ratings r ON m.movie_id = r.movie_id
LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
LEFT JOIN genres g ON mg.genre_id = g.genre_id
WHERE {dynamic_filters}
GROUP BY m.movie_id, md.poster_path, md.overview
ORDER BY {sort_field} {sort_order}
LIMIT %s OFFSET %s` },
      { name: "Get Movie Details", endpoint: "GET /api/movies/{id}", method: "GET", description: "Retrieves detailed information about a specific movie including TMDB metadata, ratings, genres, and tags.", sql: `SELECT m.movie_id, m.title, m.release_year, m.imdb_id, m.tmdb_id,
    md.poster_path, md.backdrop_path, md.overview, md.runtime,
    md.budget, md.revenue, md.popularity, md.vote_average,
    md.vote_count, md.director, md.lead_actors,
    COALESCE(AVG(r.rating), 0) as avg_rating,
    COUNT(r.rating_id) as rating_count,
    ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL) as genres,
    ARRAY_AGG(DISTINCT t.tag_text) FILTER (WHERE t.tag_text IS NOT NULL) as tags
FROM movies m
LEFT JOIN movie_details md ON m.movie_id = md.movie_id
LEFT JOIN ratings r ON m.movie_id = r.movie_id
LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
LEFT JOIN genres g ON mg.genre_id = g.genre_id
LEFT JOIN tags t ON m.movie_id = t.movie_id
WHERE m.movie_id = %s
GROUP BY m.movie_id, md.poster_path, md.backdrop_path, md.overview,
         md.runtime, md.budget, md.revenue, md.popularity,
         md.vote_average, md.vote_count, md.director, md.lead_actors` },
      { name: "Get Rating Distribution", endpoint: "GET /api/movies/{id}/ratings", method: "GET", description: "Returns rating distribution and statistics for a specific movie.", sql: `WITH rating_counts AS (
    SELECT rating, COUNT(*) as count
    FROM ratings WHERE movie_id = %s
    GROUP BY rating
)
SELECT rating, count,
    ROUND(100.0 * count / SUM(count) OVER(), 1) as percentage
FROM rating_counts ORDER BY rating` },
    ],
  },
  {
    name: "Genres",
    description: "Genre popularity and polarisation analysis",
    queries: [
      { name: "Get All Genres", endpoint: "GET /api/genres", method: "GET", description: "Lists all genres with their movie counts.", sql: `SELECT g.genre_id, g.name, COUNT(mg.movie_id) as movie_count
FROM genres g
LEFT JOIN movie_genres mg ON g.genre_id = mg.genre_id
GROUP BY g.genre_id ORDER BY g.name` },
      { name: "Genre Popularity Report", endpoint: "GET /api/genres/popularity", method: "GET", description: "Ranks genres by average rating, including total ratings and movie count.", sql: `SELECT g.name as genre,
    COUNT(DISTINCT r.rating_id) as total_ratings,
    COUNT(DISTINCT mg.movie_id) as movie_count,
    ROUND(AVG(r.rating)::numeric, 2) as avg_rating,
    ROUND(STDDEV(r.rating)::numeric, 2) as rating_stddev
FROM genres g
JOIN movie_genres mg ON g.genre_id = mg.genre_id
JOIN ratings r ON mg.movie_id = r.movie_id
GROUP BY g.genre_id, g.name ORDER BY avg_rating DESC` },
      { name: "Genre Polarisation", endpoint: "GET /api/genres/polarisation", method: "GET", description: "Identifies polarising genres by calculating extreme ratings percentage.", sql: `WITH genre_stats AS (
    SELECT genre, SUM(count) as total_ratings,
        SUM(CASE WHEN rating <= 2 THEN count ELSE 0 END) as low_ratings,
        SUM(CASE WHEN rating >= 4 THEN count ELSE 0 END) as high_ratings
    FROM genre_ratings GROUP BY genre
)
SELECT genre, total_ratings,
    ROUND(100.0 * low_ratings / total_ratings, 1) as low_pct,
    ROUND(100.0 * high_ratings / total_ratings, 1) as high_pct,
    ROUND(100.0 * (low_ratings + high_ratings) / total_ratings, 1) as polarisation_score
FROM genre_stats WHERE total_ratings >= 100
ORDER BY polarisation_score DESC` },
    ],
  },
  {
    name: "Rating Patterns",
    description: "Analysis of viewer rating behaviors",
    queries: [
      { name: "User Rating Patterns", endpoint: "GET /api/ratings/patterns", method: "GET", description: "Analyzes how users rate different genres.", sql: `WITH user_genre_ratings AS (
    SELECT r.user_id, g.name as genre,
        AVG(r.rating) as avg_rating, COUNT(*) as rating_count
    FROM ratings r
    JOIN movie_genres mg ON r.movie_id = mg.movie_id
    JOIN genres g ON mg.genre_id = g.genre_id
    GROUP BY r.user_id, g.name HAVING COUNT(*) >= 5
)
SELECT genre, COUNT(DISTINCT user_id) as user_count,
    ROUND(AVG(avg_rating)::numeric, 2) as mean_user_avg,
    ROUND(STDDEV(avg_rating)::numeric, 2) as stddev_user_avg
FROM user_genre_ratings GROUP BY genre ORDER BY mean_user_avg DESC` },
      { name: "Cross-Genre Preferences", endpoint: "GET /api/ratings/cross-genre", method: "GET", description: "Finds which genres fans of a specific genre also enjoy.", sql: `WITH genre_lovers AS (
    SELECT DISTINCT r.user_id FROM ratings r
    JOIN movie_genres mg ON r.movie_id = mg.movie_id
    JOIN genres g ON mg.genre_id = g.genre_id
    WHERE g.name ILIKE %s GROUP BY r.user_id
    HAVING COUNT(*) >= %s AND AVG(r.rating) >= 4.0
)
SELECT g.name as genre, ROUND(AVG(r.rating)::numeric, 2) as avg_rating
FROM ratings r
JOIN movie_genres mg ON r.movie_id = mg.movie_id
JOIN genres g ON mg.genre_id = g.genre_id
WHERE r.user_id IN (SELECT user_id FROM genre_lovers)
GROUP BY g.name HAVING COUNT(*) >= 50 ORDER BY avg_rating DESC` },
      { name: "Low Rater Analysis", endpoint: "GET /api/ratings/low-raters", method: "GET", description: "Categorizes users into harsh critics, balanced, and generous raters.", sql: `WITH user_categories AS (
    SELECT user_id, AVG(rating) as overall_avg,
        CASE
            WHEN AVG(rating) <= 2.5 THEN 'harsh_critic'
            WHEN AVG(rating) >= 4.0 THEN 'generous_rater'
            ELSE 'balanced_rater'
        END as rater_type
    FROM ratings GROUP BY user_id HAVING COUNT(*) >= 20
)
SELECT rater_type, COUNT(*) as user_count,
    ROUND(AVG(overall_avg)::numeric, 2) as avg_rating
FROM user_categories GROUP BY rater_type ORDER BY avg_rating` },
    ],
  },
  {
    name: "Predictions",
    description: "Rating prediction algorithms",
    queries: [
      { name: "Predict Rating", endpoint: "POST /api/predictions/predict", method: "POST", description: "Predicts ratings for new movies based on genre similarity.", sql: `WITH similar_movies AS (
    SELECT m.movie_id, COUNT(DISTINCT mg.genre_id) as matching_genres,
        (SELECT COUNT(*) FROM target_genres) as total_target_genres
    FROM movies m
    JOIN movie_genres mg ON m.movie_id = mg.movie_id
    WHERE mg.genre_id IN (SELECT genre_id FROM target_genres)
    GROUP BY m.movie_id
    HAVING COUNT(*) >= GREATEST(1, (SELECT COUNT(*) FROM target_genres) / 2)
    LIMIT 50
)
SELECT ROUND(AVG(rating)::numeric, 2) as predicted_rating,
    ROUND(STDDEV(rating)::numeric, 2) as uncertainty,
    COUNT(*) as based_on_ratings
FROM similar_movies sm JOIN ratings r ON sm.movie_id = r.movie_id` },
      { name: "Find Similar Movies", endpoint: "GET /api/predictions/similar/{id}", method: "GET", description: "Finds movies similar based on genre overlap.", sql: `WITH genre_similarity AS (
    SELECT m.movie_id, m.title, m.release_year,
        COUNT(DISTINCT mg.genre_id) as matching_genres
    FROM movies m
    JOIN movie_genres mg ON m.movie_id = mg.movie_id
    WHERE mg.genre_id IN (SELECT genre_id FROM target_genres)
      AND m.movie_id != %s
    GROUP BY m.movie_id
)
SELECT *, ROUND(100.0 * matching_genres / total_genres, 1) as similarity_pct,
    ROUND(AVG(r.rating)::numeric, 2) as avg_rating
FROM genre_similarity gs LEFT JOIN ratings r ON gs.movie_id = r.movie_id
GROUP BY gs.movie_id ORDER BY similarity_pct DESC LIMIT %s` },
    ],
  },
  {
    name: "Personality",
    description: "Personality traits and viewing preferences",
    queries: [
      { name: "Get Personality Traits", endpoint: "GET /api/personality/traits", method: "GET", description: "Returns Big Five personality trait statistics.", sql: `SELECT 'openness' as trait,
    ROUND(AVG(openness)::numeric, 2) as mean,
    ROUND(STDDEV(openness)::numeric, 2) as stddev,
    MIN(openness) as min, MAX(openness) as max
FROM personality_users
UNION ALL SELECT 'agreeableness', ROUND(AVG(agreeableness)::numeric, 2),
    ROUND(STDDEV(agreeableness)::numeric, 2), MIN(agreeableness), MAX(agreeableness)
FROM personality_users
-- (similar for other traits)` },
      { name: "Trait-Genre Correlation", endpoint: "GET /api/personality/genre-correlation", method: "GET", description: "Correlates personality traits with genre preferences.", sql: `WITH trait_users AS (
    SELECT user_id FROM personality_users
    WHERE {trait} {>= 4.0 | <= 2.0}
)
SELECT g.name as genre, ROUND(AVG(r.rating)::numeric, 2) as avg_rating
FROM trait_users tu
JOIN ratings r ON tu.user_id = r.user_id
JOIN movie_genres mg ON r.movie_id = mg.movie_id
JOIN genres g ON mg.genre_id = g.genre_id
GROUP BY g.name HAVING COUNT(*) >= 50 ORDER BY avg_rating DESC` },
      { name: "Viewer Segments", endpoint: "GET /api/personality/segments", method: "GET", description: "Identifies viewer segments based on personality clusters.", sql: `WITH user_segments AS (
    SELECT user_id,
        CASE
            WHEN extraversion >= 4 AND openness >= 4 THEN 'adventurous_social'
            WHEN extraversion >= 4 AND openness < 3 THEN 'social_traditional'
            WHEN extraversion < 3 AND openness >= 4 THEN 'curious_introvert'
            ELSE 'balanced'
        END as segment
    FROM personality_users
)
SELECT segment, g.name as genre, ROUND(AVG(r.rating)::numeric, 2) as avg_rating
FROM user_segments us
JOIN ratings r ON us.user_id = r.user_id
JOIN movie_genres mg ON r.movie_id = mg.movie_id
JOIN genres g ON mg.genre_id = g.genre_id
GROUP BY segment, g.name HAVING COUNT(*) >= 20
ORDER BY segment, avg_rating DESC` },
    ],
  },
  {
    name: "Collections",
    description: "User curated collection management",
    queries: [
      { name: "Get User Collections", endpoint: "GET /api/collections", method: "GET", description: "Retrieves all collections for the current user.", sql: `SELECT c.collection_id, c.title, c.note, c.created_at,
    COUNT(ci.item_id) as movie_count
FROM collections c
LEFT JOIN collection_items ci ON c.collection_id = ci.collection_id
WHERE c.user_id = %s
GROUP BY c.collection_id ORDER BY c.created_at DESC` },
      { name: "Get Collection Details", endpoint: "GET /api/collections/{id}", method: "GET", description: "Retrieves collection with movies grouped by genre.", sql: `SELECT g.name as genre,
    JSON_AGG(JSON_BUILD_OBJECT(
        'movie_id', m.movie_id, 'title', m.title,
        'release_year', m.release_year, 'added_at', ci.added_at
    ) ORDER BY m.title) as movies
FROM collection_items ci
JOIN movies m ON ci.movie_id = m.movie_id
JOIN movie_genres mg ON m.movie_id = mg.movie_id
JOIN genres g ON mg.genre_id = g.genre_id
WHERE ci.collection_id = %s
GROUP BY g.name ORDER BY g.name` },
      { name: "Add Movie to Collection", endpoint: "POST /api/collections/{id}/movies", method: "POST", description: "Adds a movie to an existing collection.", sql: `INSERT INTO collection_items (collection_id, movie_id, added_at)
VALUES (%s, %s, %s) RETURNING *` },
    ],
  },
]

// ============================================================================
// COMPONENTS
// ============================================================================

function TechCard({ item }: { item: TechItem }) {
  return (
    <div className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name}</span>
          {item.version && <Badge variant="secondary" className="text-xs">v{item.version}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{item.description}</p>
      </div>
      {item.link && (
        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  )
}

function QueryCard({ query }: { query: QueryInfo }) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(query.sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const methodColors = {
    GET: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    POST: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-md cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="font-medium text-sm">{query.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn("text-xs", methodColors[query.method])}>{query.method}</Badge>
                <code className="text-xs text-muted-foreground">{query.endpoint}</code>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-10 pr-3 pb-3 space-y-3">
          <p className="text-sm text-muted-foreground">{query.description}</p>
          <div className="relative">
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto"><code>{query.sql}</code></pre>
            <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-7 px-2" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function CategoryCard({ category }: { category: QueryCategory }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {category.name}
                  <Badge variant="secondary">{category.queries.length}</Badge>
                </CardTitle>
                <CardDescription className="mt-1">{category.description}</CardDescription>
              </div>
              {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="divide-y">
              {category.queries.map((query, index) => <QueryCard key={index} query={query} />)}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

// ============================================================================
// TAB CONTENT COMPONENTS
// ============================================================================

function TechStackContent() {
  return (
    <div className="space-y-6">
      {/* Architecture Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Architecture Overview</CardTitle>
          <CardDescription>Multi-tier architecture with containerized microservices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Layer</TableHead>
                <TableHead className="whitespace-nowrap">Components</TableHead>
                <TableHead className="whitespace-nowrap">Responsibility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {architectureDetails.map((layer) => (
                <TableRow key={layer.layer}>
                  <TableCell className="font-medium whitespace-nowrap">{layer.layer}</TableCell>
                  <TableCell><code className="text-xs bg-muted px-1 py-0.5 rounded">{layer.components}</code></TableCell>
                  <TableCell className="text-muted-foreground">{layer.responsibility}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Database Schema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Database Schema</CardTitle>
          <CardDescription>PostgreSQL tables and record counts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Table</TableHead>
                <TableHead className="text-right whitespace-nowrap">Records</TableHead>
                <TableHead className="whitespace-nowrap">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {databaseSchema.map((table) => (
                <TableRow key={table.table}>
                  <TableCell><code className="text-sm">{table.table}</code></TableCell>
                  <TableCell className="text-right font-mono">{table.records}</TableCell>
                  <TableCell className="text-muted-foreground">{table.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Technology Stack */}
      {stackSections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">{section.icon}{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {section.technologies.map((tech) => <TechCard key={tech.name} item={tech} />)}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Docker Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Container className="h-5 w-5" />Docker Services</CardTitle>
          <CardDescription>Container configuration and networking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Service</TableHead>
                <TableHead className="whitespace-nowrap">Container</TableHead>
                <TableHead className="whitespace-nowrap">Image</TableHead>
                <TableHead className="whitespace-nowrap">Ports</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell className="font-medium">db</TableCell><TableCell><code>movielens-db</code></TableCell><TableCell><code>postgres:16-alpine</code></TableCell><TableCell><code>5432:5432</code></TableCell></TableRow>
              <TableRow><TableCell className="font-medium">backend</TableCell><TableCell><code>movielens-backend</code></TableCell><TableCell><code>custom</code></TableCell><TableCell><code>8001:8000</code></TableCell></TableRow>
              <TableRow><TableCell className="font-medium">frontend</TableCell><TableCell><code>movielens-frontend</code></TableCell><TableCell><code>custom</code></TableCell><TableCell><code>443:443, 80:80</code></TableCell></TableRow>
              <TableRow><TableCell className="font-medium">pgadmin</TableCell><TableCell><code>movielens-pgadmin</code></TableCell><TableCell><code>dpage/pgadmin4</code></TableCell><TableCell><code>5050:80</code></TableCell></TableRow>
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SQLQueriesContent() {
  const totalQueries = queryCategories.reduce((sum, cat) => sum + cat.queries.length, 0)

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        {totalQueries} queries across {queryCategories.length} categories used in the application
      </p>

      <div className="space-y-4">
        {queryCategories.map((category, index) => <CategoryCard key={index} category={category} />)}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>About:</strong> These SQL queries are executed using psycopg2 against PostgreSQL 16.</p>
              <p><strong>Database Access:</strong> Use pgAdmin at <a href="https://db-comp22-cw.marlin.im" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://db-comp22-cw.marlin.im</a></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BuildDetails() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-6 w-6" />
          Build Details
        </h1>
        <p className="text-muted-foreground">
          Technical specifications, architecture, and SQL documentation
        </p>
      </div>

      <Tabs defaultValue="stack" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stack" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Tech Stack
          </TabsTrigger>
          <TabsTrigger value="queries" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            SQL Queries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stack">
          <TechStackContent />
        </TabsContent>

        <TabsContent value="queries">
          <SQLQueriesContent />
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Project:</strong> MoviesDB - Film Analytics Dashboard for COMP0022 Databases & Information Systems coursework at UCL.</p>
              <p><strong>Data Source:</strong> MovieLens ml-latest-small dataset enriched with TMDB API metadata. Personality data is synthetically generated.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
