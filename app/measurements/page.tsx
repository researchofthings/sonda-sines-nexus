'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Droplets, Thermometer, Wind, Clock, Beaker, Zap, Waves } from 'lucide-react';
import { measurementLabels, measurementUnits, measurementRanges } from '@/lib/measurements';
import './measurements.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
};

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [connected, setConnected] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '12h' | '1d' | '1w' | '15d' | '1m'>('1d');

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

  const isInRange = (key: string, value: number): boolean => {
    const range = measurementRanges[key as keyof typeof measurementRanges];
    if (!range) return true;
    return value >= range.min && value <= range.max;
  };

  const getFilteredHistory = () => {
    if (!history.length) return [];
    
    // Sort by date descending to get most recent first
    const sortedHistory = [...history].sort((a, b) => 
      new Date(`${b.data}T${b.hora}`).getTime() - new Date(`${a.data}T${a.hora}`).getTime()
    );
    
    // Get the most recent date as reference
    const mostRecent = sortedHistory[0];
    const referenceTime = new Date(`${mostRecent.data}T${mostRecent.hora}`).getTime();
    
    let limit = sortedHistory.length;
    switch (timeRange) {
      case '1h': limit = 1; break;
      case '12h': limit = 12; break;
      case '1d': limit = 24; break;
      case '1w': limit = 168; break; // 7 days
      case '15d': limit = 360; break; // 15 days
      case '1m': limit = 720; break; // 30 days
      default: limit = sortedHistory.length;
    }
    
    // Take the last N hours of data points
    const filtered = sortedHistory.slice(0, limit);
    
    // Return in chronological order (oldest first) for the chart
    return filtered.reverse();
  };

  const keys = Object.keys(measurements).sort();

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <Droplets className="icon header-icon" />
            <div>
              <h1>Monitorização da Qualidade da Água</h1>
              <p className="subtitle">Sonda Paramétrica Sines Nexus - IPS</p>
            </div>
          </div>
          <div className="header-info">
            <div className="last-reception">
              <Clock className="icon" />
              <span>{measurements.temperatura ? `Última Receção: ${measurements.temperatura.data.split('-').reverse().join('-')} ${measurements.temperatura.hora}` : 'Última Receção: 17-06-2026 12:00:00'}</span>
            </div>
            <div className="header-description">
              <span>Valores em tempo real. Clique num cartão para ver histórico e gráficos.</span>
            </div>
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
              {keys.map((key) => {
                const range = measurementRanges[key as keyof typeof measurementRanges];
                const hasRange = !!range;
                const inRange = hasRange ? isInRange(key, measurements[key].value) : null;
                let indicatorClass = 'no-range';
                if (hasRange) {
                  indicatorClass = inRange ? 'in-range' : 'out-of-range';
                }
                
                return (
                  <div
                    key={key}
                    className={`measurement-card ${selectedKey === key ? 'selected' : ''}`}
                    onClick={() => handleCardClick(key)}
                  >
                    <div className="card-header">
                      {measurementIcons[key] || <Activity className="icon" />}
                      <h3 className="card-title">{measurementLabels[key as keyof typeof measurementLabels] || key}</h3>
                      <span className={`status-indicator ${indicatorClass}`} title={hasRange ? (inRange ? 'Dentro do intervalo' : 'Fora do intervalo') : 'Sem intervalo definido'}></span>
                    </div>
                    <div className="card-value">
                      {formatValue(measurements[key].value, key)}
                      <span className="unit">{measurements[key].unit}</span>
                    </div>
                    <div className="card-footer">
                      {range && (
                        <span className={`range-badge ${inRange ? 'in-range' : 'out-of-range'}`}>
                          Intervalo: {range.min}-{range.max}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* History Section */}
            {selectedKey && history.length > 0 && (
              <div className="history-section">
                <div className="history-header">
                  <Clock className="icon" />
                  <h2>Histórico: {measurementLabels[selectedKey as keyof typeof measurementLabels] || selectedKey}</h2>
                </div>
                
                {/* Time Range Selector */}
                <div className="time-range-selector">
                  {[
                    { key: '1h', label: '1 Hora' },
                    { key: '12h', label: '12 Horas' },
                    { key: '1d', label: '1 Dia' },
                    { key: '1w', label: '1 Semana' },
                    { key: '15d', label: '15 Dias' },
                    { key: '1m', label: '1 Mês' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      className={`time-range-btn ${timeRange === key ? 'active' : ''}`}
                      onClick={() => setTimeRange(key as any)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Chart */}
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getFilteredHistory()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="hora" 
                        stroke="#64748b"
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tickFormatter={(value, index) => {
                          const data = getFilteredHistory();
                          const item = data[index];
                          return item ? `${item.data.split('-').reverse().join('-')}\n${value}` : value;
                        }}
                      />
                      <YAxis 
                        stroke="#64748b"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        domain={['auto', 'auto']}
                        label={{ 
                          value: measurements[selectedKey]?.unit || '', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { fill: '#64748b', fontSize: 12, fontWeight: 600 }
                        }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: number) => [formatValue(value, selectedKey), measurementLabels[selectedKey as keyof typeof measurementLabels] || selectedKey]}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            return `${payload[0].payload.data} ${payload[0].payload.hora}`;
                          }
                          return label;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#0284c7" 
                        strokeWidth={2}
                        dot={{ fill: '#0284c7', strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 6, fill: '#0284c7' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Hora</th>
                        <th>Valor ({measurements[selectedKey]?.unit || measurementUnits[selectedKey as keyof typeof measurementUnits]})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredHistory().slice(-20).reverse().map((entry, idx) => (
                        <tr key={idx}>
                          <td>{entry.data.split('-').reverse().join('-')}</td>
                          <td>{entry.hora}</td>
                          <td className="value-cell">{formatValue(entry.value, selectedKey)}</td>
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
