import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './HistoryChart.css'

function HistoryChart({ data }) {
  const chartData = data.map(entry => ({
    time: new Date(entry.timestamp).toLocaleTimeString(),
    value: entry.value
  }))

  const formatTooltipLabel = (label) => {
    return `Time: ${label}`
  }

  return (
    <div className="history-chart">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis 
            dataKey="time" 
            stroke="rgba(255, 255, 255, 0.5)"
            fontSize={12}
          />
          <YAxis 
            stroke="rgba(255, 255, 255, 0.5)"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{
              background: 'rgba(26, 26, 46, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff'
            }}
            labelFormatter={formatTooltipLabel}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#60a5fa" 
            strokeWidth={2}
            dot={{ fill: '#60a5fa', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default HistoryChart
