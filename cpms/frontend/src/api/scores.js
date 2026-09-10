import client from './client'

export const getScore = (candidateId, periodId) =>
  client.get('/api/scores/one', { params: { candidate_id: candidateId, period_id: periodId } })

export const submitManualScore = (payload) => client.post('/api/scores/manual', payload)
