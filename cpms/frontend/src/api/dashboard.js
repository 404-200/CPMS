import client from './client'

export const getDashboardSummary = () => client.get('/api/dashboard')

export const getDashboardStreams = () => client.get('/api/dashboard/streams')

export const getDashboardRankings = () => client.get('/api/dashboard/rankings')
