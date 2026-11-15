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
        available_modules JSONB DEFAULT '["dashboard","pos","inventory","purchases","sales","customers","suppliers","payments","organization","users"]'::jsonb,
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
      ALTER TABLE "BRANCHES" ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255);
      ALTER TABLE "BRANCHES" ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active';
      ALTER TABLE "BRANCHES" ADD COLUMN IF NOT EXISTS opening_date DATE DEFAULT CURRENT_DATE;
      ALTER TABLE "USERS" ADD COLUMN IF NOT EXISTS custom_role_id VARCHAR(64);
      ALTER TABLE "USERS" ADD COLUMN IF NOT EXISTS assigned_branches JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE "USERS" ADD COLUMN IF NOT EXISTS account_status VARCHAR(32) DEFAULT 'active';
      ALTER TABLE "ITEM_DEFINITIONS" ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255);
      ALTER TABLE "ITEM_DEFINITIONS" ADD COLUMN IF NOT EXISTS item_name_urdu VARCHAR(255);
      ALTER TABLE "CUSTOMERS" ADD COLUMN IF NOT EXISTS custom_scan_behavior VARCHAR(64);
      ALTER TABLE "PURCHASES" ADD COLUMN IF NOT EXISTS branch_id VARCHAR(64);
      ALTER TABLE "PURCHASES" ADD COLUMN IF NOT EXISTS sub_category_id INT;
      ALTER TABLE "PURCHASES" ADD COLUMN IF NOT EXISTS total_pieces INT DEFAULT 1;
      ALTER TABLE "PURCHASES" ADD COLUMN IF NOT EXISTS total_cft NUMERIC(14, 4) DEFAULT 0;
      ALTER TABLE "PURCHASES" ADD COLUMN IF NOT EXISTS rate_per_cft NUMERIC(14, 2) DEFAULT 0;
      ALTER TABLE "SALES" ADD COLUMN IF NOT EXISTS total_cft NUMERIC(14, 4) DEFAULT 0;
      ALTER TABLE "SALE_ITEMS" ADD COLUMN IF NOT EXISTS wood_stock_id INT;
      ALTER TABLE "SALE_ITEMS" ADD COLUMN IF NOT EXISTS serial VARCHAR(128);
      ALTER TABLE "SALE_ITEMS" ADD COLUMN IF NOT EXISTS width NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE "SALE_ITEMS" ADD COLUMN IF NOT EXISTS length NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE "SALE_ITEMS" ADD COLUMN IF NOT EXISTS cft NUMERIC(14, 4) DEFAULT 0;
      ALTER TABLE "SALE_ITEMS" ADD COLUMN IF NOT EXISTS qty INT DEFAULT 1;
      ALTER TABLE "SALE_ITEMS" ADD COLUMN IF NOT EXISTS rate NUMERIC(14, 2) DEFAULT 0;
      ALTER TABLE "SALE_ITEMS" ADD COLUMN IF NOT EXISTS line_total NUMERIC(14, 2) DEFAULT 0;
      ALTER TABLE "PAYMENTS" ADD COLUMN IF NOT EXISTS branch_id VARCHAR(64);
      ALTER TABLE "EXPENSES" ADD COLUMN IF NOT EXISTS branch_id VARCHAR(64);
      ALTER TABLE "CUSTOMERS" ADD COLUMN IF NOT EXISTS branch_id VARCHAR(64);
      ALTER TABLE "ACTIVITY_LOGS" ADD COLUMN IF NOT EXISTS branch_id VARCHAR(64);
      ALTER TABLE "ACTIVITY_LOGS" ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64);
      ALTER TABLE "ACTIVITY_LOGS" ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255);
      ALTER TABLE "ACTIVITY_LOGS" ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);

      -- Multi-tenant client_ref support for collision-free SERIAL primary keys across tenants
      ALTER TABLE "USERS" ADD COLUMN IF NOT EXISTS client_ref VARCHAR(128);
      ALTER TABLE "ITEM_GROUPS" ADD COLUMN IF NOT EXISTS client_ref VARCHAR(128);
      ALTER TABLE "CATEGORIES" ADD COLUMN IF NOT EXISTS client_ref VARCHAR(128);
      ALTER TABLE "BRANDS" ADD COLUMN IF NOT EXISTS client_ref VARCHAR(128);
      ALTER TABLE "ITEM_DEFINITIONS" ADD COLUMN IF NOT EXISTS client_ref VARCHAR(128);
      ALTER TABLE "CUSTOMERS" ADD COLUMN IF NOT EXISTS client_ref VARCHAR(128);
      ALTER TABLE "SUPPLIERS" ADD COLUMN IF NOT EXISTS client_ref VARCHAR(128);
      ALTER TABLE "PURCHASES" ADD COLUMN IF NOT EXISTS client_ref VARCHAR(128);
      ALTER TABLE "SALES" ADD COLUMN IF NOT EXISTS client_ref VARCHAR(128);
      ALTER TABLE "SALE_ITEMS" ADD COLUMN IF NOT EXISTS client_ref VARCHAR(128);
      ALTER TABLE "PAYMENTS" ADD COLUMN IF NOT EXISTS client_ref VARCHAR(128);
      ALTER TABLE "EXPENSES" ADD COLUMN IF NOT EXISTS client_ref VARCHAR(128);
      ALTER TABLE "ACTIVITY_LOGS" ADD COLUMN IF NOT EXISTS client_ref VARCHAR(128);

      CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_client_ref" ON "USERS"(client_ref) WHERE client_ref IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_item_groups_client_ref" ON "ITEM_GROUPS"(client_ref) WHERE client_ref IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_categories_client_ref" ON "CATEGORIES"(client_ref) WHERE client_ref IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_brands_client_ref" ON "BRANDS"(client_ref) WHERE client_ref IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_item_defs_client_ref" ON "ITEM_DEFINITIONS"(client_ref) WHERE client_ref IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_customers_client_ref" ON "CUSTOMERS"(client_ref) WHERE client_ref IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_suppliers_client_ref" ON "SUPPLIERS"(client_ref) WHERE client_ref IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_purchases_client_ref" ON "PURCHASES"(client_ref) WHERE client_ref IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_sales_client_ref" ON "SALES"(client_ref) WHERE client_ref IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_sale_items_client_ref" ON "SALE_ITEMS"(client_ref) WHERE client_ref IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_payments_client_ref" ON "PAYMENTS"(client_ref) WHERE client_ref IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_expenses_client_ref" ON "EXPENSES"(client_ref) WHERE client_ref IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_activity_logs_client_ref" ON "ACTIVITY_LOGS"(client_ref) WHERE client_ref IS NOT NULL;

      -- Scope uniqueness per organization rather than globally across all tenants
      ALTER TABLE "ITEM_GROUPS" DROP CONSTRAINT IF EXISTS "ITEM_GROUPS_group_id_key";
      ALTER TABLE "BRANDS" DROP CONSTRAINT IF EXISTS "BRANDS_code_key";
      ALTER TABLE "PURCHASES" DROP CONSTRAINT IF EXISTS "PURCHASES_purchase_no_key";
      ALTER TABLE "SALES" DROP CONSTRAINT IF EXISTS "SALES_invoice_no_key";
      ALTER TABLE "USERS" DROP CONSTRAINT IF EXISTS "USERS_username_key";
      ALTER TABLE "ITEM_DEFINITIONS" DROP CONSTRAINT IF EXISTS "uq_chain_barcode";

      CREATE UNIQUE INDEX IF NOT EXISTS "uq_item_groups_chain_gid" ON "ITEM_GROUPS"(COALESCE(chain_id, 'chain-default'), LOWER(group_id));
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_brands_chain_code" ON "BRANDS"(COALESCE(chain_id, 'chain-default'), LOWER(code));
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_purchases_chain_no" ON "PURCHASES"(COALESCE(chain_id, 'chain-default'), purchase_no);
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_sales_chain_inv" ON "SALES"(COALESCE(chain_id, 'chain-default'), invoice_no);
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_chain_username" ON "USERS"(COALESCE(chain_id, '__global__'), LOWER(username));
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_item_defs_chain_barcode_nonempty" ON "ITEM_DEFINITIONS"(COALESCE(chain_id, 'chain-default'), barcode) WHERE barcode IS NOT NULL AND barcode <> '';

      -- Ensure uncustomized Free Plan includes suppliers, purchases, and payments
      UPDATE "SUBSCRIPTION_PLANS"
      SET available_modules = '["dashboard","pos","inventory","purchases","sales","customers","suppliers","payments","organization","users"]'::jsonb
      WHERE id = 'plan-free'
        AND NOT (available_modules ? 'suppliers')
        AND updated_at IS NULL;

      -- Ensure existing admin/manager/purchasing/inventory/accountant users do not remain locked out of Suppliers by column defaults
      UPDATE "USERS"
      SET permissions = jsonb_set(COALESCE(permissions, '{}'::jsonb), '{suppliers_manage}', 'true'::jsonb, true)
      WHERE role IN ('admin', 'manager', 'inventory_manager', 'purchase_manager', 'warehouse_staff', 'accountant')
        AND (
          (permissions->>'suppliers_manage') IS NULL
          OR (role = 'admin' AND (permissions->>'suppliers_manage') = 'false')
          OR ((permissions->>'purchases_manage') = 'true' AND (permissions->>'suppliers_manage') = 'false' AND updated_at IS NULL)
        );
    `);
    tableColumnsCache.clear();
  } catch (err) {
    console.warn('[rozana Schema Migration Notice]', (err as Error).message);
  }
}

const STRING_PK_TABLES = new Set([
  'SUBSCRIPTION_PLANS',
  'STORE_CHAINS',
  'BRANCHES',
  'ROLES',
  'SUBSCRIPTION_HISTORY',
]);

const JSONB_COLUMNS = new Set([
  'available_modules',
  'permissions',
  'matrix',
  'assigned_branches',
]);

const tableColumnsCache = new Map<string, Map<string, string>>();

async function getTableColumns(
  client: pkg.PoolClient | pkg.Pool,
  tableName: string
): Promise<Map<string, string>> {
  const cached = tableColumnsCache.get(tableName);
  if (cached) return cached;
  const res = await client.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  const map = new Map<string, string>();
  for (const row of res.rows) {
    map.set(row.column_name, row.data_type);
  }
  if (map.size > 0) {
    tableColumnsCache.set(tableName, map);
  }
  return map;
}

async function resolveSerialFkId(
  client: pkg.PoolClient | pkg.Pool,
  parentTable: string,
  chainId: string,
  rawVal: unknown
): Promise<number | null> {
  if (rawVal === null || rawVal === undefined || rawVal === '') return null;
  const strVal = String(rawVal).trim();
  if (!strVal) return null;

  const clientRef = `${chainId || 'chain-default'}::${strVal}`;
  try {
    const refRes = await client.query(
      `SELECT id FROM "${parentTable}" WHERE client_ref = $1 LIMIT 1`,
      [clientRef]
    );
    if ((refRes.rowCount ?? 0) > 0) {
      return Number(refRes.rows[0].id);
    }
    const parsed = Number(strVal);
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 2147483647) {
      const idRes = await client.query(
        `SELECT id FROM "${parentTable}" WHERE id = $1 LIMIT 1`,
        [parsed]
      );
      if ((idRes.rowCount ?? 0) > 0) {
        return Number(idRes.rows[0].id);
      }
    }
  } catch {
    // ignore lookup error and fall back to null so parent FK does not reject insert
  }
  return null;
}

async function syncRecordToDb(
  client: pkg.PoolClient | pkg.Pool,
  rawTableInput: string,
  chainIdInput: string,
  rawRecord: Record<string, unknown>
): Promise<unknown> {
  const table = String(rawTableInput || '').toUpperCase();
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Table '${table}' is not allowed.`);
  }
  const columnsMap = await getTableColumns(client, table);
  if (columnsMap.size === 0) {
    throw new Error(`Table '${table}' does not exist in PostgreSQL.`);
  }

  const effectiveChainId = String(
    chainIdInput || rawRecord.chain_id || rawRecord.organization_id || 'chain-default'
  ).trim();

  const normalized: Record<string, unknown> = { ...rawRecord };

  // Map TS aliases -> PostgreSQL schema column names
  if (TENANT_SCOPED_TABLES.has(table) && !normalized.chain_id) {
    if (table === 'USERS' && normalized.is_super_admin === true) {
      normalized.chain_id = null;
    } else {
      normalized.chain_id = effectiveChainId;
    }
  }
  if (table === 'USERS') {
    if (normalized.password && !normalized.password_hash) {
      normalized.password_hash = normalized.password;
    }
    if (!normalized.password_hash) {
      normalized.password_hash = normalized.pos_pin ? String(normalized.pos_pin) : '1234';
    }
    if (!normalized.email) {
      normalized.email = `${String(normalized.username || 'user').toLowerCase()}@rozana.pos`;
    }
  }
  if (table === 'SALE_ITEMS') {
    if (normalized.quantity === undefined && normalized.qty !== undefined) {
      normalized.quantity = normalized.qty;
    }
    if (normalized.unit_price === undefined && normalized.rate !== undefined) {
      normalized.unit_price = normalized.rate;
    }
    if (normalized.subtotal === undefined && normalized.line_total !== undefined) {
      normalized.subtotal = normalized.line_total;
    }
    if (!normalized.sku) {
      normalized.sku = String(normalized.serial || 'RETAIL');
    }
    if (!normalized.description) {
      normalized.description = String(normalized.sku || 'Item');
    }
    if (normalized.serial_no === undefined && normalized.serial !== undefined) {
      normalized.serial_no = normalized.serial;
    }
    if (normalized.item_def_id === undefined && normalized.wood_stock_id !== undefined) {
      normalized.item_def_id = normalized.wood_stock_id;
    }
  }
  if (table === 'PURCHASES') {
    if (normalized.unit_cost === undefined && normalized.rate_per_cft !== undefined) {
      normalized.unit_cost = normalized.rate_per_cft;
    }
    if (normalized.quantity === undefined && normalized.total_pieces !== undefined) {
      normalized.quantity = normalized.total_pieces;
    }
    if (!normalized.purchase_date) {
      normalized.purchase_date = new Date().toISOString().split('T')[0];
    }
  }

  // Resolve foreign keys referencing SERIAL-PK tables
  const fkLookup: Record<string, string> = {
    item_group_id: 'ITEM_GROUPS',
    category_id: 'CATEGORIES',
    brand_id: 'BRANDS',
    item_id: 'ITEM_DEFINITIONS',
    item_def_id: 'ITEM_DEFINITIONS',
    customer_id: 'CUSTOMERS',
    supplier_id: 'SUPPLIERS',
    sale_id: 'SALES',
    purchase_id: 'PURCHASES',
    created_by: 'USERS',
    user_id: 'USERS',
  };

  for (const [fkCol, parentTbl] of Object.entries(fkLookup)) {
    if (fkCol in normalized && columnsMap.has(fkCol)) {
      normalized[fkCol] = await resolveSerialFkId(client, parentTbl, effectiveChainId, normalized[fkCol]);
    }
  }

  // Filter & coerce payload strictly to known PostgreSQL columns
  const cleanPayload: Record<string, unknown> = {};
  for (const [col, dataType] of columnsMap.entries()) {
    if (col === 'id' && !STRING_PK_TABLES.has(table)) continue;
    if (!(col in normalized)) continue;
    let val = normalized[col];
    if (val === undefined) continue;

    if (JSONB_COLUMNS.has(col) || dataType === 'jsonb' || dataType === 'json') {
      val = JSON.stringify(val ?? (col === 'permissions' || col === 'matrix' ? {} : []));
    } else if (dataType === 'integer' || dataType === 'bigint' || dataType === 'smallint') {
      if (val === '' || val === null) {
        val = null;
      } else {
        const parsed = Math.trunc(Number(val));
        val = Number.isFinite(parsed) && parsed <= 2147483647 && parsed >= -2147483648 ? parsed : null;
      }
    } else if (dataType === 'numeric' || dataType === 'double precision' || dataType === 'real') {
      if (val === '' || val === null) {
        val = 0;
      } else {
        const parsed = Number(val);
        val = Number.isFinite(parsed) ? parsed : 0;
      }
    } else if (dataType === 'boolean') {
      val = Boolean(val);
    } else if (dataType === 'date' || dataType.includes('timestamp')) {
      if (val === '' || val === null) {
        val = null;
      }
    }
    cleanPayload[col] = val;
  }

  // Case 1: String-PK tables upsert directly on `id`
  if (STRING_PK_TABLES.has(table)) {
    const pkId = normalized.id;
    if (!pkId) throw new Error(`Missing id for ${table}`);
    cleanPayload.id = String(pkId);
    const keys = Object.keys(cleanPayload);
    const colsSql = keys.map((k) => `"${k}"`).join(', ');
    const vals = keys.map((k) => cleanPayload[k]);
    const phSql = keys.map((_, i) => `$${i + 1}`).join(', ');
    const updateKeys = keys.filter((k) => k !== 'id');
    const setSql =
      updateKeys.length > 0
        ? updateKeys.map((k) => `"${k}" = EXCLUDED."${k}"`).join(', ')
        : `"id" = EXCLUDED."id"`;
    const sql = `INSERT INTO "${table}" (${colsSql}) VALUES (${phSql}) ON CONFLICT (id) DO UPDATE SET ${setSql} RETURNING *`;
    const res = await client.query(sql, vals);
    return res.rows[0];
  }

  // Case 2: SERIAL-PK tables use (chain_id, client_ref) + natural keys to prevent cross-tenant ID collisions
  const localId = rawRecord.id;
  const clientRef =
    localId !== undefined && localId !== null && localId !== ''
      ? `${effectiveChainId}::${localId}`
      : null;
  if (clientRef && columnsMap.has('client_ref')) {
    cleanPayload.client_ref = clientRef;
  }

  let existingPgId: number | null = null;
  if (clientRef) {
    const byRef = await client.query(`SELECT id FROM "${table}" WHERE client_ref = $1 LIMIT 1`, [clientRef]);
    if ((byRef.rowCount ?? 0) > 0) {
      existingPgId = Number(byRef.rows[0].id);
    }
  }

  if (!existingPgId && table === 'USERS' && cleanPayload.username) {
    const chainCheck = cleanPayload.chain_id ? `chain_id = $2` : `chain_id IS NULL`;
    const params: unknown[] = cleanPayload.chain_id
      ? [String(cleanPayload.username).toLowerCase(), cleanPayload.chain_id]
      : [String(cleanPayload.username).toLowerCase()];
    const byUser = await client.query(
      `SELECT id FROM "USERS" WHERE LOWER(username) = $1 AND ${chainCheck} LIMIT 1`,
      params
    );
    if ((byUser.rowCount ?? 0) > 0) {
      existingPgId = Number(byUser.rows[0].id);
    }
  } else if (!existingPgId && table === 'ITEM_GROUPS' && cleanPayload.group_id) {
    const byGrp = await client.query(
      `SELECT id FROM "ITEM_GROUPS" WHERE COALESCE(chain_id, 'chain-default') = $1 AND LOWER(group_id) = LOWER($2) LIMIT 1`,
      [effectiveChainId, String(cleanPayload.group_id)]
    );
    if ((byGrp.rowCount ?? 0) > 0) existingPgId = Number(byGrp.rows[0].id);
  } else if (!existingPgId && table === 'BRANDS' && cleanPayload.code) {
    const byBrd = await client.query(
      `SELECT id FROM "BRANDS" WHERE COALESCE(chain_id, 'chain-default') = $1 AND LOWER(code) = LOWER($2) LIMIT 1`,
      [effectiveChainId, String(cleanPayload.code)]
    );
    if ((byBrd.rowCount ?? 0) > 0) existingPgId = Number(byBrd.rows[0].id);
  } else if (!existingPgId && table === 'ITEM_DEFINITIONS' && cleanPayload.item_code) {
    const byItm = await client.query(
      `SELECT id FROM "ITEM_DEFINITIONS" WHERE COALESCE(chain_id, 'chain-default') = $1 AND LOWER(item_code) = LOWER($2) LIMIT 1`,
      [effectiveChainId, String(cleanPayload.item_code)]
    );
    if ((byItm.rowCount ?? 0) > 0) existingPgId = Number(byItm.rows[0].id);
  } else if (!existingPgId && table === 'PURCHASES' && cleanPayload.purchase_no) {
    const byPur = await client.query(
      `SELECT id FROM "PURCHASES" WHERE COALESCE(chain_id, 'chain-default') = $1 AND purchase_no = $2 LIMIT 1`,
      [effectiveChainId, String(cleanPayload.purchase_no)]
    );
    if ((byPur.rowCount ?? 0) > 0) existingPgId = Number(byPur.rows[0].id);
  } else if (!existingPgId && table === 'SALES' && cleanPayload.invoice_no) {
    const bySale = await client.query(
      `SELECT id FROM "SALES" WHERE COALESCE(chain_id, 'chain-default') = $1 AND invoice_no = $2 LIMIT 1`,
      [effectiveChainId, String(cleanPayload.invoice_no)]
    );
    if ((bySale.rowCount ?? 0) > 0) existingPgId = Number(bySale.rows[0].id);
  } else if (
    !existingPgId &&
    effectiveChainId === 'chain-default' &&
    localId !== undefined &&
    localId !== null &&
    Number.isInteger(Number(localId)) &&
    Number(localId) > 0
  ) {
    const byDefaultId = await client.query(
      TENANT_SCOPED_TABLES.has(table)
        ? `SELECT id FROM "${table}" WHERE id = $1 AND (chain_id = 'chain-default' OR chain_id IS NULL) AND client_ref IS NULL LIMIT 1`
        : `SELECT id FROM "${table}" WHERE id = $1 AND client_ref IS NULL LIMIT 1`,
      [Number(localId)]
    );
    if ((byDefaultId.rowCount ?? 0) > 0) {
      existingPgId = Number(byDefaultId.rows[0].id);
    }
  }

  const keys = Object.keys(cleanPayload);
  if (keys.length === 0) return null;

  if (existingPgId) {
    const setSql = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const vals = keys.map((k) => cleanPayload[k]);
    vals.push(existingPgId);
    const res = await client.query(
      `UPDATE "${table}" SET ${setSql} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return res.rows[0];
  }

  // Ensure PostgreSQL SERIAL sequence is caught up past existing max(id) before INSERT
  try {
    await client.query(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`
    );
  } catch {
    // ignore if table has no sequence
  }

  const colsSql = keys.map((k) => `"${k}"`).join(', ');
  const vals = keys.map((k) => cleanPayload[k]);
  const phSql = keys.map((_, i) => `$${i + 1}`).join(', ');
  const res = await client.query(`INSERT INTO "${table}" (${colsSql}) VALUES (${phSql}) RETURNING *`, vals);
  return res.rows[0];
}

async function deleteRecordFromDb(
  client: pkg.PoolClient | pkg.Pool,
  rawTableInput: string,
  chainIdInput: string,
  idInput: string | number
): Promise<boolean> {
  const table = String(rawTableInput || '').toUpperCase();
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Table '${table}' is not allowed.`);
  }
  const strId = String(idInput ?? '').trim();
  if (!strId) return false;

  if (STRING_PK_TABLES.has(table)) {
    const res = await client.query(`DELETE FROM "${table}" WHERE id = $1 RETURNING id`, [strId]);
    return (res.rowCount ?? 0) > 0;
  }

  const chainId = String(chainIdInput || 'chain-default').trim();
  const clientRef = `${chainId}::${strId}`;
  const res = await client.query(
    TENANT_SCOPED_TABLES.has(table)
      ? `DELETE FROM "${table}" WHERE client_ref = $1 OR (COALESCE(chain_id, 'chain-default') = $2 AND id::text = $3) RETURNING id`
      : `DELETE FROM "${table}" WHERE client_ref = $1 OR id::text = $2 RETURNING id`,
    TENANT_SCOPED_TABLES.has(table) ? [clientRef, chainId, strId] : [clientRef, strId]
  );
  return (res.rowCount ?? 0) > 0;
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

    try {
      const client = await pool.connect();
      await ensureMultiTenantSchema(client);
      client.release();
    } catch {
      // non-fatal
    }

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

// 8. Real-Time Write-Through Sync Endpoint (Upsert single record from POS/ERP actions)
app.post('/api/db/sync-record', async (req: Request, res: Response) => {
  const { table, chainId, record } = req.body || {};
  if (!table || !record || typeof record !== 'object') {
    return res.status(400).json({ success: false, error: 'Missing table or record payload.' });
  }
  const auth = getAuthContext(req);
  const effectiveChain = String(chainId || auth.chainId || 'chain-default');
  try {
    const saved = await syncRecordToDb(pool, String(table), effectiveChain, record as Record<string, unknown>);
    res.json({ success: true, table: String(table).toUpperCase(), data: saved });
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(`[PostgreSQL Sync Warning] ${table}:`, error.message);
    res.status(500).json({ success: false, table: String(table).toUpperCase(), error: error.message });
  }
});

// 9. Real-Time Delete Sync Endpoint
app.post('/api/db/delete-record', async (req: Request, res: Response) => {
  const { table, chainId, id } = req.body || {};
  if (!table || id === undefined || id === null || id === '') {
    return res.status(400).json({ success: false, error: 'Missing table or id.' });
  }
  const auth = getAuthContext(req);
  const effectiveChain = String(chainId || auth.chainId || 'chain-default');
  try {
    const deleted = await deleteRecordFromDb(pool, String(table), effectiveChain, id);
    res.json({ success: true, table: String(table).toUpperCase(), deleted });
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(`[PostgreSQL Delete Sync Warning] ${table}:`, error.message);
    res.status(500).json({ success: false, table: String(table).toUpperCase(), error: error.message });
  }
});

// 10. Ordered Batch Sync Endpoint (Pushes local organizations & records cleanly into PostgreSQL)
app.post('/api/db/sync-batch', async (req: Request, res: Response) => {
  const { items } = req.body || {};
  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, error: 'Expected items array.' });
  }

  let syncedCount = 0;
  const errors: Array<{ table: string; error: string }> = [];

  try {
    const client = await connectWithIpv4Fallback();
    try {
      await ensureMultiTenantSchema(client);
      for (const item of items) {
        if (!item || !item.table || !item.record) continue;
        try {
          await syncRecordToDb(client, String(item.table), String(item.chainId || 'chain-default'), item.record);
          syncedCount++;
        } catch (err: unknown) {
          errors.push({ table: String(item.table), error: (err as Error).message });
        }
      }
      res.json({
        success: true,
        syncedCount,
        totalRequested: items.length,
        errorCount: errors.length,
        errors: errors.slice(0, 15),
      });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message, syncedCount });
  }
});

const PURGE_TARGET_ORDER = [
  'item_definitions',
  'categories',
  'item_groups',
  'suppliers',
  'customers',
  'branches',
  'users',
  'organizations',
] as const;

type PurgeTarget = (typeof PURGE_TARGET_ORDER)[number];

async function queryPurgeCounts(client: pkg.PoolClient) {
  const safeCount = async (sql: string): Promise<number> => {
    try {
      const r = await client.query(sql);
      return Number(r.rows[0]?.cnt ?? 0);
    } catch {
      return 0;
    }
  };

  const counts: Record<PurgeTarget, number> = {
    organizations: await safeCount('SELECT COUNT(*)::int AS cnt FROM "STORE_CHAINS"'),
    branches: await safeCount('SELECT COUNT(*)::int AS cnt FROM "BRANCHES"'),
    users: await safeCount(
      `SELECT COUNT(*)::int AS cnt FROM "USERS" WHERE NOT (COALESCE(is_super_admin, FALSE) = TRUE OR LOWER(username) = 'mobin')`
    ),
    item_definitions: await safeCount('SELECT COUNT(*)::int AS cnt FROM "ITEM_DEFINITIONS"'),
    item_groups: await safeCount('SELECT COUNT(*)::int AS cnt FROM "ITEM_GROUPS"'),
    categories: await safeCount('SELECT COUNT(*)::int AS cnt FROM "CATEGORIES"'),
    suppliers: await safeCount('SELECT COUNT(*)::int AS cnt FROM "SUPPLIERS"'),
    customers: await safeCount('SELECT COUNT(*)::int AS cnt FROM "CUSTOMERS"'),
  };

  const globalUsersPreserved = await safeCount(
    `SELECT COUNT(*)::int AS cnt FROM "USERS" WHERE COALESCE(is_super_admin, FALSE) = TRUE OR LOWER(username) = 'mobin'`
  );

  return { counts, globalUsersPreserved };
}

// 11. Selective Purge Record Counts
app.get('/api/db/purge-counts', async (_req: Request, res: Response) => {
  try {
    const client = await connectWithIpv4Fallback();
    try {
      const { counts, globalUsersPreserved } = await queryPurgeCounts(client);
      res.json({
        success: true,
        connected: true,
        database: currentConfig.database,
        host: currentConfig.host,
        port: currentConfig.port,
        counts,
        globalUsersPreserved,
      });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    res.json({
      success: false,
      connected: false,
      database: currentConfig.database,
      error: (err as Error).message,
      counts: {
        organizations: 0,
        branches: 0,
        users: 0,
        item_definitions: 0,
        item_groups: 0,
        categories: 0,
        suppliers: 0,
        customers: 0,
      },
      globalUsersPreserved: 1,
    });
  }
});

// 12. Selective Database Record Purge (Preserves Global Super Admin User)
app.post('/api/db/purge-records', async (req: Request, res: Response) => {
  const rawTargets = Array.isArray(req.body?.targets) ? req.body.targets : [];
  const validSet = new Set<PurgeTarget>(
    rawTargets
      .map((t: unknown) => String(t).trim().toLowerCase() as PurgeTarget)
      .filter((t: PurgeTarget) => (PURGE_TARGET_ORDER as readonly string[]).includes(t))
  );

  if (validSet.size === 0) {
    return res.status(400).json({
      success: false,
      connected: false,
      error: 'Please select at least one record category to delete.',
    });
  }

  try {
    const client = await connectWithIpv4Fallback();
    try {
      await client.query('BEGIN');
      const deletedCounts: Partial<Record<PurgeTarget, number>> = {};

      for (const target of PURGE_TARGET_ORDER) {
        if (!validSet.has(target)) continue;
        let result;
        switch (target) {
          case 'item_definitions':
            result = await client.query('DELETE FROM "ITEM_DEFINITIONS"');
            deletedCounts.item_definitions = result.rowCount ?? 0;
            break;
          case 'categories':
            result = await client.query('DELETE FROM "CATEGORIES"');
            deletedCounts.categories = result.rowCount ?? 0;
            break;
          case 'item_groups':
            result = await client.query('DELETE FROM "ITEM_GROUPS"');
            deletedCounts.item_groups = result.rowCount ?? 0;
            break;
          case 'suppliers':
            result = await client.query('DELETE FROM "SUPPLIERS"');
            deletedCounts.suppliers = result.rowCount ?? 0;
            break;
          case 'customers':
            result = await client.query('DELETE FROM "CUSTOMERS"');
            deletedCounts.customers = result.rowCount ?? 0;
            break;
          case 'branches':
            result = await client.query('DELETE FROM "BRANCHES"');
            deletedCounts.branches = result.rowCount ?? 0;
            await client.query(
              `UPDATE "USERS" SET assigned_branch_id = 'all', assigned_branches = '["all"]'::jsonb WHERE NOT (COALESCE(is_super_admin, FALSE) = TRUE OR LOWER(username) = 'mobin')`
            );
            break;
          case 'users':
            result = await client.query(
              `DELETE FROM "USERS" WHERE NOT (COALESCE(is_super_admin, FALSE) = TRUE OR LOWER(username) = 'mobin')`
            );
            deletedCounts.users = result.rowCount ?? 0;
            break;
          case 'organizations':
            result = await client.query('DELETE FROM "STORE_CHAINS"');
            deletedCounts.organizations = result.rowCount ?? 0;
            await client.query('DELETE FROM "SUBSCRIPTION_HISTORY"');
            await client.query('DELETE FROM "ROLES"');
            break;
        }
      }

      await client.query('COMMIT');
      const { counts: remainingCounts, globalUsersPreserved } = await queryPurgeCounts(client);
      res.json({
        success: true,
        connected: true,
        database: currentConfig.database,
        deletedCounts,
        remainingCounts,
        globalUsersPreserved,
      });
    } catch (err: unknown) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback error
      }
      res.status(500).json({
        success: false,
        connected: true,
        error: (err as Error).message,
      });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    res.status(503).json({
      success: false,
      connected: false,
      error: (err as Error).message || 'Could not connect to PostgreSQL.',
    });
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
