import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error?.response?.status

    // Try one silent refresh for expired/invalid access tokens.
    if (status === 401 && originalRequest && !originalRequest._retry && !String(originalRequest.url || '').includes('/auth/refresh')) {
      originalRequest._retry = true
      try {
        const refreshResp = await client.post('/auth/refresh')
        const token = refreshResp?.data?.access_token
        if (token) {
          useAuthStore.getState().setToken(token)
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${token}`
          return client(originalRequest)
        }
      } catch {
        useAuthStore.getState().logout()
      }
    }

    return Promise.reject(error)
  }
)

export default client
