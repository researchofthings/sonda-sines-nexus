'use client';

import { TrendingUp } from 'lucide-react';
import './ValueCard.css';

interface ValueCardProps {
  keyName: string;
  value: number;
  onClick: () => void;
  isSelected: boolean;
}

export default function ValueCard({ keyName, value, onClick, isSelected }: ValueCardProps) {
  const formatValue = (val: number) => {
    if (Number.isInteger(val)) return val.toString();
    return val.toFixed(2);
  };

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
  );
}
