import React from 'react'
import { TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'
import './ValueCard.css'

function ValueCard({ keyName, value, onClick, isSelected }) {
  const formatValue = (val) => {
    if (Number.isInteger(val)) return val.toString()
    return val.toFixed(2)
  }

  return (
    <div 
      className={`value-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="card-header">
        <TrendingUp className="icon" />
        <h3 className="card-title">{keyName}</h3>
      </div>
      <div className="card-value">
        {formatValue(value)}
      </div>
      <div className="card-footer">
        <span className="card-hint">Click to view history</span>
      </div>
    </div>
  )
}

export default ValueCard
