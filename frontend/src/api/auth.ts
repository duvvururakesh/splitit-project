import client from './client'

export const guestLogin = () => client.post('/auth/guest').then(r => r.data)

export const forgotPassword = (email: string) =>
  client.post('/auth/forgot-password', { email }).then(r => r.data)

export const resetPassword = (token: string, new_password: string) =>
  client.post('/auth/reset-password', { token, new_password }).then(r => r.data)

export const login = (email: string, password: string) =>
  client.post('/auth/login', { email, password }).then(r => r.data)

export const register = (email: string, password: string, display_name: string) =>
  client.post('/auth/register', { email, password, display_name }).then(r => r.data)

export const getMe = () => client.get('/auth/me').then(r => r.data)

export const logoutApi = () => client.post('/auth/logout').then(r => r.data)
export const logoutAllApi = () => client.post('/auth/logout-all').then(r => r.data)

export const updateMe = (data: {
  display_name?: string
  email?: string
  current_password?: string
  new_password?: string
}) => client.patch('/auth/me', data).then(r => r.data)
