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
      cabo: 'cabo',
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
      .select(`${column}, data, hora, created_at`)
      .not(column, 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching measurement history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    const history = data
      ?.reverse()
      .map((row: Record<string, unknown>) => ({
        value: row[column] as number,
        timestamp: row.created_at as string,
        data: row.data as string,
        hora: row.hora as string,
      })) || [];

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
