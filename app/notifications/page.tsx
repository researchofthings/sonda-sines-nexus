'use client';

import { useState, useEffect } from 'react';
import { Bell, ArrowLeft, AlertTriangle, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import './notifications.css';

interface Notification {
  id: string;
  date: string;
  time: string;
  measurementKey: string;
  measurementLabel: string;
  value: number;
  previousValue: number;
  range: { min: number; max: number };
  consecutiveCount: number;
  read: boolean;
  createdAt: string;
}

interface GroupedNotifications {
  [date: string]: Notification[];
}

const measurementLabels: Record<string, string> = {
  temperatura: 'Temperatura',
  condutividade: 'Condutividade',
  spCondutividade: 'Condutividade SP',
  salinidade: 'Salinidade',
  tds: 'Total de Sólidos Dissolvidos',
  ph: 'pH',
  orp: 'Potencial de Oxirredução',
  do: 'Oxigénio Dissolvido',
  doSat: 'Oxigénio Dissolvido (Saturação)',
  turbidez: 'Turbidez',
  focieritrina: 'Focieritrina',
  focieritrinaRFU: 'Ficoeritrina RFU',
  clorofila: 'Clorofila',
  clorofilaRFU: 'Clorofila RFU',
  profundidade: 'Profundidade',
};

const measurementUnits: Record<string, string> = {
  temperatura: 'ºC',
  condutividade: 'mS/cm',
  spCondutividade: 'mS/cm',
  salinidade: 'PSU',
  tds: 'mg/l',
  ph: '',
  orp: 'mV',
  do: 'mg/l',
  doSat: '%sat',
  turbidez: 'NTU',
  focieritrina: 'ug/l',
  focieritrinaRFU: 'RFU',
  clorofila: 'ug/l',
  clorofilaRFU: 'RFU',
  profundidade: 'm',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNotifications();
  }, [selectedDate]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/notifications?date=${selectedDate}`);
      const data = await response.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        // Auto-expand today's notifications
        setExpandedDates(new Set([selectedDate]));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (notifications: Notification[]): GroupedNotifications => {
    return notifications.reduce((groups, notification) => {
      const date = notification.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notification);
      return groups;
    }, {} as GroupedNotifications);
  };

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const formatDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  const getOutOfRangeDirection = (value: number, range: { min: number; max: number }): string => {
    if (value < range.min) return 'abaixo do mínimo';
    if (value > range.max) return 'acima do máximo';
    return '';
  };

  const groupedNotifications = groupByDate(notifications);
  const sortedDates = Object.keys(groupedNotifications).sort((a, b) => b.localeCompare(a));

  return (
    <div className="notifications-app">
      <header className="notifications-header">
        <div className="notifications-header-content">
          <div className="header-left">
            <Link href="/measurements" className="back-link">
              <ArrowLeft className="icon" />
              <span>Voltar ao Dashboard</span>
            </Link>
            <div className="header-title">
              <Bell className="icon header-icon" />
              <div>
                <h1>Notificações</h1>
                <p className="subtitle">Alertas de valores fora do intervalo</p>
              </div>
            </div>
          </div>
          <div className="date-selector">
            <label>
              <Calendar className="icon" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </label>
          </div>
        </div>
      </header>

      <main className="notifications-main">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>A carregar notificações...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <Bell className="empty-icon" />
            <h2>Sem notificações</h2>
            <p>Não foram detetados valores fora do intervalo para {formatDate(selectedDate)}</p>
          </div>
        ) : (
          <div className="notifications-list">
            <div className="summary-card">
              <AlertTriangle className="summary-icon" />
              <div className="summary-text">
                <span className="summary-count">{notifications.length}</span>
                <span className="summary-label">alertas hoje</span>
              </div>
            </div>

            {sortedDates.map(date => (
              <div key={date} className="date-group">
                <button
                  className="date-header"
                  onClick={() => toggleDate(date)}
                >
                  <div className="date-info">
                    <Calendar className="icon" />
                    <span className="date-text">{formatDate(date)}</span>
                    <span className="notification-count">
                      {groupedNotifications[date].length} alerta{groupedNotifications[date].length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {expandedDates.has(date) ? (
                    <ChevronUp className="icon" />
                  ) : (
                    <ChevronDown className="icon" />
                  )}
                </button>

                {expandedDates.has(date) && (
                  <div className="notifications-for-date">
                    {groupedNotifications[date].map((notification, index) => (
                      <div
                        key={`${notification.id}-${index}`}
                        className="notification-card"
                      >
                        <div className="notification-header">
                          <div className="notification-time">
                            <Clock className="icon" />
                            <span>{notification.time}</span>
                          </div>
                          <div className="consecutive-badge">
                            <AlertTriangle className="icon" />
                            <span>Consecutivo</span>
                          </div>
                        </div>

                        <div className="notification-content">
                          <h3 className="measurement-name">
                            {measurementLabels[notification.measurementKey] || notification.measurementKey}
                          </h3>
                          
                          <div className="values-comparison">
                            <div className="value-box previous">
                              <span className="value-label">Anterior</span>
                              <span className="value-number">
                                {notification.previousValue}
                                {measurementUnits[notification.measurementKey] && (
                                  <span className="unit"> {measurementUnits[notification.measurementKey]}</span>
                                )}
                              </span>
                            </div>
                            <div className="arrow">→</div>
                            <div className="value-box current out-of-range">
                              <span className="value-label">Atual</span>
                              <span className="value-number">
                                {notification.value}
                                {measurementUnits[notification.measurementKey] && (
                                  <span className="unit"> {measurementUnits[notification.measurementKey]}</span>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="range-info">
                            <p className="out-of-range-text">
                              Valor {getOutOfRangeDirection(notification.value, notification.range)}
                            </p>
                            <p className="range-details">
                              Intervalo esperado: {notification.range.min} - {notification.range.max}
                              {measurementUnits[notification.measurementKey] && (
                                <span> {measurementUnits[notification.measurementKey]}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
