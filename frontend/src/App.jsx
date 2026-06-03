import { useEffect, useMemo, useState } from 'react'
import useWebSocket from './hooks/useWebSocket'
import Dashboard from './components/Dashboard'
import SensorChart from './components/SensorChart'
import DeviceStatus from './components/DeviceStatus'
import AlertPanel from './components/AlertPanel'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    minHeight: '100vh',
    background: '#071821',
    color: '#e6f7ff',
  },
  sidebar: {
    padding: '28px 20px',
    background: '#06131d',
    borderRight: '1px solid rgba(6, 182, 212, 0.12)',
  },
  content: {
    padding: '28px',
    overflow: 'auto',
  },
  navItem: {
    marginBottom: '18px',
    fontSize: '0.98rem',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    borderRadius: '16px',
    cursor: 'pointer',
    background: '#0b1f2f',
  },
  header: {
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    margin: 0,
    fontSize: '1.7rem',
    letterSpacing: '-0.03em',
  },
  loginCard: {
    maxWidth: '420px',
    margin: '120px auto',
    padding: '32px',
    borderRadius: '24px',
    background: '#0b1f2f',
    boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
  },
  input: {
    width: '100%',
    marginTop: '10px',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid rgba(6,182,212,0.25)',
    background: '#06131d',
    color: '#e6f7ff',
  },
  button: {
    width: '100%',
    marginTop: '20px',
    padding: '14px 16px',
    borderRadius: '14px',
    border: 'none',
    background: '#06b6d4',
    color: '#041f2d',
    fontWeight: '700',
    cursor: 'pointer',
  },
}

function App() {
  const [token, setToken] = useState(null)
  const [screen, setScreen] = useState('dashboard')
  const [userToken, setUserToken] = useState('')
  const [userPass, setUserPass] = useState('')
  const [loginError, setLoginError] = useState(null)
  const { lastReading, alerts, connectionStatus } = useWebSocket(token)
  const [devices, setDevices] = useState([])
  const [initialReadings, setInitialReadings] = useState([])

  useEffect(() => {
    if (!token) return
    const fetchInfo = async () => {
      try {
        const [readingsRes, devicesRes] = await Promise.all([
          fetch(`${API_BASE}/readings?limit=50`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/devices`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const [readingsData, devicesData] = await Promise.all([readingsRes.json(), devicesRes.json()])
        setInitialReadings(readingsData)
        setDevices(devicesData)
      } catch (error) {
        console.error(error)
      }
    }
    fetchInfo()
  }, [token])

  const activeDevice = useMemo(() => devices.find((item) => item.id === 'rpi-001') || null, [devices])

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoginError(null)
    try {
      const response = await fetch(`${API_BASE}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: userToken, password: userPass }),
      })
      if (!response.ok) {
        throw new Error('Authentication failed')
      }
      const data = await response.json()
      setToken(data.access_token)
    } catch (error) {
      setLoginError('Usuario o contraseña incorrectos')
    }
  }

  if (!token) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.sidebar, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '10px' }}>IoT MIRAI</div>
          <div style={{ color: '#8bd7ea' }}>Sistema de monitoreo en tiempo real</div>
        </div>
        <div style={styles.content}>
          <div style={styles.loginCard}>
            <h2>Iniciar sesión</h2>
            <form onSubmit={handleLogin}>
              <label>Usuario</label>
              <input style={styles.input} value={userToken} onChange={(e) => setUserToken(e.target.value)} />
              <label>Contraseña</label>
              <input type="password" style={styles.input} value={userPass} onChange={(e) => setUserPass(e.target.value)} />
              <button style={styles.button} type="submit">Entrar</button>
              {loginError && <p style={{ marginTop: '12px', color: '#fb7185' }}>{loginError}</p>}
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>IoT MIRAI</h2>
        {['dashboard', 'history', 'alerts', 'devices'].map((item) => (
          <div key={item} style={{ ...styles.navItem, background: screen === item ? '#06272f' : '#0b1f2f' }} onClick={() => setScreen(item)}>
            <span>{item === 'dashboard' ? '📡' : item === 'history' ? '📈' : item === 'alerts' ? '🚨' : '🖥️'}</span>
            <span>{item.charAt(0).toUpperCase() + item.slice(1)}</span>
          </div>
        ))}
      </aside>
      <main style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Panel de control IoT</h1>
            <p style={{ color: '#8bd7ea' }}>Estado en vivo, alertas y métricas de sensores</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ color: '#06b6d4' }}>Conexión {connectionStatus}</span>
          </div>
        </div>
        {screen === 'dashboard' && (
          <>
            <Dashboard lastReading={lastReading} status={connectionStatus} />
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginTop: '20px' }}>
              <SensorChart token={token} initialReadings={initialReadings} />
              <DeviceStatus device={activeDevice} />
            </div>
          </>
        )}
        {screen === 'history' && <SensorChart token={token} initialReadings={initialReadings} />}
        {screen === 'alerts' && <AlertPanel alerts={alerts} />}
        {screen === 'devices' && <DeviceStatus device={activeDevice} />}
      </main>
    </div>
  )
}

export default App
