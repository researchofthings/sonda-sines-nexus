import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const key = params.key;

    const { data, error } = await supabase
      .from('values')
      .select('value, timestamp')
      .eq('key', key)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      key,
      history: data?.reverse().map((row: { value: number; timestamp: string }) => ({
        value: row.value,
        timestamp: row.timestamp,
      })) || [],
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
