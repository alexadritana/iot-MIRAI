import React from 'react'

const card = {
  background: '#0b1f2f',
  border: '1px solid rgba(6,182,212,0.16)',
  borderRadius: '20px',
  padding: '22px',
}

function DeviceStatus({ device }) {
  return (
    <div style={card}>
      <h3 style={{ margin: 0, color: '#8bd7ea' }}>Estado del dispositivo</h3>
      {device ? (
        <div style={{ marginTop: '18px', display: 'grid', gap: '14px' }}>
          <div>
            <span style={{ color: '#94a3b8' }}>ID</span>
            <p style={{ margin: '6px 0 0', fontWeight: 700 }}>{device.id}</p>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Estatus</span>
            <p style={{ margin: '6px 0 0', color: device.status === 'connected' ? '#22c55e' : '#fbbf24' }}>{device.status}</p>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Última conexión</span>
            <p style={{ margin: '6px 0 0' }}>{device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Pendiente'}</p>
          </div>
        </div>
      ) : (
        <p style={{ marginTop: '16px', color: '#cbd5e1' }}>No hay datos del dispositivo disponibles.</p>
      )}
    </div>
  )
}

export default DeviceStatus
