import React from 'react'

const card = {
  background: '#0b1f2f',
  border: '1px solid rgba(6,182,212,0.16)',
  borderRadius: '20px',
  padding: '22px',
}

function AlertPanel({ alerts }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#8bd7ea' }}>Alertas recientes</h3>
        <span style={{ background: '#fb7185', color: '#fff', padding: '8px 12px', borderRadius: '999px' }}>{alerts.length} nuevas</span>
      </div>
      <div style={{ marginTop: '20px', display: 'grid', gap: '16px' }}>
        {alerts.length === 0 && <p style={{ color: '#cbd5e1' }}>No hay alertas recientes.</p>}
        {alerts.map((alert) => (
          <div key={alert.sensor_type + alert.triggered_at} style={{ padding: '16px', borderRadius: '18px', background: '#06131d' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <strong style={{ color: '#fff' }}>{alert.sensor_type.toUpperCase()}</strong>
              <span style={{ color: '#38bdf8' }}>{new Date(alert.triggered_at).toLocaleString()}</span>
            </div>
            <p style={{ margin: '10px 0 0', color: '#cbd5e1' }}>
              Valor: <strong>{alert.valor}</strong> • Umbral: <strong>{alert.threshold}</strong>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AlertPanel
