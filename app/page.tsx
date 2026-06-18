'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, TrendingUp, Clock, Wifi } from 'lucide-react';
import ValueCard from './components/ValueCard';
import HistoryChart from './components/HistoryChart';
import './page.css';

interface Values {
  [key: string]: number;
}

interface HistoryEntry {
  value: number;
  timestamp: string;
}

interface History {
  [key: string]: HistoryEntry[];
}

export default function Home() {
  const [values, setValues] = useState<Values>({});
  const [history, setHistory] = useState<History>({});
  const [connected, setConnected] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Fetch initial values
  useEffect(() => {
    fetch('/api/values')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setValues(data);
        }
      })
      .catch((err) => console.error('Failed to fetch values:', err));
  }, []);

  // Polling for updates (Vercel doesn't support WebSocket in serverless)
  useEffect(() => {
    setConnected(true);
    const interval = setInterval(() => {
      fetch('/api/values')
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setValues(data);
          }
        })
        .catch(() => setConnected(false));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchHistory = useCallback(async (key: string) => {
    try {
      const res = await fetch(`/api/history/${key}`);
      const data = await res.json();
      setHistory((prev) => ({
        ...prev,
        [key]: data.history,
      }));
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }, []);

  const handleCardClick = (key: string) => {
    setSelectedKey(selectedKey === key ? null : key);
    if (selectedKey !== key) {
      fetchHistory(key);
    }
  };

  const keys = Object.keys(values).sort();

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
              {keys.map((key) => (
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
  );
}
