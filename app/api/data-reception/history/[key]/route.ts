import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const key = params.key;
    
    // Map the key to the database column name
    const columnMap: Record<string, string> = {
      temperatura: 'temperatura',
      condutividade: 'condutividade',
      spCondutividade: 'sp_condutividade',
      salinidade: 'salinidade',
      tds: 'tds',
      ph: 'ph',
      orp: 'orp',
      do: 'do_mg',
      doSat: 'do_sat',
      turbidez: 'turbidez',
      focieritrina: 'focieritrina',
      focieritrinaRFU: 'focieritrina_rfu',
      clorofila: 'clorofila',
      clorofilaRFU: 'clorofila_rfu',
      profundidade: 'profundidade',
    };

    const column = columnMap[key];
    if (!column) {
      return NextResponse.json(
        { error: 'Invalid measurement key' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .not(column, 'is', null)
      .order('data', { ascending: false })
      .order('hora', { ascending: false })
      .limit(10000);

    if (error) {
      console.error('Error fetching measurement history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    const history = ((data as unknown[] | null) || [])
      .map((row) => {
        const r = row as Record<string, unknown>;
        return {
          value: r[column] != null ? Number(r[column]) : 0,
          timestamp: String(r.created_at),
          data: String(r.data),
          hora: String(r.hora),
        };
      });

    // Debug logging
    console.log(`API ${key}:`, {
      totalRows: history.length,
      firstDate: history[0]?.data + ' ' + history[0]?.hora,
      lastDate: history[history.length - 1]?.data + ' ' + history[history.length - 1]?.hora,
    });

    return NextResponse.json({
      key,
      history,
    });
  } catch (error) {
    console.error('Error fetching measurement history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
