# Value Dashboard - Vercel + Supabase Edition

A real-time dashboard for monitoring and visualizing values received through a web server, deployed on Vercel with Supabase PostgreSQL storage.

## Features

- **Real-time Updates**: Polling-based updates for serverless compatibility
- **Current Values Display**: Shows all current values in a clean card layout
- **History Visualization**: Interactive charts showing value history over time
- **REST API**: Simple API to send and retrieve values
- **Persistent Storage**: Supabase PostgreSQL database for data persistence
- **Modern UI**: Beautiful dark theme with glassmorphism effects

## Deployment

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Create a new project or use an existing one
3. Go to **Project Settings** → **API**
4. Copy the **Project URL** and **service_role key** (not the anon key)
5. Add these to your environment variables:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 3. Create Database Tables

In Supabase dashboard, go to **SQL Editor** → **New query** and run:

```sql
-- Create values table for history
CREATE TABLE IF NOT EXISTS values (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  value REAL NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_values_key ON values(key);
CREATE INDEX IF NOT EXISTS idx_values_timestamp ON values(timestamp);

-- Create current_values table for latest values
CREATE TABLE IF NOT EXISTS current_values (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value REAL NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_current_values_key ON current_values(key);
```

### 4. Deploy to Vercel

1. Push your code to GitHub
2. Connect your repo in Vercel dashboard
3. Add the environment variables in Vercel project settings
4. Deploy!

Or use Vercel CLI:

```bash
vercel --prod
```

## Local Development

```bash
npm run dev
```

The app will run on `http://localhost:3000`

## API Usage

### Send a value update

```bash
POST /api/update
Content-Type: application/json

{
  "key": "temperature",
  "value": 23.5
}
```

### Get all current values

```bash
GET /api/values
```

### Get history for a specific key

```bash
GET /api/history/{key}
```

## Example Usage

### Using curl

```bash
# Send a temperature update
curl -X POST https://your-app.vercel.app/api/update \
  -H "Content-Type: application/json" \
  -d '{"key": "temperature", "value": 23.5}'

# Send a humidity update
curl -X POST https://your-app.vercel.app/api/update \
  -H "Content-Type: application/json" \
  -d '{"key": "humidity", "value": 65.0}'
```

### Using Python

```python
import requests

response = requests.post(
    'https://your-app.vercel.app/api/update',
    json={'key': 'temperature', 'value': 23.5}
)
print(response.json())
```

### Using JavaScript

```javascript
fetch('https://your-app.vercel.app/api/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    key: 'temperature',
    value: 23.5
  })
})
```

## Architecture

- **Framework**: Next.js 14 with App Router
- **Database**: Supabase (PostgreSQL)
- **Client**: @supabase/supabase-js
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel Serverless Functions

## Project Structure

```
app/
├── api/
│   ├── update/route.ts      # POST endpoint for value updates
│   ├── values/route.ts      # GET all current values
│   └── history/[key]/route.ts  # GET history for specific key
├── components/
│   ├── ValueCard.tsx        # Value display card component
│   ├── HistoryChart.tsx     # Chart component for history
│   └── *.css                # Component styles
├── page.tsx                 # Main dashboard page
├── layout.tsx               # Root layout
└── globals.css              # Global styles
lib/
└── supabase.ts              # Supabase client configuration
scripts/
└── setup-db.js              # Database setup script
```

## Database Schema

The app uses two tables:

1. **values**: Stores all value history
   - id (serial, primary key)
   - key (varchar)
   - value (real)
   - timestamp (timestamp)

2. **current_values**: Stores current/latest values
   - id (serial, primary key)
   - key (varchar, unique)
   - value (real)
   - updated_at (timestamp)

## Notes

- Vercel's serverless functions don't support WebSocket connections, so the app uses polling (2-second intervals) for real-time updates
- Data persists in Supabase even after deployments
- Supabase free tier includes 500MB database storage
- Use the **service_role key** (not anon key) for server-side API routes - keep this secret!
