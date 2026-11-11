import express, { Request, Response } from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '25mb' }));

// ------------------------------------------------------------------------
// POSTGRESQL CONFIGURATION
// Target Database: "rozana" on port 5432
// ------------------------------------------------------------------------
let currentConfig = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'rozana',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000,
  max: 10,
};

let pool: pkg.Pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 }
    : currentConfig
);

// Graceful pool error handling (prevents unhandled crash on disconnect)
pool.on('error', (err: Error) => {
  console.warn('[PostgreSQL Pool Warning]', err.message);
});

// Allowed UPPERCASE Tables (Security whitelist to prevent SQL injection)
const ALLOWED_TABLES = new Set([
  'STORE_CHAINS',
  'BRANCHES',
  'USERS',
  'ITEM_GROUPS',
  'CATEGORIES',
  'BRANDS',
  'ITEM_DEFINITIONS',
  'CUSTOMERS',
  'SUPPLIERS',
  'PURCHASES',
  'SALES',
  'SALE_ITEMS',
  'PAYMENTS',
  'EXPENSES',
  'ACTIVITY_LOGS',
]);

// ------------------------------------------------------------------------
// API ROUTES
// ------------------------------------------------------------------------

// 1. Connection Health & Status Check
app.get('/api/db/status', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const dbInfoRes = await client.query(
        'SELECT current_database() AS db_name, version() AS version, inet_server_port() AS port'
      );
      const tablesRes = await client.query(
        `SELECT table_name 
         FROM information_schema.tables 
         WHERE table_schema = 'public' 
         ORDER BY table_name`
      );

      const tableNames = tablesRes.rows.map((r: { table_name: string }) => r.table_name);
      const isRozana = dbInfoRes.rows[0]?.db_name === currentConfig.database;

      res.json({
        connected: true,
        database: dbInfoRes.rows[0]?.db_name || currentConfig.database,
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
        server_version: dbInfoRes.rows[0]?.version,
        is_target_rozana: isRozana,
        tables: tableNames,
        total_tables: tableNames.length,
        timestamp: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const error = err as Error;
    res.json({
      connected: false,
      database: currentConfig.database,
      host: currentConfig.host,
      port: currentConfig.port,
      user: currentConfig.user,
      error: error.message || 'Failed to connect to PostgreSQL',
      hint: `Ensure PostgreSQL is running on ${currentConfig.host}:${currentConfig.port} and database '${currentConfig.database}' exists.`,
      timestamp: new Date().toISOString(),
    });
  }
});

// 2. Live Configuration Update
app.post('/api/db/configure', async (req: Request, res: Response) => {
  try {
    const { host, port, database, user, password } = req.body;
    currentConfig = {
      ...currentConfig,
      host: host || currentConfig.host,
      port: port ? parseInt(port, 10) : currentConfig.port,
      database: database || currentConfig.database,
      user: user || currentConfig.user,
      password: password !== undefined ? password : currentConfig.password,
    };

    // Recreate pool with new configuration
    try {
      await pool.end();
    } catch {
      // Ignore cleanup error
    }

    pool = new Pool(currentConfig);
    pool.on('error', (err: Error) => {
      console.warn('[PostgreSQL Pool Warning]', err.message);
    });

    const client = await pool.connect();
    try {
      const testRes = await client.query('SELECT current_database() AS db_name');
      res.json({
        success: true,
        connected: true,
        database: testRes.rows[0]?.db_name,
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
      });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message,
    });
  }
});

// 3. Generic Query Endpoint for UPPERCASE tables
app.get('/api/table/:tableName', async (req: Request, res: Response) => {
  const rawTable = String(req.params.tableName || '').toUpperCase();

  if (!ALLOWED_TABLES.has(rawTable)) {
    return res.status(400).json({ error: `Table '${rawTable}' is not allowed or does not exist.` });
  }

  try {
    // Preserve exact UPPERCASE table identifier
    const result = await pool.query(`SELECT * FROM "${rawTable}" ORDER BY id ASC`);
    res.json({ success: true, table: rawTable, count: result.rowCount, data: result.rows });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ success: false, table: rawTable, error: error.message });
  }
});

// 4. Insert Record into UPPERCASE table
app.post('/api/table/:tableName', async (req: Request, res: Response) => {
  const rawTable = String(req.params.tableName || '').toUpperCase();

  if (!ALLOWED_TABLES.has(rawTable)) {
    return res.status(400).json({ error: `Table '${rawTable}' is not allowed.` });
  }

  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Invalid payload.' });
  }

  try {
    const keys = Object.keys(payload);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields provided.' });
    }

    const columns = keys.map((k) => `"${k}"`).join(', ');
    const values = keys.map((k) => payload[k]);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `INSERT INTO "${rawTable}" (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(sql, values);

    res.status(201).json({ success: true, table: rawTable, data: result.rows[0] });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ success: false, table: rawTable, error: error.message });
  }
});

// 5. Update Record in UPPERCASE table
app.put('/api/table/:tableName/:id', async (req: Request, res: Response) => {
  const rawTable = String(req.params.tableName || '').toUpperCase();
  const id = req.params.id;

  if (!ALLOWED_TABLES.has(rawTable)) {
    return res.status(400).json({ error: `Table '${rawTable}' is not allowed.` });
  }

  const payload = req.body;
  const keys = Object.keys(payload).filter((k) => k !== 'id');

  if (keys.length === 0) {
    return res.status(400).json({ error: 'No update fields provided.' });
  }

  try {
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = keys.map((k) => payload[k]);
    values.push(id);

    const sql = `UPDATE "${rawTable}" SET ${setClause} WHERE id = $${values.length} RETURNING *`;
    const result = await pool.query(sql, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Record with id ${id} not found.` });
    }

    res.json({ success: true, table: rawTable, data: result.rows[0] });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ success: false, table: rawTable, error: error.message });
  }
});

// 6. Delete Record from UPPERCASE table
app.delete('/api/table/:tableName/:id', async (req: Request, res: Response) => {
  const rawTable = String(req.params.tableName || '').toUpperCase();
  const id = req.params.id;

  if (!ALLOWED_TABLES.has(rawTable)) {
    return res.status(400).json({ error: `Table '${rawTable}' is not allowed.` });
  }

  try {
    const sql = `DELETE FROM "${rawTable}" WHERE id = $1 RETURNING id`;
    const result = await pool.query(sql, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Record with id ${id} not found.` });
    }

    res.json({ success: true, table: rawTable, deleted_id: id });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ success: false, table: rawTable, error: error.message });
  }
});

// 7. Full Sync Route (Push or Pull between Browser & PostgreSQL "rozana")
app.get('/api/db/export-all', async (req: Request, res: Response) => {
  try {
    const exportData: Record<string, unknown[]> = {};
    for (const tableName of ALLOWED_TABLES) {
      try {
        const queryRes = await pool.query(`SELECT * FROM "${tableName}"`);
        exportData[tableName] = queryRes.rows;
      } catch {
        exportData[tableName] = [];
      }
    }
    res.json({ success: true, database: currentConfig.database, data: exportData });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

// ------------------------------------------------------------------------
// SERVER BOOTSTRAP WITH VITE MIDDLEWARE
// ------------------------------------------------------------------------
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Z-POS Server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[PostgreSQL Target] Host: ${currentConfig.host}:${currentConfig.port} | Database: "${currentConfig.database}"`);
  });
}

startServer().catch((err) => {
  console.error('[Z-POS Server Fatal Error]', err);
  process.exit(1);
});
