-- Create measurements table for historical data
CREATE TABLE IF NOT EXISTS measurements (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  temperatura REAL,
  condutividade REAL,
  sp_condutividade REAL,
  salinidade REAL,
  tds REAL,
  ph REAL,
  orp REAL,
  do_mg REAL,
  do_sat REAL,
  turbidez REAL,
  focieritrina REAL,
  focieritrina_rfu REAL,
  clorofila REAL,
  clorofila_rfu REAL,
  profundidade REAL,
  cabo REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_measurements_data ON measurements(data);
CREATE INDEX IF NOT EXISTS idx_measurements_created ON measurements(created_at);

-- Create current_measurements table for latest values
CREATE TABLE IF NOT EXISTS current_measurements (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value REAL NOT NULL,
  unit VARCHAR(50),
  data DATE,
  hora TIME,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_current_measurements_key ON current_measurements(key);
