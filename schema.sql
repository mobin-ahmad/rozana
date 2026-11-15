-- ========================================================================
-- POSTGRESQL RELATIONAL SCHEMA & DATA DUMP FOR RETAIL Z-POS & ERP
-- Target Engine: PostgreSQL 14 / 15 / 16+
-- CONVENTION: ALL TABLE NAMES ARE UPPERCASE ("STORE_CHAINS", "BRANCHES", etc.)
-- Quoted identifiers preserve exact uppercase table names in PostgreSQL
-- ========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------
-- 0. SUBSCRIPTION PLANS (PLATFORM LEVEL)
-- ------------------------------------------------------------------------
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
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- active, inactive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------
-- 1. STORE CHAINS / ORGANIZATIONS & MULTI-TENANCY
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "STORE_CHAINS" (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    business_type VARCHAR(128) DEFAULT 'Supermarket & General Retail',
    industry VARCHAR(128) DEFAULT 'Retail Departmental Store',
    description TEXT,
    registration_number VARCHAR(128),
    tax_id VARCHAR(128),
    website VARCHAR(255),
    country VARCHAR(128) DEFAULT 'Pakistan',
    city VARCHAR(128) DEFAULT 'Lahore',
    logo_url TEXT,
    admin_email VARCHAR(255),
    admin_name VARCHAR(255),
    admin_username VARCHAR(128),
    admin_phone VARCHAR(64),
    phone VARCHAR(64),
    address TEXT,
    currency VARCHAR(16) DEFAULT 'PKR',
    currency_symbol VARCHAR(16) DEFAULT 'Rs.',
    plan_id VARCHAR(64) REFERENCES "SUBSCRIPTION_PLANS"(id) ON DELETE SET NULL,
    subscription_start_date DATE DEFAULT CURRENT_DATE,
    subscription_expiry_date DATE,
    max_branches INT DEFAULT 5,
    max_users INT DEFAULT 25,
    max_pos_terminals INT DEFAULT 10,
    status VARCHAR(32) DEFAULT 'active', -- active, suspended, expired, pending
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------
-- 2. BRANCHES
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BRANCHES" (
    id VARCHAR(64) PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL,
    branch_type VARCHAR(64) DEFAULT 'retail_outlet',
    contact_person VARCHAR(255),
    manager_user_id INT,
    address TEXT,
    address_line_2 TEXT,
    phone VARCHAR(64),
    cell_phone VARCHAR(64),
    email VARCHAR(255),
    region VARCHAR(128),
    city VARCHAR(128),
    postal_code VARCHAR(32),
    country VARCHAR(128) DEFAULT 'Pakistan',
    status VARCHAR(32) DEFAULT 'active', -- active, inactive
    opening_date DATE DEFAULT CURRENT_DATE,
    is_head_office BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------
-- 3. ROLES, USERS & ACCESS CONTROL (RBAC)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ROLES" (
    id VARCHAR(64) PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    base_role VARCHAR(32) NOT NULL DEFAULT 'cashier',
    description TEXT,
    branch_access VARCHAR(32) DEFAULT 'assigned', -- all, assigned
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    matrix JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "USERS" (
    id SERIAL PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(64),
    role VARCHAR(32) NOT NULL DEFAULT 'cashier', -- admin, manager, cashier, salesperson, inventory_manager, purchase_manager, warehouse_staff, accountant
    custom_role_id VARCHAR(64),
    designation VARCHAR(128),
    employee_code VARCHAR(64),
    assigned_branch_id VARCHAR(64) DEFAULT 'all',
    assigned_branches JSONB DEFAULT '[]'::jsonb,
    pos_pin VARCHAR(32),
    password_hash VARCHAR(255) NOT NULL,
    account_status VARCHAR(32) DEFAULT 'active',
    is_super_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '{
        "pos_billing": true,
        "sales_view": true,
        "sales_discount": false,
        "sales_refund": false,
        "inventory_view": true,
        "inventory_manage": false,
        "purchases_manage": false,
        "customers_manage": true,
        "suppliers_manage": false,
        "expenses_manage": false,
        "reports_view": false,
        "settings_manage": false,
        "users_manage": false,
        "audit_logs_view": false
    }'::jsonb,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------
-- 4. ITEM GROUPS, CATEGORIES & BRANDS
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ITEM_GROUPS" (
    id SERIAL PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
    group_id VARCHAR(64) NOT NULL UNIQUE,
    group_description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES "USERS"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CATEGORIES" (
    id SERIAL PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
    item_group_id INT REFERENCES "ITEM_GROUPS"(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES "USERS"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "BRANDS" (
    id SERIAL PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES "USERS"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------
-- 5. RETAIL PRODUCT ITEM DEFINITIONS & INVENTORY
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ITEM_DEFINITIONS" (
    id SERIAL PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
    item_group_id INT REFERENCES "ITEM_GROUPS"(id) ON DELETE SET NULL,
    category_id INT REFERENCES "CATEGORIES"(id) ON DELETE SET NULL,
    brand_id INT REFERENCES "BRANDS"(id) ON DELETE SET NULL,
    item_code VARCHAR(128) NOT NULL,
    barcode VARCHAR(128) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    national_language_item_name VARCHAR(255),
    unit_of_measure VARCHAR(64) DEFAULT 'PCS',
    publisher_vendor VARCHAR(255),
    image_url TEXT,
    reorder_level INT DEFAULT 10,
    reorder_qty INT DEFAULT 50,
    printed_price NUMERIC(14, 2) DEFAULT 0.00,
    purchase_discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    purchase_rate NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    weighted_average_rate NUMERIC(14, 2) DEFAULT 0.00,
    sale_discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    sale_rate NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    margin_percent NUMERIC(12, 2) DEFAULT 0.00,
    packing INT DEFAULT 1,
    bulk_rate NUMERIC(14, 2) DEFAULT 0.00,
    ctn_rate NUMERIC(14, 2) DEFAULT 0.00,
    ws_rate NUMERIC(14, 2) DEFAULT 0.00,
    bulk_qty INT DEFAULT 0,
    stock_quantity INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES "USERS"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_chain_barcode UNIQUE (chain_id, barcode)
);

CREATE INDEX idx_item_def_barcode ON "ITEM_DEFINITIONS"(barcode);
CREATE INDEX idx_item_def_code ON "ITEM_DEFINITIONS"(item_code);

-- ------------------------------------------------------------------------
-- 6. CUSTOMERS & SUPPLIERS
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CUSTOMERS" (
    id SERIAL PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64),
    address TEXT,
    total_purchase NUMERIC(14, 2) DEFAULT 0.00,
    total_paid NUMERIC(14, 2) DEFAULT 0.00,
    total_due NUMERIC(14, 2) DEFAULT 0.00,
    loyalty_points INT DEFAULT 0,
    qr_code VARCHAR(128),
    custom_redemption_rate NUMERIC(6, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES "USERS"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_phone ON "CUSTOMERS"(phone);
CREATE INDEX idx_customers_qr ON "CUSTOMERS"(qr_code);

CREATE TABLE IF NOT EXISTS "SUPPLIERS" (
    id SERIAL PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES "USERS"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------
-- 7. PURCHASES & STOCK-IN
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PURCHASES" (
    id SERIAL PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
    purchase_no VARCHAR(128) NOT NULL UNIQUE,
    supplier_id INT REFERENCES "SUPPLIERS"(id) ON DELETE SET NULL,
    item_id INT REFERENCES "ITEM_DEFINITIONS"(id) ON DELETE SET NULL,
    quantity INT DEFAULT 1,
    unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(14, 2) DEFAULT 0.00,
    due_amount NUMERIC(14, 2) DEFAULT 0.00,
    purchase_date DATE NOT NULL,
    notes TEXT,
    status VARCHAR(32) DEFAULT 'completed', -- pending, completed, cancelled
    created_by INT REFERENCES "USERS"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------
-- 8. SALES INVOICES & LINE ITEMS
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SALES" (
    id SERIAL PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
    branch_id VARCHAR(64) REFERENCES "BRANCHES"(id) ON DELETE SET NULL,
    invoice_no VARCHAR(128) NOT NULL UNIQUE,
    customer_id INT REFERENCES "CUSTOMERS"(id) ON DELETE SET NULL,
    total_items INT DEFAULT 1,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    tax_amount NUMERIC(14, 2) DEFAULT 0.00,
    discount NUMERIC(14, 2) DEFAULT 0.00,
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    due_amount NUMERIC(14, 2) DEFAULT 0.00,
    payment_method VARCHAR(32) NOT NULL DEFAULT 'cash', -- cash, card, wallet, gift, store_credit, bank
    points_earned INT DEFAULT 0,
    points_redeemed INT DEFAULT 0,
    points_discount_amount NUMERIC(14, 2) DEFAULT 0.00,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) DEFAULT 'completed', -- completed, pending, cancelled
    notes TEXT,
    created_by INT REFERENCES "USERS"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_invoice_no ON "SALES"(invoice_no);
CREATE INDEX idx_sales_date ON "SALES"(sale_date);

CREATE TABLE IF NOT EXISTS "SALE_ITEMS" (
    id SERIAL PRIMARY KEY,
    sale_id INT NOT NULL REFERENCES "SALES"(id) ON DELETE CASCADE,
    item_def_id INT REFERENCES "ITEM_DEFINITIONS"(id) ON DELETE SET NULL,
    serial_no VARCHAR(128),
    sku VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    packing INT DEFAULT 1,
    ctn_qty INT DEFAULT 0,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00
);

CREATE INDEX idx_sale_items_sale_id ON "SALE_ITEMS"(sale_id);

-- ------------------------------------------------------------------------
-- 9. PAYMENTS & FINANCIAL EXPENSES
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PAYMENTS" (
    id SERIAL PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
    sale_id INT REFERENCES "SALES"(id) ON DELETE SET NULL,
    purchase_id INT REFERENCES "PURCHASES"(id) ON DELETE SET NULL,
    payment_type VARCHAR(32) NOT NULL, -- customer_payment, supplier_payment
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(32) NOT NULL DEFAULT 'cash',
    reference_no VARCHAR(128),
    payment_date DATE NOT NULL,
    notes TEXT,
    created_by INT REFERENCES "USERS"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EXPENSES" (
    id SERIAL PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL, -- rent, transport, utility, labor, maintenance, office, other
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    expense_date DATE NOT NULL,
    notes TEXT,
    created_by INT REFERENCES "USERS"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------
-- 10. SYSTEM ACTIVITY & AUDIT LOGS
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ACTIVITY_LOGS" (
    id SERIAL PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE CASCADE,
    user_id INT REFERENCES "USERS"(id) ON DELETE SET NULL,
    username VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    table_name VARCHAR(64) NOT NULL,
    record_id VARCHAR(64),
    details TEXT,
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

-- Non-destructive column migrations for existing databases
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

-- ========================================================================
-- SYSTEM DEFAULTS ONLY (NO DEMO/SEED ORGANIZATIONS, BRANCHES, OR ITEMS)
-- ========================================================================

-- Subscription Plans (System Tiers)
INSERT INTO "SUBSCRIPTION_PLANS" (id, name, description, monthly_price, annual_price, max_branches, max_users, max_pos_terminals, storage_limit_mb, available_modules, status)
VALUES
('plan-free', 'Free', 'Evaluation tier for single-outlet retail shops', 0.00, 0.00, 3, 10, 2, 512, '["dashboard","pos","inventory","purchases","sales","customers","suppliers","payments","organization","users"]', 'active'),
('plan-starter', 'Starter', 'Essential retail POS for growing local businesses', 4900.00, 49000.00, 5, 15, 5, 2048, '["dashboard","pos","inventory","purchases","sales","customers","suppliers","payments","expenses"]', 'active'),
('plan-growth', 'Growth', 'Multi-branch retail chain operations with full analytics', 12500.00, 125000.00, 15, 50, 20, 10240, '["dashboard","pos","inventory","purchases","sales","customers","suppliers","payments","expenses","reports","organization","users","audit_logs"]', 'active'),
('plan-enterprise', 'Enterprise', 'Unlimited-scale corporate chains, custom roles & full ERP', 29000.00, 290000.00, 100, 500, 100, 102400, '["dashboard","pos","inventory","purchases","sales","customers","suppliers","payments","expenses","reports","organization","users","settings","audit_logs"]', 'active')
ON CONFLICT (id) DO NOTHING;

-- Global Super Administrator (Preserved System Account)
INSERT INTO "USERS" (id, chain_id, full_name, username, email, phone, role, designation, employee_code, assigned_branch_id, pos_pin, password_hash, is_super_admin, is_active)
VALUES
(1, NULL, 'Mobin', 'mobin', 'mobin@rozana.pos', '+92 300 7654321', 'admin', 'SaaS Global Super Administrator', 'SA-001', 'all', '123456', '123456', TRUE, TRUE)
ON CONFLICT (username) DO NOTHING;

SELECT setval('"USERS_id_seq"', COALESCE((SELECT MAX(id) FROM "USERS"), 1));

-- ------------------------------------------------------------------------
-- COMPLETED CLEAN POSTGRESQL SCHEMA (ZERO DEMO SEED DATA)
-- Ready for: psql -U <user> -d <database> -f schema.sql
-- ------------------------------------------------------------------------
