import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing key or value' },
        { status: 400 }
      );
    }

    // Insert into history
    const { error: insertError } = await supabase
      .from('values')
      .insert({ key, value });

    if (insertError) {
      console.error('Error inserting value:', insertError);
      return NextResponse.json(
        { error: 'Failed to insert value' },
        { status: 500 }
      );
    }

    // Upsert current value
    const { error: upsertError } = await supabase
      .from('current_values')
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (upsertError) {
      console.error('Error upserting current value:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update current value' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      key,
      value,
    });
  } catch (error) {
    console.error('Error updating value:', error);
    return NextResponse.json(
      { error: 'Failed to update value' },
      { status: 500 }
    );
  }
}
