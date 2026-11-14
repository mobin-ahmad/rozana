import express, { Request, Response } from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Port 3000 is required by AI Studio dev environment constraints
const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '25mb' }));

// ------------------------------------------------------------------------
// POSTGRESQL CONFIGURATION
// Target Database: "rozana" on port 5432
// ------------------------------------------------------------------------
interface PgConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  max: number;
}

function parseDatabaseUrl(rawUrl?: string): Partial<PgConfig> {
  if (!rawUrl) return {};
  try {
    const cleaned = rawUrl.replace(/^jdbc:/i, '');
    const parsed = new URL(cleaned);
    return {
      host: parsed.hostname || undefined,
      port: parsed.port ? parseInt(parsed.port, 10) : undefined,
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') || undefined : undefined,
      user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password !== undefined ? decodeURIComponent(parsed.password) : undefined,
    };
  } catch {
    return {};
  }
}

const urlDefaults = parseDatabaseUrl(process.env.DATABASE_URL);

let currentConfig: PgConfig = {
  host: process.env.PGHOST || urlDefaults.host || 'localhost',
  port: parseInt(process.env.PGPORT || String(urlDefaults.port || 5432), 10),
  database: process.env.PGDATABASE || urlDefaults.database || 'rozana',
  user: process.env.PGUSER || urlDefaults.user || 'postgres',
  password: process.env.PGPASSWORD ?? urlDefaults.password ?? 'postgres',
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000,
  max: 10,
};

function createPgPool(cfg: PgConfig): pkg.Pool {
  const nextPool = new Pool(cfg);
  nextPool.on('error', (err: Error) => {
    console.warn('[PostgreSQL Pool Warning]', err.message);
  });
  return nextPool;
}

let pool: pkg.Pool = createPgPool(currentConfig);

function persistEnvConfig(cfg: PgConfig) {
  try {
    const envPath = path.resolve(__dirname, '.env');
    let existing = '';
    if (fs.existsSync(envPath)) {
      existing = fs.readFileSync(envPath, 'utf-8');
    }

    const encodedPass = encodeURIComponent(cfg.password);
    const encodedUser = encodeURIComponent(cfg.user);
    const dbUrl = `postgresql://${encodedUser}:${encodedPass}@${cfg.host}:${cfg.port}/${cfg.database}`;

    const updates: Record<string, string> = {
      PGHOST: cfg.host,
      PGPORT: String(cfg.port),
      PGDATABASE: cfg.database,
      PGUSER: cfg.user,
      PGPASSWORD: cfg.password,
      DATABASE_URL: dbUrl,
    };

    const lines = existing ? existing.split(/\r?\n/) : ['# Local PostgreSQL Configuration'];
    const seen = new Set<string>();

    const nextLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) return line;
      const key = line.slice(0, eqIdx).trim();
      if (key in updates) {
        seen.add(key);
        return `${key}="${updates[key]}"`;
      }
      return line;
    });

    for (const [k, v] of Object.entries(updates)) {
      if (!seen.has(k)) {
        nextLines.push(`${k}="${v}"`);
      }
    }

    fs.writeFileSync(envPath, `${nextLines.filter((l, i, arr) => i < arr.length - 1 || l !== '').join('\n')}\n`, 'utf-8');
  } catch (err) {
    console.warn('[rozana Server] Could not persist .env file:', (err as Error).message);
  }
}

async function connectWithIpv4Fallback(): Promise<pkg.PoolClient> {
  try {
    return await pool.connect();
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    // On Windows/Node, 'localhost' often resolves to IPv6 ::1 while PostgreSQL listens on 127.0.0.1
    if (
      currentConfig.host === 'localhost' &&
      (error.code === 'ECONNREFUSED' || error.message.includes('::1') || error.message.includes('ECONNREFUSED'))
    ) {
      const ipv4Config: PgConfig = { ...currentConfig, host: '127.0.0.1' };
      const ipv4Pool = createPgPool(ipv4Config);
      try {
        const client = await ipv4Pool.connect();
        try {
          await pool.end();
        } catch {
          // ignore
        }
        currentConfig = ipv4Config;
        pool = ipv4Pool;
        return client;
      } catch {
        try {
          await ipv4Pool.end();
        } catch {
          // ignore
        }
        throw err;
      }
    }
    throw err;
  }
}

// Allowed UPPERCASE Tables (Security whitelist to prevent SQL injection)
const ALLOWED_TABLES = new Set([
  'SUBSCRIPTION_PLANS',
  'STORE_CHAINS',
  'BRANCHES',
  'ROLES',
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
  'SUBSCRIPTION_HISTORY',
]);

// Tables that carry chain_id for strict tenant isolation
const TENANT_SCOPED_TABLES = new Set([
  'BRANCHES',
  'ROLES',
  'USERS',
  'ITEM_GROUPS',
  'CATEGORIES',
  'BRANDS',
  'ITEM_DEFINITIONS',
  'CUSTOMERS',
  'SUPPLIERS',
  'PURCHASES',
  'SALES',
  'PAYMENTS',
  'EXPENSES',
  'ACTIVITY_LOGS',
]);

// Tables blocked for suspended/expired/pending organizations on mutations
const POS_MUTATION_TABLES = new Set([
  'SALES',
  'SALE_ITEMS',
  'PURCHASES',
  'PAYMENTS',
  'EXPENSES',
  'ITEM_DEFINITIONS',
  'CUSTOMERS',
  'SUPPLIERS',
]);

interface AuthContext {
  chainId: string;
  branchId: string;
  userId: string;
  role: string;
  isSuperAdmin: boolean;
}

function getAuthContext(req: Request): AuthContext {
  const headerChain = String(req.headers['x-rozana-chain-id'] || '').trim();
  const queryChain = String(req.query.chain_id || '').trim();
  const headerBranch = String(req.headers['x-rozana-branch-id'] || '').trim();
  const headerUser = String(req.headers['x-rozana-user-id'] || '').trim();
  const headerRole = String(req.headers['x-rozana-role'] || '').trim().toLowerCase();
  const isSuper = String(req.headers['x-rozana-super-admin'] || '').toLowerCase() === 'true';

  return {
    chainId: headerChain || queryChain || '',
    branchId: headerBranch || '',
    userId: headerUser || '',
    role: headerRole || '',
    isSuperAdmin: isSuper,
  };
}

async function verifyOrgActiveForWrite(chainId: string): Promise<{ allowed: boolean; reason?: string }> {
  if (!chainId) return { allowed: true };
  try {
    const res = await pool.query(
      `SELECT status, is_active, subscription_expiry_date FROM "STORE_CHAINS" WHERE id = $1 LIMIT 1`,
      [chainId]
    );
    if (res.rowCount === 0) return { allowed: true };
    const org = res.rows[0];
    const effectiveStatus = (org.status || (org.is_active ? 'active' : 'suspended')).toLowerCase();
    if (effectiveStatus === 'suspended' || org.is_active === false) {
      return { allowed: false, reason: 'Organization is suspended. POS operations are blocked.' };
    }
    if (effectiveStatus === 'pending') {
      return { allowed: false, reason: 'Organization is pending activation by Global Admin.' };
    }
    if (effectiveStatus === 'expired') {
      return { allowed: false, reason: 'Organization subscription has expired. Renew plan to continue.' };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

async function validatePlanLimitForInsert(
  rawTable: string,
  chainId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (!chainId || (rawTable !== 'BRANCHES' && rawTable !== 'USERS')) {
    return { allowed: true };
  }
  try {
    const orgRes = await pool.query(
      `SELECT s.max_branches, s.max_users, p.max_branches AS plan_max_branches, p.max_users AS plan_max_users
       FROM "STORE_CHAINS" s
       LEFT JOIN "SUBSCRIPTION_PLANS" p ON s.plan_id = p.id
       WHERE s.id = $1 LIMIT 1`,
      [chainId]
    );
    if (orgRes.rowCount === 0) return { allowed: true };
    const row = orgRes.rows[0];
    if (rawTable === 'BRANCHES') {
      const limit = Number(row.max_branches || row.plan_max_branches || 0);
      if (limit > 0) {
        const cntRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM "BRANCHES" WHERE chain_id = $1`, [chainId]);
        if ((cntRes.rows[0]?.cnt ?? 0) >= limit) {
          return {
            allowed: false,
            reason: `Branch limit reached (${limit} max branches under current subscription plan). Upgrade plan to add more branches.`,
          };
        }
      }
    }
    if (rawTable === 'USERS') {
      const limit = Number(row.max_users || row.plan_max_users || 0);
      if (limit > 0) {
        const cntRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM "USERS" WHERE chain_id = $1`, [chainId]);
        if ((cntRes.rows[0]?.cnt ?? 0) >= limit) {
          return {
            allowed: false,
            reason: `User limit reached (${limit} max users under current subscription plan). Upgrade plan to add more users.`,
          };
        }
      }
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

async function ensureMultiTenantSchema(client: pkg.PoolClient): Promise<void> {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SUBSCRIPTION_PLANS" (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL UNIQUE,
        description TEXT,
        monthly_price NUMERIC(14, 2) DEFAULT 0.00,
        annual_price NUMERIC(14, 2) DEFAULT 0.00,
        max_branches INT NOT NULL DEFAULT 1,
        max_users INT NOT NULL DEFAULT 5,
        max_pos_terminals INT NOT NULL DEFAULT 2,
        storage_limit_mb INT DEFAULT 1024,
        available_modules JSONB DEFAULT '["dashboard","pos","inventory","sales","customers","payments"]'::jsonb,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS "ROLES" (
        id VARCHAR(64) PRIMARY KEY,
        chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
        name VARCHAR(128) NOT NULL,
        base_role VARCHAR(32) NOT NULL DEFAULT 'cashier',
        description TEXT,
        branch_access VARCHAR(32) DEFAULT 'assigned',
        permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
        matrix JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS "SUBSCRIPTION_HISTORY" (
        id VARCHAR(64) PRIMARY KEY,
        organization_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
        organization_name VARCHAR(255) NOT NULL,
        previous_plan_id VARCHAR(64),
        previous_plan_name VARCHAR(128),
        new_plan_id VARCHAR(64),
        new_plan_name VARCHAR(128) NOT NULL,
        action VARCHAR(64) NOT NULL,
        changed_by VARCHAR(128),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS registration_number VARCHAR(128);
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS tax_id VARCHAR(128);
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS website VARCHAR(255);
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS country VARCHAR(128) DEFAULT 'Pakistan';
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS city VARCHAR(128) DEFAULT 'Lahore';
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS admin_username VARCHAR(128);
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS admin_phone VARCHAR(64);
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS plan_id VARCHAR(64);
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS subscription_start_date DATE DEFAULT CURRENT_DATE;
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS subscription_expiry_date DATE;
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS max_branches INT DEFAULT 5;
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS max_users INT DEFAULT 25;
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS max_pos_terminals INT DEFAULT 10;
      ALTER TABLE "STORE_CHAINS" ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active';
      ALTER TABLE "BRANCHES" ADD COLUMN IF NOT EXISTS branch_type VARCHAR(64) DEFAULT 'retail_outlet';
      ALTER TABLE "BRANCHES" ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
      ALTER TABLE "BRANCHES" ADD COLUMN IF NOT EXISTS manager_user_id INT;
      ALTER TABLE "BRANCHES" ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active';
      ALTER TABLE "BRANCHES" ADD COLUMN IF NOT EXISTS opening_date DATE DEFAULT CURRENT_DATE;
      ALTER TABLE "USERS" ADD COLUMN IF NOT EXISTS custom_role_id VARCHAR(64);
      ALTER TABLE "USERS" ADD COLUMN IF NOT EXISTS assigned_branches JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE "USERS" ADD COLUMN IF NOT EXISTS account_status VARCHAR(32) DEFAULT 'active';
    `);
  } catch (err) {
    console.warn('[rozana Schema Migration Notice]', (err as Error).message);
  }
}

// ------------------------------------------------------------------------
// API ROUTES
// ------------------------------------------------------------------------

// 1. Connection Health & Status Check
app.get('/api/db/status', async (req: Request, res: Response) => {
  try {
    const client = await connectWithIpv4Fallback();
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

      const tableCounts: Record<string, number> = {};
      for (const tbl of tableNames) {
        if (ALLOWED_TABLES.has(tbl)) {
          try {
            const cntRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM "${tbl}"`);
            tableCounts[tbl] = cntRes.rows[0]?.cnt ?? 0;
          } catch {
            tableCounts[tbl] = 0;
          }
        }
      }

      res.json({
        connected: true,
        database: dbInfoRes.rows[0]?.db_name || currentConfig.database,
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
        server_version: dbInfoRes.rows[0]?.version,
        is_target_rozana: isRozana,
        tables: tableNames,
        table_counts: tableCounts,
        total_tables: tableNames.length,
        timestamp: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    res.json({
      connected: false,
      database: currentConfig.database,
      host: currentConfig.host,
      port: currentConfig.port,
      user: currentConfig.user,
      error_code: error.code,
      error: error.message || 'Failed to connect to PostgreSQL',
      hint: `Ensure PostgreSQL is running on ${currentConfig.host}:${currentConfig.port} and database '${currentConfig.database}' exists.`,
      timestamp: new Date().toISOString(),
    });
  }
});

// 2. Live Configuration Update (persists to .env when verified)
app.post('/api/db/configure', async (req: Request, res: Response) => {
  try {
    const { host, port, database, user, password, connectionUrl } = req.body || {};
    const parsedFromUrl = connectionUrl ? parseDatabaseUrl(String(connectionUrl)) : {};

    const nextConfig: PgConfig = {
      ...currentConfig,
      host: (host ? String(host).trim() : '') || parsedFromUrl.host || currentConfig.host,
      port: port ? parseInt(String(port), 10) : parsedFromUrl.port || currentConfig.port,
      database: (database ? String(database).trim() : '') || parsedFromUrl.database || currentConfig.database,
      user: (user ? String(user).trim() : '') || parsedFromUrl.user || currentConfig.user,
      password:
        password !== undefined && password !== ''
          ? String(password)
          : parsedFromUrl.password !== undefined
          ? parsedFromUrl.password
          : password === ''
          ? ''
          : currentConfig.password,
    };

    const tryHosts = nextConfig.host === 'localhost' ? ['localhost', '127.0.0.1'] : [nextConfig.host];
    let connectedPool: pkg.Pool | null = null;
    let connectedHost = nextConfig.host;
    let dbName = nextConfig.database;
    let lastError: Error | null = null;

    for (const candidateHost of tryHosts) {
      const candidateConfig = { ...nextConfig, host: candidateHost };
      const candidatePool = createPgPool(candidateConfig);
      try {
        const client = await candidatePool.connect();
        try {
          const testRes = await client.query('SELECT current_database() AS db_name');
          dbName = testRes.rows[0]?.db_name || candidateConfig.database;
          connectedPool = candidatePool;
          connectedHost = candidateHost;
          break;
        } finally {
          client.release();
        }
      } catch (err) {
        lastError = err as Error;
        try {
          await candidatePool.end();
        } catch {
          // ignore
        }
      }
    }

    if (!connectedPool) {
      throw lastError || new Error('Failed to connect to PostgreSQL');
    }

    try {
      await pool.end();
    } catch {
      // Ignore cleanup error
    }

    currentConfig = { ...nextConfig, host: connectedHost };
    pool = connectedPool;
    persistEnvConfig(currentConfig);

    res.json({
      success: true,
      connected: true,
      database: dbName,
      host: currentConfig.host,
      port: currentConfig.port,
      user: currentConfig.user,
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message,
    });
  }
});

// 3. Generic Query Endpoint for UPPERCASE tables with backend tenant isolation
app.get('/api/table/:tableName', async (req: Request, res: Response) => {
  const rawTable = String(req.params.tableName || '').toUpperCase();

  if (!ALLOWED_TABLES.has(rawTable)) {
    return res.status(400).json({ error: `Table '${rawTable}' is not allowed or does not exist.` });
  }

  const auth = getAuthContext(req);
  if ((rawTable === 'SUBSCRIPTION_PLANS' || rawTable === 'STORE_CHAINS') && !auth.isSuperAdmin && auth.chainId) {
    if (rawTable === 'STORE_CHAINS') {
      try {
        const result = await pool.query(`SELECT * FROM "STORE_CHAINS" WHERE id = $1`, [auth.chainId]);
        return res.json({ success: true, table: rawTable, count: result.rowCount, data: result.rows });
      } catch (err: unknown) {
        return res.status(500).json({ success: false, table: rawTable, error: (err as Error).message });
      }
    }
  }

  try {
    let sql = `SELECT * FROM "${rawTable}" ORDER BY id ASC`;
    const params: unknown[] = [];

    if (TENANT_SCOPED_TABLES.has(rawTable) && auth.chainId && !auth.isSuperAdmin) {
      sql = `SELECT * FROM "${rawTable}" WHERE chain_id = $1 ORDER BY id ASC`;
      params.push(auth.chainId);
    } else if (TENANT_SCOPED_TABLES.has(rawTable) && req.query.chain_id) {
      sql = `SELECT * FROM "${rawTable}" WHERE chain_id = $1 ORDER BY id ASC`;
      params.push(String(req.query.chain_id));
    }

    const result = await pool.query(sql, params);
    res.json({ success: true, table: rawTable, count: result.rowCount, data: result.rows });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ success: false, table: rawTable, error: error.message });
  }
});

// 4. Insert Record into UPPERCASE table (enforces tenant context, status, and subscription limits)
app.post('/api/table/:tableName', async (req: Request, res: Response) => {
  const rawTable = String(req.params.tableName || '').toUpperCase();

  if (!ALLOWED_TABLES.has(rawTable)) {
    return res.status(400).json({ error: `Table '${rawTable}' is not allowed.` });
  }

  const payload = { ...(req.body || {}) };
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Invalid payload.' });
  }

  const auth = getAuthContext(req);

  // Only Global Admin may create plans or register organizations from platform endpoints
  if (rawTable === 'SUBSCRIPTION_PLANS' && auth.chainId && !auth.isSuperAdmin) {
    return res.status(403).json({ error: 'Only Global Admin can manage subscription plans.' });
  }

  // Enforce authenticated organization context on tenant-scoped records
  if (TENANT_SCOPED_TABLES.has(rawTable) && auth.chainId && !auth.isSuperAdmin) {
    if (payload.chain_id && payload.chain_id !== auth.chainId) {
      return res.status(403).json({ error: 'Cross-organization write denied.' });
    }
    payload.chain_id = auth.chainId;
  }

  const effectiveChainId = String(payload.chain_id || auth.chainId || '');

  // Block POS/data writes for Suspended, Expired, or Pending organizations
  if (POS_MUTATION_TABLES.has(rawTable) && effectiveChainId && !auth.isSuperAdmin) {
    const orgCheck = await verifyOrgActiveForWrite(effectiveChainId);
    if (!orgCheck.allowed) {
      return res.status(403).json({ error: orgCheck.reason });
    }
  }

  // Enforce subscription branch/user limits
  const limitCheck = await validatePlanLimitForInsert(rawTable, effectiveChainId);
  if (!limitCheck.allowed) {
    return res.status(403).json({ error: limitCheck.reason });
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

// 5. Update Record in UPPERCASE table (enforces tenant ownership)
app.put('/api/table/:tableName/:id', async (req: Request, res: Response) => {
  const rawTable = String(req.params.tableName || '').toUpperCase();
  const id = req.params.id;

  if (!ALLOWED_TABLES.has(rawTable)) {
    return res.status(400).json({ error: `Table '${rawTable}' is not allowed.` });
  }

  const payload = { ...(req.body || {}) };
  const keys = Object.keys(payload).filter((k) => k !== 'id');

  if (keys.length === 0) {
    return res.status(400).json({ error: 'No update fields provided.' });
  }

  const auth = getAuthContext(req);
  if (rawTable === 'SUBSCRIPTION_PLANS' && auth.chainId && !auth.isSuperAdmin) {
    return res.status(403).json({ error: 'Only Global Admin can update subscription plans.' });
  }

  if (rawTable === 'STORE_CHAINS' && auth.chainId && !auth.isSuperAdmin && id !== auth.chainId) {
    return res.status(403).json({ error: 'Cross-organization access denied.' });
  }

  try {
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = keys.map((k) => payload[k]);
    values.push(id);

    let sql = `UPDATE "${rawTable}" SET ${setClause} WHERE id = $${values.length} RETURNING *`;
    if (TENANT_SCOPED_TABLES.has(rawTable) && auth.chainId && !auth.isSuperAdmin) {
      values.push(auth.chainId);
      sql = `UPDATE "${rawTable}" SET ${setClause} WHERE id = $${values.length - 1} AND chain_id = $${values.length} RETURNING *`;
    }

    const result = await pool.query(sql, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Record with id ${id} not found or access denied.` });
    }

    res.json({ success: true, table: rawTable, data: result.rows[0] });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ success: false, table: rawTable, error: error.message });
  }
});

// 6. Delete Record from UPPERCASE table (enforces tenant ownership)
app.delete('/api/table/:tableName/:id', async (req: Request, res: Response) => {
  const rawTable = String(req.params.tableName || '').toUpperCase();
  const id = req.params.id;

  if (!ALLOWED_TABLES.has(rawTable)) {
    return res.status(400).json({ error: `Table '${rawTable}' is not allowed.` });
  }

  const auth = getAuthContext(req);
  if ((rawTable === 'SUBSCRIPTION_PLANS' || rawTable === 'STORE_CHAINS') && auth.chainId && !auth.isSuperAdmin) {
    return res.status(403).json({ error: 'Only Global Admin can delete platform records.' });
  }

  try {
    const params: unknown[] = [id];
    let sql = `DELETE FROM "${rawTable}" WHERE id = $1 RETURNING id`;
    if (TENANT_SCOPED_TABLES.has(rawTable) && auth.chainId && !auth.isSuperAdmin) {
      params.push(auth.chainId);
      sql = `DELETE FROM "${rawTable}" WHERE id = $1 AND chain_id = $2 RETURNING id`;
    }

    const result = await pool.query(sql, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Record with id ${id} not found or access denied.` });
    }

    res.json({ success: true, table: rawTable, deleted_id: id });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ success: false, table: rawTable, error: error.message });
  }
});

// 7. Full Sync Route (Push or Pull between Browser & PostgreSQL "rozana")
app.get('/api/db/export-all', async (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  try {
    const exportData: Record<string, unknown[]> = {};
    for (const tableName of ALLOWED_TABLES) {
      try {
        if (TENANT_SCOPED_TABLES.has(tableName) && auth.chainId && !auth.isSuperAdmin) {
          const queryRes = await pool.query(`SELECT * FROM "${tableName}" WHERE chain_id = $1`, [auth.chainId]);
          exportData[tableName] = queryRes.rows;
        } else {
          const queryRes = await pool.query(`SELECT * FROM "${tableName}"`);
          exportData[tableName] = queryRes.rows;
        }
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
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Serve index.html transformed by Vite for all non-API SPA routes
    app.use('*', async (req: Request, res: Response, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: unknown) {
        const err = e as Error;
        vite.ssrFixStacktrace(err);
        next(err);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[rozana Server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[PostgreSQL Target] Host: ${currentConfig.host}:${currentConfig.port} | Database: "${currentConfig.database}"`);
    try {
      const client = await connectWithIpv4Fallback();
      const res = await client.query('SELECT current_database() AS db_name');
      await ensureMultiTenantSchema(client);
      client.release();
      console.log(`[PostgreSQL Connected] Active database "${res.rows[0]?.db_name}" on ${currentConfig.host}:${currentConfig.port}`);
    } catch (err: unknown) {
      console.warn(`[PostgreSQL Standby] Could not connect on startup (${(err as Error).message}). Configure credentials in DB Manager or .env.`);
    }
  });
}

startServer().catch((err) => {
  console.error('[rozana Server Fatal Error]', err);
  process.exit(1);
});
