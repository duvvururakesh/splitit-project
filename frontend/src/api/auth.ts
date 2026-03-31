import client from './client'

export const getMe = () => client.get('/auth/me').then(r => r.data)

export const updateMe = (data: {
  display_name?: string
  email?: string
  current_password?: string
  new_password?: string
}) => client.patch('/auth/me', data).then(r => r.data)
