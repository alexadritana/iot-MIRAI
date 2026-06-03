import React from 'react'

const cardStyle = {
  background: '#0b1f2f',
  border: '1px solid rgba(6,182,212,0.16)',
  borderRadius: '20px',
  padding: '20px',
  boxShadow: '0 22px 50px rgba(0,0,0,0.18)',
}

function SensorCard({ label, value, unit, color }) {
  return (
    <div style={{ ...cardStyle, borderColor: color }}>
      <p style={{ margin: 0, color: '#8bd7ea', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      <h2 style={{ margin: '14px 0 0', fontSize: '2.8rem', color: '#fff' }}>{value ?? '--'} {unit}</h2>
    </div>
  )
}

function Dashboard({ lastReading, status }) {
  const temperatura = lastReading?.sensor_type === 'temperatura' ? lastReading.valor : '--'
  const humedad = lastReading?.sensor_type === 'humedad' ? lastReading.valor : '--'
  const movimiento = lastReading?.sensor_type === 'movimiento' ? lastReading.valor : '--'

  const badgeColor = status.includes('Live') ? '#22c55e' : status.includes('Error') ? '#fb7185' : '#facc15'

  return (
    <section style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <SensorCard label="Temperatura" value={temperatura} unit="°C" color="#06b6d4" />
        <SensorCard label="Humedad" value={humedad} unit="%" color="#0ea5e9" />
        <SensorCard label="Movimiento" value={movimiento} unit="" color="#22c55e" />
      </div>
      <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: '#8bd7ea' }}>Conexión de transmisión</h3>
          <p style={{ margin: '10px 0 0', fontSize: '1rem', color: '#cbd5e1' }}>Estado en tiempo real del socket y últimas actualizaciones.</p>
        </div>
        <div style={{ padding: '10px 16px', borderRadius: '999px', background: badgeColor, color: '#041f2d', fontWeight: 700 }}>
          {status}
        </div>
      </div>
    </section>
  )
}

export default Dashboard
