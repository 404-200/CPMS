import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function StreamChart({ streamAverages }) {
  if (!streamAverages || !streamAverages.length) {
    return <p className="muted">No stream data for this period yet.</p>
  }

  return (
    <div className="card">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={streamAverages}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
          <XAxis dataKey="stream_name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="tdc_average" name="TDC Avg" fill="#623f99" radius={[4, 4, 0, 0]} />
          <Bar dataKey="tech_average" name="Tech Avg" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="overall_average" name="Overall Avg" fill="#f25657" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
