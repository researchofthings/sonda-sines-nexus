import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('current_values')
      .select('key, value');

    if (error) {
      console.error('Error fetching values:', error);
      return NextResponse.json(
        { error: 'Failed to fetch values' },
        { status: 500 }
      );
    }

    // Convert to key-value object
    const valuesMap: Record<string, number> = {};
    data?.forEach((row: { key: string; value: number }) => {
      valuesMap[row.key] = row.value;
    });

    return NextResponse.json(valuesMap);
  } catch (error) {
    console.error('Error fetching values:', error);
    return NextResponse.json(
      { error: 'Failed to fetch values' },
      { status: 500 }
    );
  }
}
