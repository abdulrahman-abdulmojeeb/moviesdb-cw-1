import { Routes, Route } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import GenreReports from './pages/GenreReports'
import RatingPatterns from './pages/RatingPatterns'
import Predictions from './pages/Predictions'
import Personality from './pages/Personality'
import Collections from './pages/Collections'
import MovieDetail from './pages/MovieDetail'
import MyRatings from './pages/MyRatings'
import Profile from './pages/Profile'
import BuildDetails from './pages/BuildDetails'
import Recommendations from './pages/Recommendations'

function App() {
  return (
    <div className="flex h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">
        Skip to main content
      </a>
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <main id="main-content" className="flex-1 overflow-auto p-3 pt-16 sm:p-4 md:p-6 md:pt-6" role="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/movies/:id" element={<MovieDetail />} />
            <Route path="/genres" element={<GenreReports />} />
            <Route path="/ratings" element={<RatingPatterns />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/personality" element={<Personality />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/build" element={<BuildDetails />} />
            <Route path="/my-ratings" element={<MyRatings />} />
            <Route path="/recommendations" element={<Recommendations />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
