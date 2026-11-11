-- ========================================================================
-- POSTGRESQL RELATIONAL SCHEMA & DATA DUMP FOR RETAIL Z-POS & ERP
-- Target Engine: PostgreSQL 14 / 15 / 16+
-- CONVENTION: ALL TABLE NAMES ARE UPPERCASE ("STORE_CHAINS", "BRANCHES", etc.)
-- Quoted identifiers preserve exact uppercase table names in PostgreSQL
-- ========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------
-- 1. STORE CHAINS & MULTI-TENANCY
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "STORE_CHAINS" (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    business_type VARCHAR(128) DEFAULT 'Supermarket & General Retail',
    industry VARCHAR(128) DEFAULT 'Retail Departmental Store',
    description TEXT,
    logo_url TEXT,
    admin_email VARCHAR(255),
    admin_name VARCHAR(255),
    phone VARCHAR(64),
    address TEXT,
    currency VARCHAR(16) DEFAULT 'PKR',
    currency_symbol VARCHAR(16) DEFAULT 'Rs.',
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
    address TEXT,
    address_line_2 TEXT,
    phone VARCHAR(64),
    cell_phone VARCHAR(64),
    email VARCHAR(255),
    region VARCHAR(128),
    city VARCHAR(128),
    postal_code VARCHAR(32),
    country VARCHAR(128) DEFAULT 'Pakistan',
    is_head_office BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------
-- 3. USERS & ACCESS CONTROL (RBAC)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "USERS" (
    id SERIAL PRIMARY KEY,
    chain_id VARCHAR(64) REFERENCES "STORE_CHAINS"(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(64),
    role VARCHAR(32) NOT NULL DEFAULT 'cashier', -- admin, manager, cashier, warehouse_staff, accountant
    designation VARCHAR(128),
    employee_code VARCHAR(64),
    assigned_branch_id VARCHAR(64) DEFAULT 'all',
    pos_pin VARCHAR(32),
    password_hash VARCHAR(255) NOT NULL,
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
    margin_percent NUMERIC(6, 2) DEFAULT 0.00,
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

-- ========================================================================
-- SEED DATA DUMP (ALL TABLES UPPERCASE)
-- ========================================================================

-- Store Chains
INSERT INTO "STORE_CHAINS" (id, name, code, business_type, industry, description, admin_email, admin_name, phone, address, currency, currency_symbol)
VALUES 
('chain-default', 'Askari Departmental Store Chain', 'ASKARI', 'Supermarket & General Retail', 'Retail & Departmental Store', 'Premier departmental store and retail supermarket chain.', 'admin@askari.com', 'Askari System Admin', '+92 300 1234567', 'Main Boulevard, Gulberg III, Lahore', 'PKR', 'Rs.'),
('chain-jks', 'JKS Cash & Carry', 'JKS-CC', 'Wholesale & Retail Supermarket', 'Cash & Carry Supermarket', 'Discount FMCG, grocery and household bulk cash & carry network.', 'admin@jks.com', 'JKS Administrator', '+92 321 9876543', 'Plot 12-A, Commercial Market, Phase 5 DHA, Lahore', 'PKR', 'Rs.')
ON CONFLICT (id) DO NOTHING;

-- Branches
INSERT INTO "BRANCHES" (id, chain_id, name, code, address, phone, is_head_office)
VALUES
('br-1', 'chain-default', 'Gulberg III Shop', 'ASK-LHR-01', 'Main Boulevard, Gulberg III, Lahore', '+92 42 35710000', TRUE),
('br-2', 'chain-default', 'Times Square Branch', 'ASK-NYC-01', '1500 Broadway, Times Square, New York', '+1 212-555-0199', FALSE),
('jks-br-1', 'chain-jks', 'DHA Phase 5 Cash & Carry', 'JKS-DHA-01', 'Plot 12-A, Commercial Market, DHA Phase 5, Lahore', '+92 321 9876543', TRUE),
('jks-br-2', 'chain-jks', 'Nespak Society Branch', 'JKS-NSP-01', 'Main Boulevard, Nespak Housing Society, Lahore', '+92 322 1122334', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Users (PIN / Passwords: '123456' for Mobin, '1234' for admins and cashiers)
INSERT INTO "USERS" (id, chain_id, full_name, username, email, phone, role, designation, employee_code, assigned_branch_id, pos_pin, password_hash, is_super_admin, is_active)
VALUES
(1, NULL, 'Mobin', 'mobin', 'mobin@askari.com', '+92 300 7654321', 'admin', 'SaaS Global Super Administrator', 'SA-001', 'all', '123456', '123456', TRUE, TRUE),
(2, 'chain-default', 'Askari System Admin', 'admin', 'admin@askari.com', '+92 300 1000001', 'admin', 'General Manager / Owner', 'EMP-001', 'all', '1234', '1234', FALSE, TRUE),
(3, 'chain-jks', 'JKS Admin', 'jks', 'admin@jks.com', '+92 321 9876543', 'admin', 'General Manager JKS', 'JKS-001', 'jks-br-1', '1234', '1234', FALSE, TRUE),
(4, 'chain-default', 'Cashier One', 'cashier1', 'cashier1@askari.com', '+92 300 1000003', 'cashier', 'Frontline Cashier', 'CSH-001', 'br-1', '1234', '1234', FALSE, TRUE)
ON CONFLICT (username) DO NOTHING;

SELECT setval('"USERS_id_seq"', (SELECT MAX(id) FROM "USERS"));

-- Item Groups
INSERT INTO "ITEM_GROUPS" (id, chain_id, group_id, group_description, is_active, created_by)
VALUES
(1, 'chain-default', 'GRP-001', 'Beverages, Cold Drinks & Juices', TRUE, 1),
(2, 'chain-default', 'GRP-002', 'Packaged Snacks, Biscuits & Confectionery', TRUE, 1),
(3, 'chain-default', 'GRP-003', 'Dairy, Milk & Breakfast Essentials', TRUE, 1),
(4, 'chain-default', 'GRP-004', 'Personal Care, Soaps & Toiletries', TRUE, 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('"ITEM_GROUPS_id_seq"', (SELECT MAX(id) FROM "ITEM_GROUPS"));

-- Categories
INSERT INTO "CATEGORIES" (id, chain_id, item_group_id, name, description, is_active, created_by)
VALUES
(1, 'chain-default', 1, 'Carbonated Soft Drinks', 'Soda cans, 1.5L and 2.25L family bottles', TRUE, 1),
(2, 'chain-default', 2, 'Biscuits & Cookies', 'Tea biscuits, cream sandwich and digestive cookies', TRUE, 1),
(3, 'chain-default', 3, 'UHT Milk & Dairy', 'Tetra pack milk, butter, cheese, and cream', TRUE, 1),
(4, 'chain-default', 4, 'Soaps & Handwash', 'Bath soaps, liquid antibacterial handwash', TRUE, 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('"CATEGORIES_id_seq"', (SELECT MAX(id) FROM "CATEGORIES"));

-- Brands
INSERT INTO "BRANDS" (id, chain_id, code, name, description, is_active, created_by)
VALUES
(1, 'chain-default', 'BRD-001', 'Coca-Cola Company', 'Soft drinks, mineral water and juices', TRUE, 1),
(2, 'chain-default', 'BRD-002', 'PepsiCo Intl', 'Beverages and snack chips', TRUE, 1),
(3, 'chain-default', 'BRD-003', 'Nestle Pakistan', 'Dairy, juices, cereals, infant nutrition', TRUE, 1),
(4, 'chain-default', 'BRD-004', 'Unilever', 'Personal care, soaps, tea and condiments', TRUE, 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('"BRANDS_id_seq"', (SELECT MAX(id) FROM "BRANDS"));

-- Item Definitions
INSERT INTO "ITEM_DEFINITIONS" (id, chain_id, item_group_id, category_id, brand_id, item_code, barcode, item_name, unit_of_measure, printed_price, purchase_rate, sale_rate, packing, stock_quantity, is_active, created_by)
VALUES
(1, 'chain-default', 1, 1, 1, 'BEV-COKE-15L', '8901234567891', 'Coca-Cola Regular 1.5 Litre Bottle', 'Bottle', 220.00, 185.00, 210.00, 6, 120, TRUE, 1),
(2, 'chain-default', 1, 1, 2, 'BEV-PEP-15L', '8901234567892', 'Pepsi Cola 1.5 Litre Bottle', 'Bottle', 220.00, 182.00, 210.00, 6, 95, TRUE, 1),
(3, 'chain-default', 2, 2, 4, 'SNK-LU-TUC', '8901234567893', 'LU TUC Crackers Family Pack', 'Pack', 150.00, 120.00, 140.00, 12, 180, TRUE, 1),
(4, 'chain-default', 3, 3, 3, 'DRY-MILK-1L', '8901234567894', 'Nestle MilkPak Full Cream 1000ml', 'Pack', 310.00, 275.00, 300.00, 12, 240, TRUE, 1),
(5, 'chain-default', 4, 4, 4, 'PC-LUX-140G', '8901234567895', 'Lux Rose & Vitamin E Beauty Bar 140g', 'Bar', 160.00, 130.00, 150.00, 24, 150, TRUE, 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('"ITEM_DEFINITIONS_id_seq"', (SELECT MAX(id) FROM "ITEM_DEFINITIONS"));

-- Customers
INSERT INTO "CUSTOMERS" (id, chain_id, name, phone, address, total_purchase, total_paid, total_due, loyalty_points, qr_code, is_active, created_by)
VALUES
(1, 'chain-default', 'Walk-in Customer', '03000000000', 'Direct Store Visit', 45000.00, 45000.00, 0.00, 0, 'CUST-WALKIN', TRUE, 1),
(2, 'chain-default', 'Apex Mart & Catering', '03001000020', 'Plot 45, Commercial Area, Lahore', 125000.00, 110000.00, 15000.00, 250, 'CUST-03001000020', TRUE, 1),
(3, 'chain-default', 'Haji Superstore', '03001000021', 'Market Road, Sector 8', 88000.00, 68000.00, 20000.00, 120, 'CUST-03001000021', TRUE, 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('"CUSTOMERS_id_seq"', (SELECT MAX(id) FROM "CUSTOMERS"));

-- Suppliers
INSERT INTO "SUPPLIERS" (id, chain_id, name, phone, address, is_active, created_by)
VALUES
(1, 'chain-default', 'Metro Distribution Network', '03001000010', 'Depot #4, Multan Road, Lahore', TRUE, 1),
(2, 'chain-default', 'National Beverage Bottlers', '03001000011', 'Industrial Estate Kot Lakhpat', TRUE, 1),
(3, 'chain-default', 'Unilever Pakistan Distribution', '03001000012', 'Plot 18, Commercial Hub', TRUE, 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('"SUPPLIERS_id_seq"', (SELECT MAX(id) FROM "SUPPLIERS"));

-- Expenses
INSERT INTO "EXPENSES" (id, chain_id, title, category, amount, expense_date, notes, created_by)
VALUES
(1, 'chain-default', 'Store Premises Monthly Rent', 'rent', 45000.00, CURRENT_DATE - INTERVAL '15 days', 'Main outlet rent', 1),
(2, 'chain-default', 'Electricity & Utility Bills', 'utility', 18500.00, CURRENT_DATE - INTERVAL '10 days', 'WAPDA electricity bill', 1),
(3, 'chain-default', 'Cashier & Staff Daily Wages', 'labor', 8500.00, CURRENT_DATE - INTERVAL '5 days', 'Support staff overtime & shift allowance', 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('"EXPENSES"', 'id'), COALESCE((SELECT MAX(id) FROM "EXPENSES"), 1));

-- Purchases
INSERT INTO "PURCHASES" (id, chain_id, purchase_no, supplier_id, item_id, quantity, unit_cost, total_amount, paid_amount, due_amount, purchase_date, notes, status, created_by)
VALUES
(1, 'chain-default', 'PUR-20260410-001', 1, 1, 100, 185.00, 18500.00, 18500.00, 0.00, CURRENT_DATE - INTERVAL '20 days', 'Beverages replenishment lot', 'completed', 1),
(2, 'chain-default', 'PUR-20260415-001', 3, 4, 150, 275.00, 41250.00, 30000.00, 11250.00, CURRENT_DATE - INTERVAL '12 days', 'MilkPak cartons delivery', 'completed', 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('"PURCHASES"', 'id'), COALESCE((SELECT MAX(id) FROM "PURCHASES"), 1));

-- Sales
INSERT INTO "SALES" (id, chain_id, branch_id, invoice_no, customer_id, total_items, subtotal, tax_rate, tax_amount, discount, grand_total, paid_amount, due_amount, payment_method, points_earned, points_redeemed, points_discount_amount, sale_date, status, notes, created_by)
VALUES
(1, 'chain-default', 'br-1', 'INV-20260423-001', 1, 2, 630.00, 0.00, 0.00, 0.00, 630.00, 630.00, 0.00, 'cash', 6, 0, 0.00, CURRENT_TIMESTAMP - INTERVAL '2 days', 'completed', 'Front register counter sale', 4),
(2, 'chain-default', 'br-1', 'INV-20260425-001', 2, 4, 1260.00, 0.00, 0.00, 60.00, 1200.00, 1000.00, 200.00, 'card', 12, 0, 0.00, CURRENT_TIMESTAMP - INTERVAL '1 day', 'completed', 'Commercial order delivery', 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('"SALES"', 'id'), COALESCE((SELECT MAX(id) FROM "SALES"), 1));

-- Sale Items
INSERT INTO "SALE_ITEMS" (id, sale_id, item_def_id, serial_no, sku, description, packing, ctn_qty, quantity, unit_price, subtotal)
VALUES
(1, 1, 1, 'SER-001', '8901234567891', 'Coca-Cola Regular 1.5 Litre Bottle', 6, 0, 3, 210.00, 630.00),
(2, 2, 4, 'SER-002', '8901234567894', 'Nestle MilkPak Full Cream 1000ml', 12, 0, 4, 300.00, 1200.00)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('"SALE_ITEMS"', 'id'), COALESCE((SELECT MAX(id) FROM "SALE_ITEMS"), 1));

-- Payments
INSERT INTO "PAYMENTS" (id, chain_id, sale_id, purchase_id, payment_type, amount, payment_method, reference_no, payment_date, notes, created_by)
VALUES
(1, 'chain-default', 1, NULL, 'customer_payment', 630.00, 'cash', 'CSH-001', CURRENT_DATE - INTERVAL '2 days', 'Walk-in invoice payment', 4),
(2, 'chain-default', 2, NULL, 'customer_payment', 1000.00, 'card', 'TXN-98421', CURRENT_DATE - INTERVAL '1 day', 'Card transaction advance', 4),
(3, 'chain-default', NULL, 1, 'supplier_payment', 18500.00, 'bank', 'TRF-1022', CURRENT_DATE - INTERVAL '18 days', 'Direct bank settlement for beverages', 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('"PAYMENTS"', 'id'), COALESCE((SELECT MAX(id) FROM "PAYMENTS"), 1));

-- Activity Audit Logs
INSERT INTO "ACTIVITY_LOGS" (id, chain_id, user_id, username, action, table_name, record_id, details, ip_address, created_at)
VALUES
(1, 'chain-default', 1, 'mobin', 'LOGIN', 'USERS', '1', 'Super Admin logged in', '127.0.0.1', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(2, 'chain-default', 4, 'cashier1', 'CREATE', 'SALES', '1', 'Created Sale INV-20260423-001 (Rs. 630.00)', '192.168.1.101', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(3, 'chain-default', 2, 'admin', 'CREATE', 'ITEM_DEFINITIONS', '1', 'Configured stock item Coca-Cola Regular 1.5L', '192.168.1.100', CURRENT_TIMESTAMP - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('"ACTIVITY_LOGS"', 'id'), COALESCE((SELECT MAX(id) FROM "ACTIVITY_LOGS"), 1));

-- ------------------------------------------------------------------------
-- COMPLETED POSTGRESQL DUMP WITH UPPERCASE TABLES
-- Ready for: psql -U <user> -d <database> -f schema.sql
-- ------------------------------------------------------------------------
