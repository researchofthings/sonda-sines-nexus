import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MeasurementData } from '@/lib/measurements';

export async function POST(request: NextRequest) {
  try {
    const body: MeasurementData = await request.json();

    // Validate required fields
    if (!body.data || !body.hora) {
      return NextResponse.json(
        { error: 'Data and Hora are required' },
        { status: 400 }
      );
    }

    // Insert measurement into history
    const { error: insertError } = await supabase
      .from('measurements')
      .insert({
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
        cabo: body.cabo,
      });

    if (insertError) {
      console.error('Error inserting measurement:', insertError);
      return NextResponse.json(
        { error: 'Failed to insert measurement' },
        { status: 500 }
      );
    }

    // Update current values for each measurement type
    const measurementTypes = [
      { key: 'temperatura', value: body.temperatura, unit: 'ºC' },
      { key: 'condutividade', value: body.condutividade, unit: 'mS/cm' },
      { key: 'spCondutividade', value: body.spCondutividade, unit: 'mS/cm' },
      { key: 'salinidade', value: body.salinidade, unit: 'PSU' },
      { key: 'tds', value: body.tds, unit: 'mg/l' },
      { key: 'ph', value: body.ph, unit: '' },
      { key: 'orp', value: body.orp, unit: 'mV' },
      { key: 'do', value: body.do, unit: 'mg/l' },
      { key: 'doSat', value: body.doSat, unit: '%sat' },
      { key: 'turbidez', value: body.turbidez, unit: 'NTU' },
      { key: 'focieritrina', value: body.focieritrina, unit: 'ug/l' },
      { key: 'focieritrinaRFU', value: body.focieritrinaRFU, unit: 'RFU' },
      { key: 'clorofila', value: body.clorofila, unit: 'ug/l' },
      { key: 'clorofilaRFU', value: body.clorofilaRFU, unit: 'RFU' },
      { key: 'profundidade', value: body.profundidade, unit: 'm' },
      { key: 'cabo', value: body.cabo, unit: 'V' },
    ];

    for (const measurement of measurementTypes) {
      if (measurement.value !== undefined && measurement.value !== null) {
        const { error: upsertError } = await supabase
          .from('current_measurements')
          .upsert(
            {
              key: measurement.key,
              value: measurement.value,
              unit: measurement.unit,
              data: body.data,
              hora: body.hora,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'key' }
          );

        if (upsertError) {
          console.error(`Error upserting ${measurement.key}:`, upsertError);
        }
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Measurement recorded',
      timestamp: `${body.data} ${body.hora}`,
    });
  } catch (error) {
    console.error('Error processing measurement:', error);
    return NextResponse.json(
      { error: 'Failed to process measurement' },
      { status: 500 }
    );
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
