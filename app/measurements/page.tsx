'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Droplets, Thermometer, Wind, Clock, Beaker, Zap, Waves, Download, Camera, CloudFog, Leaf, Battery } from 'lucide-react';
import { measurementLabels, measurementUnits, measurementRanges } from '@/lib/measurements';
import './measurements.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

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
  orp: <Battery className="icon" />,
  do: <Droplets className="icon" />,
  doSat: <Droplets className="icon" />,
  turbidez: <CloudFog className="icon" />,
  focieritrina: <Beaker className="icon" />,
  focieritrinaRFU: <Beaker className="icon" />,
  clorofila: <Leaf className="icon" />,
  clorofilaRFU: <Leaf className="icon" />,
  profundidade: <Waves className="icon" />,
};

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [connected, setConnected] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '12h' | '1d' | '1w' | '15d' | '1m' | 'custom'>('1d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const chartRef = useRef<HTMLDivElement>(null);

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
    
    // Large integers (condutividade, etc.) - no decimals
    const integerKeys = ['condutividade', 'spCondutividade', 'turbidez', 'focieritrina', 'clorofila'];
    if (integerKeys.includes(key)) return Math.round(val).toString();
    
    if (Math.abs(val) < 0.01) return val.toExponential(2);
    return val.toFixed(3);
  };

  const isInRange = (key: string, value: number): boolean => {
    const range = measurementRanges[key as keyof typeof measurementRanges];
    if (!range) return true;
    return value >= range.min && value <= range.max;
  };

  // Parse YYYY-MM-DD format from database to Date object
  const parseDate = (dateStr: string, timeStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, ...timeStr.split(':').map(Number) as [number, number, number]);
  };

  const getFilteredHistory = () => {
    if (!history.length) return [];
    
    // Add ISO timestamp to each entry (data comes sorted newest first from API)
    const historyWithTimestamp = history.map(entry => ({
      ...entry,
      timestamp: parseDate(entry.data, entry.hora).toISOString()
    }));
    
    // Custom date range selected
    if (timeRange === 'custom' && startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000 - 1); // Include full end day
      
      return historyWithTimestamp.filter(entry => {
        const entryTime = parseDate(entry.data, entry.hora).getTime();
        return entryTime >= start && entryTime <= end;
      });
    }
    
    // Get the most recent date as reference (first entry since data is sorted descending)
    const mostRecent = historyWithTimestamp[0];
    const referenceTime = parseDate(mostRecent.data, mostRecent.hora).getTime();
    
    let hoursBack = 24;
    switch (timeRange) {
      case '1h': hoursBack = 1; break;
      case '12h': hoursBack = 12; break;
      case '1d': hoursBack = 24; break;
      case '1w': hoursBack = 168; break; // 7 days
      case '15d': hoursBack = 360; break; // 15 days
      case '1m': hoursBack = 720; break; // 30 days
      default: hoursBack = 24;
    }
    
    const cutoffTime = referenceTime - (hoursBack * 60 * 60 * 1000);
    
    // Debug logging
    console.log('History filtering:', {
      totalEntries: history.length,
      mostRecent: mostRecent.data + ' ' + mostRecent.hora,
      referenceTime: new Date(referenceTime).toISOString(),
      cutoffTime: new Date(cutoffTime).toISOString(),
      hoursBack,
      firstEntry: history[0].data + ' ' + history[0].hora,
      lastEntry: history[history.length - 1].data + ' ' + history[history.length - 1].hora
    });
    
    const filtered = historyWithTimestamp.filter(entry => {
      const entryTime = parseDate(entry.data, entry.hora).getTime();
      return entryTime >= cutoffTime;
    });
    
    console.log('Filtered result:', filtered.length, 'entries');
    
    return filtered;
  };

  // Download chart as PNG
  const downloadChartAsPNG = async () => {
    if (!chartRef.current) return;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `${selectedKey}_chart_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading chart:', error);
    }
  };

  // Download data as Excel
  const downloadDataAsExcel = () => {
    if (!selectedKey) return;
    
    const filteredData = getFilteredHistory();
    if (filteredData.length === 0) return;
    
    // Prepare data for Excel
    const excelData = filteredData.map(entry => ({
      Data: entry.data,
      Hora: entry.hora,
      [measurementLabels[selectedKey as keyof typeof measurementLabels] || selectedKey]: entry.value
    }));
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, selectedKey);
    
    // Download
    XLSX.writeFile(wb, `${selectedKey}_dados_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const keys = Object.keys(measurements)
    .filter(key => key !== 'cabo')
    .sort((a, b) => {
      const labelA = measurementLabels[a as keyof typeof measurementLabels] || a;
      const labelB = measurementLabels[b as keyof typeof measurementLabels] || b;
      return labelA.localeCompare(labelB, 'pt');
    });

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <Droplets className="icon header-icon" />
            <div>
              <h1>Monitorização da Qualidade da Água</h1>
              <p className="subtitle">Sonda Paramétrica Sines Nexus - IPS (v2.1 - June 18)</p>
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
                
                {/* Date Range Selector */}
                <div className="date-range-selector">
                  <div className="preset-buttons">
                    {[
                      { key: '1d', label: '1 Dia' },
                      { key: '1w', label: '1 Semana' },
                      { key: '15d', label: '15 Dias' },
                      { key: '1m', label: '1 Mês' },
                      { key: 'custom', label: 'Personalizado' },
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
                  {timeRange === 'custom' && (
                    <div className="custom-date-inputs">
                      <label>
                        De:
                        <input 
                          type="date" 
                          value={startDate} 
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </label>
                      <label>
                        Até:
                        <input 
                          type="date" 
                          value={endDate} 
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Chart */}
                <div className="chart-container" ref={chartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getFilteredHistory()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="timestamp" 
                        stroke="#64748b"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        angle={-30}
                        textAnchor="end"
                        height={70}
                        interval="preserveStartEnd"
                        minTickGap={30}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          const day = date.getDate().toString().padStart(2, '0');
                          const month = (date.getMonth() + 1).toString().padStart(2, '0');
                          const hours = date.getHours().toString().padStart(2, '0');
                          const minutes = date.getMinutes().toString().padStart(2, '0');
                          return `${day}/${month} ${hours}:${minutes}`;
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
                        labelFormatter={(label: string) => {
                          const date = new Date(label);
                          const day = date.getDate().toString().padStart(2, '0');
                          const month = (date.getMonth() + 1).toString().padStart(2, '0');
                          const year = date.getFullYear();
                          const hours = date.getHours().toString().padStart(2, '0');
                          const minutes = date.getMinutes().toString().padStart(2, '0');
                          return `${day}-${month}-${year} ${hours}:${minutes}`;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#0284c7" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, fill: '#0284c7', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Download buttons */}
                <div className="download-buttons">
                  <button 
                    onClick={downloadChartAsPNG}
                    className="download-btn png-btn"
                  >
                    <Camera className="icon" />
                    <span>Descarregar PNG</span>
                  </button>
                  <button 
                    onClick={downloadDataAsExcel}
                    className="download-btn excel-btn"
                  >
                    <Download className="icon" />
                    <span>Descarregar Excel</span>
                  </button>
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
                      {getFilteredHistory().map((entry, idx) => (
                        <tr key={idx}>
                          <td>{entry.data}</td>
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
