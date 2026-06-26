import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MeasurementData } from '@/lib/measurements';

export const dynamic = 'force-dynamic';

const CSV_COLUMN_MAP: Record<string, string> = {
  'Data': 'data',
  'Hora': 'hora',
  'Temperatura ºC': 'temperatura',
  'Condutividade mS/cm': 'condutividade',
  'SpCondutividade mS/cm': 'sp_condutividade',
  'Salinidade PSU': 'salinidade',
  'TDS mg/l': 'tds',
  'pH': 'ph',
  'ORP mV': 'orp',
  'DO mg/l': 'do_mg',
  'DO %sat': 'do_sat',
  'Turbidez NTU': 'turbidez',
  'Focieritrina ug/l': 'focieritrina',
  'Ficoeritrina RFU': 'focieritrina_rfu',
  'Clorofila ug/l': 'clorofila',
  'Clorofila RFU': 'clorofila_rfu',
  'Profundidade m': 'profundidade',
};

function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim());
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(sep).map(v => v.trim());
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      const dbCol = CSV_COLUMN_MAP[header];
      if (!dbCol) return;
      const val = values[idx];
      if (!val) return;
      if (dbCol === 'data') {
        const parts = val.split('-');
        row[dbCol] = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : val;
      } else if (dbCol === 'hora') {
        row[dbCol] = val;
      } else {
        row[dbCol] = parseFloat(val.replace(',', '.'));
      }
    });
    if (row.data && row.hora) rows.push(row);
  }
  return rows;
}

function bodyToDbRow(body: MeasurementData) {
  return {
    data: body.data,
    hora: body.hora,
    temperatura: body.temperatura,
    condutividade: body.condutividade,
    sp_condutividade: body.spCondutividade,
    salinidade: body.salinidade,
    tds: body.tds,
    ph: body.ph,
    orp: body.orp,
    do_mg: body.do,
    do_sat: body.doSat,
    turbidez: body.turbidez,
    focieritrina: body.focieritrina,
    focieritrina_rfu: body.focieritrinaRFU,
    clorofila: body.clorofila,
    clorofila_rfu: body.clorofilaRFU,
    profundidade: body.profundidade,
  };
}

async function upsertCurrent(body: MeasurementData) {
  const measurementTypes = [
    { key: 'temperatura', value: body.temperatura, unit: 'ºC' },
    { key: 'condutividade', value: body.condutividade, unit: 'mS/cm' },
    { key: 'spCondutividade', value: body.spCondutividade, unit: 'mS/cm' },
    { key: 'salinidade', value: body.salinidade, unit: 'PSU' },
    { key: 'tds', value: body.tds, unit: 'mg/l' },
    { key: 'ph', value: body.ph, unit: '' },
    { key: 'orp', value: body.orp, unit: 'mV' },
    { key: 'do', value: body.do, unit: 'mg/l' },
    { key: 'doSat', value: body.doSat, unit: '%' },
    { key: 'turbidez', value: body.turbidez, unit: 'NTU' },
    { key: 'focieritrina', value: body.focieritrina, unit: 'ug/l' },
    { key: 'focieritrinaRFU', value: body.focieritrinaRFU, unit: 'RFU' },
    { key: 'clorofila', value: body.clorofila, unit: 'ug/l' },
    { key: 'clorofilaRFU', value: body.clorofilaRFU, unit: 'RFU' },
    { key: 'profundidade', value: body.profundidade, unit: 'm' },
  ];
  for (const m of measurementTypes) {
    if (m.value !== undefined && m.value !== null) {
      await supabase.from('current_measurements').upsert(
        { key: m.key, value: m.value, unit: m.unit, data: body.data, hora: body.hora, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    console.log(`[data-reception] POST from IP=${ip} UA="${userAgent}" Content-Type="${contentType}"`);

    // ── CSV upload (multipart/form-data or text/csv) ──────────────────────
    if (contentType.includes('multipart/form-data') || contentType.includes('text/csv')) {
      let csvText = '';

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        if (!file) return NextResponse.json({ error: 'No file field in form data' }, { status: 400 });
        csvText = await file.text();
      } else {
        csvText = await request.text();
      }

      console.log(`[data-reception] CSV received, first 300 chars: ${csvText.slice(0, 300)}`);
      const rows = parseCSV(csvText);
      console.log(`[data-reception] CSV parsed: ${rows.length} rows. Last row:`, rows[rows.length - 1]);
      if (rows.length === 0) return NextResponse.json({ error: 'No valid rows found in CSV' }, { status: 400 });

      const batchSize = 500;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += batchSize) {
        const { error } = await supabase.from('measurements').insert(rows.slice(i, i + batchSize));
        if (error) console.error('Batch insert error:', error);
        else inserted += rows.slice(i, i + batchSize).length;
      }

      // Update current_measurements with the last row
      const last = rows[rows.length - 1];
      if (last) {
        const lastBody: MeasurementData = {
          data: last.data as string,
          hora: last.hora as string,
          temperatura: last.temperatura as number,
          condutividade: last.condutividade as number,
          spCondutividade: last.sp_condutividade as number,
          salinidade: last.salinidade as number,
          tds: last.tds as number,
          ph: last.ph as number,
          orp: last.orp as number,
          do: last.do_mg as number,
          doSat: last.do_sat as number,
          turbidez: last.turbidez as number,
          focieritrina: last.focieritrina as number,
          focieritrinaRFU: last.focieritrina_rfu as number,
          clorofila: last.clorofila as number,
          clorofilaRFU: last.clorofila_rfu as number,
          profundidade: last.profundidade as number,
        };
        await upsertCurrent(lastBody);
      }

      return NextResponse.json({ status: 'success', message: `${inserted} rows imported from CSV`, total: rows.length });
    }

    // ── Single JSON measurement ───────────────────────────────────────────
    const body: MeasurementData = await request.json();
    console.log(`[data-reception] JSON received:`, JSON.stringify(body));
    if (!body.data || !body.hora) {
      return NextResponse.json({ error: 'data and hora are required' }, { status: 400 });
    }

    const { error: insertError } = await supabase.from('measurements').insert(bodyToDbRow(body));
    if (insertError) {
      console.error('Error inserting measurement:', insertError);
      return NextResponse.json({ error: 'Failed to insert measurement' }, { status: 500 });
    }

    await upsertCurrent(body);

    return NextResponse.json({ status: 'success', message: 'Measurement recorded', timestamp: `${body.data} ${body.hora}` });
  } catch (error) {
    console.error('Error processing measurement:', error);
    return NextResponse.json({ error: 'Failed to process measurement' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('current_measurements')
      .select('key, value, unit, data, hora')
      .order('key');

    if (error) {
      console.error('Error fetching measurements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch measurements' },
        { status: 500 }
      );
    }

    // Group by measurement type
    const measurements: Record<string, {
      value: number;
      unit: string;
      data: string;
      hora: string;
    }> = {};

    data?.forEach((row) => {
      measurements[row.key] = {
        value: row.value,
        unit: row.unit,
        data: row.data,
        hora: row.hora,
      };
    });

    return NextResponse.json(measurements);
  } catch (error) {
    console.error('Error fetching measurements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch measurements' },
      { status: 500 }
    );
  }
}
