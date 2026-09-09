import { useEffect, useState } from 'react'
import { listPeriods } from '../api/periods'
import { uploadScores } from '../api/uploads'
import UploadForm from '../components/UploadForm'

export default function UploadScores() {
  const [periods, setPeriods] = useState([])
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listPeriods('BIWEEKLY').then((res) => setPeriods(res.data))
  }, [])

  async function handleSubmit(file, periodId, createNewVersion) {
    setSubmitting(true)
    setError('')
    setResult(null)
    try {
      const res = await uploadScores(file, periodId, createNewVersion)
      setResult(res.data)
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response.data.detail)
      } else if (err.response?.data?.detail) {
        setError(
          typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : JSON.stringify(err.response.data.detail)
        )
      } else {
        setError('Upload failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Upload Score Sheet</h1>
      <p style={{ color: '#6b7280', maxWidth: 520 }}>
        Upload an .xlsx file with columns: Candidate ID, Candidate Name, Stream, Communication,
        Attendance, Accountability, Project Delivery, Tech Skills, Creativity.
      </p>
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      <UploadForm periods={periods} onSubmit={handleSubmit} submitting={submitting} result={result} />
    </div>
  )
}
