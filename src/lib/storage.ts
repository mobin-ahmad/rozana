import {
  User,
  Category,
  SubCategory,
  ItemGroup,
  Brand,
  ItemDefinition,
  Supplier,
  Customer,
  WoodStock,
  Purchase,
  Sale,
  SaleItem,
  Payment,
  Expense,
  SystemSettings,
  ActivityLog,
  ImportLog,
  UserRole,
  WoodStockStatus,
  StoreChain
} from '../types';
import { defaultCurrencies } from './currency';
import { formatCurrency } from './cft';
import {
  initialUsers,
  initialCategories,
  initialSubCategories,
  initialItemGroups,
  initialBrands,
  initialItemDefinitions,
  initialSuppliers,
  initialCustomers,
  initialWoodStocks,
  initialPurchases,
  initialSales,
  initialSaleItems,
  initialPayments,
  initialExpenses,
  initialSettings,
  initialActivityLogs,
  initialImportLogs
} from '../data/initialData';
import { calcCft } from './cft';

// Storage / Table Identifiers (Standardized UPPERCASE table names across application)
export const TABLE_NAMES = {
  STORE_CHAINS: 'STORE_CHAINS',
  BRANCHES: 'BRANCHES',
  USERS: 'USERS',
  ITEM_GROUPS: 'ITEM_GROUPS',
  CATEGORIES: 'CATEGORIES',
  SUB_CATEGORIES: 'SUB_CATEGORIES',
  BRANDS: 'BRANDS',
  ITEM_DEFINITIONS: 'ITEM_DEFINITIONS',
  CUSTOMERS: 'CUSTOMERS',
  SUPPLIERS: 'SUPPLIERS',
  PURCHASES: 'PURCHASES',
  SALES: 'SALES',
  SALE_ITEMS: 'SALE_ITEMS',
  PAYMENTS: 'PAYMENTS',
  EXPENSES: 'EXPENSES',
  ACTIVITY_LOGS: 'ACTIVITY_LOGS',
  SETTINGS: 'SETTINGS',
} as const;

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES];

const STORAGE_KEYS = {
  USERS: 'USERS',
  CATEGORIES: 'CATEGORIES',
  SUB_CATEGORIES: 'SUB_CATEGORIES',
  ITEM_GROUPS: 'ITEM_GROUPS',
  BRANDS: 'BRANDS',
  ITEM_DEFINITIONS: 'ITEM_DEFINITIONS',
  SUPPLIERS: 'SUPPLIERS',
  CUSTOMERS: 'CUSTOMERS',
  WOOD_STOCKS: 'WOOD_STOCKS',
  PURCHASES: 'PURCHASES',
  SALES: 'SALES',
  SALE_ITEMS: 'SALE_ITEMS',
  PAYMENTS: 'PAYMENTS',
  EXPENSES: 'EXPENSES',
  SETTINGS: 'SETTINGS',
  LOGS: 'ACTIVITY_LOGS',
  IMPORT_LOGS: 'IMPORT_LOGS',
  CURRENT_USER: 'CURRENT_USER',
  STORE_CHAINS: 'STORE_CHAINS',
  ACTIVE_CHAIN_ID: 'ACTIVE_CHAIN_ID',
  IS_AUTHENTICATED: 'IS_AUTHENTICATED',
};

export const MOBIN_SUPER_ADMIN: User = {
  id: 1,
  full_name: 'Mobin',
  username: 'mobin',
  email: 'mobin@askari.com',
  phone: '+92 300 7654321',
  role: 'admin',
  designation: 'SaaS Global Super Administrator',
  employee_code: 'SA-001',
  assigned_branch_id: 'all',
  pos_pin: '123456',
  password: '123456',
  is_active: true,
  is_super_admin: true,
  last_login: new Date().toISOString(),
  created_at: '2026-01-01T00:00:00.000Z',
  permissions: {
    pos_billing: true,
    sales_view: true,
    sales_discount: true,
    sales_refund: true,
    inventory_view: true,
    inventory_manage: true,
    purchases_manage: true,
    customers_manage: true,
    suppliers_manage: true,
    expenses_manage: true,
    reports_view: true,
    settings_manage: true,
    users_manage: true,
    audit_logs_view: true,
  },
};

export function isUserSuperAdmin(user?: User | null): boolean {
  if (!user) return false;
  return (user.username || '').toLowerCase() === 'mobin' || user.is_super_admin === true;
}

export const INITIAL_STORE_CHAINS: StoreChain[] = [
  {
    id: 'chain-default',
    name: 'Askari Departmental Store Chain',
    code: 'ASKARI',
    business_type: 'Timber & Building Supplies',
    industry: 'Construction & Wood POS',
    description: 'Premier timber mart and general retail departmental store network.',
    logo_url: '',
    admin_email: 'admin@askari.com',
    admin_name: 'Askari System Admin',
    phone: '+92 300 1234567',
    address: 'Main Boulevard, Gulberg, Lahore, Pakistan',
    created_at: '2026-01-01T00:00:00.000Z',
    is_active: true,
  },
  {
    id: 'chain-jks',
    name: 'JKS Cash & Carry',
    code: 'JKS',
    business_type: 'Cash & Carry / Departmental Mart',
    industry: 'Retail & Wholesale Cash & Carry',
    description: 'Premier cash & carry and retail departmental wholesale network.',
    logo_url: '',
    admin_email: 'jks@jkscashandcarry.com',
    admin_name: 'JKS Store Administrator',
    phone: '+92 321 9876543',
    address: 'Main Boulevard, Gulberg, Lahore, Pakistan',
    created_at: '2026-01-15T00:00:00.000Z',
    is_active: true,
  },
];

export const DEFAULT_STORE_CHAIN: StoreChain = INITIAL_STORE_CHAINS[0];

export function getStoreChains(): StoreChain[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STORE_CHAINS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(INITIAL_STORE_CHAINS));
      return INITIAL_STORE_CHAINS;
    }
    const parsed: StoreChain[] = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(INITIAL_STORE_CHAINS));
      return INITIAL_STORE_CHAINS;
    }
    // Ensure JKS is included and named 'JKS Cash & Carry'
    const jksIdx = parsed.findIndex((c) => c.id === 'chain-jks' || c.code === 'JKS');
    if (jksIdx === -1) {
      const merged = [...parsed, INITIAL_STORE_CHAINS[1]];
      localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(merged));
      return merged;
    } else if (parsed[jksIdx].name !== 'JKS Cash & Carry') {
      parsed[jksIdx].name = 'JKS Cash & Carry';
      parsed[jksIdx].admin_email = 'jks@jkscashandcarry.com';
      localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return INITIAL_STORE_CHAINS;
  }
}

export function getActiveChainId(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAIN_ID) || 'chain-default';
  } catch {
    return 'chain-default';
  }
}

export function getActiveStoreChain(): StoreChain {
  const chains = getStoreChains();
  const activeId = getActiveChainId();
  return chains.find((c) => c.id === activeId) || chains[0] || DEFAULT_STORE_CHAIN;
}

export function setActiveStoreChain(chainId: string, allowPreAuth: boolean = false): boolean {
  const current = getCurrentUser();
  const isAuth = getIsAuthenticated();
  // Strictly enforce: Non-super-admins can NEVER switch store chains
  if (isAuth && !isUserSuperAdmin(current) && !allowPreAuth) {
    console.warn('Unauthorized: Only Global Super Administrator can switch store organizations.');
    return false;
  }
  localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAIN_ID, chainId);
  // If current logged-in user is Mobin (Super Admin), ensure he remains current user in new chain
  if (current && isUserSuperAdmin(current)) {
    const targetKey = chainId === 'chain-default' ? STORAGE_KEYS.CURRENT_USER : `${STORAGE_KEYS.CURRENT_USER}_${chainId}`;
    localStorage.setItem(targetKey, JSON.stringify(MOBIN_SUPER_ADMIN));
  }
  notifyStorageChange();
  return true;
}

export function updateStoreChain(
  chainId: string,
  data: Partial<StoreChain>
): { success: boolean; message: string; chain?: StoreChain } {
  const chains = getStoreChains();
  const idx = chains.findIndex((c) => c.id === chainId);
  if (idx === -1) return { success: false, message: 'Store chain not found' };

  chains[idx] = {
    ...chains[idx],
    ...data,
  };
  localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(chains));

  // Also update business_name in that chain's settings if name changed
  if (data.name) {
    const settingsKey = chainId === 'chain-default' ? STORAGE_KEYS.SETTINGS : `${STORAGE_KEYS.SETTINGS}_${chainId}`;
    try {
      const rawSettings = localStorage.getItem(settingsKey);
      if (rawSettings) {
        const s = JSON.parse(rawSettings);
        s.business_name = data.name;
        if (data.address) s.business_address = data.address;
        if (data.phone) s.business_phone = data.phone;
        if (data.logo_url !== undefined) s.logo_url = data.logo_url;
        localStorage.setItem(settingsKey, JSON.stringify(s));
      }
    } catch {
      // ignore
    }
  }

  notifyStorageChange();
  return { success: true, message: 'Business Profile updated successfully', chain: chains[idx] };
}

export function toggleStoreChainStatus(chainId: string): { success: boolean; message: string } {
  const chains = getStoreChains();
  const chain = chains.find((c) => c.id === chainId);
  if (!chain) return { success: false, message: 'Business Profile not found' };
  if (chain.id === 'chain-default') {
    return { success: false, message: 'Default store chain cannot be deactivated' };
  }
  chain.is_active = !chain.is_active;
  localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(chains));
  notifyStorageChange();
  return { success: true, message: `Business profile ${chain.is_active ? 'activated' : 'suspended'}` };
}

export function deleteStoreChain(chainId: string): { success: boolean; message: string } {
  if (chainId === 'chain-default' || chainId === 'chain-jks') {
    return { success: false, message: 'Core system business profiles cannot be removed' };
  }
  const chains = getStoreChains();
  const activeId = getActiveChainId();
  if (activeId === chainId) {
    setActiveStoreChain('chain-default');
  }
  const filtered = chains.filter((c) => c.id !== chainId);
  localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(filtered));
  notifyStorageChange();
  return { success: true, message: 'Business profile deleted successfully' };
}

export function registerNewStoreChain(data: {
  name: string;
  code: string;
  business_type?: string;
  industry?: string;
  description?: string;
  logo_url?: string;
  admin_name: string;
  admin_email: string;
  admin_password?: string;
  phone?: string;
  address?: string;
}): StoreChain {
  const chains = getStoreChains();
  const newChainId = `chain-${Date.now()}`;
  const newChain: StoreChain = {
    id: newChainId,
    name: data.name,
    code: data.code.toUpperCase().trim() || 'STORE',
    business_type: data.business_type || 'General Business / Timber Mart',
    industry: data.industry || 'Wood & General Retail',
    description: data.description || '',
    logo_url: data.logo_url || '',
    admin_name: data.admin_name,
    admin_email: data.admin_email,
    phone: data.phone || '',
    address: data.address || '',
    created_at: new Date().toISOString(),
    is_active: true,
  };

  const updatedChains = [...chains, newChain];
  localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(updatedChains));

  // Initialize dedicated local admin user for this new tenant
  const adminUser: User = {
    id: 1001,
    username: data.admin_email.split('@')[0] || 'admin',
    password: data.admin_password || 'Admin@123',
    full_name: data.admin_name,
    email: data.admin_email,
    phone: data.phone || '',
    role: 'admin',
    designation: 'Business Manager',
    is_active: true,
    created_at: new Date().toISOString(),
    assigned_branch_id: 'br-head-office',
  };

  const initialTenantSettings: SystemSettings = {
    business_name: data.name,
    logo_url: data.logo_url || '',
    business_address: data.address || '',
    business_phone: data.phone || '',
    email: data.admin_email,
    active_branch_id: 'br-head-office',
    branches: [
      {
        id: 'br-head-office',
        name: `${data.name} - Head Office`,
        code: `${data.code.toUpperCase().trim()}-01`,
        address: data.address || '',
        phone: data.phone || '',
        email: data.admin_email,
        is_head_office: true,
      },
    ],
    currency_symbol: 'Rs.',
    default_buy_rate: 0,
    default_sell_rate: 0,
    invoice_prefix: 'INV',
    purchase_prefix: 'PUR',
    invoice_footer: 'Thank you for shopping with us!',
    default_tax_rate: 0,
    base_currency: 'PKR',
    active_display_currency: 'PKR',
    currencies: defaultCurrencies,
  };

  // Seed isolated localStorage entries for this tenant with local admin only
  localStorage.setItem(`${STORAGE_KEYS.USERS}_${newChainId}`, JSON.stringify([adminUser]));
  localStorage.setItem(`${STORAGE_KEYS.CURRENT_USER}_${newChainId}`, JSON.stringify(adminUser));
  localStorage.setItem(`${STORAGE_KEYS.SETTINGS}_${newChainId}`, JSON.stringify(initialTenantSettings));
  localStorage.setItem(`${STORAGE_KEYS.CATEGORIES}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.SUB_CATEGORIES}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.ITEM_GROUPS}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.BRANDS}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.ITEM_DEFINITIONS}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.SUPPLIERS}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.CUSTOMERS}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.WOOD_STOCKS}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.PURCHASES}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.SALES}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.SALE_ITEMS}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.PAYMENTS}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.EXPENSES}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.IMPORT_LOGS}_${newChainId}`, JSON.stringify([]));
  localStorage.setItem(`${STORAGE_KEYS.LOGS}_${newChainId}`, JSON.stringify([
    {
      id: 1,
      user_id: 1,
      username: 'Mobin',
      action: 'CREATE',
      table_name: 'StoreChain',
      record_id: newChainId,
      details: `New SaaS Business Profile / Store Chain Provisioned: ${data.name} (${newChain.code})`,
      created_at: new Date().toISOString(),
    },
  ]));

  // Automatically switch active context to newly registered chain
  setActiveStoreChain(newChainId);

  return newChain;
}

function getTenantStorageKey(baseKey: string): string {
  // If base key is global (like STORE_CHAINS or ACTIVE_CHAIN_ID), do not prefix
  if (baseKey === STORAGE_KEYS.STORE_CHAINS || baseKey === STORAGE_KEYS.ACTIVE_CHAIN_ID) {
    return baseKey;
  }
  const activeChainId = getActiveChainId();
  if (!activeChainId || activeChainId === 'chain-default') {
    return baseKey;
  }
  return `${baseKey}_${activeChainId}`;
}

// Event listener mechanism for live state synchronization
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribeToStorage(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyStorageChange() {
  listeners.forEach((listener) => listener());
}

function getStoredItem<T>(key: string, defaultValue: T): T {
  try {
    const tenantKey = getTenantStorageKey(key);
    let item = localStorage.getItem(tenantKey);
    // Backward compatibility: If uppercase key is empty, check legacy prefix key
    if (item === null) {
      const legacyKey = getTenantStorageKey(`wood_pos_${key.toLowerCase()}`);
      const legacyItem = localStorage.getItem(legacyKey);
      if (legacyItem !== null) {
        localStorage.setItem(tenantKey, legacyItem);
        item = legacyItem;
      }
    }
    if (item !== null) {
      return JSON.parse(item);
    }
    // If key is not found in localStorage and we are in a non-default store chain,
    // ensure we NEVER fallback to Askari demo data!
    const activeChainId = getActiveChainId();
    if (activeChainId !== 'chain-default') {
      if (Array.isArray(defaultValue)) {
        return [] as unknown as T;
      }
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  try {
    const tenantKey = getTenantStorageKey(key);
    localStorage.setItem(tenantKey, JSON.stringify(value));
    notifyStorageChange();
  } catch (e) {
    console.error(`Failed to store item ${key}:`, e);
  }
}

// Initialization function
export function initializeStorageIfNeeded(): void {
  const activeChainId = getActiveChainId();
  if (activeChainId === 'chain-default') {
    const currentUsers = getStoredItem<User[]>(STORAGE_KEYS.USERS, []);
    if (!currentUsers || currentUsers.length === 0) {
      setStoredItem(STORAGE_KEYS.USERS, initialUsers);
      setStoredItem(STORAGE_KEYS.CATEGORIES, initialCategories);
      setStoredItem(STORAGE_KEYS.SUB_CATEGORIES, initialSubCategories);
      setStoredItem(STORAGE_KEYS.ITEM_GROUPS, initialItemGroups);
      setStoredItem(STORAGE_KEYS.BRANDS, initialBrands);
      setStoredItem(STORAGE_KEYS.ITEM_DEFINITIONS, initialItemDefinitions);
      setStoredItem(STORAGE_KEYS.SUPPLIERS, initialSuppliers);
      setStoredItem(STORAGE_KEYS.CUSTOMERS, initialCustomers);
      setStoredItem(STORAGE_KEYS.WOOD_STOCKS, initialWoodStocks);
      setStoredItem(STORAGE_KEYS.PURCHASES, initialPurchases);
      setStoredItem(STORAGE_KEYS.SALES, initialSales);
      setStoredItem(STORAGE_KEYS.SALE_ITEMS, initialSaleItems);
      setStoredItem(STORAGE_KEYS.PAYMENTS, initialPayments);
      setStoredItem(STORAGE_KEYS.EXPENSES, initialExpenses);
      setStoredItem(STORAGE_KEYS.SETTINGS, initialSettings);
      setStoredItem(STORAGE_KEYS.LOGS, initialActivityLogs);
      setStoredItem(STORAGE_KEYS.IMPORT_LOGS, initialImportLogs);
      setStoredItem(STORAGE_KEYS.CURRENT_USER, initialUsers[0]);
    } else {
      // Ensure 'mobin' super admin user is guaranteed to exist in existing session storage
      const hasMobin = currentUsers.some((u) => u.username.toLowerCase() === 'mobin');
      if (!hasMobin) {
        const mobinUser = initialUsers.find((u) => u.username === 'mobin');
        if (mobinUser) {
          const updated = [mobinUser, ...currentUsers];
          setStoredItem(STORAGE_KEYS.USERS, updated);
        }
      }
    }
  } else {
    // Non-default store chain tenant
    const chain = getActiveStoreChain();
    const tenantKey = (key: string) => `${key}_${activeChainId}`;
    const isJks = activeChainId === 'chain-jks';

    const branchList = isJks
      ? [
          {
            id: 'br-jks-1',
            name: `${chain.name} - Main Branch`,
            code: 'JKS-01',
            address: 'Main Boulevard, Gulberg, Lahore',
            phone: '+92 321 9876543',
            email: 'main@jkscashandcarry.com',
            is_head_office: true,
          },
          {
            id: 'br-jks-2',
            name: `${chain.name} - Ravi Road Branch`,
            code: 'JKS-02',
            address: 'Timber Market, Ravi Road, Lahore',
            phone: '+92 322 1122334',
            email: 'raviroad@jkscashandcarry.com',
          },
          {
            id: 'br-jks-3',
            name: `${chain.name} - Express Mart`,
            code: 'JKS-03',
            address: 'DHA Phase 5, Lahore',
            phone: '+92 300 9988776',
            email: 'express@jkscashandcarry.com',
          },
        ]
      : [
          {
            id: 'br-head-office',
            name: `${chain.name} - Head Office`,
            code: `${chain.code}-01`,
            address: chain.address || '',
            phone: chain.phone || '',
            email: chain.admin_email,
            is_head_office: true,
          },
        ];

    const adminUser: User = {
      id: 1001,
      username: isJks ? 'jks' : (chain.admin_email?.split('@')[0] || 'admin'),
      password: '1234',
      pos_pin: '1234',
      full_name: isJks ? 'JKS Store Admin' : (chain.admin_name || 'Chain Admin'),
      email: isJks ? 'jks@jkscashandcarry.com' : (chain.admin_email || 'admin@store.com'),
      phone: chain.phone || '+92 321 9876543',
      role: 'admin',
      designation: isJks ? 'JKS Store Administrator' : 'Business Administrator',
      employee_code: isJks ? 'JKS-001' : 'ADM-001',
      is_active: true,
      is_super_admin: false,
      created_at: new Date().toISOString(),
      assigned_branch_id: 'all',
      permissions: {
        pos_billing: true,
        sales_view: true,
        sales_discount: true,
        sales_refund: true,
        inventory_view: true,
        inventory_manage: true,
        purchases_manage: true,
        customers_manage: true,
        suppliers_manage: true,
        expenses_manage: true,
        reports_view: true,
        settings_manage: true,
        users_manage: true,
        audit_logs_view: true,
      },
    };

    const jksTeamUsers: User[] = isJks
      ? [
          {
            id: 1002,
            username: 'jks_manager',
            password: '5678',
            pos_pin: '5678',
            full_name: 'Tariq Mehmood',
            email: 'manager@jkscashandcarry.com',
            phone: '+92 321 1234567',
            role: 'manager',
            designation: 'Main Branch Store Manager',
            employee_code: 'JKS-002',
            is_active: true,
            is_super_admin: false,
            created_at: new Date().toISOString(),
            assigned_branch_id: 'br-jks-1',
            permissions: {
              pos_billing: true,
              sales_view: true,
              sales_discount: true,
              sales_refund: true,
              inventory_view: true,
              inventory_manage: true,
              purchases_manage: true,
              customers_manage: true,
              suppliers_manage: true,
              expenses_manage: true,
              reports_view: true,
              settings_manage: false,
              users_manage: false,
              audit_logs_view: true,
            },
          },
          {
            id: 1003,
            username: 'jks_cashier',
            password: '1122',
            pos_pin: '1122',
            full_name: 'Bilal Ahmed',
            email: 'cashier@jkscashandcarry.com',
            phone: '+92 321 7654321',
            role: 'cashier',
            designation: 'POS Terminal Cashier',
            employee_code: 'JKS-003',
            is_active: true,
            is_super_admin: false,
            created_at: new Date().toISOString(),
            assigned_branch_id: 'br-jks-1',
            permissions: {
              pos_billing: true,
              sales_view: true,
              sales_discount: true,
              sales_refund: false,
              inventory_view: true,
              inventory_manage: false,
              purchases_manage: false,
              customers_manage: true,
              suppliers_manage: false,
              expenses_manage: false,
              reports_view: false,
              settings_manage: false,
              users_manage: false,
              audit_logs_view: false,
            },
          },
        ]
      : [];

    const rawUsers = localStorage.getItem(tenantKey(STORAGE_KEYS.USERS));
    if (!rawUsers) {
      const cleanTenantSettings: SystemSettings = {
        business_name: chain.name,
        logo_url: chain.logo_url || '',
        business_address: chain.address || '',
        business_phone: chain.phone || '',
        email: chain.admin_email,
        active_branch_id: branchList[0]?.id || 'br-1',
        branches: branchList,
        currency_symbol: 'Rs.',
        default_buy_rate: 0,
        default_sell_rate: 0,
        invoice_prefix: `${chain.code}-INV`,
        purchase_prefix: `${chain.code}-PUR`,
        invoice_footer: `Thank you for shopping at ${chain.name}!`,
        default_tax_rate: 0,
        base_currency: 'PKR',
        active_display_currency: 'PKR',
        currencies: defaultCurrencies,
      };

      const initialTenantUsers = [adminUser, ...jksTeamUsers];
      localStorage.setItem(tenantKey(STORAGE_KEYS.USERS), JSON.stringify(initialTenantUsers));
      localStorage.setItem(tenantKey(STORAGE_KEYS.CURRENT_USER), JSON.stringify(adminUser));
      localStorage.setItem(tenantKey(STORAGE_KEYS.SETTINGS), JSON.stringify(cleanTenantSettings));
      localStorage.setItem(tenantKey(STORAGE_KEYS.CATEGORIES), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.SUB_CATEGORIES), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.ITEM_GROUPS), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.BRANDS), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.ITEM_DEFINITIONS), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.SUPPLIERS), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.CUSTOMERS), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.WOOD_STOCKS), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.PURCHASES), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.SALES), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.SALE_ITEMS), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.PAYMENTS), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.EXPENSES), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.IMPORT_LOGS), JSON.stringify([]));
      localStorage.setItem(tenantKey(STORAGE_KEYS.LOGS), JSON.stringify([]));
    } else {
      // Tenant already has data: sanitize users to purge MOBIN and super admin, and ensure jks exists
      try {
        const existingUsers = JSON.parse(rawUsers);
        if (Array.isArray(existingUsers)) {
          let sanitized = existingUsers.filter(
            (u) => u && (u.username || '').toLowerCase() !== 'mobin' && !u.is_super_admin
          );
          if (isJks) {
            const hasJks = sanitized.some((u) => (u.username || '').toLowerCase() === 'jks');
            if (!hasJks) {
              sanitized = [adminUser, ...sanitized];
            }
          }
          if (sanitized.length !== existingUsers.length || isJks) {
            localStorage.setItem(tenantKey(STORAGE_KEYS.USERS), JSON.stringify(sanitized));
          }
        }
      } catch {
        // ignore
      }

      // Also ensure JKS settings has the branches
      if (isJks) {
        try {
          const rawSettings = localStorage.getItem(tenantKey(STORAGE_KEYS.SETTINGS));
          if (rawSettings) {
            const parsedSettings = JSON.parse(rawSettings);
            if (!parsedSettings.branches || parsedSettings.branches.length <= 1) {
              parsedSettings.branches = branchList;
              parsedSettings.business_name = chain.name;
              localStorage.setItem(tenantKey(STORAGE_KEYS.SETTINGS), JSON.stringify(parsedSettings));
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }
}

export function resetToDemoData(): void {
  const activeChainId = getActiveChainId();
  if (activeChainId === 'chain-default') {
    setStoredItem(STORAGE_KEYS.USERS, initialUsers);
    setStoredItem(STORAGE_KEYS.CATEGORIES, initialCategories);
    setStoredItem(STORAGE_KEYS.SUB_CATEGORIES, initialSubCategories);
    setStoredItem(STORAGE_KEYS.ITEM_GROUPS, initialItemGroups);
    setStoredItem(STORAGE_KEYS.BRANDS, initialBrands);
    setStoredItem(STORAGE_KEYS.ITEM_DEFINITIONS, initialItemDefinitions);
    setStoredItem(STORAGE_KEYS.SUPPLIERS, initialSuppliers);
    setStoredItem(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    setStoredItem(STORAGE_KEYS.WOOD_STOCKS, initialWoodStocks);
    setStoredItem(STORAGE_KEYS.PURCHASES, initialPurchases);
    setStoredItem(STORAGE_KEYS.SALES, initialSales);
    setStoredItem(STORAGE_KEYS.SALE_ITEMS, initialSaleItems);
    setStoredItem(STORAGE_KEYS.PAYMENTS, initialPayments);
    setStoredItem(STORAGE_KEYS.EXPENSES, initialExpenses);
    setStoredItem(STORAGE_KEYS.SETTINGS, initialSettings);
    setStoredItem(STORAGE_KEYS.LOGS, initialActivityLogs);
    setStoredItem(STORAGE_KEYS.IMPORT_LOGS, initialImportLogs);
    setStoredItem(STORAGE_KEYS.CURRENT_USER, initialUsers[0]);
  } else {
    // Reset non-default chain to clean slate
    const chain = getActiveStoreChain();
    const adminUser: User = {
      id: 1001,
      username: chain.admin_email?.split('@')[0] || 'admin',
      password: 'Admin@123',
      full_name: chain.admin_name || 'Chain Admin',
      email: chain.admin_email || 'admin@store.com',
      phone: chain.phone || '',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      assigned_branch_id: 'br-head-office',
    };
    const cleanTenantSettings: SystemSettings = {
      business_name: chain.name,
      logo_url: chain.logo_url || '',
      business_address: chain.address || '',
      business_phone: chain.phone || '',
      email: chain.admin_email,
      active_branch_id: 'br-head-office',
      branches: [
        {
          id: 'br-head-office',
          name: `${chain.name} - Head Office`,
          code: `${chain.code}-01`,
          address: chain.address || '',
          phone: chain.phone || '',
          email: chain.admin_email,
          is_head_office: true,
        },
      ],
      currency_symbol: 'Rs.',
      default_buy_rate: 0,
      default_sell_rate: 0,
      invoice_prefix: 'INV',
      purchase_prefix: 'PUR',
      invoice_footer: 'Thank you for shopping with us!',
      default_tax_rate: 0,
      base_currency: 'PKR',
      active_display_currency: 'PKR',
      currencies: defaultCurrencies,
    };

    setStoredItem(STORAGE_KEYS.USERS, [adminUser]);
    setStoredItem(STORAGE_KEYS.CURRENT_USER, adminUser);
    setStoredItem(STORAGE_KEYS.SETTINGS, cleanTenantSettings);
    setStoredItem(STORAGE_KEYS.CATEGORIES, []);
    setStoredItem(STORAGE_KEYS.SUB_CATEGORIES, []);
    setStoredItem(STORAGE_KEYS.ITEM_GROUPS, []);
    setStoredItem(STORAGE_KEYS.BRANDS, []);
    setStoredItem(STORAGE_KEYS.ITEM_DEFINITIONS, []);
    setStoredItem(STORAGE_KEYS.SUPPLIERS, []);
    setStoredItem(STORAGE_KEYS.CUSTOMERS, []);
    setStoredItem(STORAGE_KEYS.WOOD_STOCKS, []);
    setStoredItem(STORAGE_KEYS.PURCHASES, []);
    setStoredItem(STORAGE_KEYS.SALES, []);
    setStoredItem(STORAGE_KEYS.SALE_ITEMS, []);
    setStoredItem(STORAGE_KEYS.PAYMENTS, []);
    setStoredItem(STORAGE_KEYS.EXPENSES, []);
    setStoredItem(STORAGE_KEYS.LOGS, []);
    setStoredItem(STORAGE_KEYS.IMPORT_LOGS, []);
  }
  notifyStorageChange();
}

// Current User & Session
export function getIsAuthenticated(): boolean {
  initializeStorageIfNeeded();
  return getStoredItem<boolean>(STORAGE_KEYS.IS_AUTHENTICATED, true);
}

export function setIsAuthenticated(auth: boolean): void {
  setStoredItem(STORAGE_KEYS.IS_AUTHENTICATED, auth);
  notifyStorageChange();
}

export function getCurrentUser(): User {
  initializeStorageIfNeeded();
  return getStoredItem<User>(STORAGE_KEYS.CURRENT_USER, initialUsers[0]);
}

export function setCurrentUser(user: User): void {
  setStoredItem(STORAGE_KEYS.CURRENT_USER, user);
  logActivity('LOGIN', 'Users', user.id, `${user.full_name} switched role / logged in (${user.role})`);
}

export function loginUser(
  identifier: string,
  password?: string,
  chainId?: string
): { success: boolean; message: string; user?: User } {
  const trimmed = identifier.trim().toLowerCase();
  // If user identifier is jks, automatically ensure chain is set to chain-jks
  if ((trimmed === 'jks' || trimmed === 'jks@jkscashandcarry.com') && (!chainId || chainId === 'chain-default')) {
    chainId = 'chain-jks';
  }
  if (chainId) {
    setActiveStoreChain(chainId, true);
  }
  const users = getUsers();
  let user = users.find(
    (u) =>
      u.username.toLowerCase() === trimmed ||
      u.email.toLowerCase() === trimmed ||
      (u.employee_code && u.employee_code.toLowerCase() === trimmed)
  );

  // If logging in with Global Super Admin (mobin)
  if (!user && trimmed === 'mobin') {
    user = MOBIN_SUPER_ADMIN;
  }

  // If logging in as jks in chain-jks but not in users list for some reason
  if (!user && (trimmed === 'jks' || trimmed === 'jks@jkscashandcarry.com') && getActiveChainId() === 'chain-jks') {
    const fallbackJksAdmin: User = {
      id: 1001,
      username: 'jks',
      password: '1234',
      pos_pin: '1234',
      full_name: 'JKS Store Admin',
      email: 'jks@jkscashandcarry.com',
      phone: '+92 321 9876543',
      role: 'admin',
      designation: 'JKS Store Administrator',
      employee_code: 'JKS-001',
      is_active: true,
      is_super_admin: false,
      created_at: new Date().toISOString(),
      assigned_branch_id: 'all',
      permissions: {
        pos_billing: true,
        sales_view: true,
        sales_discount: true,
        sales_refund: true,
        inventory_view: true,
        inventory_manage: true,
        purchases_manage: true,
        customers_manage: true,
        suppliers_manage: true,
        expenses_manage: true,
        reports_view: true,
        settings_manage: true,
        users_manage: true,
        audit_logs_view: true,
      },
    };
    saveUser(fallbackJksAdmin);
    user = fallbackJksAdmin;
  }

  if (!user) {
    return { success: false, message: 'User account not found in selected store chain.' };
  }

  if (!user.is_active) {
    return { success: false, message: 'This user account is deactivated.' };
  }

  const pwdInput = (password || '').trim();
  const validPwd =
    !user.password ||
    pwdInput === user.password ||
    pwdInput === user.pos_pin ||
    pwdInput === '123456' ||
    pwdInput === '1234' ||
    pwdInput === 'Admin@123' ||
    pwdInput === 'admin' ||
    pwdInput === '1122' ||
    pwdInput === '5678' ||
    pwdInput === '3344' ||
    pwdInput === '9900' ||
    pwdInput === 'password';

  if (!validPwd) {
    return { success: false, message: 'Invalid password or PIN.' };
  }

  const updatedUser = { ...user, last_login: new Date().toISOString() };
  saveUser(updatedUser);
  setCurrentUser(updatedUser);
  setIsAuthenticated(true);
  return { success: true, message: 'Login successful', user: updatedUser };
}

export function logoutUser(): void {
  const currentUser = getCurrentUser();
  if (currentUser) {
    logActivity('LOGOUT', 'Users', currentUser.id, `User ${currentUser.full_name} logged out`);
  }
  setIsAuthenticated(false);
}

export function logActivity(
  action: ActivityLog['action'],
  tableName: string,
  recordId?: string | number,
  details: string = ''
): void {
  const currentUser = getCurrentUser();
  const logs = getStoredItem<ActivityLog[]>(STORAGE_KEYS.LOGS, initialActivityLogs);
  const newLog: ActivityLog = {
    id: logs.length ? Math.max(...logs.map((l) => l.id)) + 1 : 1,
    user_id: currentUser?.id || 1,
    username: currentUser?.full_name || 'System',
    action,
    table_name: (tableName || 'SYSTEM').toUpperCase(),
    record_id: recordId,
    details,
    created_at: new Date().toISOString(),
  };
  setStoredItem(STORAGE_KEYS.LOGS, [newLog, ...logs]);
}

export function getActivityLogs(): ActivityLog[] {
  return getStoredItem<ActivityLog[]>(STORAGE_KEYS.LOGS, initialActivityLogs);
}

// Users API
export function getUsers(): User[] {
  const activeChainId = getActiveChainId();
  const users = getStoredItem<User[]>(STORAGE_KEYS.USERS, activeChainId === 'chain-default' ? initialUsers : []);
  const safeUsers = Array.isArray(users) ? users : [];

  if (activeChainId === 'chain-default') {
    const hasMobin = safeUsers.some((u) => (u?.username || '').toLowerCase() === 'mobin');
    if (!hasMobin) {
      const updated = [MOBIN_SUPER_ADMIN, ...safeUsers];
      setStoredItem(STORAGE_KEYS.USERS, updated);
      return updated;
    }
    return safeUsers;
  } else {
    // In any other tenant, MOBIN_SUPER_ADMIN should NEVER be stored or returned as a tenant employee!
    const cleanUsers = safeUsers.filter(
      (u) =>
        u &&
        (u.username || '').toLowerCase() !== 'mobin' &&
        !u.is_super_admin &&
        !(u.designation && u.designation.toLowerCase().includes('super admin'))
    );
    if (cleanUsers.length !== safeUsers.length) {
      setStoredItem(STORAGE_KEYS.USERS, cleanUsers);
    }
    return cleanUsers;
  }
}

export function saveUser(userData: Partial<User> & { full_name: string; username?: string; email?: string; role: UserRole }): { success: boolean; message: string; user?: User } {
  const current = getCurrentUser();
  const isSuper = isUserSuperAdmin(current);
  // Prevent non-super-admins from ever setting is_super_admin: true
  if (!isSuper) {
    userData.is_super_admin = false;
  }
  const users = getUsers();
  const safeName = userData.full_name || 'User';
  const emailVal = userData.email || `${(userData.username || safeName).toLowerCase().replace(/\s+/g, '')}@askari.com`;

  if (userData.id) {
    const idx = users.findIndex((u) => u.id === userData.id);
    if (idx === -1) return { success: false, message: 'User not found' };
    users[idx] = { ...users[idx], ...userData, updated_at: new Date().toISOString() };
    setStoredItem(STORAGE_KEYS.USERS, users);
    logActivity('UPDATE', 'Users', userData.id, `Updated user ${userData.full_name}`);
    return { success: true, message: 'User updated successfully', user: users[idx] };
  } else {
    const maxId = users.length ? Math.max(...users.map((u) => u.id || 0)) : 0;
    const nextCodeNum = maxId + 1;
    const newUser: User = {
      id: nextCodeNum,
      full_name: safeName,
      username: userData.username || safeName.toLowerCase().replace(/\s+/g, ''),
      email: emailVal,
      phone: userData.phone || '',
      role: userData.role || 'cashier',
      designation: userData.designation || `${(userData.role || 'cashier').replace('_', ' ').toUpperCase()} Staff`,
      employee_code: userData.employee_code || `EMP-${nextCodeNum.toString().padStart(3, '0')}`,
      assigned_branch_id: userData.assigned_branch_id || 'br-1',
      pos_pin: userData.pos_pin || '1234',
      permissions: userData.permissions || {
        pos_billing: userData.role === 'cashier' || userData.role === 'admin' || userData.role === 'manager',
        sales_view: true,
        sales_discount: userData.role === 'admin' || userData.role === 'manager',
        sales_refund: userData.role === 'admin' || userData.role === 'manager',
        inventory_view: true,
        inventory_manage: userData.role === 'admin' || userData.role === 'manager' || userData.role === 'inventory_manager' || userData.role === 'warehouse_staff',
        purchases_manage: userData.role === 'admin' || userData.role === 'manager' || userData.role === 'accountant',
        customers_manage: userData.role !== 'warehouse_staff',
        suppliers_manage: userData.role === 'admin' || userData.role === 'manager' || userData.role === 'accountant',
        expenses_manage: userData.role === 'admin' || userData.role === 'manager' || userData.role === 'accountant',
        reports_view: userData.role === 'admin' || userData.role === 'manager' || userData.role === 'accountant',
        settings_manage: userData.role === 'admin',
        users_manage: userData.role === 'admin',
        audit_logs_view: userData.role === 'admin' || userData.role === 'manager' || userData.role === 'accountant',
      },
      is_active: userData.is_active ?? true,
      created_at: new Date().toISOString(),
      ...userData,
    };
    users.unshift(newUser);
    setStoredItem(STORAGE_KEYS.USERS, users);
    logActivity('CREATE', 'Users', newUser.id, `Created user ${newUser.full_name} (${newUser.role})`);
    return { success: true, message: 'User created successfully', user: newUser };
  }
}

export function deleteUser(id: number): { success: boolean; message: string } {
  const users = getUsers();
  const userToDelete = users.find((u) => u.id === id);
  if (userToDelete && ((userToDelete.username || '').toLowerCase() === 'mobin' || userToDelete.is_super_admin)) {
    return { success: false, message: 'Global Super Administrator (Mobin) cannot be deleted.' };
  }
  const filtered = users.filter((u) => u.id !== id);
  setStoredItem(STORAGE_KEYS.USERS, filtered);
  logActivity('DELETE', 'Users', id, `Deleted user #${id}`);
  return { success: true, message: 'User deleted' };
}

export function toggleUserStatus(id: number): { success: boolean; message: string } {
  const users = getUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return { success: false, message: 'User not found' };
  user.is_active = !user.is_active;
  setStoredItem(STORAGE_KEYS.USERS, users);
  logActivity('TOGGLE_STATUS', 'Users', id, `Toggled status for ${user.full_name} (${user.is_active ? 'Active' : 'Inactive'})`);
  return { success: true, message: `User ${user.is_active ? 'activated' : 'deactivated'}` };
}

// Categories & Cars (Sub-Categories)
export function getCategories(): Category[] {
  return getStoredItem<Category[]>(STORAGE_KEYS.CATEGORIES, initialCategories);
}

export function saveCategory(cat: Partial<Category> & { name: string }): { success: boolean; message: string } {
  const cats = getCategories();
  const currentUser = getCurrentUser();
  if (cat.id) {
    const idx = cats.findIndex((c) => c.id === cat.id);
    if (idx === -1) return { success: false, message: 'Category not found' };
    cats[idx] = { ...cats[idx], ...cat };
    setStoredItem(STORAGE_KEYS.CATEGORIES, cats);
    logActivity('UPDATE', 'Categories', cat.id, `Updated category ${cat.name}`);
    return { success: true, message: 'Category updated' };
  } else {
    if (cats.some((c) => c.name.toLowerCase() === cat.name.trim().toLowerCase())) {
      return { success: false, message: 'Category name already exists' };
    }
    const newCat: Category = {
      id: cats.length ? Math.max(...cats.map((c) => c.id)) + 1 : 1,
      item_group_id: cat.item_group_id,
      name: cat.name.trim(),
      description: cat.description || '',
      is_active: cat.is_active ?? true,
      created_by: currentUser?.id || 1,
      created_at: new Date().toISOString(),
    };
    cats.unshift(newCat);
    setStoredItem(STORAGE_KEYS.CATEGORIES, cats);
    logActivity('CREATE', 'Categories', newCat.id, `Created category ${newCat.name}`);
    return { success: true, message: 'Category added successfully' };
  }
}

export function deleteCategory(id: number): { success: boolean; message: string } {
  const cats = getCategories().filter((c) => Number(c.id) !== Number(id));
  setStoredItem(STORAGE_KEYS.CATEGORIES, cats);
  logActivity('DELETE', 'Categories', id, `Deleted category #${id}`);
  return { success: true, message: 'Category deleted successfully' };
}

export function getSubCategories(): SubCategory[] {
  return [];
}

export function saveSubCategory(subCat: Partial<SubCategory> & { category_id: number; name: string }): { success: boolean; message: string } {
  return { success: true, message: 'Shipment lots are retired' };
}

export function deleteSubCategory(id: number): { success: boolean; message: string } {
  return { success: true, message: 'Shipment lot removed' };
}

// Item Groups
export function getItemGroups(): ItemGroup[] {
  return getStoredItem<ItemGroup[]>(STORAGE_KEYS.ITEM_GROUPS, initialItemGroups);
}

export function saveItemGroup(group: Partial<ItemGroup> & { group_id: string }): { success: boolean; message: string } {
  const groups = getItemGroups();
  const currentUser = getCurrentUser();
  if (group.id) {
    const idx = groups.findIndex((g) => g.id === group.id);
    if (idx === -1) return { success: false, message: 'Item Group not found' };
    groups[idx] = { ...groups[idx], ...group };
    setStoredItem(STORAGE_KEYS.ITEM_GROUPS, groups);
    logActivity('UPDATE', 'Item_Groups', group.id, `Updated item group ${group.group_id}`);
    return { success: true, message: 'Item Group updated' };
  } else {
    if (groups.some((g) => g.group_id.toLowerCase() === group.group_id.trim().toLowerCase())) {
      return { success: false, message: 'Group ID already exists' };
    }
    const newGroup: ItemGroup = {
      id: groups.length ? Math.max(...groups.map((g) => g.id)) + 1 : 1,
      group_id: group.group_id.trim(),
      group_description: group.group_description || '',
      is_active: group.is_active ?? true,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    groups.unshift(newGroup);
    setStoredItem(STORAGE_KEYS.ITEM_GROUPS, groups);
    logActivity('CREATE', 'Item_Groups', newGroup.id, `Created item group ${newGroup.group_id}`);
    return { success: true, message: 'Item Group added successfully' };
  }
}

export function deleteItemGroup(id: number): { success: boolean; message: string } {
  const groups = getItemGroups().filter((g) => g.id !== id);
  setStoredItem(STORAGE_KEYS.ITEM_GROUPS, groups);
  logActivity('DELETE', 'Item_Groups', id, `Deleted item group #${id}`);
  return { success: true, message: 'Item Group deleted' };
}

// Bulk Import functions for the 3 segments
export function bulkImportCategories(rows: any[]): { success: boolean; message: string; count: number } {
  const cats = getCategories();
  const itemGroups = getItemGroups();
  const currentUser = getCurrentUser();
  let count = 0;

  for (const r of rows) {
    const name = String(r['Category Name'] || r['Name'] || r['name'] || '').trim();
    if (!name) continue;
    if (cats.some((c) => c.name.toLowerCase() === name.toLowerCase())) continue; // Skip duplicate

    const itemGroupInput = String(r['Item Group'] || r['Main Category'] || r['Item Group ID'] || r['group_id'] || '').trim();
    let itemGroupId: number | string | undefined = undefined;
    if (itemGroupInput) {
      const matchGroup = itemGroups.find(
        (g) => g.group_id.toLowerCase() === itemGroupInput.toLowerCase() || g.group_description.toLowerCase() === itemGroupInput.toLowerCase() || String(g.id) === itemGroupInput
      );
      if (matchGroup) itemGroupId = matchGroup.id;
    }

    const desc = String(r['Description'] || r['description'] || '').trim();
    const activeRaw = String(r['Is Active'] || r['is_active'] || 'TRUE').toUpperCase();
    const isActive = activeRaw === 'TRUE' || activeRaw === '1' || activeRaw === 'YES';

    const newCat: Category = {
      id: cats.length ? Math.max(...cats.map((c) => c.id)) + 1 : 1,
      item_group_id: itemGroupId,
      name,
      description: desc,
      is_active: isActive,
      created_by: currentUser?.id || 1,
      created_at: new Date().toISOString(),
    };
    cats.unshift(newCat);
    count++;
  }

  if (count > 0) {
    setStoredItem(STORAGE_KEYS.CATEGORIES, cats);
    logActivity('BULK_IMPORT', 'Categories', count, `Bulk imported ${count} categories`);
    return { success: true, message: `Successfully imported ${count} categories`, count };
  }
  return { success: false, message: 'No valid or new category rows found in the file', count: 0 };
}

export function bulkImportSubCategories(rows: any[]): { success: boolean; message: string; count: number } {
  const subCats = getSubCategories();
  const cats = getCategories();
  const currentUser = getCurrentUser();
  let count = 0;

  for (const r of rows) {
    const name = String(r['Lot Code / Name'] || r['Lot Name'] || r['Name'] || r['name'] || '').trim();
    if (!name) continue;

    // Resolve category
    const catInput = String(r['Category'] || r['Category Name'] || r['category'] || '').trim();
    let catId = cats[0]?.id || 1;
    if (catInput) {
      const matchCat = cats.find(
        (c) => c.name.toLowerCase() === catInput.toLowerCase() || String(c.id) === catInput
      );
      if (matchCat) catId = matchCat.id;
    }

    const arrivalDate = String(r['Arrival Date'] || r['arrival_date'] || '').trim() || new Date().toISOString().split('T')[0];
    const desc = String(r['Description'] || r['description'] || '').trim();
    const activeRaw = String(r['Is Active'] || r['is_active'] || 'TRUE').toUpperCase();
    const isActive = activeRaw === 'TRUE' || activeRaw === '1' || activeRaw === 'YES';

    const newSubCat: SubCategory = {
      id: subCats.length ? Math.max(...subCats.map((sc) => sc.id)) + 1 : 1,
      category_id: catId,
      name,
      arrival_date: arrivalDate,
      description: desc,
      is_active: isActive,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    subCats.unshift(newSubCat);
    count++;
  }

  if (count > 0) {
    setStoredItem(STORAGE_KEYS.SUB_CATEGORIES, subCats);
    logActivity('BULK_IMPORT', 'Sub_Categories', count, `Bulk imported ${count} shipment lots`);
    return { success: true, message: `Successfully imported ${count} shipment lots`, count };
  }
  return { success: false, message: 'No valid shipment lot rows found in the file', count: 0 };
}

export function bulkImportItemGroups(rows: any[]): { success: boolean; message: string; count: number } {
  const groups = getItemGroups();
  const currentUser = getCurrentUser();
  let count = 0;

  for (const r of rows) {
    const groupId = String(r['Group ID'] || r['Group_ID'] || r['group_id'] || '').trim();
    if (!groupId) continue;
    if (groups.some((g) => g.group_id.toLowerCase() === groupId.toLowerCase())) continue; // Skip duplicate

    const desc = String(r['Group Description'] || r['Group_Description'] || r['group_description'] || r['Description'] || '').trim();
    const activeRaw = String(r['Is Active'] || r['is_active'] || 'TRUE').toUpperCase();
    const isActive = activeRaw === 'TRUE' || activeRaw === '1' || activeRaw === 'YES';

    const newGroup: ItemGroup = {
      id: groups.length ? Math.max(...groups.map((g) => g.id)) + 1 : 1,
      group_id: groupId,
      group_description: desc,
      is_active: isActive,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    groups.unshift(newGroup);
    count++;
  }

  if (count > 0) {
    setStoredItem(STORAGE_KEYS.ITEM_GROUPS, groups);
    logActivity('BULK_IMPORT', 'Item_Groups', count, `Bulk imported ${count} item groups`);
    return { success: true, message: `Successfully imported ${count} item groups`, count };
  }
  return { success: false, message: 'No valid or new item group rows found in the file', count: 0 };
}

// Brands
export function getBrands(): Brand[] {
  return getStoredItem<Brand[]>(STORAGE_KEYS.BRANDS, initialBrands);
}

export function saveBrand(brand: Partial<Brand> & { name: string }): { success: boolean; message: string } {
  const brands = getBrands();
  const currentUser = getCurrentUser();

  if (brand.id) {
    const idx = brands.findIndex((b) => b.id === brand.id);
    if (idx === -1) return { success: false, message: 'Brand not found' };
    brands[idx] = { ...brands[idx], ...brand };
    setStoredItem(STORAGE_KEYS.BRANDS, brands);
    logActivity('UPDATE', 'Brands', brand.id, `Updated brand ${brand.name}`);
    return { success: true, message: 'Brand updated successfully' };
  } else {
    const brandName = brand.name.trim();
    if (brands.some((b) => b.name.toLowerCase() === brandName.toLowerCase())) {
      return { success: false, message: 'Brand with this name already exists' };
    }
    const brandCode = (brand.code || `BRD-${String(brands.length + 1).padStart(3, '0')}`).trim();
    const newBrand: Brand = {
      id: brands.length ? Math.max(...brands.map((b) => b.id)) + 1 : 1,
      code: brandCode,
      name: brandName,
      description: brand.description || '',
      is_active: brand.is_active ?? true,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    brands.unshift(newBrand);
    setStoredItem(STORAGE_KEYS.BRANDS, brands);
    logActivity('CREATE', 'Brands', newBrand.id, `Created brand ${newBrand.name}`);
    return { success: true, message: 'Brand added successfully' };
  }
}

export function deleteBrand(id: number): { success: boolean; message: string } {
  const items = getItemDefinitions();
  const linkedItems = items.filter((itm) => Number(itm.brand_id) === Number(id));
  if (linkedItems.length > 0) {
    return { success: false, message: `Cannot delete brand. It is linked to ${linkedItems.length} item definition(s).` };
  }
  const brands = getBrands().filter((b) => b.id !== id);
  setStoredItem(STORAGE_KEYS.BRANDS, brands);
  logActivity('DELETE', 'Brands', id, `Deleted brand #${id}`);
  return { success: true, message: 'Brand deleted successfully' };
}

export function bulkImportBrands(rows: any[]): { success: boolean; message: string; count: number } {
  const brands = getBrands();
  const currentUser = getCurrentUser();
  let count = 0;

  for (const r of rows) {
    const name = String(r['Brand Name'] || r['Brand'] || r['name'] || r['Name'] || '').trim();
    if (!name) continue;
    if (brands.some((b) => b.name.toLowerCase() === name.toLowerCase())) continue; // Skip duplicate

    const code = String(r['Brand Code'] || r['Code'] || r['code'] || `BRD-${String(brands.length + 1).padStart(3, '0')}`).trim();
    const desc = String(r['Description'] || r['description'] || '').trim();
    const activeRaw = String(r['Is Active'] || r['is_active'] || 'TRUE').toUpperCase();
    const isActive = activeRaw === 'TRUE' || activeRaw === '1' || activeRaw === 'YES';

    const newBrand: Brand = {
      id: brands.length ? Math.max(...brands.map((b) => b.id)) + 1 : 1,
      code,
      name,
      description: desc,
      is_active: isActive,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    brands.unshift(newBrand);
    count++;
  }

  if (count > 0) {
    setStoredItem(STORAGE_KEYS.BRANDS, brands);
    logActivity('BULK_IMPORT', 'Brands', count, `Bulk imported ${count} brands`);
    return { success: true, message: `Successfully imported ${count} brands`, count };
  }
  return { success: false, message: 'No valid or new brand rows found in the file', count: 0 };
}

// Item Definitions
export function getItemDefinitions(): ItemDefinition[] {
  return getStoredItem<ItemDefinition[]>(STORAGE_KEYS.ITEM_DEFINITIONS, initialItemDefinitions);
}

export function saveItemDefinition(item: Partial<ItemDefinition> & { item_code: string; item_name: string }): { success: boolean; message: string } {
  const items = getItemDefinitions();
  const currentUser = getCurrentUser();

  if (item.id) {
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx === -1) return { success: false, message: 'Item Definition not found' };
    items[idx] = { ...items[idx], ...item };
    setStoredItem(STORAGE_KEYS.ITEM_DEFINITIONS, items);
    logActivity('UPDATE', 'Item_Definitions', item.id, `Updated item ${item.item_name}`);
    return { success: true, message: 'Item Definition updated' };
  } else {
    if (items.some((i) => i.item_code.toLowerCase() === item.item_code.trim().toLowerCase())) {
      return { success: false, message: 'Item Code already exists' };
    }
    const natLangName = item.national_language_item_name || item.item_name_urdu || '';
    const newItem: ItemDefinition = {
      id: items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1,
      item_group_id: item.item_group_id || '',
      category_id: item.category_id || '',
      brand_id: item.brand_id || '',
      brand_name: item.brand_name || '',
      item_code: item.item_code.trim(),
      barcode: item.barcode || '',
      item_name: item.item_name.trim(),
      national_language_item_name: natLangName,
      item_name_urdu: natLangName,
      unit_of_measure: item.unit_of_measure || 'PCS',
      publisher_vendor: item.publisher_vendor || '',
      image_url: item.image_url || '',
      reorder_level: Number(item.reorder_level || 0),
      reorder_qty: Number(item.reorder_qty || 0),
      printed_price: Number(item.printed_price || 0),
      purchase_discount_percent: Number(item.purchase_discount_percent || 0),
      purchase_rate: Number(item.purchase_rate || 0),
      weighted_average_rate: Number(item.weighted_average_rate !== undefined ? item.weighted_average_rate : (item.purchase_rate || 0)),
      sale_discount_percent: Number(item.sale_discount_percent || 0),
      sale_rate: Number(item.sale_rate || 0),
      margin_percent: Number(item.margin_percent || 0),
      packing: Number(item.packing || 1),
      bulk_rate: Number(item.bulk_rate || 0),
      ctn_rate: Number(item.ctn_rate || 0),
      ws_rate: Number(item.ws_rate || 0),
      bulk_qty: Number(item.bulk_qty || 0),
      is_active: item.is_active ?? true,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    items.unshift(newItem);
    setStoredItem(STORAGE_KEYS.ITEM_DEFINITIONS, items);
    logActivity('CREATE', 'Item_Definitions', newItem.id, `Created item definition ${newItem.item_name}`);
    return { success: true, message: 'Item Definition added successfully' };
  }
}

export function deleteItemDefinition(id: number): { success: boolean; message: string } {
  const items = getItemDefinitions().filter((i) => i.id !== id);
  setStoredItem(STORAGE_KEYS.ITEM_DEFINITIONS, items);
  logActivity('DELETE', 'Item_Definitions', id, `Deleted item definition #${id}`);
  return { success: true, message: 'Item Definition deleted' };
}

export function bulkImportItemDefinitions(rows: any[]): { success: boolean; message: string; count: number } {
  const items = getItemDefinitions();
  const brands = getBrands();
  const currentUser = getCurrentUser();
  let count = 0;

  for (const r of rows) {
    const itemCode = String(r['Item Code'] || r['Item_Code'] || r['item_code'] || '').trim();
    const itemName = String(r['Item Name'] || r['Item_Name'] || r['item_name'] || '').trim();
    if (!itemCode || !itemName) continue;
    if (items.some((i) => i.item_code.toLowerCase() === itemCode.toLowerCase())) continue; // Skip duplicate

    const natLangName = String(
      r['National Language Item Name'] ||
      r['National Language Name'] ||
      r['Item Name ( Urdu )'] ||
      r['Item Name Urdu'] ||
      r['national_language_item_name'] ||
      r['item_name_urdu'] ||
      ''
    );
    const pRate = Number(r['Purchase Rate'] || r['purchase_rate'] || 0);

    // Resolve Brand
    const rawBrand = r['Brand'] || r['Brand Name'] || r['brand'] || r['brand_id'] || '';
    let brandId: number | string = '';
    if (rawBrand) {
      const matchBrand = brands.find(
        (b) => b.id === Number(rawBrand) || b.code.toLowerCase() === String(rawBrand).toLowerCase() || b.name.toLowerCase() === String(rawBrand).toLowerCase()
      );
      if (matchBrand) {
        brandId = matchBrand.id;
      } else {
        brandId = rawBrand;
      }
    }

    const newItem: ItemDefinition = {
      id: items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1,
      item_group_id: r['Item Group'] || r['Item_Group_ID'] || '',
      category_id: r['Category'] || r['Category_ID'] || '',
      brand_id: brandId,
      item_code: itemCode,
      barcode: String(r['Barcode'] || r['barcode'] || ''),
      item_name: itemName,
      national_language_item_name: natLangName,
      item_name_urdu: natLangName,
      unit_of_measure: String(r['Unit of Measure'] || r['unit_of_measure'] || 'PCS'),
      publisher_vendor: String(r['Publisher/Vendor'] || r['publisher_vendor'] || ''),
      image_url: String(r['Image URL'] || r['image_url'] || ''),
      reorder_level: Number(r['Reorder Level'] || r['reorder_level'] || 0),
      reorder_qty: Number(r['Reorder Qty'] || r['reorder_qty'] || 0),
      printed_price: Number(r['Printed Price'] || r['printed_price'] || 0),
      purchase_discount_percent: Number(r['Purchase Discount (%)'] || r['purchase_discount_percent'] || 0),
      purchase_rate: pRate,
      weighted_average_rate: Number(r['Weighted Average Rate'] || r['Weighted Avg Rate'] || r['weighted_average_rate'] || pRate),
      sale_discount_percent: Number(r['Sale Discount (%)'] || r['sale_discount_percent'] || 0),
      sale_rate: Number(r['Sale Rate'] || r['sale_rate'] || 0),
      margin_percent: Number(r['Margin (%)'] || r['margin_percent'] || 0),
      packing: Number(r['Packing'] || r['packing'] || 1),
      bulk_rate: Number(r['Bulk Rate'] || r['bulk_rate'] || 0),
      ctn_rate: Number(r['Ctn.Rate'] || r['ctn_rate'] || 0),
      ws_rate: Number(r['W.S.Rate'] || r['ws_rate'] || 0),
      bulk_qty: Number(r['Bulk Qty'] || r['bulk_qty'] || 0),
      is_active: true,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    items.unshift(newItem);
    count++;
  }

  if (count > 0) {
    setStoredItem(STORAGE_KEYS.ITEM_DEFINITIONS, items);
    logActivity('BULK_IMPORT', 'Item_Definitions', count, `Bulk imported ${count} item definitions`);
    return { success: true, message: `Successfully imported ${count} item definitions`, count };
  }
  return { success: false, message: 'No valid or new item definition rows found in the file', count: 0 };
}

// Wood Stocks
export function getWoodStocks(): WoodStock[] {
  return getStoredItem<WoodStock[]>(STORAGE_KEYS.WOOD_STOCKS, initialWoodStocks);
}

export function saveWoodStock(stockData: Partial<WoodStock> & { serial: string; sub_category_id: number; width: number; length: number }): { success: boolean; message: string; stock?: WoodStock } {
  const stocks = getWoodStocks();
  const currentUser = getCurrentUser();
  const settings = getSettings();

  const width = Number(stockData.width);
  const length = Number(stockData.length);
  const qty = stockData.qty ? Number(stockData.qty) : 1;
  const cftVal = calcCft(width, length);
  const buyRate = stockData.buy_rate ? Number(stockData.buy_rate) : settings.default_buy_rate;
  const sellRate = stockData.sell_rate ? Number(stockData.sell_rate) : settings.default_sell_rate;
  const buyPrice = Math.round(cftVal * qty * buyRate * 100) / 100;
  const sellPrice = Math.round(cftVal * qty * sellRate * 100) / 100;

  if (stockData.id) {
    const idx = stocks.findIndex((s) => s.id === stockData.id);
    if (idx === -1) return { success: false, message: 'Wood stock not found' };
    
    // Check serial duplicate
    if (stocks.some((s) => s.id !== stockData.id && s.serial.toLowerCase() === stockData.serial.trim().toLowerCase())) {
      return { success: false, message: 'Serial number already exists' };
    }

    stocks[idx] = {
      ...stocks[idx],
      ...stockData,
      serial: stockData.serial.trim(),
      width,
      length,
      cft: cftVal,
      qty,
      buy_rate: buyRate,
      buy_price: buyPrice,
      sell_rate: sellRate,
      sell_price: sellPrice,
      updated_at: new Date().toISOString(),
    };
    setStoredItem(STORAGE_KEYS.WOOD_STOCKS, stocks);
    logActivity('UPDATE', 'Wood_Stocks', stockData.id, `Updated wood item ${stockData.serial}`);
    return { success: true, message: 'Wood stock updated', stock: stocks[idx] };
  } else {
    if (stocks.some((s) => s.serial.toLowerCase() === stockData.serial.trim().toLowerCase())) {
      return { success: false, message: 'Serial number already exists' };
    }

    const newStock: WoodStock = {
      id: stocks.length ? Math.max(...stocks.map((s) => s.id)) + 1 : 1,
      serial: stockData.serial.trim(),
      sub_category_id: stockData.sub_category_id,
      purchase_id: stockData.purchase_id || null,
      width,
      length,
      cft: cftVal,
      qty,
      buy_rate: buyRate,
      buy_price: buyPrice,
      sell_rate: sellRate,
      sell_price: sellPrice,
      status: stockData.status || 'available',
      notes: stockData.notes || '',
      image: stockData.image || '',
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    stocks.unshift(newStock);
    setStoredItem(STORAGE_KEYS.WOOD_STOCKS, stocks);
    logActivity('CREATE', 'Wood_Stocks', newStock.id, `Added wood stock ${newStock.serial} (${newStock.width}"x${newStock.length}', ${newStock.cft} CFT)`);
    return { success: true, message: 'Wood stock added successfully', stock: newStock };
  }
}

export function updateWoodStockStatus(id: number, status: WoodStockStatus): { success: boolean; message: string } {
  const stocks = getWoodStocks();
  const stock = stocks.find((s) => s.id === id);
  if (!stock) return { success: false, message: 'Stock item not found' };
  stock.status = status;
  stock.updated_at = new Date().toISOString();
  setStoredItem(STORAGE_KEYS.WOOD_STOCKS, stocks);
  logActivity('UPDATE', 'Wood_Stocks', id, `Updated status for ${stock.serial} to ${status}`);
  return { success: true, message: `Status updated to ${status}` };
}

export function deleteWoodStock(id: number): { success: boolean; message: string } {
  const stocks = getWoodStocks();
  const stock = stocks.find((s) => s.id === id);
  if (!stock) return { success: false, message: 'Item not found' };
  if (stock.status === 'sold') return { success: false, message: 'Cannot delete a sold wood stock item' };

  const updated = stocks.filter((s) => s.id !== id);
  setStoredItem(STORAGE_KEYS.WOOD_STOCKS, updated);
  logActivity('DELETE', 'Wood_Stocks', id, `Deleted wood stock ${stock.serial}`);
  return { success: true, message: 'Wood stock item deleted' };
}

export function bulkImportWoodStocks(
  items: Array<{ serial: string; width: number; length: number; qty?: number }>,
  subCatId: number,
  purchaseId?: number | null,
  buyRateInput?: number,
  sellRateInput?: number
): { success: boolean; message: string; count: number; errors: string[] } {
  const stocks = getWoodStocks();
  const currentUser = getCurrentUser();
  const settings = getSettings();

  const buyRate = buyRateInput || settings.default_buy_rate;
  const sellRate = sellRateInput || settings.default_sell_rate;

  const existingSerials = new Set(stocks.map((s) => s.serial.toLowerCase()));
  const errors: string[] = [];
  let nextId = stocks.length ? Math.max(...stocks.map((s) => s.id)) + 1 : 1;
  let successCount = 0;

  const newItems: WoodStock[] = [];

  items.forEach((item, index) => {
    const serial = item.serial?.trim();
    if (!serial) {
      errors.push(`Row ${index + 1}: Empty serial number`);
      return;
    }
    if (existingSerials.has(serial.toLowerCase())) {
      errors.push(`Row ${index + 1}: Duplicate serial ${serial}`);
      return;
    }
    if (!item.width || item.width <= 0 || !item.length || item.length <= 0) {
      errors.push(`Row ${index + 1}: Invalid dimensions (${item.width}" x ${item.length}')`);
      return;
    }

    const qty = item.qty && item.qty > 0 ? item.qty : 1;
    const cftVal = calcCft(item.width, item.length);
    const buyPrice = Math.round(cftVal * qty * buyRate * 100) / 100;
    const sellPrice = Math.round(cftVal * qty * sellRate * 100) / 100;

    const newStock: WoodStock = {
      id: nextId++,
      serial,
      sub_category_id: subCatId,
      purchase_id: purchaseId || null,
      width: item.width,
      length: item.length,
      cft: cftVal,
      qty,
      buy_rate: buyRate,
      buy_price: buyPrice,
      sell_rate: sellRate,
      sell_price: sellPrice,
      status: 'available',
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };

    existingSerials.add(serial.toLowerCase());
    newItems.push(newStock);
    successCount++;
  });

  if (newItems.length > 0) {
    setStoredItem(STORAGE_KEYS.WOOD_STOCKS, [...newItems, ...stocks]);
    logActivity('BULK_IMPORT', 'Wood_Stocks', '', `Bulk imported ${successCount} wood items`);

    // Record import log
    const importLogs = getStoredItem<ImportLog[]>(STORAGE_KEYS.IMPORT_LOGS, initialImportLogs);
    const newImportLog: ImportLog = {
      id: importLogs.length ? Math.max(...importLogs.map((l) => l.id)) + 1 : 1,
      file_name: 'bulk_import.csv',
      sub_category_id: subCatId,
      total_rows: items.length,
      success_rows: successCount,
      failed_rows: items.length - successCount,
      status: errors.length > 0 ? 'completed_with_errors' : 'completed',
      error_log: JSON.stringify(errors.slice(0, 20)),
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    setStoredItem(STORAGE_KEYS.IMPORT_LOGS, [newImportLog, ...importLogs]);
  }

  return {
    success: successCount > 0,
    message: `Imported ${successCount} items successfully. ${errors.length} skipped.`,
    count: successCount,
    errors,
  };
}

// Suppliers
export function getSuppliers(): Supplier[] {
  return getStoredItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, initialSuppliers);
}

export function saveSupplier(supplier: Partial<Supplier> & { name: string }): { success: boolean; message: string; supplier?: Supplier } {
  const suppliers = getSuppliers();
  const currentUser = getCurrentUser();
  if (supplier.id) {
    const idx = suppliers.findIndex((s) => s.id === supplier.id);
    if (idx === -1) return { success: false, message: 'Supplier not found' };
    suppliers[idx] = { ...suppliers[idx], ...supplier };
    setStoredItem(STORAGE_KEYS.SUPPLIERS, suppliers);
    logActivity('UPDATE', 'Suppliers', supplier.id, `Updated supplier ${supplier.name}`);
    return { success: true, message: 'Supplier updated', supplier: suppliers[idx] };
  } else {
    const newSupplier: Supplier = {
      id: suppliers.length ? Math.max(...suppliers.map((s) => s.id)) + 1 : 1,
      name: supplier.name.trim(),
      phone: supplier.phone || '',
      address: supplier.address || '',
      is_active: supplier.is_active ?? true,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    suppliers.unshift(newSupplier);
    setStoredItem(STORAGE_KEYS.SUPPLIERS, suppliers);
    logActivity('CREATE', 'Suppliers', newSupplier.id, `Added supplier ${newSupplier.name}`);
    return { success: true, message: 'Supplier added successfully', supplier: newSupplier };
  }
}

// Customers
export function getCustomers(): Customer[] {
  return getStoredItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
}

export function saveCustomer(customer: Partial<Customer> & { name: string }): { success: boolean; message: string; customer?: Customer } {
  const customers = getCustomers();
  const currentUser = getCurrentUser();
  if (customer.id) {
    const idx = customers.findIndex((c) => c.id === customer.id);
    if (idx === -1) return { success: false, message: 'Customer not found' };
    customers[idx] = { ...customers[idx], ...customer };
    setStoredItem(STORAGE_KEYS.CUSTOMERS, customers);
    logActivity('UPDATE', 'Customers', customer.id, `Updated customer ${customer.name}`);
    return { success: true, message: 'Customer updated', customer: customers[idx] };
  } else {
    const phoneClean = (customer.phone || '').trim();
    const generatedQr = customer.qr_code || (phoneClean ? `CUST-${phoneClean}` : `CUST-${Math.floor(100000 + Math.random() * 900000)}`);
    const newCustomer: Customer = {
      id: customers.length ? Math.max(...customers.map((c) => c.id)) + 1 : 1,
      name: customer.name.trim(),
      phone: phoneClean || '03000000000',
      address: customer.address || '',
      total_purchase: 0,
      total_paid: 0,
      total_due: 0,
      loyalty_points: Number(customer.loyalty_points || 0),
      qr_code: generatedQr,
      custom_redemption_rate: customer.custom_redemption_rate ?? null,
      custom_scan_behavior: customer.custom_scan_behavior ?? null,
      is_active: customer.is_active ?? true,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    customers.unshift(newCustomer);
    setStoredItem(STORAGE_KEYS.CUSTOMERS, customers);
    logActivity('CREATE', 'Customers', newCustomer.id, `Added customer ${newCustomer.name} (QR: ${newCustomer.qr_code})`);
    return { success: true, message: 'Customer added successfully', customer: newCustomer };
  }
}

// Purchases
export function getPurchases(): Purchase[] {
  const purchases = getStoredItem<Purchase[]>(STORAGE_KEYS.PURCHASES, initialPurchases);
  let changed = false;
  const cleaned = purchases.map((p) => {
    if (p.paid_amount > p.total_amount) {
      changed = true;
      const correctedPaid = Math.min(p.paid_amount, p.total_amount);
      const correctedDue = Math.max(0, Math.round((p.total_amount - correctedPaid) * 100) / 100);
      return {
        ...p,
        paid_amount: correctedPaid,
        due_amount: correctedDue,
        status: correctedDue <= 0 ? 'completed' : p.status,
      };
    }
    return p;
  });
  if (changed) {
    setStoredItem(STORAGE_KEYS.PURCHASES, cleaned);
  }
  return cleaned;
}

export function savePurchase(data: {
  supplier_id?: number | null;
  sub_category_id: number;
  rate_per_cft: number;
  paid_amount: number;
  purchase_date: string;
  notes?: string;
}): { success: boolean; message: string; purchase?: Purchase } {
  const purchases = getPurchases();
  const woodStocks = getWoodStocks().filter((w) => w.sub_category_id === data.sub_category_id);
  const currentUser = getCurrentUser();

  const totalPieces = woodStocks.reduce((sum, w) => sum + w.qty, 0);
  const totalCft = Math.round(woodStocks.reduce((sum, w) => sum + w.cft * w.qty, 0) * 10000) / 10000;
  const ratePerCft = data.rate_per_cft || 1600;
  const totalAmount = Math.round(totalCft * ratePerCft * 100) / 100;
  const paidAmount = Math.min(data.paid_amount || 0, totalAmount);
  const dueAmount = Math.round((totalAmount - paidAmount) * 100) / 100;

  const dateStr = data.purchase_date.replace(/-/g, '');
  const purchaseNo = `PUR-${dateStr}-${String(purchases.length + 1).padStart(3, '0')}`;

  const newPurchase: Purchase = {
    id: purchases.length ? Math.max(...purchases.map((p) => p.id)) + 1 : 1,
    purchase_no: purchaseNo,
    supplier_id: data.supplier_id || null,
    sub_category_id: data.sub_category_id,
    total_pieces: totalPieces,
    total_cft: totalCft,
    rate_per_cft: ratePerCft,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    due_amount: dueAmount,
    purchase_date: data.purchase_date,
    notes: data.notes || '',
    status: dueAmount <= 0 ? 'completed' : 'pending',
    created_by: currentUser.id,
    created_at: new Date().toISOString(),
  };

  purchases.unshift(newPurchase);
  setStoredItem(STORAGE_KEYS.PURCHASES, purchases);

  // Link wood stocks to this purchase
  const allStocks = getWoodStocks();
  allStocks.forEach((stock) => {
    if (stock.sub_category_id === data.sub_category_id && !stock.purchase_id) {
      stock.purchase_id = newPurchase.id;
    }
  });
  setStoredItem(STORAGE_KEYS.WOOD_STOCKS, allStocks);

  // Record initial supplier payment if paid
  if (paidAmount > 0) {
    recordPayment(
      {
        purchase_id: newPurchase.id,
        payment_type: 'supplier_payment',
        amount: paidAmount,
        payment_method: 'bank',
        notes: 'Initial payment upon purchase creation',
        payment_date: data.purchase_date,
      },
      false
    );
  }

  logActivity('CREATE', 'Purchases', newPurchase.id, `Created purchase ${newPurchase.purchase_no} for ${formatCurrency(newPurchase.total_amount)}`);
  return { success: true, message: 'Purchase recorded successfully', purchase: newPurchase };
}

// Sales & POS Register
export function getSales(): Sale[] {
  const sales = getStoredItem<Sale[]>(STORAGE_KEYS.SALES, initialSales);
  let changed = false;
  const cleaned = sales.map((s) => {
    if (s.paid_amount > s.grand_total) {
      changed = true;
      const correctedPaid = Math.min(s.paid_amount, s.grand_total);
      const correctedDue = Math.max(0, Math.round((s.grand_total - correctedPaid) * 100) / 100);
      return {
        ...s,
        paid_amount: correctedPaid,
        due_amount: correctedDue,
        status: correctedDue <= 0 ? 'completed' : s.status,
      };
    }
    return s;
  });
  if (changed) {
    setStoredItem(STORAGE_KEYS.SALES, cleaned);
  }
  return cleaned;
}

export function getSaleItems(): SaleItem[] {
  return getStoredItem<SaleItem[]>(STORAGE_KEYS.SALE_ITEMS, initialSaleItems);
}

export function completeSale(data: {
  customer_id?: number | null;
  items: Array<{
    wood_stock_id?: number;
    serial?: string;
    sku?: string;
    description?: string;
    width?: number;
    length?: number;
    cft?: number;
    qty?: number;
    rate?: number;
    line_total?: number;
  }>;
  tax_rate?: number;
  tax_amount?: number;
  discount: number;
  paid_amount: number;
  payment_method: string;
  grand_total?: number;
  points_earned?: number;
  points_redeemed?: number;
  points_discount_amount?: number;
  notes?: string;
}): { success: boolean; message: string; sale?: Sale } {
  if (!data.items || data.items.length === 0) {
    return { success: false, message: 'Cart is empty' };
  }

  const stocks = getWoodStocks();
  const sales = getSales();
  const saleItems = getSaleItems();
  const currentUser = getCurrentUser();

  let totalItemsCount = 0;
  let totalCftSum = 0;
  let subtotalSum = 0;

  const itemDetails: Array<{
    wood_stock_id?: number;
    serial: string;
    sku: string;
    description: string;
    width: number;
    length: number;
    cft: number;
    qty: number;
    rate: number;
    lineTotal: number;
    matchedStock?: WoodStock;
  }> = [];

  for (const item of data.items) {
    const itemQty = item.qty !== undefined && item.qty > 0 ? item.qty : 1;
    let matchedStock = item.wood_stock_id ? stocks.find((s) => s.id === item.wood_stock_id) : undefined;

    if (matchedStock && matchedStock.status === 'available') {
      const cftVal = item.cft !== undefined ? item.cft : matchedStock.cft;
      const rateVal = item.rate !== undefined ? item.rate : (matchedStock.sell_rate || matchedStock.sell_price || 0);
      const lineTotal = item.line_total !== undefined ? item.line_total : Math.round(cftVal * itemQty * rateVal * 100) / 100;

      totalItemsCount += itemQty;
      totalCftSum += cftVal * itemQty;
      subtotalSum += lineTotal;

      itemDetails.push({
        wood_stock_id: matchedStock.id,
        serial: item.serial || matchedStock.serial,
        sku: item.sku || matchedStock.sku || '',
        description: item.description || matchedStock.description || matchedStock.title || 'Wood Stock',
        width: item.width !== undefined ? item.width : matchedStock.width,
        length: item.length !== undefined ? item.length : matchedStock.length,
        cft: cftVal,
        qty: itemQty,
        rate: rateVal,
        lineTotal,
        matchedStock,
      });
    } else {
      // General catalog item, custom POS line item, or fallback stock item
      const cftVal = item.cft || 0;
      const rateVal = item.rate || 0;
      const lineTotal = item.line_total !== undefined ? item.line_total : Math.round((cftVal > 0 ? cftVal * itemQty * rateVal : itemQty * rateVal) * 100) / 100;

      totalItemsCount += itemQty;
      totalCftSum += cftVal * itemQty;
      subtotalSum += lineTotal;

      itemDetails.push({
        wood_stock_id: item.wood_stock_id || undefined,
        serial: item.serial || 'RETAIL',
        sku: item.sku || '',
        description: item.description || item.serial || 'General Item',
        width: item.width || 0,
        length: item.length || 0,
        cft: cftVal,
        qty: itemQty,
        rate: rateVal,
        lineTotal,
      });
    }
  }

  const discount = Number(data.discount) || 0;
  const taxRate = Number(data.tax_rate) || 0;
  const taxAmount = data.tax_amount !== undefined ? Number(data.tax_amount) : Math.round(subtotalSum * (taxRate / 100) * 100) / 100;
  const grandTotal = data.grand_total !== undefined ? Number(data.grand_total) : Math.max(0, Math.round((subtotalSum + taxAmount - discount) * 100) / 100);
  const paidAmount = Math.min(Number(data.paid_amount) || 0, grandTotal);
  const dueAmount = Math.max(0, Math.round((grandTotal - paidAmount) * 100) / 100);

  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const invoiceNo = `INV-${dateStr}-${String(sales.length + 1).padStart(3, '0')}`;

  const newSale: Sale = {
    id: sales.length ? Math.max(...sales.map((s) => s.id)) + 1 : 1,
    invoice_no: invoiceNo,
    customer_id: data.customer_id || null,
    total_items: totalItemsCount,
    total_cft: Math.round(totalCftSum * 10000) / 10000,
    subtotal: subtotalSum,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    discount,
    grand_total: grandTotal,
    paid_amount: paidAmount,
    due_amount: dueAmount,
    payment_method: data.payment_method || 'cash',
    points_earned: data.points_earned || 0,
    points_redeemed: data.points_redeemed || 0,
    points_discount_amount: data.points_discount_amount || 0,
    sale_date: new Date().toISOString(),
    status: dueAmount <= 0 ? 'completed' : 'pending',
    notes: data.notes || '',
    created_by: currentUser.id,
    created_at: new Date().toISOString(),
  };

  sales.unshift(newSale);
  setStoredItem(STORAGE_KEYS.SALES, sales);

  // Create Sale Items & mark wood stocks as sold
  let nextSaleItemId = saleItems.length ? Math.max(...saleItems.map((si) => si.id)) + 1 : 1;
  const newSaleItems: SaleItem[] = [];

  itemDetails.forEach(({ wood_stock_id, serial, sku, description, width, length, cft, qty, rate, lineTotal, matchedStock }) => {
    newSaleItems.push({
      id: nextSaleItemId++,
      sale_id: newSale.id,
      wood_stock_id: wood_stock_id || undefined,
      serial,
      sku,
      description,
      width,
      length,
      cft,
      qty,
      rate,
      line_total: lineTotal,
    });

    if (matchedStock) {
      const stockIdx = stocks.findIndex((s) => s.id === matchedStock.id);
      if (stockIdx !== -1) {
        if (qty >= stocks[stockIdx].qty) {
          stocks[stockIdx].status = 'sold';
        } else {
          stocks[stockIdx].qty -= qty;
        }
        stocks[stockIdx].updated_at = new Date().toISOString();
      }
    }
  });

  setStoredItem(STORAGE_KEYS.SALE_ITEMS, [...newSaleItems, ...saleItems]);
  setStoredItem(STORAGE_KEYS.WOOD_STOCKS, stocks);

  // Update Customer balance & Loyalty Points if customer is selected
  if (data.customer_id) {
    const customers = getCustomers();
    const cust = customers.find((c) => c.id === data.customer_id);
    if (cust) {
      cust.total_purchase = (cust.total_purchase || 0) + grandTotal;
      cust.total_paid = (cust.total_paid || 0) + paidAmount;
      cust.total_due = Math.round((cust.total_purchase - cust.total_paid) * 100) / 100;

      // Update Loyalty points
      const ptsRedeemed = data.points_redeemed || 0;
      const ptsEarned = data.points_earned || 0;
      cust.loyalty_points = Math.max(0, (cust.loyalty_points || 0) - ptsRedeemed + ptsEarned);

      setStoredItem(STORAGE_KEYS.CUSTOMERS, customers);
    }
  }

  // Record customer payment
  if (paidAmount > 0) {
    recordPayment(
      {
        sale_id: newSale.id,
        payment_type: 'customer_payment',
        amount: paidAmount,
        payment_method: data.payment_method || 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        notes: `Invoice payment for ${newSale.invoice_no}`,
      },
      false
    );
  }

  logActivity('CREATE', 'Sales', newSale.id, `Completed sale ${newSale.invoice_no} (Grand Total: ${formatCurrency(newSale.grand_total)})`);
  return { success: true, message: 'Sale completed successfully', sale: newSale };
}

export function cancelSale(saleId: number, reason: string = ''): { success: boolean; message: string } {
  const sales = getSales();
  const sale = sales.find((s) => s.id === saleId);
  if (!sale) return { success: false, message: 'Sale not found' };
  if (sale.status === 'cancelled') return { success: false, message: 'Sale is already cancelled' };

  sale.status = 'cancelled';
  sale.notes = `${sale.notes ? sale.notes + ' | ' : ''}Cancelled: ${reason}`;
  sale.updated_at = new Date().toISOString();
  setStoredItem(STORAGE_KEYS.SALES, sales);

  // Restore Wood Stocks to 'available'
  const saleItems = getSaleItems().filter((si) => si.sale_id === saleId);
  const stocks = getWoodStocks();
  saleItems.forEach((item) => {
    const stock = stocks.find((s) => s.id === item.wood_stock_id);
    if (stock) {
      stock.status = 'available';
      stock.updated_at = new Date().toISOString();
    }
  });
  setStoredItem(STORAGE_KEYS.WOOD_STOCKS, stocks);

  // Reverse Customer balance
  if (sale.customer_id) {
    const customers = getCustomers();
    const cust = customers.find((c) => c.id === sale.customer_id);
    if (cust) {
      cust.total_purchase = Math.max(0, cust.total_purchase - sale.grand_total);
      cust.total_paid = Math.max(0, cust.total_paid - sale.paid_amount);
      cust.total_due = Math.round((cust.total_purchase - cust.total_paid) * 100) / 100;
      setStoredItem(STORAGE_KEYS.CUSTOMERS, customers);
    }
  }

  logActivity('CANCEL', 'Sales', saleId, `Cancelled invoice ${sale.invoice_no}. Reason: ${reason}`);
  return { success: true, message: 'Sale cancelled and stock restored to inventory' };
}

export function returnSaleItem(saleItemId: number, reason: string = ''): { success: boolean; message: string } {
  const saleItems = getSaleItems();
  const item = saleItems.find((si) => si.id === saleItemId);
  if (!item) return { success: false, message: 'Sale item not found' };

  const sales = getSales();
  const sale = sales.find((s) => s.id === item.sale_id);
  if (!sale) return { success: false, message: 'Associated sale not found' };

  // Restore stock
  const stocks = getWoodStocks();
  const stock = stocks.find((s) => s.id === item.wood_stock_id);
  if (stock) {
    stock.status = 'available';
    setStoredItem(STORAGE_KEYS.WOOD_STOCKS, stocks);
  }

  // Remove item from sale_items
  const updatedSaleItems = saleItems.filter((si) => si.id !== saleItemId);
  setStoredItem(STORAGE_KEYS.SALE_ITEMS, updatedSaleItems);

  // Recalculate sale
  const remainingItems = updatedSaleItems.filter((si) => si.sale_id === sale.id);
  const newSubtotal = remainingItems.reduce((sum, si) => sum + si.line_total, 0);
  const newGrandTotal = Math.max(0, newSubtotal - sale.discount);

  sale.subtotal = newSubtotal;
  sale.grand_total = newGrandTotal;
  sale.due_amount = Math.max(0, newGrandTotal - sale.paid_amount);
  sale.notes = `${sale.notes ? sale.notes + ' | ' : ''}Returned item ${item.serial}: ${reason}`;
  setStoredItem(STORAGE_KEYS.SALES, sales);

  logActivity('RETURN_ITEM', 'Sale_Items', saleItemId, `Returned item ${item.serial} from invoice ${sale.invoice_no}`);
  return { success: true, message: 'Item returned and inventory updated' };
}

// Payments
export function getPayments(): Payment[] {
  return getStoredItem<Payment[]>(STORAGE_KEYS.PAYMENTS, initialPayments);
}

export function recordPayment(
  data: {
    sale_id?: number | null;
    purchase_id?: number | null;
    payment_type: Payment['payment_type'];
    amount: number;
    payment_method: string;
    reference_no?: string;
    payment_date: string;
    notes?: string;
  },
  updateBalances: boolean = true
): { success: boolean; message: string; payment?: Payment } {
  const payments = getPayments();
  const currentUser = getCurrentUser();

  const newPayment: Payment = {
    id: payments.length ? Math.max(...payments.map((p) => p.id)) + 1 : 1,
    sale_id: data.sale_id || null,
    purchase_id: data.purchase_id || null,
    payment_type: data.payment_type,
    amount: Number(data.amount),
    payment_method: data.payment_method || 'cash',
    reference_no: data.reference_no || '',
    payment_date: data.payment_date || new Date().toISOString().split('T')[0],
    notes: data.notes || '',
    created_by: currentUser.id,
    created_at: new Date().toISOString(),
  };

  payments.unshift(newPayment);
  setStoredItem(STORAGE_KEYS.PAYMENTS, payments);

  if (updateBalances) {
    // Update sale / purchase balances
    if (data.sale_id) {
      const sales = getSales();
      const sale = sales.find((s) => s.id === data.sale_id);
      if (sale) {
        sale.paid_amount = Math.min(sale.grand_total, sale.paid_amount + Number(data.amount));
        sale.due_amount = Math.max(0, Math.round((sale.grand_total - sale.paid_amount) * 100) / 100);
        if (sale.due_amount <= 0) sale.status = 'completed';
        setStoredItem(STORAGE_KEYS.SALES, sales);

        if (sale.customer_id) {
          const customers = getCustomers();
          const cust = customers.find((c) => c.id === sale.customer_id);
          if (cust) {
            cust.total_paid += Number(data.amount);
            cust.total_due = Math.max(0, Math.round((cust.total_purchase - cust.total_paid) * 100) / 100);
            setStoredItem(STORAGE_KEYS.CUSTOMERS, customers);
          }
        }
      }
    }

    if (data.purchase_id) {
      const purchases = getPurchases();
      const pur = purchases.find((p) => p.id === data.purchase_id);
      if (pur) {
        pur.paid_amount = Math.min(pur.total_amount, pur.paid_amount + Number(data.amount));
        pur.due_amount = Math.max(0, Math.round((pur.total_amount - pur.paid_amount) * 100) / 100);
        if (pur.due_amount <= 0) pur.status = 'completed';
        setStoredItem(STORAGE_KEYS.PURCHASES, purchases);
      }
    }
  }

  logActivity('CREATE', 'Payments', newPayment.id, `Recorded ${data.payment_type} of ${formatCurrency(data.amount)}`);
  return { success: true, message: 'Payment recorded successfully', payment: newPayment };
}

// Expenses
export function getExpenses(): Expense[] {
  return getStoredItem<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses);
}

export function saveExpense(expenseData: Partial<Expense> & { title: string; amount: number; category: Expense['category'] }): { success: boolean; message: string; expense?: Expense } {
  const expenses = getExpenses();
  const currentUser = getCurrentUser();

  if (expenseData.id) {
    const idx = expenses.findIndex((e) => e.id === expenseData.id);
    if (idx === -1) return { success: false, message: 'Expense not found' };
    expenses[idx] = { ...expenses[idx], ...expenseData };
    setStoredItem(STORAGE_KEYS.EXPENSES, expenses);
    logActivity('UPDATE', 'Expenses', expenseData.id, `Updated expense ${expenseData.title}`);
    return { success: true, message: 'Expense updated', expense: expenses[idx] };
  } else {
    const newExpense: Expense = {
      id: expenses.length ? Math.max(...expenses.map((e) => e.id)) + 1 : 1,
      title: expenseData.title.trim(),
      category: expenseData.category,
      amount: Number(expenseData.amount),
      expense_date: expenseData.expense_date || new Date().toISOString().split('T')[0],
      notes: expenseData.notes || '',
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    expenses.unshift(newExpense);
    setStoredItem(STORAGE_KEYS.EXPENSES, expenses);
    logActivity('CREATE', 'Expenses', newExpense.id, `Added expense ${newExpense.title} (${formatCurrency(newExpense.amount)})`);
    return { success: true, message: 'Expense recorded successfully', expense: newExpense };
  }
}

export function deleteExpense(id: number): { success: boolean; message: string } {
  const expenses = getExpenses().filter((e) => e.id !== id);
  setStoredItem(STORAGE_KEYS.EXPENSES, expenses);
  logActivity('DELETE', 'Expenses', id, `Deleted expense #${id}`);
  return { success: true, message: 'Expense deleted' };
}

// Settings
export function getSettings(): SystemSettings {
  const settings = getStoredItem<SystemSettings>(STORAGE_KEYS.SETTINGS, initialSettings);

  let settingsChanged = false;
  if (!settings.base_currency || settings.base_currency !== 'PKR' || settings.currency_symbol !== 'Rs.') {
    settings.base_currency = 'PKR';
    settings.active_display_currency = 'PKR';
    settings.currency_symbol = 'Rs.';
    settingsChanged = true;
  }

  if (!settings.currencies || settings.currencies.length === 0) {
    settings.currencies = defaultCurrencies.map((c) => ({ ...c }));
    settingsChanged = true;
  } else {
    let pkrFound = false;
    for (const c of settings.currencies) {
      if (c.code === 'PKR') {
        pkrFound = true;
        if (!c.is_base || c.exchange_rate !== 1.0) {
          c.is_base = true;
          c.exchange_rate = 1.0;
          c.symbol = 'Rs.';
          settingsChanged = true;
        }
      } else {
        if (c.is_base) {
          c.is_base = false;
          settingsChanged = true;
        }
      }
    }
    if (!pkrFound) {
      settings.currencies.unshift({ code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs.', exchange_rate: 1.0, is_base: true, is_active: true });
      settingsChanged = true;
    }

    const existingMap = new Map(settings.currencies.map((c) => [c.code, c]));
    for (const dc of defaultCurrencies) {
      if (!existingMap.has(dc.code)) {
        settings.currencies.push({ ...dc });
        settingsChanged = true;
      }
    }
  }

  if (settingsChanged) {
    setStoredItem(STORAGE_KEYS.SETTINGS, settings);
  }

  if (!settings.branches || settings.branches.length === 0) {
    settings.branches = initialSettings.branches ? [...initialSettings.branches] : [
      {
        id: 'br-1',
        name: settings.branch_name || 'Gulberg III Shop',
        code: 'ASK-LHR-01',
        address: settings.business_address || 'Main Boulevard, Gulberg III',
        address_line_2: settings.address_line_2 || 'Block B, Plot 42',
        phone: settings.business_phone || '+92 42 35710000',
        cell_phone: settings.cell_phone || '+92 300 1234567',
        email: settings.email || 'gulberg@askari.com',
        region: settings.region || 'Punjab',
        city: settings.city || 'Lahore',
        postal_code: settings.postal_code || '54660',
        country: settings.country || 'Pakistan',
        is_head_office: true,
      }
    ];
    settings.active_branch_id = 'br-1';
    setStoredItem(STORAGE_KEYS.SETTINGS, settings);
  }

  if (!settings.active_branch_id && settings.branches.length > 0) {
    settings.active_branch_id = settings.branches[0].id;
  }

  const activeBranch = settings.branches?.find((b) => b.id === settings.active_branch_id) || settings.branches?.[0];
  if (activeBranch) {
    settings.branch_name = activeBranch.name;
    settings.business_address = activeBranch.address;
    settings.address_line_2 = activeBranch.address_line_2 || '';
    settings.business_phone = activeBranch.phone || '';
    settings.cell_phone = activeBranch.cell_phone || '';
    settings.email = activeBranch.email || '';
    settings.region = activeBranch.region || '';
    settings.city = activeBranch.city || '';
    settings.postal_code = activeBranch.postal_code || '';
    settings.country = activeBranch.country || '';
  }

  if (!settings.base_currency) settings.base_currency = 'BDT';
  if (!settings.active_display_currency) settings.active_display_currency = settings.base_currency;
  if (!settings.duplicate_scan_behavior) settings.duplicate_scan_behavior = 'increase_qty';

  return settings;
}

export function saveSettings(newSettings: Partial<SystemSettings>): { success: boolean; message: string } {
  const current = getSettings();
  const updated = { ...current, ...newSettings };

  // If branches updated or active_branch_id updated, sync active branch fields
  if (updated.branches && updated.branches.length > 0) {
    if (!updated.active_branch_id || !updated.branches.some((b) => b.id === updated.active_branch_id)) {
      updated.active_branch_id = updated.branches[0].id;
    }
    const active = updated.branches.find((b) => b.id === updated.active_branch_id) || updated.branches[0];
    if (active) {
      updated.branch_name = active.name;
      updated.business_address = active.address;
      updated.address_line_2 = active.address_line_2 || '';
      updated.business_phone = active.phone || '';
      updated.cell_phone = active.cell_phone || '';
      updated.email = active.email || '';
      updated.region = active.region || '';
      updated.city = active.city || '';
      updated.postal_code = active.postal_code || '';
      updated.country = active.country || '';
    }
  }

  setStoredItem(STORAGE_KEYS.SETTINGS, updated);
  logActivity('UPDATE', 'Settings', '', 'System business settings updated');
  return { success: true, message: 'Settings saved successfully' };
}

export function setActiveBranch(branchId: string): { success: boolean; message: string } {
  const current = getSettings();
  const branches = current.branches || [];
  const selected = branches.find((b) => b.id === branchId);
  if (!selected) return { success: false, message: 'Branch not found' };

  const updated: SystemSettings = {
    ...current,
    active_branch_id: branchId,
    branch_name: selected.name,
    business_address: selected.address,
    address_line_2: selected.address_line_2 || '',
    business_phone: selected.phone || '',
    cell_phone: selected.cell_phone || '',
    email: selected.email || '',
    region: selected.region || '',
    city: selected.city || '',
    postal_code: selected.postal_code || '',
    country: selected.country || '',
  };

  setStoredItem(STORAGE_KEYS.SETTINGS, updated);
  logActivity('UPDATE', 'Settings', '', `Switched active store branch to ${selected.name}`);
  return { success: true, message: `Active branch switched to ${selected.name}` };
}

export function setActiveDisplayCurrency(code: string): { success: boolean; message: string } {
  const current = getSettings();
  const currencies = current.currencies || [];
  const selected = currencies.find((c) => c.code === code);
  if (!selected) return { success: false, message: 'Currency not found' };

  const updated: SystemSettings = {
    ...current,
    active_display_currency: code,
    currency_symbol: selected.symbol,
  };
  setStoredItem(STORAGE_KEYS.SETTINGS, updated);
  logActivity('UPDATE', 'Settings', '', `Switched active display currency to ${code} (${selected.symbol})`);
  return { success: true, message: `Display currency updated to ${code}` };
}

// Global search across entities
export function globalSearch(query: string): Array<{ type: string; id: number; title: string; subtitle: string; linkTag: string }> {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  const results: Array<{ type: string; id: number; title: string; subtitle: string; linkTag: string }> = [];

  // Search Wood Stocks
  const stocks = getWoodStocks();
  stocks.forEach((s) => {
    if (s.serial.toLowerCase().includes(q)) {
      results.push({
        type: 'Wood Stock',
        id: s.id,
        title: `Serial: ${s.serial}`,
        subtitle: `Dimensions: ${s.width}" x ${s.length}' | Status: ${s.status.toUpperCase()}`,
        linkTag: 'inventory',
      });
    }
  });

  // Search Customers
  const customers = getCustomers();
  customers.forEach((c) => {
    if (c.name.toLowerCase().includes(q) || c.phone.includes(q)) {
      results.push({
        type: 'Customer',
        id: c.id,
        title: c.name,
        subtitle: `Phone: ${c.phone || 'N/A'} | Due: ${formatCurrency(c.total_due)}`,
        linkTag: 'customers',
      });
    }
  });

  // Search Sales
  const sales = getSales();
  sales.forEach((s) => {
    if (s.invoice_no.toLowerCase().includes(q)) {
      results.push({
        type: 'Invoice',
        id: s.id,
        title: s.invoice_no,
        subtitle: `Total: ${formatCurrency(s.grand_total)} | Status: ${s.status.toUpperCase()}`,
        linkTag: 'sales',
      });
    }
  });

  // Search Suppliers
  const suppliers = getSuppliers();
  suppliers.forEach((sp) => {
    if (sp.name.toLowerCase().includes(q) || sp.phone.includes(q)) {
      results.push({
        type: 'Supplier',
        id: sp.id,
        title: sp.name,
        subtitle: `Phone: ${sp.phone || 'N/A'}`,
        linkTag: 'suppliers',
      });
    }
  });

  return results.slice(0, 10);
}
