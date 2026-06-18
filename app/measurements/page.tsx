'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Droplets, Thermometer, Wind, Clock, Wifi, Beaker, Zap, Waves } from 'lucide-react';
import { measurementLabels, measurementUnits } from '@/lib/measurements';
import './measurements.css';

interface Measurement {
  value: number;
  unit: string;
  data: string;
  hora: string;
}

interface Measurements {
  [key: string]: Measurement;
}

interface HistoryEntry {
  value: number;
  timestamp: string;
  data: string;
  hora: string;
}

const measurementIcons: Record<string, React.ReactNode> = {
  temperatura: <Thermometer className="icon" />,
  condutividade: <Zap className="icon" />,
  spCondutividade: <Zap className="icon" />,
  salinidade: <Waves className="icon" />,
  tds: <Beaker className="icon" />,
  ph: <Activity className="icon" />,
  orp: <Activity className="icon" />,
  do: <Droplets className="icon" />,
  doSat: <Droplets className="icon" />,
  turbidez: <Wind className="icon" />,
  focieritrina: <Beaker className="icon" />,
  focieritrinaRFU: <Beaker className="icon" />,
  clorofila: <Beaker className="icon" />,
  clorofilaRFU: <Beaker className="icon" />,
  profundidade: <Waves className="icon" />,
  cabo: <Zap className="icon" />,
};

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [connected, setConnected] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Fetch measurements
  useEffect(() => {
    fetchMeasurements();
    setConnected(true);
    
    const interval = setInterval(() => {
      fetchMeasurements();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchMeasurements = async () => {
    try {
      const res = await fetch('/api/measurement');
      const data = await res.json();
      if (!data.error) {
        setMeasurements(data);
      }
    } catch (err) {
      console.error('Failed to fetch measurements:', err);
      setConnected(false);
    }
  };

  const fetchHistory = useCallback(async (key: string) => {
    try {
      const res = await fetch(`/api/measurement/history/${key}`);
      const data = await res.json();
      if (!data.error) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }, []);

  const handleCardClick = (key: string) => {
    if (selectedKey === key) {
      setSelectedKey(null);
    } else {
      setSelectedKey(key);
      fetchHistory(key);
    }
  };

  const formatValue = (val: number, key: string) => {
    if (val === undefined || val === null) return '-';
    
    // Special formatting for different types
    if (key === 'ph') return val.toFixed(2);
    if (key === 'temperatura') return val.toFixed(1);
    if (key === 'profundidade') return val.toFixed(2);
    if (Math.abs(val) < 0.01) return val.toExponential(2);
    return val.toFixed(3);
  };

  const keys = Object.keys(measurements).sort();

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <Droplets className="icon header-icon" />
            <div>
              <h1>Monitoramento da Qualidade da Água</h1>
              <p className="subtitle">Sistema de Monitoramento Ambiental</p>
            </div>
          </div>
          <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            <Wifi className="icon" />
            <span>{connected ? 'Conectado' : 'Desconectado'}</span>
          </div>
        </div>
      </header>

      <main className="main">
        {keys.length === 0 ? (
          <div className="empty-state">
            <Beaker className="icon" />
            <h2>Nenhuma medição disponível</h2>
            <p>Envie dados para visualizar as medições</p>
            <div className="example">
              <p>Exemplo de API:</p>
              <code>POST /api/measurement</code>
            </div>
          </div>
        ) : (
          <>
            {/* Last Update Info */}
            {measurements.temperatura && (
              <div className="last-update">
                <Clock className="icon" />
                <span>Última atualização: {measurements.temperatura.data} {measurements.temperatura.hora}</span>
              </div>
            )}

            {/* Measurements Grid */}
            <div className="measurements-grid">
              {keys.map((key) => (
                <div
                  key={key}
                  className={`measurement-card ${selectedKey === key ? 'selected' : ''}`}
                  onClick={() => handleCardClick(key)}
                >
                  <div className="card-header">
                    {measurementIcons[key] || <Activity className="icon" />}
                    <h3 className="card-title">{measurementLabels[key as keyof typeof measurementLabels] || key}</h3>
                  </div>
                  <div className="card-value">
                    {formatValue(measurements[key].value, key)}
                    <span className="unit">{measurements[key].unit}</span>
                  </div>
                  <div className="card-footer">
                    <span className="card-hint">Clique para ver histórico</span>
                  </div>
                </div>
              ))}
            </div>

            {/* History Section */}
            {selectedKey && history.length > 0 && (
              <div className="history-section">
                <div className="history-header">
                  <Clock className="icon" />
                  <h2>Histórico: {measurementLabels[selectedKey as keyof typeof measurementLabels] || selectedKey}</h2>
                </div>
                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Hora</th>
                        <th>Valor</th>
                        <th>Unidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(-20).map((entry, idx) => (
                        <tr key={idx}>
                          <td>{entry.data}</td>
                          <td>{entry.hora}</td>
                          <td className="value-cell">{formatValue(entry.value, selectedKey)}</td>
                          <td>{measurements[selectedKey]?.unit || measurementUnits[selectedKey as keyof typeof measurementUnits]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
