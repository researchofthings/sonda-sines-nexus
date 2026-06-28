import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MeasurementData } from '@/lib/measurements';

export const dynamic = 'force-dynamic';

const CSV_COLUMN_MAP: Record<string, string> = {
  'Data': 'data',
  'Hora': 'hora',
  'Temperatura ºC': 'temperatura',
  'Temperature (ºC)': 'temperatura',
  'Temperatura °C': 'temperatura',
  'Temperatura ?C': 'temperatura',
  'Temperatura': 'temperatura',
  'Condutividade mS/cm': 'condutividade',
  'SpCondutividade mS/cm': 'sp_condutividade',
  'SpCondutivity (25ºC) mS/cm': 'sp_condutividade',
  'Salinidade PSU': 'salinidade',
  'TDS mg/l': 'tds',
  'pH': 'ph',
  'ORP mV': 'orp',
  'DO mg/l': 'do_mg',
  'DO %sat': 'do_sat',
  'Turbidez NTU': 'turbidez',
  'Focieritrina ug/l': 'focieritrina',
  'Ficoeritrina RFU': 'focieritrina_rfu',
  'chlorophyll-a  ug/l': 'clorofila',
  'Clorofila ug/l': 'clorofila',
  'Clorofila RFU': 'clorofila_rfu',
  'Profundidade m': 'profundidade',
};

function normalizeHeader(h: string): string {
  // Replace any non-ASCII degree-like characters with º for consistent matching
  return h.replace(/[\u00b0\u00ba\ufffd\u0080-\u00bf]/g, match => {
    if (match === '\u00b0' || match === '\u00ba') return 'º';
    return '?';
  }).trim();
}

function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(normalizeHeader);
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(sep).map(v => v.trim());
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      const dbCol = CSV_COLUMN_MAP[header];
      if (!dbCol) return; // skips Cabo and unknown columns
      const val = values[idx];
      if (!val) return;
      if (dbCol === 'data') {
        // Handle both DD-MM-YYYY and DD/MM/YYYY formats
        const parts = val.split(/[-\/]/);
        row[dbCol] = parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : val;
      } else if (dbCol === 'hora') {
        row[dbCol] = val;
      } else {
        row[dbCol] = parseFloat(val.replace(',', '.'));
      }
    });
    if (row.data && row.hora) {
      // Default profundidade to 0 if not present
      if (row.profundidade === undefined) row.profundidade = 0;
      rows.push(row);
    }
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
        const fieldNames = Array.from(formData.keys());
        console.log(`[data-reception] Form fields:`, fieldNames);
        // Accept any field - try 'file' first, then first available field
        let entry = formData.get('file') ?? formData.get('data') ?? (fieldNames.length ? formData.get(fieldNames[0]) : null);
        if (!entry) return NextResponse.json({ error: 'No field found in form data' }, { status: 400 });
        csvText = typeof entry === 'string' ? entry : await (entry as File).text();
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

    return NextResponse.json({ status: 'success', message: 'Measurement recorded', timestamp: `${body.data} ${body.hora}` });
  } catch (error) {
    console.error('Error processing measurement:', error);
    return NextResponse.json({ error: 'Failed to process measurement' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get the latest measurement row
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .order('data', { ascending: false })
      .order('hora', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching latest measurement:', error);
      return NextResponse.json(
        { error: 'Failed to fetch measurements' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({});
    }

    // Transform to the expected format
    const measurements: Record<string, {
      value: number;
      unit: string;
      data: string;
      hora: string;
    }> = {
      temperatura: { value: data.temperatura, unit: 'ºC', data: data.data, hora: data.hora },
      condutividade: { value: data.condutividade, unit: 'mS/cm', data: data.data, hora: data.hora },
      spCondutividade: { value: data.sp_condutividade, unit: 'mS/cm', data: data.data, hora: data.hora },
      salinidade: { value: data.salinidade, unit: 'PSU', data: data.data, hora: data.hora },
      tds: { value: data.tds, unit: 'mg/l', data: data.data, hora: data.hora },
      ph: { value: data.ph, unit: '', data: data.data, hora: data.hora },
      orp: { value: data.orp, unit: 'mV', data: data.data, hora: data.hora },
      do: { value: data.do_mg, unit: 'mg/l', data: data.data, hora: data.hora },
      doSat: { value: data.do_sat, unit: '%', data: data.data, hora: data.hora },
      turbidez: { value: data.turbidez, unit: 'NTU', data: data.data, hora: data.hora },
      focieritrina: { value: data.focieritrina, unit: 'ug/l', data: data.data, hora: data.hora },
      focieritrinaRFU: { value: data.focieritrina_rfu, unit: 'RFU', data: data.data, hora: data.hora },
      clorofila: { value: data.clorofila, unit: 'ug/l', data: data.data, hora: data.hora },
      clorofilaRFU: { value: data.clorofila_rfu, unit: 'RFU', data: data.data, hora: data.hora },
      profundidade: { value: data.profundidade, unit: 'm', data: data.data, hora: data.hora },
    };

    return NextResponse.json(measurements);
  } catch (error) {
    console.error('Error fetching measurements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch measurements' },
      { status: 500 }
    );
  }
}
