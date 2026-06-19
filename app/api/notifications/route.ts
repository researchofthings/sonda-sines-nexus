import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { measurementRanges } from '@/lib/measurements';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MeasurementEntry {
  id: number;
  data: string;
  hora: string;
  temperatura: number;
  condutividade: number;
  sp_condutividade: number;
  salinidade: number;
  tds: number;
  ph: number;
  orp: number;
  do_mg: number;
  do_sat: number;
  turbidez: number;
  focieritrina: number;
  focieritrina_rfu: number;
  clorofila: number;
  clorofila_rfu: number;
  profundidade: number;
}

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

function isInRange(key: string, value: number): boolean {
  const range = measurementRanges[key as keyof typeof measurementRanges];
  if (!range) return true;
  return value >= range.min && value <= range.max;
}

function getMeasurementValue(entry: MeasurementEntry, key: string): number {
  const valueMap: Record<string, number> = {
    temperatura: entry.temperatura,
    condutividade: entry.condutividade,
    spCondutividade: entry.sp_condutividade,
    salinidade: entry.salinidade,
    tds: entry.tds,
    ph: entry.ph,
    orp: entry.orp,
    do: entry.do_mg,
    doSat: entry.do_sat,
    turbidez: entry.turbidez,
    focieritrina: entry.focieritrina,
    focieritrinaRFU: entry.focieritrina_rfu,
    clorofila: entry.clorofila,
    clorofilaRFU: entry.clorofila_rfu,
    profundidade: entry.profundidade,
  };
  return valueMap[key] ?? 0;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    
    // Calculate date range (last N days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Get measurements for the date range
    const { data: measurements, error } = await supabase
      .from('measurements')
      .select('*')
      .gte('data', startDateStr)
      .lte('data', endDateStr)
      .order('data', { ascending: true })
      .order('hora', { ascending: true });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!measurements || measurements.length === 0) {
      return NextResponse.json({ notifications: [], count: 0, days });
    }
    
    // Also get day before start date's last measurement for consecutive checking
    const prevDate = new Date(startDateStr);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    
    const { data: prevMeasurements } = await supabase
      .from('measurements')
      .select('*')
      .eq('data', prevDateStr)
      .order('hora', { ascending: false })
      .limit(1);
    
    const allMeasurements = [...(prevMeasurements || []), ...(measurements || [])];
    
    // Detect all out-of-range readings
    const notifications: Notification[] = [];
    
    const keysToCheck = Object.keys(measurementRanges);
    
    for (let i = 0; i < allMeasurements.length; i++) {
      const entry = allMeasurements[i] as MeasurementEntry;
      
      for (const key of keysToCheck) {
        const value = getMeasurementValue(entry, key);
        const inRange = isInRange(key, value);
        
        if (!inRange) {
          const range = measurementRanges[key as keyof typeof measurementRanges];
          // Get previous value if available
          const prevValue = i > 0 ? getMeasurementValue(allMeasurements[i - 1], key) : value;
          
          notifications.push({
            id: `${entry.data}_${entry.hora}_${key}`,
            date: entry.data,
            time: entry.hora,
            measurementKey: key,
            measurementLabel: key,
            value: value,
            previousValue: prevValue,
            range: range!,
            consecutiveCount: 1,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    
    return NextResponse.json({ 
      notifications,
      count: notifications.length,
      days,
      dateRange: { start: startDateStr, end: endDateStr }
    });
  } catch (error) {
    console.error('Error generating notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
