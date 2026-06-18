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
  cabo: number;            // Cabo V
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
  cabo: 'V',
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
  cabo: 'Cabo',
};

export const measurementRanges: Partial<Record<keyof MeasurementData, { min: number; max: number }>> = {
  temperatura: { min: -5, max: 50 },
  ph: { min: 0, max: 14 },
  doSat: { min: 0, max: 200 },
};
