import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${API_URL}/api/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
              },
            }
          )

          const { access_token, refresh_token } = response.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)

          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

// Movies API
export const moviesApi = {
  getMovies: (params: Record<string, unknown>) => api.get('/movies', { params }),
  getMovie: (id: number) => api.get(`/movies/${id}`),
  getMovieRatings: (id: number) => api.get(`/movies/${id}/ratings`),
}

// Genres API
export const genresApi = {
  getGenres: () => api.get('/genres'),
  getPopularity: () => api.get('/genres/popularity'),
  getPolarisation: () => api.get('/genres/polarisation'),
}

// Ratings API
export const ratingsApi = {
  getPatterns: () => api.get('/ratings/patterns'),
  getCrossGenre: (sourceGenre: string, minRatings?: number) =>
    api.get('/ratings/cross-genre', { params: { source_genre: sourceGenre, min_ratings: minRatings } }),
  getLowRaterPatterns: () => api.get('/ratings/low-raters'),
  getConsistency: (genre?: string) => api.get('/ratings/consistency', { params: { genre } }),
}

// Predictions API
export const predictionsApi = {
  predict: (data: { title: string; genres: string[]; year?: number }) =>
    api.post('/predictions/predict', data),
  getSimilar: (movieId: number, limit?: number) =>
    api.get(`/predictions/similar/${movieId}`, { params: { limit } }),
  getPreviewPanel: (movieId: number, panelSize?: number) =>
    api.get('/predictions/preview-panel', { params: { movie_id: movieId, panel_size: panelSize } }),
}

// Personality API
export const personalityApi = {
  getTraits: () => api.get('/personality/traits'),
  getGenreCorrelation: (trait: string, threshold: 'high' | 'low') =>
    api.get('/personality/genre-correlation', { params: { trait, threshold } }),
  getGenreTraits: (genre: string) =>
    api.get('/personality/genre-traits', { params: { genre } }),
  getSegments: () => api.get('/personality/segments'),
}

// Collections API
export const collectionsApi = {
  getCollections: () => api.get('/collections'),
  getCollection: (id: number) => api.get(`/collections/${id}`),
  createCollection: (data: { title: string; note?: string }) =>
    api.post('/collections', data),
  updateCollection: (id: number, data: { title?: string; note?: string }) =>
    api.put(`/collections/${id}`, data),
  deleteCollection: (id: number) => api.delete(`/collections/${id}`),
  addMovie: (collectionId: number, movieId: number) =>
    api.post(`/collections/${collectionId}/movies`, { movie_id: movieId }),
  removeMovie: (collectionId: number, movieId: number) =>
    api.delete(`/collections/${collectionId}/movies/${movieId}`),
}

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (username: string, password: string, inviteToken: string, email?: string) =>
    api.post('/auth/register', { username, password, invite_token: inviteToken, email }),
  refresh: () => api.post('/auth/refresh'),
  getMe: () => api.get('/auth/me'),
}
