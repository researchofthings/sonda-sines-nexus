export interface MeasurementData {
  data: string;           // Date
  hora: string;           // Time
  temperatura: number;     // Temperatura ºC
  condutividade: number;   // Condutividade mS/cm
  spCondutividade: number; // SpCondutividade mS/cm
  salinidade: number;      // Salinidade PSU
  tds: number;             // TDS mg/l
  ph: number;              // pH
  orp: number;             // ORP mV
  do: number;              // DO mg/l
  doSat: number;           // DO %sat
  turbidez: number;        // Turbidez NTU
  focieritrina: number;    // Focieritrina ug/l
  focieritrinaRFU: number; // Ficoeritrina RFU
  clorofila: number;       // Clorofila ug/l
  clorofilaRFU: number;    // Clorofila RFU
  profundidade: number;    // Profundidade m
}

export const measurementUnits: Record<keyof MeasurementData, string> = {
  data: '',
  hora: '',
  temperatura: 'ºC',
  condutividade: 'mS/cm',
  spCondutividade: 'mS/cm',
  salinidade: 'PSU',
  tds: 'mg/l',
  ph: '',
  orp: 'mV',
  do: 'mg/l',
  doSat: '%sat',
  turbidez: 'NTU',
  focieritrina: 'ug/l',
  focieritrinaRFU: 'RFU',
  clorofila: 'ug/l',
  clorofilaRFU: 'RFU',
  profundidade: 'm',
};

export const measurementLabels: Record<keyof MeasurementData, string> = {
  data: 'Data',
  hora: 'Hora',
  temperatura: 'Temperatura',
  condutividade: 'Condutividade',
  spCondutividade: 'SpCondutividade',
  salinidade: 'Salinidade',
  tds: 'TDS',
  ph: 'pH',
  orp: 'ORP',
  do: 'DO',
  doSat: 'DO Sat',
  turbidez: 'Turbidez',
  focieritrina: 'Focieritrina',
  focieritrinaRFU: 'Ficoeritrina RFU',
  clorofila: 'Clorofila',
  clorofilaRFU: 'Clorofila RFU',
  profundidade: 'Profundidade',
};

export const measurementRanges: Partial<Record<keyof MeasurementData, { min: number; max: number }>> = {
  temperatura: { min: 13, max: 20 },
  condutividade: { min: 48000, max: 56000 },
  salinidade: { min: 30, max: 37 },
  ph: { min: 7.5, max: 8.3 },
  orp: { min: 100, max: 370 },
  doSat: { min: 75, max: 85 },
  turbidez: { min: 0, max: 20 },
  clorofila: { min: 0, max: 20 },
};
