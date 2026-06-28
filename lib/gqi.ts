// Global Quality Index calculation based on Sines Coastal Water Quality Index

export interface GQIResult {
  index: number;
  classification: 'Normal' | 'Alert' | 'Critical';
  color: string;
  components: {
    doSat: { value: number; index: number; weight: number };
    clorofila: { value: number; index: number; weight: number };
    turbidez: { value: number; index: number; weight: number };
    spCondutividade: { value: number; index: number; weight: number };
    ph: { value: number; index: number; weight: number };
    temperatura: { value: number; index: number; weight: number };
    orp: { value: number; index: number; weight: number };
  };
}

// Sub-index calculation functions
function calculateDoSatIndex(value: number): number {
  // Based on Excel: =SE(OU(B6<75;B6>85);1-(ABS(B6-80)/80);1)
  // If value < 75 or > 85: 1 - (ABS(value - 80) / 80), else: 1
  if (value < 75 || value > 85) {
    return 1 - (Math.abs(value - 80) / 80);
  }
  return 1;
}

function calculateClorofilaIndex(value: number): number {
  // Based on Excel: =SE(D6>20;0;SE(D6<0;1;1-(D6/20)))
  // If value > 20: 0, else if value < 0: 1, else: 1 - (value / 20)
  if (value > 20) return 0;
  if (value < 0) return 1;
  return 1 - (value / 20);
}

function calculateTurbidezIndex(value: number): number {
  // Based on Excel: =SE(F6>20;0;SE(F6<0;1;1-(F6/20)))
  // Same as Chlorophyll
  if (value > 20) return 0;
  if (value < 0) return 1;
  return 1 - (value / 20);
}

function calculateSpCondutividadeIndex(value: number): number {
  // Based on Excel: =SE(H6<54;0;SE(H6>58;0;1-(ABS(H6-56)/2)))
  // If value < 54 or > 58: 0, else: 1 - (ABS(value - 56) / 2)
  if (value < 54 || value > 58) return 0;
  return 1 - (Math.abs(value - 56) / 2);
}

function calculatePhIndex(value: number): number {
  // Based on Excel: =SE(J6<7.5;0;SE(J6>8.3;0;1-(ABS(J6-7.9)/0.4)))
  // If value < 7.5 or > 8.3: 0, else: 1 - (ABS(value - 7.9) / 0.4)
  if (value < 7.5 || value > 8.3) return 0;
  return 1 - (Math.abs(value - 7.9) / 0.4);
}

function calculateTemperaturaIndex(value: number): number {
  // Based on Excel: =SE(L6<13;0;SE(L6>20;0;1-(ABS(L6-16.5)/3.5)))
  // If value < 13 or > 20: 0, else: 1 - (ABS(value - 16.5) / 3.5)
  if (value < 13 || value > 20) return 0;
  return 1 - (Math.abs(value - 16.5) / 3.5);
}

function calculateOrpIndex(value: number): number {
  // Based on Excel: =SE(N6<100;0;SE(N6>370;0;SE(N6<235;(N6-100)/135;1-(N6-235)/135)))
  // If value < 100 or > 370: 0
  // If value < 235: (value - 100) / 135
  // Else: 1 - (value - 235) / 135
  if (value < 100 || value > 370) return 0;
  if (value < 235) {
    return (value - 100) / 135;
  }
  return 1 - (value - 235) / 135;
}

export function calculateGQI(
  doSat: number,
  clorofila: number,
  turbidez: number,
  spCondutividade: number,
  ph: number,
  temperatura: number,
  orp: number
): GQIResult {
  const weights = {
    doSat: 0.25,
    clorofila: 0.15,
    turbidez: 0.15,
    spCondutividade: 0.10,
    ph: 0.15,
    temperatura: 0.10,
    orp: 0.15,
  };

  const components = {
    doSat: { value: doSat, index: calculateDoSatIndex(doSat), weight: weights.doSat },
    clorofila: { value: clorofila, index: calculateClorofilaIndex(clorofila), weight: weights.clorofila },
    turbidez: { value: turbidez, index: calculateTurbidezIndex(turbidez), weight: weights.turbidez },
    spCondutividade: { value: spCondutividade, index: calculateSpCondutividadeIndex(spCondutividade), weight: weights.spCondutividade },
    ph: { value: ph, index: calculatePhIndex(ph), weight: weights.ph },
    temperatura: { value: temperatura, index: calculateTemperaturaIndex(temperatura), weight: weights.temperatura },
    orp: { value: orp, index: calculateOrpIndex(orp), weight: weights.orp },
  };

  // Calculate weighted sum
  const weightedSum = Object.values(components).reduce((sum, comp) => {
    return sum + (comp.index * comp.weight);
  }, 0);

  const index = Math.min(100, Math.max(0, weightedSum * 100));

  // Classification
  let classification: 'Normal' | 'Alert' | 'Critical';
  let color: string;
  
  if (index >= 70) {
    classification = 'Normal';
    color = '#22c55e'; // green-500
  } else if (index >= 50) {
    classification = 'Alert';
    color = '#eab308'; // yellow-500
  } else {
    classification = 'Critical';
    color = '#ef4444'; // red-500
  }

  return {
    index: Math.round(index * 100) / 100, // Round to 2 decimal places
    classification,
    color,
    components,
  };
}
