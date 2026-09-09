import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function StreamChart({ streamAverages }) {
  if (!streamAverages || !streamAverages.length) {
    return <p style={{ color: '#6b7280' }}>No stream data for this period yet.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={streamAverages}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="stream_name" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Legend />
        <Bar dataKey="tdc_average" name="TDC Avg" fill="#6366f1" />
        <Bar dataKey="tech_average" name="Tech Avg" fill="#10b981" />
        <Bar dataKey="overall_average" name="Overall Avg" fill="#f59e0b" />
      </BarChart>
    </ResponsiveContainer>
  )
}
