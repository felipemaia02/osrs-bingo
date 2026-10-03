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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Centralised error handling – expand per auth/error spec.
    return Promise.reject(error)
  },
)
