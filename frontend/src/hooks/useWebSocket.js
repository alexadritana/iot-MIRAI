import { useEffect, useState } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

function useWebSocket(token) {
  const [connectionStatus, setConnectionStatus] = useState('Pending')
  const [latestReadings, setLatestReadings] = useState({})
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    if (!token) {
      return
    }

    const ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      setConnectionStatus('Live')
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const { event: eventType, data } = message
        if (eventType === 'reading_ok') {
          setLatestReadings((prev) => ({ ...prev, [data.sensor_type]: data }))
        }
        if (eventType === 'reading_error') {
          setConnectionStatus('Error')
        }
        if (eventType === 'alert_triggered') {
          setAlerts((prev) => [data, ...prev].slice(0, 10))
        }
      } catch (error) {
        console.error(error)
      }
    }

    ws.onclose = () => {
      setConnectionStatus('Pending - no recent update')
    }

    ws.onerror = () => {
      setConnectionStatus('Error')
    }

    return () => {
      ws.close()
    }
  }, [token])

  return { latestReadings, alerts, connectionStatus }
}

export default useWebSocket
