import { useEffect, useMemo, useState } from 'react'
import useWebSocket from './hooks/useWebSocket'
import Dashboard from './components/Dashboard'
import SensorChart from './components/SensorChart'
import DeviceStatus from './components/DeviceStatus'
import AlertPanel from './components/AlertPanel'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/*
  ── PARA PONER TU LOGO (Imagen 2) ────────────────────────────────────────
  1) Copia el archivo de imagen a: frontend/src/assets/logo.png
  2) Descomenta la siguiente línea de import:
       import logo from './assets/logo.png'
  3) Reemplaza el bloque de texto "MIRAI" en el sidebar (login y dashboard)
     por: <img src={logo} alt="MIRAI" style={styles.logoImg} />
     Ya dejé styles.logoImg listo más abajo (invierte a blanco con filter
     porque tu logo es azul sobre fondo blanco, y aquí el fondo es oscuro).
  ───────────────────────────────────────────────────────────────────────── */
 import logo from './assets/logo.png'

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: '264px 1fr',
    minHeight: '100vh',
    background:
      'radial-gradient(1200px 600px at 100% -10%, rgba(34,211,238,0.06), transparent 60%), #050b14',
    color: '#e8f4fa',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  sidebar: {
    padding: '32px 22px',
    background: '#070f1a',
    borderRight: '1px solid rgba(34,211,238,0.10)',
    display: 'flex',
    flexDirection: 'column',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '40px',
  },
  brandDot: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    background: '#22d3ee',
    boxShadow: '0 0 12px 2px rgba(34,211,238,0.65)',
  },
  brandText: {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: '1.15rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: '#f2fbff',
  },
  logoImg: {
    height: '32px',
    width: 'auto',
    filter: 'none',
    objectFit: 'contain',
  },
  navItem: {
    marginBottom: '8px',
    fontSize: '0.93rem',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '12px',
    cursor: 'pointer',
    color: '#8fb4c9',
    transition: 'background 0.15s ease, color 0.15s ease',
    border: '1px solid transparent',
  },
  navItemActive: {
    background: 'rgba(34,211,238,0.08)',
    color: '#e8f4fa',
    border: '1px solid rgba(34,211,238,0.18)',
  },
  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    fontSize: '0.78rem',
    color: '#4d7287',
  },
  content: {
    padding: '32px 36px',
    overflow: 'auto',
  },
  header: {
    marginBottom: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: '1.65rem',
    letterSpacing: '-0.02em',
    color: '#f6fcff',
  },
  subtitle: {
    margin: '6px 0 0',
    color: '#5b8aa6',
    fontSize: '0.92rem',
  },
  statusPill: (connected) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: '999px',
    fontSize: '0.82rem',
    fontWeight: 600,
    background: connected ? 'rgba(34,211,238,0.10)' : 'rgba(251,113,133,0.10)',
    color: connected ? '#22d3ee' : '#fb7185',
    border: `1px solid ${connected ? 'rgba(34,211,238,0.25)' : 'rgba(251,113,133,0.25)'}`,
  }),
  statusDot: (connected) => ({
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: connected ? '#22d3ee' : '#fb7185',
    boxShadow: connected
      ? '0 0 8px 1px rgba(34,211,238,0.8)'
      : '0 0 8px 1px rgba(251,113,133,0.8)',
  }),
  loginWrap: {
    minHeight: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginCard: {
    width: '100%',
    maxWidth: '400px',
    padding: '36px',
    borderRadius: '20px',
    background: 'linear-gradient(165deg, #0b1828 0%, #081320 100%)',
    border: '1px solid rgba(34,211,238,0.12)',
    boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
  },
  loginTitle: {
    margin: '0 0 6px',
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontSize: '1.3rem',
    color: '#f6fcff',
  },
  loginSubtitle: {
    margin: '0 0 28px',
    fontSize: '0.88rem',
    color: '#5b8aa6',
  },
  label: {
    display: 'block',
    fontSize: '0.78rem',
    color: '#8fb4c9',
    marginBottom: '6px',
    marginTop: '18px',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  input: {
    width: '100%',
    padding: '13px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(34,211,238,0.16)',
    background: '#050b14',
    color: '#e8f4fa',
    fontSize: '0.92rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    marginTop: '26px',
    padding: '14px 16px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #22d3ee, #3b82f6)',
    color: '#04141d',
    fontWeight: 700,
    fontSize: '0.94rem',
    cursor: 'pointer',
    boxShadow: '0 12px 28px rgba(34,211,238,0.18)',
  },
  errorText: {
    marginTop: '14px',
    color: '#fb7185',
    fontSize: '0.85rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '20px',
    marginTop: '20px',
  },
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '◈' },
  { key: 'history', label: 'Historial', icon: '◷' },
  { key: 'alerts', label: 'Alertas', icon: '◬' },
  { key: 'devices', label: 'Dispositivos', icon: '◫' },
]

function App() {
  const [token, setToken] = useState(null)
  const [screen, setScreen] = useState('dashboard')
  const [userToken, setUserToken] = useState('')
  const [userPass, setUserPass] = useState('')
  const [loginError, setLoginError] = useState(null)
  const { latestReadings, alerts, connectionStatus } = useWebSocket(token)
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

  const isConnected =
    connectionStatus === 'Live' ||
    connectionStatus === 'connected' ||
    connectionStatus === 'conectado'

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

  // ── Bloque de marca reutilizable (login + sidebar) ──
  // Para usar tu logo: reemplaza el contenido de este bloque por
  // <img src={logo} alt="MIRAI" style={styles.logoImg} />
  const Brand = () => (
    <div style={styles.brandRow}>
      <img src={logo} alt="MIRAI" style={styles.logoImg} />
      <span style={styles.brandText}>MIRAI</span>
    </div>
  )

  if (!token) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.sidebar, justifyContent: 'center' }}>
          <Brand />
          <div style={{ color: '#5b8aa6', fontSize: '0.92rem', lineHeight: 1.6 }}>
            Sistema de monitoreo IoT en tiempo real para tus dispositivos conectados.
          </div>
        </div>
        <div style={styles.content}>
          <div style={styles.loginWrap}>
            <div style={styles.loginCard}>
              <h2 style={styles.loginTitle}>Iniciar sesión</h2>
              <p style={styles.loginSubtitle}>Accede al panel de control</p>
              <form onSubmit={handleLogin}>
                <label style={styles.label}>Usuario</label>
                <input style={styles.input} value={userToken} onChange={(e) => setUserToken(e.target.value)} />
                <label style={styles.label}>Contraseña</label>
                <input
                  type="password"
                  style={styles.input}
                  value={userPass}
                  onChange={(e) => setUserPass(e.target.value)}
                />
                <button style={styles.button} type="submit">Entrar</button>
                {loginError && <p style={styles.errorText}>{loginError}</p>}
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <Brand />
        {NAV_ITEMS.map((item) => (
          <div
            key={item.key}
            style={{ ...styles.navItem, ...(screen === item.key ? styles.navItemActive : {}) }}
            onClick={() => setScreen(item.key)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
        <div style={styles.sidebarFooter}>rpi-001 · canal seguro</div>
      </aside>
      <main style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Panel de control IoT</h1>
            <p style={styles.subtitle}>Estado en vivo, alertas y métricas de sensores</p>
          </div>
          <div style={styles.statusPill(isConnected)}>
            <span style={styles.statusDot(isConnected)} />
            Conexión {connectionStatus}
          </div>
        </div>
        {screen === 'dashboard' && (
          <>
            <Dashboard latestReadings={latestReadings} status={connectionStatus} />
            <div style={styles.grid}>
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