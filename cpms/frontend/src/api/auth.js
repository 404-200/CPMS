import client from './client'

export const login = (email, password) => client.post('/api/auth/login', { email, password })

export const register = (payload) => client.post('/api/auth/register', payload)

export const me = () => client.get('/api/auth/me')

export const forgotPassword = (email) => client.post('/api/auth/forgot-password', { email })

export const resetPassword = (token, newPassword) =>
  client.post('/api/auth/reset-password', { token, new_password: newPassword })
