import client from './client'

export const listPeriods = (periodType) =>
  client.get('/api/periods', { params: periodType ? { period_type: periodType } : {} })

export const createPeriod = (payload) => client.post('/api/periods', payload)
