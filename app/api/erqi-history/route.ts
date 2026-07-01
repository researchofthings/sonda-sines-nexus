import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('erqi_history')
      .select('data,hora,erqi,si_do_sat,si_clorofila,si_turbidez,si_sp_condutividade,si_ph,si_temperatura,si_orp')
      .order('data', { ascending: false })
      .order('hora', { ascending: false })
      .limit(10000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ history: data || [] });
  } catch (err) {
    console.error('Error fetching ERQI history:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
