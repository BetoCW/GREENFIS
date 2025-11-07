import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { poolPromise } from './src/database/connection.js';
import managerRouter from './src/routes/manager.js';
import almacenRouter from './src/routes/almacen.js';
import vendedorRouter from './src/routes/vendedor.js';

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ ok: true }));

// DB health check: simple query to validate connectivity
app.get('/api/health/db', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT 1 AS ok');
    if (result && result.recordset && result.recordset.length) return res.json({ ok: true });
    return res.status(500).json({ ok: false, error: 'DB returned unexpected result' });
  } catch (err) {
    console.error('/api/health/db error', err && err.message);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// example route that queries products (kept for quick smoke tests)
app.get('/productos', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT TOP (100) * FROM productos'); // Ajusta el nombre de la tabla
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Mount manager routes under /api/manager
app.use('/api/manager', managerRouter);
// Mount almacen routes under /api/almacen
app.use('/api/almacen', almacenRouter);
// Mount vendedor routes under /api/vendedor
app.use('/api/vendedor', vendedorRouter);

// Basic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err?.message || 'Internal Server Error' });
});

const port = process.env.PORT || 4000;
const server = app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`));

// Graceful shutdown: close DB pool when process exits
const shutdown = async (signal) => {
  console.log(`Received ${signal}. Closing server and DB pool...`);
  try {
    const pool = await poolPromise;
    await pool.close();
    console.log('DB pool closed');
  } catch (err) {
    console.warn('Error closing DB pool', err?.message || err);
  }
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
