import client from './client'

export const listCandidates = (params = {}) => client.get('/api/candidates', { params })

export const createCandidate = (payload) => client.post('/api/candidates', payload)

export const updateCandidate = (id, payload) => client.put(`/api/candidates/${id}`, payload)

export const deleteCandidate = (id) => client.delete(`/api/candidates/${id}`)

export const listStreams = () => client.get('/api/streams')

export const createStream = (payload) => client.post('/api/streams', payload)
export const deleteStream = (id) => client.delete(`/api/streams/${id}`)
export const importCandidatesDocument = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return client.post('/api/candidates/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
