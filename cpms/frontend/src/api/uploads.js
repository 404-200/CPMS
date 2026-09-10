import client from './client'

export const uploadScores = (file, periodId, createNewVersion = false) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('period_id', periodId)
  formData.append('create_new_version', createNewVersion)
  return client.post('/api/uploads/scores', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
