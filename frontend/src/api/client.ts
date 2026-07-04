// src/api/client.ts

import axios from 'axios'

// Base instance — all requests go through this
const apiClient = axios.create({
    baseURL: '/api/v1',   // Vite proxy handles routing to localhost:8000
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,  // send cookies (refresh token) on every request
})

// ── Request interceptor ────────────────────────────────────────────
// Attaches the access token to every request automatically
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ── Response interceptor ───────────────────────────────────────────
// If any request returns 401, try to refresh the token
// If refresh also fails, log the user out
let isRefreshing = false
let failedQueue: Array<{
    resolve: (token: string) => void
    reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error)
        else resolve(token!)
    })
    failedQueue = []
}

apiClient.interceptors.response.use(
    (response) => response,   // success — pass through unchanged
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Another request is already refreshing — queue this one
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`
                        return apiClient(originalRequest)
                    })
                    .catch((err) => Promise.reject(err))
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                // Try to get a new access token using the refresh cookie
                const response = await apiClient.post('/auth/refresh')
                const newToken = response.data.access_token

                localStorage.setItem('access_token', newToken)
                apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`

                processQueue(null, newToken)
                originalRequest.headers.Authorization = `Bearer ${newToken}`
                return apiClient(originalRequest)

            } catch (refreshError) {
                // Refresh failed — token is expired or revoked
                processQueue(refreshError, null)
                localStorage.removeItem('access_token')
                window.location.href = '/login'
                return Promise.reject(refreshError)

            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    }
)

export default apiClient

// Why the failedQueue? If 3 API calls all get a 401 at the same time (access token just expired), you don't want 3 simultaneous refresh requests. The queue holds the other requests while one refresh happens, then replays them all with the new token.