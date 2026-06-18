import React, { useState, useEffect, useCallback } from 'react'
import { Activity, TrendingUp, Clock, Wifi } from 'lucide-react'
import ValueCard from './components/ValueCard'
import HistoryChart from './components/HistoryChart'
import './App.css'

function App() {
  const [values, setValues] = useState({})
  const [history, setHistory] = useState({})
  const [connected, setConnected] = useState(false)
  const [selectedKey, setSelectedKey] = useState(null)

  // Fetch initial values
  useEffect(() => {
    fetch('/api/values')
      .then(res => res.json())
      .then(data => setValues(data))
      .catch(err => console.error('Failed to fetch values:', err))
  }, [])

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws`)
    
    ws.onopen = () => {
      setConnected(true)
      console.log('WebSocket connected')
    }
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      if (message.type === 'init') {
        setValues(message.values)
        // Fetch history for all keys
        Object.keys(message.values).forEach(key => {
          fetchHistory(key)
        })
      } else if (message.type === 'update') {
        setValues(prev => ({
          ...prev,
          [message.key]: message.value
        }))
        fetchHistory(message.key)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnected(false)
    }
    
    ws.onclose = () => {
      setConnected(false)
      console.log('WebSocket disconnected')
    }
    
    return () => {
      ws.close()
    }
  }, [])

  const fetchHistory = useCallback(async (key) => {
    try {
      const res = await fetch(`/api/history/${key}`)
      const data = await res.json()
      setHistory(prev => ({
        ...prev,
        [key]: data.history
      }))
    } catch (err) {
      console.error('Failed to fetch history:', err)
    }
  }, [])

  const handleCardClick = (key) => {
    setSelectedKey(selectedKey === key ? null : key)
  }

  const keys = Object.keys(values).sort()

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <Activity className="icon" />
            <h1>Value Dashboard</h1>
          </div>
          <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            <Wifi className="icon" />
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </header>

      <main className="main">
        {keys.length === 0 ? (
          <div className="empty-state">
            <TrendingUp className="icon" />
            <h2>No values yet</h2>
            <p>Send values to the server to see them here</p>
            <div className="example">
              <p>Example API call:</p>
              <code>POST /api/update {"{"}"key": "temperature", "value": 23.5{"}"}</code>
            </div>
          </div>
        ) : (
          <>
            <div className="values-grid">
              {keys.map(key => (
                <ValueCard
                  key={key}
                  keyName={key}
                  value={values[key]}
                  onClick={() => handleCardClick(key)}
                  isSelected={selectedKey === key}
                />
              ))}
            </div>

            {selectedKey && history[selectedKey] && (
              <div className="chart-section">
                <div className="chart-header">
                  <Clock className="icon" />
                  <h2>History: {selectedKey}</h2>
                </div>
                <HistoryChart data={history[selectedKey]} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
