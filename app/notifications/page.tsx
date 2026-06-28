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
  temperatura: 'Temperature',
  condutividade: 'Conductivity',
  spCondutividade: 'SpConductivity (25ºC)',
  salinidade: 'Salinity',
  tds: 'Total Dissolved Solids',
  ph: 'pH',
  orp: 'ORP Potential',
  do: 'Dissolved Oxygen',
  doSat: 'Dissolved Oxygen (Saturation)',
  turbidez: 'Turbidity',
  focieritrina: 'Phycoerythrin',
  focieritrinaRFU: 'Phycoerythrin RFU',
  clorofila: 'Chlorophyll-a',
  clorofilaRFU: 'Chlorophyll RFU',
  profundidade: 'Depth',
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
  doSat: '%',
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
  const [dateRange, setDateRange] = useState<{start: string, end: string} | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications?days=7');
      const data = await response.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setDateRange(data.dateRange);
        // Auto-expand all dates with notifications
        const datesWithNotifications = new Set<string>(data.notifications.map((n: Notification) => n.date));
        setExpandedDates(datesWithNotifications);
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
    if (value < range.min) return 'below minimum';
    if (value > range.max) return 'above maximum';
    return '';
  };

  const groupedNotifications = groupByDate(notifications);
  const sortedDates = Object.keys(groupedNotifications).sort((a, b) => b.localeCompare(a));

  const formatDateRange = () => {
    if (!dateRange) return '';
    const start = formatDate(dateRange.start);
    const end = formatDate(dateRange.end);
    return `${start} - ${end}`;
  };

  return (
    <div className="notifications-app">
      <header className="notifications-header">
        <div className="notifications-header-content">
          <div className="header-left">
            <Link href="/" className="back-link">
              <ArrowLeft className="icon" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="header-title">
              <Bell className="icon header-icon" />
              <div>
                <h1>Notifications</h1>
                <p className="subtitle">Out-of-range value alerts • Last 7 days</p>
                {dateRange && (
                  <p className="date-range">{formatDateRange()}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="notifications-main">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <Bell className="empty-icon" />
            <h2>No notifications</h2>
            <p>No out-of-range values detected in the last 7 days</p>
          </div>
        ) : (
          <div className="notifications-list">
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
                      {groupedNotifications[date].length} alert{groupedNotifications[date].length !== 1 ? 's' : ''}
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
                          <div className="out-of-range-badge">
                            <AlertTriangle className="icon" />
                            <span>Out of range</span>
                          </div>
                        </div>

                        <div className="notification-content">
                          <h3 className="measurement-name">
                            {measurementLabels[notification.measurementKey] || notification.measurementKey}
                          </h3>
                          
                          <div className="value-display">
                            <span className="value-number out-of-range">
                              {notification.value}
                              {measurementUnits[notification.measurementKey] && (
                                <span className="unit"> {measurementUnits[notification.measurementKey]}</span>
                              )}
                            </span>
                          </div>

                          <div className="range-info">
                            <p className="out-of-range-text">
                              Value {getOutOfRangeDirection(notification.value, notification.range)}
                            </p>
                            <p className="range-details">
                              Expected range: {notification.range.min} - {notification.range.max}
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
