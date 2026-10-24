/**
 * Central HTTP client.
 *
 * Type generation strategy: use `openapi-typescript` against the FastAPI OpenAPI
 * schema to auto-generate `src/types/api.gen.ts`. Define this as a task in a spec.
 *
 * npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.gen.ts
 */
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

const MAINTENANCE_DETAIL = 'Maintenance in progress'
const SERVICE_UNAVAILABLE = 503

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // A request refused for maintenance makes the app re-check the site status (feature 028).
    if (
      axios.isAxiosError(error) &&
      error.response?.status === SERVICE_UNAVAILABLE &&
      error.response.data?.detail === MAINTENANCE_DETAIL
    )
      window.dispatchEvent(new Event('bingo:maintenance'))
    return Promise.reject(error)
  },
)

/** True when the request never got an answer (server down, offline, CORS/network failure). */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response
}
