import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const chartCard = {
  background: '#0b1f2f',
  border: '1px solid rgba(6,182,212,0.16)',
  borderRadius: '20px',
  padding: '22px',
  minHeight: '380px',
}

function formatTime(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
}

function SensorChart({ token, initialReadings }) {
  const [readings, setReadings] = useState(initialReadings || [])

  useEffect(() => {
    if (!token) return
    const fetchInitial = async () => {
      try {
        const response = await fetch(`http://localhost:8000/readings?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        setReadings(data)
      } catch (error) {
        console.error(error)
      }
    }
    if (!initialReadings || initialReadings.length === 0) {
      fetchInitial()
    }
  }, [token])

  const grouped = useMemo(() => {
    const grouped = { temperatura: [], humedad: [], movimiento: [] }
    readings.slice(0, 50).reverse().forEach((item) => {
      grouped[item.sensor_type]?.push({
        name: formatTime(item.timestamp),
        valor: item.valor,
      })
    })
    return grouped
  }, [readings])

  return (
    <div style={chartCard}>
      <h3 style={{ margin: 0, color: '#8bd7ea' }}>Historial de sensores</h3>
      <div style={{ display: 'grid', gap: '26px', marginTop: '20px' }}>
        {Object.entries(grouped).map(([sensorType, data]) => (
          <div key={sensorType} style={{ minHeight: '170px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#fff', fontWeight: 700 }}>{sensorType.toUpperCase()}</span>
              <span style={{ color: '#94a3b8' }}>{data.length} lecturas</span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={data}>
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <CartesianGrid stroke="#13414f" vertical={false} />
                <Tooltip contentStyle={{ background: '#0b1f2f', border: '1px solid rgba(6,182,212,0.16)', color: '#fff' }} />
                <Line type="monotone" dataKey="valor" stroke="#06b6d4" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SensorChart
