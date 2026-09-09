import axios from 'axios'

// In Docker Compose, the frontend container reaches the backend via the
// service name; in local dev (vite outside Docker) it falls back to localhost.
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auth token attachment is wired up in Phase 3 once login/register exist.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('cpms_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default client
