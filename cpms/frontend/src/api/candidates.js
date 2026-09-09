import client from './client'

export const listCandidates = (params = {}) => client.get('/api/candidates', { params })

export const createCandidate = (payload) => client.post('/api/candidates', payload)

export const updateCandidate = (id, payload) => client.put(`/api/candidates/${id}`, payload)

export const deleteCandidate = (id) => client.delete(`/api/candidates/${id}`)

export const listStreams = () => client.get('/api/streams')
