'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Droplets, Thermometer, Wind, Clock, Beaker, Zap, Waves, Download, Camera, CloudFog, Leaf, Battery, Bell } from 'lucide-react';
import { measurementLabels, measurementUnits, measurementRanges } from '@/lib/measurements';
import './page.css';
import Link from 'next/link';
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
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const chartRef = useRef<HTMLDivElement>(null);

  // Fetch measurements and notifications
  useEffect(() => {
    fetchMeasurements();
    fetchNotificationCount();
    setConnected(true);
    
    const interval = setInterval(() => {
      fetchMeasurements();
      fetchNotificationCount();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchMeasurements = async () => {
    try {
      const res = await fetch('/api/data-reception');
      const data = await res.json();
      if (!data.error) {
        setMeasurements(data);
      }
    } catch (err) {
      console.error('Failed to fetch measurements:', err);
      setConnected(false);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const res = await fetch('/api/notifications?days=7');
      const data = await res.json();
      if (data.count !== undefined) {
        setNotificationCount(data.count);
      }
    } catch (err) {
      console.error('Failed to fetch notification count:', err);
    }
  };

  const fetchHistory = useCallback(async (key: string) => {
    try {
      const res = await fetch(`/api/data-reception/history/${key}`);
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
    const integerKeys = ['condutividade', 'spCondutividade'];
    if (integerKeys.includes(key)) return Math.round(val).toString();
    
    // Handle zero and near-zero values
    if (val === 0 || (Math.abs(val) < 0.0001 && Math.abs(val) > 0)) return '0';
    
    // Very small values - show as fixed 3 decimals (not exponential)
    if (Math.abs(val) < 0.01) return val.toFixed(3);
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
      return labelA.localeCompare(labelB, 'en');
    });

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <Droplets className="icon header-icon" />
            <div>
              <h1>Water Quality Monitoring</h1>
              <p className="subtitle">Parametric Probe Sines Nexus - IPS (v2.1 - June 18)</p>
              <p className="header-description-left">Real-time values. Click a card to view history and charts.</p>
            </div>
          </div>
          <div className="header-info">
            <div className="last-reception">
              <Link href="/notifications" className="notification-bell-inline">
                <Bell className="icon" />
                {notificationCount > 0 && (
                  <span className="notification-badge-inline">{notificationCount}</span>
                )}
              </Link>
              <Clock className="icon" />
              <span>{measurements.temperatura ? `Last Reading: ${measurements.temperatura.data.split('-').reverse().join('-')} ${measurements.temperatura.hora}` : 'Last Reading: 17-06-2026 12:00:00'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {keys.length === 0 ? (
          <div className="empty-state">
            <Beaker className="icon" />
            <h2>No measurements available</h2>
            <p>Send data to visualize measurements</p>
            <div className="example">
              <p>Data reception link:</p>
              <code>POST /api/data-reception</code>
            </div>
            <div className="json-example">
              <p>JSON Format:</p>
              <pre>{`{
  "data": "2026-06-19",
  "hora": "14:30:00",
  "temperatura": 16.4,
  "condutividade": 45500,
  "spCondutividade": 54490,
  "salinidade": 36.1,
  "tds": 35416.2,
  "ph": 7.94,
  "orp": 302.4,
  "do": 8.32,
  "doSat": 105.8,
  "turbidez": 1.23,
  "focieritrina": 0,
  "focieritrinaRFU": 0,
  "clorofila": 0,
  "clorofilaRFU": 0,
  "profundidade": 4.065
}`}</pre>
            </div>
          </div>
        ) : (
          <>
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
                      <span className={`status-indicator ${indicatorClass}`} title={hasRange ? (inRange ? 'Within range' : 'Out of range') : 'No range defined'}></span>
                    </div>
                    <div className="card-value">
                      {formatValue(measurements[key].value, key)}
                      <span className="unit">{measurements[key].unit}</span>
                    </div>
                    <div className="card-footer">
                      {range && (
                        <span className={`range-badge ${inRange ? 'in-range' : 'out-of-range'}`}>
                          Range: {range.min}-{range.max}
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
                  <h2>History: {measurementLabels[selectedKey as keyof typeof measurementLabels] || selectedKey}</h2>
                </div>
                
                {/* Date Range Selector */}
                <div className="date-range-selector">
                  <div className="preset-buttons">
                    {[
                      { key: '1d', label: '1 Day' },
                      { key: '1w', label: '1 Week' },
                      { key: '15d', label: '15 Days' },
                      { key: '1m', label: '1 Month' },
                      { key: 'custom', label: 'Custom' },
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
                        From:
                        <input 
                          type="date" 
                          value={startDate} 
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </label>
                      <label>
                        To:
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
                    <LineChart data={[...getFilteredHistory()].reverse()}>
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
                    <span>Download PNG</span>
                  </button>
                  <button 
                    onClick={downloadDataAsExcel}
                    className="download-btn excel-btn"
                  >
                    <Download className="icon" />
                    <span>Download Excel</span>
                  </button>
                </div>

                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Value ({measurements[selectedKey]?.unit || measurementUnits[selectedKey as keyof typeof measurementUnits]})</th>
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
