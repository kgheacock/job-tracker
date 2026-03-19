import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pool from './db/pool.mjs';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (nginx sits in front in production)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://jobs.keithheacock.com',
  ],
  credentials: true,
}));

// Body parsing
app.use(express.json());

// Health check — used by Railway and nginx
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

// Phase 1 smoke test — verify schema is applied
app.get('/api/schema-check', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  res.json({ tables: rows.map((r) => r.table_name) });
});

// TODO: mount routes in Phase 2
// import jobsRouter from './routes/jobs.mjs';
// app.use('/api/jobs', jobsRouter);

// Central error handler (placeholder — expanded in Phase 2)
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
});

app.listen(PORT, () => {
  console.log(`job-tracker-api listening on :${PORT}`);
});
