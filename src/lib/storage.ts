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
  StoreChain,
  StoreBranch,
  SubscriptionPlan,
  SubscriptionHistoryEntry,
  OrganizationStatus,
  RoleDefinition,
  GranularPermissionMatrix,
  RoleModuleKey,
  ModulePermissionActions,
  UserPermissions
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
  SUBSCRIPTION_PLANS: 'SUBSCRIPTION_PLANS',
  SUBSCRIPTION_HISTORY: 'SUBSCRIPTION_HISTORY',
  ROLES: 'ROLES',
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
  SUBSCRIPTION_PLANS: 'SUBSCRIPTION_PLANS',
  SUBSCRIPTION_HISTORY: 'SUBSCRIPTION_HISTORY',
  ROLES: 'ROLES',
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

export const ALL_MODULE_KEYS: RoleModuleKey[] = [
  'dashboard',
  'pos',
  'inventory',
  'purchases',
  'sales',
  'customers',
  'suppliers',
  'payments',
  'expenses',
  'reports',
  'organization',
  'users',
  'settings',
  'audit_logs',
];

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-free',
    name: 'Free',
    description: 'Starter plan for single-outlet retail shops and trial evaluation.',
    monthly_price: 0,
    annual_price: 0,
    max_branches: 2,
    max_users: 10,
    max_pos_terminals: 2,
    storage_limit_mb: 500,
    available_modules: ['dashboard', 'pos', 'inventory', 'sales', 'customers', 'organization', 'users'],
    status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan-starter',
    name: 'Starter',
    description: 'Essential retail POS & ledger management for growing stores.',
    monthly_price: 29,
    annual_price: 290,
    max_branches: 5,
    max_users: 25,
    max_pos_terminals: 5,
    storage_limit_mb: 2048,
    available_modules: ['dashboard', 'pos', 'inventory', 'purchases', 'sales', 'customers', 'suppliers', 'payments', 'organization', 'users'],
    status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan-growth',
    name: 'Growth',
    description: 'Multi-branch retail operations with expenses, reports, and role controls.',
    monthly_price: 79,
    annual_price: 790,
    max_branches: 15,
    max_users: 75,
    max_pos_terminals: 20,
    storage_limit_mb: 10240,
    available_modules: ['dashboard', 'pos', 'inventory', 'purchases', 'sales', 'customers', 'suppliers', 'payments', 'expenses', 'reports', 'organization', 'users', 'audit_logs'],
    status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise',
    description: 'Full-scale enterprise chain control with unlimited scalability and audit trail.',
    monthly_price: 199,
    annual_price: 1990,
    max_branches: 100,
    max_users: 500,
    max_pos_terminals: 150,
    storage_limit_mb: 51200,
    available_modules: [...ALL_MODULE_KEYS],
    status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

export const INITIAL_STORE_CHAINS: StoreChain[] = [
  {
    id: 'chain-default',
    name: 'Askari Departmental Store Chain',
    code: 'ASKARI',
    business_type: 'Departmental Store & Supply Chain',
    industry: 'Retail & Wholesale Supply',
    description: 'Premier wholesale supply and general retail departmental store network.',
    registration_number: 'REG-ASK-2026',
    tax_id: 'NTN-441029-1',
    website: 'https://askari-stores.example.com',
    country: 'Pakistan',
    city: 'Lahore',
    logo_url: '',
    admin_email: 'admin@askari.com',
    admin_name: 'Askari System Admin',
    admin_username: 'admin',
    admin_phone: '+92 300 1234567',
    phone: '+92 300 1234567',
    address: 'Main Boulevard, Gulberg, Lahore, Pakistan',
    plan_id: 'plan-enterprise',
    subscription_start_date: '2026-01-01',
    subscription_expiry_date: '2028-12-31',
    max_branches: 100,
    max_users: 500,
    max_pos_terminals: 150,
    status: 'active',
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
    registration_number: 'REG-JKS-2026',
    tax_id: 'NTN-882190-4',
    country: 'Pakistan',
    city: 'Lahore',
    logo_url: '',
    admin_email: 'jks@jkscashandcarry.com',
    admin_name: 'JKS Store Administrator',
    admin_username: 'jks',
    admin_phone: '+92 321 9876543',
    phone: '+92 321 9876543',
    address: 'Main Boulevard, Gulberg, Lahore, Pakistan',
    plan_id: 'plan-growth',
    subscription_start_date: '2026-01-15',
    subscription_expiry_date: '2027-01-15',
    max_branches: 15,
    max_users: 75,
    max_pos_terminals: 20,
    status: 'active',
    created_at: '2026-01-15T00:00:00.000Z',
    is_active: true,
  },
];

export const DEFAULT_STORE_CHAIN: StoreChain = INITIAL_STORE_CHAINS[0];

// Subscription Plans Management (Global)
export function getSubscriptionPlans(): SubscriptionPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_PLANS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, JSON.stringify(DEFAULT_SUBSCRIPTION_PLANS));
      return DEFAULT_SUBSCRIPTION_PLANS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, JSON.stringify(DEFAULT_SUBSCRIPTION_PLANS));
      return DEFAULT_SUBSCRIPTION_PLANS;
    }
    return parsed;
  } catch {
    return DEFAULT_SUBSCRIPTION_PLANS;
  }
}

export function getPlanById(planId?: string): SubscriptionPlan {
  const plans = getSubscriptionPlans();
  return plans.find((p) => p.id === planId) || plans[0] || DEFAULT_SUBSCRIPTION_PLANS[0];
}

export function saveSubscriptionPlan(
  planData: Partial<SubscriptionPlan> & { name: string }
): { success: boolean; message: string; plan?: SubscriptionPlan } {
  const plans = getSubscriptionPlans();
  const cleanName = planData.name.trim();
  if (!cleanName) {
    return { success: false, message: 'Plan name is required.' };
  }

  if (planData.id) {
    const idx = plans.findIndex((p) => p.id === planData.id);
    if (idx === -1) return { success: false, message: 'Subscription plan not found.' };
    plans[idx] = {
      ...plans[idx],
      ...planData,
      name: cleanName,
      max_branches: Math.max(1, Number(planData.max_branches ?? plans[idx].max_branches)),
      max_users: Math.max(1, Number(planData.max_users ?? plans[idx].max_users)),
      max_pos_terminals: Math.max(1, Number(planData.max_pos_terminals ?? plans[idx].max_pos_terminals)),
      storage_limit_mb: Math.max(100, Number(planData.storage_limit_mb ?? plans[idx].storage_limit_mb)),
      monthly_price: Math.max(0, Number(planData.monthly_price ?? plans[idx].monthly_price)),
      annual_price: Math.max(0, Number(planData.annual_price ?? plans[idx].annual_price)),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, JSON.stringify(plans));
    logActivity('UPDATE', 'SUBSCRIPTION_PLANS', plans[idx].id, `Updated subscription plan "${plans[idx].name}"`);
    notifyStorageChange();
    return { success: true, message: `Plan "${plans[idx].name}" updated successfully.`, plan: plans[idx] };
  }

  if (plans.some((p) => p.name.toLowerCase() === cleanName.toLowerCase())) {
    return { success: false, message: 'A subscription plan with this name already exists.' };
  }

  const newPlan: SubscriptionPlan = {
    id: `plan-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`,
    name: cleanName,
    description: planData.description || '',
    monthly_price: Math.max(0, Number(planData.monthly_price ?? 0)),
    annual_price: Math.max(0, Number(planData.annual_price ?? 0)),
    max_branches: Math.max(1, Number(planData.max_branches ?? 3)),
    max_users: Math.max(1, Number(planData.max_users ?? 15)),
    max_pos_terminals: Math.max(1, Number(planData.max_pos_terminals ?? 5)),
    storage_limit_mb: Math.max(100, Number(planData.storage_limit_mb ?? 1024)),
    available_modules:
      Array.isArray(planData.available_modules) && planData.available_modules.length > 0
        ? planData.available_modules
        : ['dashboard', 'pos', 'inventory', 'sales', 'customers', 'organization', 'users'],
    status: planData.status || 'active',
    created_at: new Date().toISOString(),
  };

  const updated = [...plans, newPlan];
  localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, JSON.stringify(updated));
  logActivity('CREATE', 'SUBSCRIPTION_PLANS', newPlan.id, `Created subscription plan "${newPlan.name}"`);
  notifyStorageChange();
  return { success: true, message: `Subscription plan "${newPlan.name}" created.`, plan: newPlan };
}

export function toggleSubscriptionPlanStatus(planId: string): { success: boolean; message: string } {
  const plans = getSubscriptionPlans();
  const idx = plans.findIndex((p) => p.id === planId);
  if (idx === -1) return { success: false, message: 'Plan not found.' };
  plans[idx].status = plans[idx].status === 'active' ? 'inactive' : 'active';
  plans[idx].updated_at = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_PLANS, JSON.stringify(plans));
  logActivity('TOGGLE_STATUS', 'SUBSCRIPTION_PLANS', planId, `Set plan "${plans[idx].name}" to ${plans[idx].status}`);
  notifyStorageChange();
  return { success: true, message: `Plan "${plans[idx].name}" is now ${plans[idx].status}.` };
}

export function getSubscriptionHistory(orgId?: string): SubscriptionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_HISTORY);
    const list: SubscriptionHistoryEntry[] = raw ? JSON.parse(raw) : [];
    const safeList = Array.isArray(list) ? list : [];
    return orgId ? safeList.filter((h) => h.organization_id === orgId) : safeList;
  } catch {
    return [];
  }
}

export function recordSubscriptionHistory(entry: Omit<SubscriptionHistoryEntry, 'id' | 'created_at'>): void {
  const existing = getSubscriptionHistory();
  const record: SubscriptionHistoryEntry = {
    ...entry,
    id: `subh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    created_at: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_HISTORY, JSON.stringify([record, ...existing].slice(0, 200)));
}

export function getEffectiveOrgLimits(chain?: StoreChain | null): {
  plan: SubscriptionPlan;
  maxBranches: number;
  maxUsers: number;
  maxPosTerminals: number;
  availableModules: string[];
} {
  const targetChain = chain || getActiveStoreChain();
  const plan = getPlanById(targetChain?.plan_id);
  return {
    plan,
    maxBranches: Number(targetChain?.max_branches && targetChain.max_branches > 0 ? targetChain.max_branches : plan.max_branches),
    maxUsers: Number(targetChain?.max_users && targetChain.max_users > 0 ? targetChain.max_users : plan.max_users),
    maxPosTerminals: Number(targetChain?.max_pos_terminals && targetChain.max_pos_terminals > 0 ? targetChain.max_pos_terminals : plan.max_pos_terminals),
    availableModules: plan.available_modules && plan.available_modules.length > 0 ? plan.available_modules : [...ALL_MODULE_KEYS],
  };
}

export function getOrganizationAccessState(chain?: StoreChain | null): {
  blocked: boolean;
  status: OrganizationStatus;
  reason: string;
} {
  const target = chain || getActiveStoreChain();
  const derivedStatus: OrganizationStatus =
    target.status || (target.is_active === false ? 'suspended' : 'active');

  if (derivedStatus === 'suspended' || target.is_active === false) {
    return {
      blocked: true,
      status: 'suspended',
      reason: `Organization "${target.name}" is currently suspended by platform administration.`,
    };
  }
  if (derivedStatus === 'expired') {
    return {
      blocked: true,
      status: 'expired',
      reason: `Organization "${target.name}" subscription has expired. Please renew your plan to continue operations.`,
    };
  }
  if (derivedStatus === 'pending') {
    return {
      blocked: true,
      status: 'pending',
      reason: `Organization "${target.name}" is pending activation.`,
    };
  }
  if (target.subscription_expiry_date) {
    const exp = new Date(target.subscription_expiry_date);
    if (!Number.isNaN(exp.getTime())) {
      const endOfExpiry = new Date(exp);
      endOfExpiry.setHours(23, 59, 59, 999);
      if (Date.now() > endOfExpiry.getTime()) {
        return {
          blocked: true,
          status: 'expired',
          reason: `Subscription expired on ${target.subscription_expiry_date}. Please contact platform support to renew.`,
        };
      }
    }
  }
  return { blocked: false, status: 'active', reason: '' };
}

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
    let dirty = false;
    const normalized: StoreChain[] = parsed.map((c): StoreChain => {
      const defMatch = INITIAL_STORE_CHAINS.find((d) => d.id === c.id);
      const nextStatus: OrganizationStatus = c.status || (c.is_active === false ? 'suspended' : 'active');
      const nextPlanId = c.plan_id || defMatch?.plan_id || (c.id === 'chain-default' ? 'plan-enterprise' : 'plan-free');
      const planObj = getPlanById(nextPlanId);
      if (!c.plan_id || !c.status || !c.max_branches || !c.max_users) {
        dirty = true;
      }
      return {
        ...defMatch,
        ...c,
        name: c.id === 'chain-jks' ? 'JKS Cash & Carry' : c.name,
        admin_email: c.id === 'chain-jks' ? 'jks@jkscashandcarry.com' : c.admin_email,
        plan_id: nextPlanId,
        status: nextStatus,
        is_active: nextStatus === 'active',
        max_branches: c.max_branches || planObj.max_branches,
        max_users: c.max_users || planObj.max_users,
        max_pos_terminals: c.max_pos_terminals || planObj.max_pos_terminals,
        subscription_start_date: c.subscription_start_date || (c.created_at ? c.created_at.split('T')[0] : '2026-01-01'),
        subscription_expiry_date: c.subscription_expiry_date || '2027-12-31',
      };
    });
    const jksIdx = normalized.findIndex((c) => c.id === 'chain-jks' || c.code === 'JKS');
    if (jksIdx === -1) {
      normalized.push(INITIAL_STORE_CHAINS[1]);
      dirty = true;
    }
    if (dirty) {
      localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(normalized));
    }
    return normalized;
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
  if (isAuth && !isUserSuperAdmin(current) && !allowPreAuth) {
    console.warn('Unauthorized: Only Global Super Administrator can switch store organizations.');
    return false;
  }
  localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAIN_ID, chainId);
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
  if (idx === -1) return { success: false, message: 'Organization not found' };

  const updatedStatus = data.status || chains[idx].status || (data.is_active === false ? 'suspended' : 'active');
  chains[idx] = {
    ...chains[idx],
    ...data,
    status: updatedStatus,
    is_active: updatedStatus === 'active',
  };
  localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(chains));

  const settingsKey = chainId === 'chain-default' ? STORAGE_KEYS.SETTINGS : `${STORAGE_KEYS.SETTINGS}_${chainId}`;
  try {
    const rawSettings = localStorage.getItem(settingsKey);
    if (rawSettings) {
      const s = JSON.parse(rawSettings);
      if (data.name) s.business_name = data.name;
      if (data.address) s.business_address = data.address;
      if (data.phone) s.business_phone = data.phone;
      if (data.logo_url !== undefined) s.logo_url = data.logo_url;
      if (data.tax_id !== undefined) s.tax_id = data.tax_id;
      if (data.registration_number !== undefined) s.registration_number = data.registration_number;
      if (data.website !== undefined) s.website = data.website;
      if (data.country !== undefined) s.country = data.country;
      if (data.city !== undefined) s.city = data.city;
      localStorage.setItem(settingsKey, JSON.stringify(s));
    }
  } catch {
    // ignore
  }

  logActivity('UPDATE', 'STORE_CHAINS', chainId, `Updated organization "${chains[idx].name}"`);
  notifyStorageChange();
  return { success: true, message: 'Organization updated successfully', chain: chains[idx] };
}

export function setOrganizationStatus(
  chainId: string,
  status: OrganizationStatus
): { success: boolean; message: string; chain?: StoreChain } {
  const chains = getStoreChains();
  const idx = chains.findIndex((c) => c.id === chainId);
  if (idx === -1) return { success: false, message: 'Organization not found' };
  if (chainId === 'chain-default' && status !== 'active') {
    return { success: false, message: 'Primary platform host organization cannot be suspended or deactivated.' };
  }

  const prevStatus = chains[idx].status || 'active';
  chains[idx].status = status;
  chains[idx].is_active = status === 'active';
  localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(chains));

  const currentUser = getCurrentUser();
  const plan = getPlanById(chains[idx].plan_id);
  recordSubscriptionHistory({
    organization_id: chainId,
    organization_name: chains[idx].name,
    previous_plan_id: plan.id,
    previous_plan_name: plan.name,
    new_plan_id: plan.id,
    new_plan_name: plan.name,
    action: 'status_changed',
    changed_by: currentUser?.full_name || 'Global Admin',
    notes: `Status changed from ${prevStatus} to ${status}`,
  });

  logActivity(
    status === 'active' ? 'ACTIVATE' : 'SUSPEND',
    'STORE_CHAINS',
    chainId,
    `Changed organization "${chains[idx].name}" status to ${status.toUpperCase()}`
  );
  notifyStorageChange();
  return { success: true, message: `Organization "${chains[idx].name}" is now ${status}.`, chain: chains[idx] };
}

export function toggleStoreChainStatus(chainId: string): { success: boolean; message: string } {
  const chains = getStoreChains();
  const chain = chains.find((c) => c.id === chainId);
  if (!chain) return { success: false, message: 'Organization not found' };
  const nextStatus: OrganizationStatus = chain.status === 'active' && chain.is_active ? 'suspended' : 'active';
  return setOrganizationStatus(chainId, nextStatus);
}

export function assignOrganizationPlan(
  chainId: string,
  planId: string,
  overrides?: {
    subscription_start_date?: string;
    subscription_expiry_date?: string;
    max_branches?: number;
    max_users?: number;
    max_pos_terminals?: number;
  }
): { success: boolean; message: string; chain?: StoreChain } {
  const chains = getStoreChains();
  const idx = chains.findIndex((c) => c.id === chainId);
  if (idx === -1) return { success: false, message: 'Organization not found' };

  const newPlan = getPlanById(planId);
  const oldPlan = getPlanById(chains[idx].plan_id);
  const action: SubscriptionHistoryEntry['action'] =
    oldPlan.id === newPlan.id
      ? 'renewed'
      : newPlan.monthly_price > oldPlan.monthly_price
      ? 'upgraded'
      : newPlan.monthly_price < oldPlan.monthly_price
      ? 'downgraded'
      : 'assigned';

  chains[idx] = {
    ...chains[idx],
    plan_id: newPlan.id,
    max_branches: overrides?.max_branches ?? newPlan.max_branches,
    max_users: overrides?.max_users ?? newPlan.max_users,
    max_pos_terminals: overrides?.max_pos_terminals ?? newPlan.max_pos_terminals,
    ...(overrides?.subscription_start_date ? { subscription_start_date: overrides.subscription_start_date } : {}),
    ...(overrides?.subscription_expiry_date ? { subscription_expiry_date: overrides.subscription_expiry_date } : {}),
  };

  localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(chains));

  const currentUser = getCurrentUser();
  recordSubscriptionHistory({
    organization_id: chainId,
    organization_name: chains[idx].name,
    previous_plan_id: oldPlan.id,
    previous_plan_name: oldPlan.name,
    new_plan_id: newPlan.id,
    new_plan_name: newPlan.name,
    action,
    changed_by: currentUser?.full_name || 'Global Admin',
    notes: `Plan ${action}: ${oldPlan.name} -> ${newPlan.name} (Limits: ${chains[idx].max_branches} branches, ${chains[idx].max_users} users)`,
  });

  logActivity(
    'PLAN_CHANGE',
    'STORE_CHAINS',
    chainId,
    `${action.toUpperCase()} plan for "${chains[idx].name}" to ${newPlan.name}`
  );
  notifyStorageChange();
  return { success: true, message: `Assigned "${newPlan.name}" plan to ${chains[idx].name}.`, chain: chains[idx] };
}

export function deleteStoreChain(chainId: string): { success: boolean; message: string } {
  if (chainId === 'chain-default' || chainId === 'chain-jks') {
    return { success: false, message: 'Core system organizations cannot be removed' };
  }
  const chains = getStoreChains();
  const activeId = getActiveChainId();
  if (activeId === chainId) {
    setActiveStoreChain('chain-default');
  }
  const filtered = chains.filter((c) => c.id !== chainId);
  localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(filtered));
  notifyStorageChange();
  return { success: true, message: 'Organization deleted successfully' };
}

export function registerOrganization(data: {
  name: string;
  code?: string;
  business_type?: string;
  industry?: string;
  description?: string;
  registration_number?: string;
  tax_id?: string;
  email?: string;
  website?: string;
  country?: string;
  city?: string;
  logo_url?: string;
  admin_name: string;
  admin_email: string;
  admin_username?: string;
  admin_phone?: string;
  admin_password?: string;
  phone?: string;
  address?: string;
  plan_id?: string;
  subscription_start_date?: string;
  subscription_expiry_date?: string;
  max_branches?: number;
  max_users?: number;
  max_pos_terminals?: number;
  status?: OrganizationStatus;
  switchContext?: boolean;
}): { success: boolean; message: string; chain?: StoreChain; adminUser?: User } {
  const chains = getStoreChains();
  const cleanName = data.name.trim();
  if (!cleanName) {
    return { success: false, message: 'Organization name is required.' };
  }
  if (!data.admin_name.trim() || !data.admin_email.trim()) {
    return { success: false, message: 'Administrator full name and email are required.' };
  }

  const baseCode = (data.code || cleanName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6) || 'ORG')
    .toUpperCase()
    .trim();
  const finalCode = chains.some((c) => c.code.toUpperCase() === baseCode)
    ? `${baseCode}${Date.now().toString().slice(-3)}`
    : baseCode;

  const plan = getPlanById(data.plan_id || 'plan-free');
  const startDate = data.subscription_start_date || new Date().toISOString().split('T')[0];
  const defaultExpiry = new Date();
  defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
  const expiryDate = data.subscription_expiry_date || defaultExpiry.toISOString().split('T')[0];
  const orgStatus: OrganizationStatus = data.status || 'active';

  const newChainId = `org-${Date.now()}`;
  const adminUsername =
    (data.admin_username || data.admin_email.split('@')[0] || 'orgadmin')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '') || 'orgadmin';

  const newChain: StoreChain = {
    id: newChainId,
    name: cleanName,
    code: finalCode,
    business_type: data.business_type || 'Retail & Departmental Store',
    industry: data.industry || 'Retail & General POS',
    description: data.description || '',
    registration_number: data.registration_number || '',
    tax_id: data.tax_id || '',
    website: data.website || '',
    country: data.country || 'Pakistan',
    city: data.city || '',
    logo_url: data.logo_url || '',
    admin_name: data.admin_name.trim(),
    admin_email: data.admin_email.trim(),
    admin_username: adminUsername,
    admin_phone: data.admin_phone || data.phone || '',
    phone: data.phone || data.admin_phone || '',
    address: data.address || '',
    plan_id: plan.id,
    subscription_start_date: startDate,
    subscription_expiry_date: expiryDate,
    max_branches: Number(data.max_branches || plan.max_branches),
    max_users: Number(data.max_users || plan.max_users),
    max_pos_terminals: Number(data.max_pos_terminals || plan.max_pos_terminals),
    status: orgStatus,
    created_at: new Date().toISOString(),
    is_active: orgStatus === 'active',
  };

  const updatedChains = [...chains, newChain];
  localStorage.setItem(STORAGE_KEYS.STORE_CHAINS, JSON.stringify(updatedChains));

  const headOfficeBranchId = `br-${finalCode.toLowerCase()}-01`;
  const headOfficeBranch: StoreBranch = {
    id: headOfficeBranchId,
    organization_id: newChainId,
    name: `${cleanName} - Head Office`,
    code: `${finalCode}-01`,
    branch_type: 'head_office',
    contact_person: data.admin_name.trim(),
    manager_user_id: 1001,
    manager_name: data.admin_name.trim(),
    address: data.address || `${data.city ? data.city + ', ' : ''}${data.country || 'Pakistan'}`,
    phone: data.phone || data.admin_phone || '',
    email: data.email || data.admin_email.trim(),
    city: data.city || '',
    country: data.country || 'Pakistan',
    status: 'active',
    opening_date: startDate,
    is_head_office: true,
    is_active: true,
  };

  const orgRoles = buildDefaultRolesForOrg(newChainId);
  const orgAdminRole = orgRoles.find((r) => r.base_role === 'admin');

  const adminUser: User = {
    id: 1001,
    organization_id: newChainId,
    username: adminUsername,
    password: data.admin_password || 'Admin@123',
    pos_pin: '1234',
    full_name: data.admin_name.trim(),
    email: data.admin_email.trim(),
    phone: data.admin_phone || data.phone || '',
    role: 'admin',
    custom_role_id: orgAdminRole?.id,
    designation: 'Organization Administrator',
    employee_code: `${finalCode}-001`,
    is_active: true,
    account_status: 'active',
    is_super_admin: false,
    created_at: new Date().toISOString(),
    assigned_branch_id: 'all',
    assigned_branches: ['all'],
    permissions: defaultPermissionsByRole('admin'),
  };

  const initialTenantSettings: SystemSettings = {
    business_name: cleanName,
    logo_url: data.logo_url || '',
    business_address: headOfficeBranch.address,
    business_phone: data.phone || '',
    email: data.email || data.admin_email.trim(),
    city: data.city || '',
    country: data.country || 'Pakistan',
    tax_id: data.tax_id || '',
    registration_number: data.registration_number || '',
    website: data.website || '',
    active_branch_id: headOfficeBranchId,
    branches: [headOfficeBranch],
    currency_symbol: 'Rs.',
    default_buy_rate: 0,
    default_sell_rate: 0,
    invoice_prefix: `${finalCode}-INV`,
    purchase_prefix: `${finalCode}-PUR`,
    invoice_footer: `Thank you for shopping at ${cleanName}!`,
    default_tax_rate: 0,
    base_currency: 'PKR',
    active_display_currency: 'PKR',
    currencies: defaultCurrencies,
  };

  localStorage.setItem(`${STORAGE_KEYS.USERS}_${newChainId}`, JSON.stringify([adminUser]));
  localStorage.setItem(`${STORAGE_KEYS.CURRENT_USER}_${newChainId}`, JSON.stringify(adminUser));
  localStorage.setItem(`${STORAGE_KEYS.SETTINGS}_${newChainId}`, JSON.stringify(initialTenantSettings));
  localStorage.setItem(`${STORAGE_KEYS.ROLES}_${newChainId}`, JSON.stringify(orgRoles));
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
  localStorage.setItem(
    `${STORAGE_KEYS.LOGS}_${newChainId}`,
    JSON.stringify([
      {
        id: 1,
        organization_id: newChainId,
        organization_name: cleanName,
        branch_id: headOfficeBranchId,
        branch_name: headOfficeBranch.name,
        user_id: 1,
        username: 'Mobin',
        action: 'CREATE',
        table_name: 'STORE_CHAINS',
        record_id: newChainId,
        details: `Organization "${cleanName}" (${finalCode}) registered on ${plan.name} plan`,
        created_at: new Date().toISOString(),
      },
    ])
  );

  const actor = getCurrentUser();
  recordSubscriptionHistory({
    organization_id: newChainId,
    organization_name: cleanName,
    new_plan_id: plan.id,
    new_plan_name: plan.name,
    action: 'assigned',
    changed_by: actor?.full_name || 'Global Admin',
    notes: `Initial registration on ${plan.name} plan (${newChain.max_branches} branches, ${newChain.max_users} users)`,
  });

  logActivity('CREATE', 'STORE_CHAINS', newChainId, `Registered organization "${cleanName}" (${finalCode}) on ${plan.name} plan`);

  if (data.switchContext) {
    setActiveStoreChain(newChainId, true);
  } else {
    notifyStorageChange();
  }

  return { success: true, message: `Organization "${cleanName}" registered successfully.`, chain: newChain, adminUser };
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
  const res = registerOrganization({
    ...data,
    switchContext: true,
  });
  if (!res.chain) {
    throw new Error(res.message || 'Failed to register organization');
  }
  return res.chain;
}

function getTenantStorageKey(baseKey: string, overrideChainId?: string): string {
  // Global platform keys are shared across all organizations
  if (
    baseKey === STORAGE_KEYS.STORE_CHAINS ||
    baseKey === STORAGE_KEYS.ACTIVE_CHAIN_ID ||
    baseKey === STORAGE_KEYS.SUBSCRIPTION_PLANS ||
    baseKey === STORAGE_KEYS.SUBSCRIPTION_HISTORY
  ) {
    return baseKey;
  }
  const activeChainId = overrideChainId || getActiveChainId();
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
  if ((trimmed === 'jks' || trimmed === 'jks@jkscashandcarry.com') && (!chainId || chainId === 'chain-default')) {
    chainId = 'chain-jks';
  }
  if (chainId) {
    setActiveStoreChain(chainId, true);
  }

  const activeChain = getActiveStoreChain();
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

  // If logging in as jks in chain-jks fallback
  if (!user && (trimmed === 'jks' || trimmed === 'jks@jkscashandcarry.com') && getActiveChainId() === 'chain-jks') {
    const fallbackJksAdmin: User = {
      id: 1001,
      organization_id: 'chain-jks',
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
      account_status: 'active',
      is_super_admin: false,
      created_at: new Date().toISOString(),
      assigned_branch_id: 'all',
      assigned_branches: ['all'],
      permissions: defaultPermissionsByRole('admin'),
    };
    saveUser(fallbackJksAdmin);
    user = fallbackJksAdmin;
  }

  if (!user) {
    return { success: false, message: 'User account not found in selected organization.' };
  }

  if (!user.is_active || user.account_status === 'inactive') {
    return { success: false, message: 'This user account is deactivated.' };
  }

  // Check Organization Status for non-Global-Super-Admin users
  if (!isUserSuperAdmin(user)) {
    const accessState = getOrganizationAccessState(activeChain);
    if (accessState.blocked) {
      return { success: false, message: accessState.reason };
    }
  }

  const pwdInput = (password || '').trim();
  const isDefaultDemoUser = ['mobin', 'admin', 'manager', 'cashier1', 'warehouse1', 'jks', 'jks_manager', 'jks_cashier'].includes(
    (user.username || '').toLowerCase()
  );
  const validPwd = isDefaultDemoUser
    ? !user.password ||
      pwdInput === user.password ||
      pwdInput === user.pos_pin ||
      ['123456', '1234', 'Admin@123', 'admin', '1122', '5678', '3344', '9900', 'password'].includes(pwdInput)
    : !user.password || pwdInput === user.password || pwdInput === user.pos_pin;

  if (!validPwd) {
    return { success: false, message: 'Invalid password or PIN.' };
  }

  const updatedUser = { ...user, last_login: new Date().toISOString() };
  if (!isUserSuperAdmin(updatedUser)) {
    saveUser(updatedUser);
  }
  setCurrentUser(updatedUser);

  // Align active branch to an authorized branch for restricted users
  const authorizedBranches = getAuthorizedBranchesForUser(updatedUser);
  const currentSettings = getSettings();
  if (
    authorizedBranches.length > 0 &&
    !authorizedBranches.some((b) => b.id === currentSettings.active_branch_id)
  ) {
    setActiveBranch(authorizedBranches[0].id);
  }

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
  let currentUser: User | null = null;
  try {
    const rawUser = localStorage.getItem(getTenantStorageKey(STORAGE_KEYS.CURRENT_USER));
    currentUser = rawUser ? JSON.parse(rawUser) : initialUsers[0];
  } catch {
    currentUser = initialUsers[0];
  }

  const activeChain = getActiveStoreChain();
  let branchId = '';
  let branchName = '';
  try {
    const rawSettings = localStorage.getItem(getTenantStorageKey(STORAGE_KEYS.SETTINGS));
    if (rawSettings) {
      const s = JSON.parse(rawSettings);
      branchId = s.active_branch_id || '';
      branchName = s.branch_name || '';
    }
  } catch {
    // ignore
  }

  const activeChainId = getActiveChainId();
  const logs = getStoredItem<ActivityLog[]>(STORAGE_KEYS.LOGS, activeChainId === 'chain-default' ? initialActivityLogs : []);
  const newLog: ActivityLog = {
    id: logs.length ? Math.max(...logs.map((l) => l.id)) + 1 : 1,
    organization_id: activeChain.id,
    organization_name: activeChain.name,
    branch_id: branchId || undefined,
    branch_name: branchName || undefined,
    user_id: currentUser?.id || 1,
    username: currentUser?.full_name || 'System',
    action,
    table_name: (tableName || 'SYSTEM').toUpperCase(),
    record_id: recordId,
    details,
    created_at: new Date().toISOString(),
  };
  setStoredItem(STORAGE_KEYS.LOGS, [newLog, ...logs].slice(0, 500));
}

export function getActivityLogs(): ActivityLog[] {
  const activeChainId = getActiveChainId();
  return getStoredItem<ActivityLog[]>(STORAGE_KEYS.LOGS, activeChainId === 'chain-default' ? initialActivityLogs : []);
}

export function defaultPermissionsByRole(role: UserRole): UserPermissions {
  switch (role) {
    case 'admin':
      return {
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
      };
    case 'manager':
      return {
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
      };
    case 'cashier':
      return {
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
      };
    case 'salesperson':
      return {
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
        reports_view: true,
        settings_manage: false,
        users_manage: false,
        audit_logs_view: false,
      };
    case 'inventory_manager':
      return {
        pos_billing: false,
        sales_view: true,
        sales_discount: false,
        sales_refund: false,
        inventory_view: true,
        inventory_manage: true,
        purchases_manage: true,
        customers_manage: false,
        suppliers_manage: true,
        expenses_manage: false,
        reports_view: true,
        settings_manage: false,
        users_manage: false,
        audit_logs_view: true,
      };
    case 'purchase_manager':
      return {
        pos_billing: false,
        sales_view: false,
        sales_discount: false,
        sales_refund: false,
        inventory_view: true,
        inventory_manage: true,
        purchases_manage: true,
        customers_manage: false,
        suppliers_manage: true,
        expenses_manage: false,
        reports_view: true,
        settings_manage: false,
        users_manage: false,
        audit_logs_view: true,
      };
    case 'accountant':
      return {
        pos_billing: false,
        sales_view: true,
        sales_discount: false,
        sales_refund: false,
        inventory_view: true,
        inventory_manage: false,
        purchases_manage: true,
        customers_manage: true,
        suppliers_manage: true,
        expenses_manage: true,
        reports_view: true,
        settings_manage: false,
        users_manage: false,
        audit_logs_view: true,
      };
    case 'warehouse_staff':
    default:
      return {
        pos_billing: false,
        sales_view: true,
        sales_discount: false,
        sales_refund: false,
        inventory_view: true,
        inventory_manage: true,
        purchases_manage: true,
        customers_manage: false,
        suppliers_manage: true,
        expenses_manage: false,
        reports_view: false,
        settings_manage: false,
        users_manage: false,
        audit_logs_view: false,
      };
  }
}

export function createMatrixForRole(baseRole: UserRole): GranularPermissionMatrix {
  const perms = defaultPermissionsByRole(baseRole);
  const full = (on: boolean, canApprove = false): ModulePermissionActions => ({
    access: on,
    view: on,
    add: on,
    edit: on,
    delete: on && baseRole === 'admin',
    approve: on && (canApprove || baseRole === 'admin' || baseRole === 'manager'),
    print: on,
    export: on && (baseRole === 'admin' || baseRole === 'manager' || baseRole === 'accountant'),
  });

  return {
    dashboard: { access: true, view: true, add: false, edit: false, delete: false, approve: false, print: true, export: baseRole === 'admin' || baseRole === 'manager' },
    pos: { access: perms.pos_billing, view: perms.pos_billing, add: perms.pos_billing, edit: perms.sales_discount, delete: perms.sales_refund, approve: perms.sales_refund, print: perms.pos_billing, export: perms.pos_billing },
    inventory: { access: perms.inventory_view, view: perms.inventory_view, add: perms.inventory_manage, edit: perms.inventory_manage, delete: perms.inventory_manage && baseRole === 'admin', approve: perms.inventory_manage, print: perms.inventory_view, export: perms.inventory_view },
    purchases: full(perms.purchases_manage, true),
    sales: { access: perms.sales_view, view: perms.sales_view, add: perms.pos_billing, edit: perms.sales_discount, delete: perms.sales_refund, approve: perms.sales_refund, print: perms.sales_view, export: perms.reports_view },
    customers: full(perms.customers_manage),
    suppliers: full(perms.suppliers_manage),
    payments: full(perms.customers_manage || perms.suppliers_manage || perms.expenses_manage),
    expenses: full(perms.expenses_manage, true),
    reports: { access: perms.reports_view, view: perms.reports_view, add: false, edit: false, delete: false, approve: false, print: perms.reports_view, export: perms.reports_view },
    organization: { access: baseRole === 'admin' || baseRole === 'manager', view: baseRole === 'admin' || baseRole === 'manager', add: baseRole === 'admin', edit: baseRole === 'admin', delete: baseRole === 'admin', approve: baseRole === 'admin', print: baseRole === 'admin', export: baseRole === 'admin' },
    users: full(perms.users_manage, true),
    settings: full(perms.settings_manage, true),
    audit_logs: { access: perms.audit_logs_view, view: perms.audit_logs_view, add: false, edit: false, delete: false, approve: false, print: perms.audit_logs_view, export: perms.audit_logs_view },
  };
}

export function buildDefaultRolesForOrg(orgId: string): RoleDefinition[] {
  const now = new Date().toISOString();
  const templates: Array<{ idSuffix: string; name: string; base_role: UserRole; description: string; branch_access: 'all' | 'assigned' }> = [
    { idSuffix: 'org-admin', name: 'Organization Admin', base_role: 'admin', description: 'Full organization-wide administration across branches, staff, roles, and POS.', branch_access: 'all' },
    { idSuffix: 'branch-manager', name: 'Branch Manager', base_role: 'manager', description: 'Manage assigned branch operations, staff, stock, and branch reports.', branch_access: 'assigned' },
    { idSuffix: 'cashier', name: 'Cashier', base_role: 'cashier', description: 'Counter checkout, customer lookup, receipts, and daily shift billing.', branch_access: 'assigned' },
    { idSuffix: 'salesperson', name: 'Salesperson', base_role: 'salesperson', description: 'Retail billing, customer credit accounts, and sales summaries.', branch_access: 'assigned' },
    { idSuffix: 'inventory-manager', name: 'Inventory Manager', base_role: 'inventory_manager', description: 'Manage items, categories, brands, stock counts, and reorders.', branch_access: 'assigned' },
    { idSuffix: 'purchase-manager', name: 'Purchase Manager', base_role: 'purchase_manager', description: 'Manage purchase orders, stock-in, and supplier bills.', branch_access: 'assigned' },
    { idSuffix: 'accountant', name: 'Accountant', base_role: 'accountant', description: 'Manage financial ledgers, supplier/customer payments, expenses, and reports.', branch_access: 'all' },
    { idSuffix: 'warehouse-staff', name: 'Warehouse Staff', base_role: 'warehouse_staff', description: 'Receive inventory shipments and manage warehouse stock.', branch_access: 'assigned' },
  ];

  return templates.map((t) => ({
    id: `role-${orgId}-${t.idSuffix}`,
    organization_id: orgId,
    name: t.name,
    base_role: t.base_role,
    description: t.description,
    branch_access: t.branch_access,
    permissions: defaultPermissionsByRole(t.base_role),
    matrix: createMatrixForRole(t.base_role),
    is_system: true,
    created_at: now,
  }));
}

export function getRoles(chainId?: string): RoleDefinition[] {
  const targetChainId = chainId || getActiveChainId();
  const key = getTenantStorageKey(STORAGE_KEYS.ROLES, targetChainId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const seeded = buildDefaultRolesForOrg(targetChainId);
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = buildDefaultRolesForOrg(targetChainId);
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    return parsed;
  } catch {
    return buildDefaultRolesForOrg(targetChainId);
  }
}

export function saveRole(
  roleInput: Partial<RoleDefinition> & { name: string; base_role: UserRole }
): { success: boolean; message: string; role?: RoleDefinition } {
  const orgId = getActiveChainId();
  const roles = getRoles(orgId);
  const key = getTenantStorageKey(STORAGE_KEYS.ROLES, orgId);
  const cleanName = roleInput.name.trim();
  if (!cleanName) return { success: false, message: 'Role name is required.' };

  if (roleInput.id) {
    const idx = roles.findIndex((r) => r.id === roleInput.id);
    if (idx === -1) return { success: false, message: 'Role not found.' };
    roles[idx] = {
      ...roles[idx],
      ...roleInput,
      name: cleanName,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(roles));

    // Propagate updated role permissions to linked users
    if (roleInput.permissions) {
      const users = getUsers();
      let usersChanged = false;
      const updatedUsers = users.map((u) => {
        if (u.custom_role_id === roleInput.id) {
          usersChanged = true;
          return { ...u, permissions: { ...roleInput.permissions! } };
        }
        return u;
      });
      if (usersChanged) {
        setStoredItem(STORAGE_KEYS.USERS, updatedUsers);
      }
    }

    logActivity('ROLE_CHANGE', 'ROLES', roles[idx].id, `Updated role permissions for "${roles[idx].name}"`);
    notifyStorageChange();
    return { success: true, message: `Role "${roles[idx].name}" updated.`, role: roles[idx] };
  }

  if (roles.some((r) => r.name.toLowerCase() === cleanName.toLowerCase())) {
    return { success: false, message: 'A role with this name already exists in this organization.' };
  }

  const newRole: RoleDefinition = {
    id: `role-${orgId}-${Date.now()}`,
    organization_id: orgId,
    name: cleanName,
    base_role: roleInput.base_role,
    description: roleInput.description || '',
    branch_access: roleInput.branch_access || 'assigned',
    permissions: roleInput.permissions || defaultPermissionsByRole(roleInput.base_role),
    matrix: roleInput.matrix || createMatrixForRole(roleInput.base_role),
    is_system: false,
    created_at: new Date().toISOString(),
  };

  const nextRoles = [...roles, newRole];
  localStorage.setItem(key, JSON.stringify(nextRoles));
  logActivity('CREATE', 'ROLES', newRole.id, `Created custom role "${newRole.name}"`);
  notifyStorageChange();
  return { success: true, message: `Role "${newRole.name}" created.`, role: newRole };
}

export function deleteRole(roleId: string): { success: boolean; message: string } {
  const orgId = getActiveChainId();
  const roles = getRoles(orgId);
  const target = roles.find((r) => r.id === roleId);
  if (!target) return { success: false, message: 'Role not found.' };
  if (target.is_system) return { success: false, message: 'Core system role templates cannot be deleted.' };

  const key = getTenantStorageKey(STORAGE_KEYS.ROLES, orgId);
  localStorage.setItem(key, JSON.stringify(roles.filter((r) => r.id !== roleId)));
  logActivity('DELETE', 'ROLES', roleId, `Deleted custom role "${target.name}"`);
  notifyStorageChange();
  return { success: true, message: `Role "${target.name}" deleted.` };
}

// Cross-tenant helpers for Global Admin SaaS Dashboard
export function getOrganizationUsers(chainId: string): User[] {
  const key = getTenantStorageKey(STORAGE_KEYS.USERS, chainId);
  try {
    const raw = localStorage.getItem(key);
    let list: User[] = raw ? JSON.parse(raw) : chainId === 'chain-default' ? initialUsers : [];
    if (!Array.isArray(list)) list = [];
    // Exclude Global Super Admin from organization employee seat counts
    return list.filter((u) => u && !isUserSuperAdmin(u));
  } catch {
    return [];
  }
}

export function getOrganizationBranches(chainId: string): StoreBranch[] {
  const key = getTenantStorageKey(STORAGE_KEYS.SETTINGS, chainId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const s: SystemSettings = JSON.parse(raw);
      if (Array.isArray(s.branches) && s.branches.length > 0) {
        return s.branches;
      }
    }
  } catch {
    // ignore
  }
  if (chainId === 'chain-default') {
    return (initialSettings.branches || []).map((b) => ({
      ...b,
      organization_id: 'chain-default',
      status: b.status || 'active',
      is_active: b.is_active !== false,
    }));
  }
  if (chainId === 'chain-jks') {
    return [
      { id: 'br-jks-1', organization_id: 'chain-jks', name: 'JKS Cash & Carry - Main Branch', code: 'JKS-01', branch_type: 'head_office', address: 'Main Boulevard, Gulberg, Lahore', city: 'Lahore', country: 'Pakistan', status: 'active', is_head_office: true, is_active: true },
      { id: 'br-jks-2', organization_id: 'chain-jks', name: 'JKS Cash & Carry - Ravi Road Branch', code: 'JKS-02', branch_type: 'retail_outlet', address: 'Main Market, Ravi Road, Lahore', city: 'Lahore', country: 'Pakistan', status: 'active', is_active: true },
      { id: 'br-jks-3', organization_id: 'chain-jks', name: 'JKS Cash & Carry - Express Mart', code: 'JKS-03', branch_type: 'express_mart', address: 'DHA Phase 5, Lahore', city: 'Lahore', country: 'Pakistan', status: 'active', is_active: true },
    ];
  }
  const chain = getStoreChains().find((c) => c.id === chainId);
  return [
    {
      id: 'br-head-office',
      organization_id: chainId,
      name: `${chain?.name || 'Store'} - Head Office`,
      code: `${chain?.code || 'ORG'}-01`,
      branch_type: 'head_office',
      address: chain?.address || '',
      city: chain?.city || '',
      country: chain?.country || 'Pakistan',
      status: 'active',
      is_head_office: true,
      is_active: true,
    },
  ];
}

export function getOrganizationSales(chainId: string): Sale[] {
  const key = getTenantStorageKey(STORAGE_KEYS.SALES, chainId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    }
    return chainId === 'chain-default' ? initialSales : [];
  } catch {
    return [];
  }
}

export function getOrganizationUsageStats(chainId: string): {
  branches: StoreBranch[];
  branchCount: number;
  activeBranchCount: number;
  users: User[];
  userCount: number;
  activeUserCount: number;
  salesCount: number;
  totalRevenue: number;
  maxBranches: number;
  maxUsers: number;
  maxPosTerminals: number;
  plan: SubscriptionPlan;
} {
  const chain = getStoreChains().find((c) => c.id === chainId);
  const limits = getEffectiveOrgLimits(chain);
  const branches = getOrganizationBranches(chainId);
  const users = getOrganizationUsers(chainId);
  const sales = getOrganizationSales(chainId);
  const totalRevenue = sales
    .filter((s) => s.status !== 'cancelled')
    .reduce((sum, s) => sum + Number(s.grand_total || 0), 0);

  return {
    branches,
    branchCount: branches.length,
    activeBranchCount: branches.filter((b) => b.status !== 'inactive' && b.is_active !== false).length,
    users,
    userCount: users.length,
    activeUserCount: users.filter((u) => u.is_active).length,
    salesCount: sales.length,
    totalRevenue,
    maxBranches: limits.maxBranches,
    maxUsers: limits.maxUsers,
    maxPosTerminals: limits.maxPosTerminals,
    plan: limits.plan,
  };
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
  if (!isSuper) {
    userData.is_super_admin = false;
  }
  const activeChain = getActiveStoreChain();
  const limits = getEffectiveOrgLimits(activeChain);
  const users = getUsers();
  const safeName = userData.full_name || 'User';
  const domainHint = activeChain.code ? `${activeChain.code.toLowerCase()}.rozana.pos` : 'rozana.pos';
  const emailVal = userData.email || `${(userData.username || safeName).toLowerCase().replace(/\s+/g, '')}@${domainHint}`;

  if (userData.id) {
    const idx = users.findIndex((u) => u.id === userData.id);
    if (idx === -1) return { success: false, message: 'User not found' };
    const normalizedBranches =
      userData.assigned_branches && userData.assigned_branches.length > 0
        ? userData.assigned_branches
        : userData.assigned_branch_id
        ? [userData.assigned_branch_id]
        : users[idx].assigned_branches;

    users[idx] = {
      ...users[idx],
      ...userData,
      organization_id: users[idx].organization_id || activeChain.id,
      assigned_branches: normalizedBranches,
      assigned_branch_id:
        userData.assigned_branch_id ||
        (normalizedBranches?.includes('all') ? 'all' : normalizedBranches?.[0]) ||
        users[idx].assigned_branch_id,
      account_status:
        userData.is_active === false ? 'inactive' : (userData.account_status || users[idx].account_status || 'active'),
      updated_at: new Date().toISOString(),
    };
    setStoredItem(STORAGE_KEYS.USERS, users);
    logActivity('UPDATE', 'Users', userData.id, `Updated user ${userData.full_name}`);
    return { success: true, message: 'User updated successfully', user: users[idx] };
  } else {
    // Enforce plan max_users limit for new non-super-admin users
    if (!userData.is_super_admin) {
      const tenantUserCount = users.filter((u) => !isUserSuperAdmin(u)).length;
      if (tenantUserCount >= limits.maxUsers) {
        return {
          success: false,
          message: `User seat limit reached (${tenantUserCount}/${limits.maxUsers}) on "${limits.plan.name}" plan. Upgrade plan to add more users.`,
        };
      }
    }

    const maxId = users.length ? Math.max(...users.map((u) => u.id || 0)) : 0;
    const nextCodeNum = maxId + 1;
    const assignedBranchPrimary = userData.assigned_branch_id || userData.assigned_branches?.[0] || 'br-1';
    const assignedBranchesList =
      userData.assigned_branches && userData.assigned_branches.length > 0
        ? userData.assigned_branches
        : [assignedBranchPrimary];

    const newUser: User = {
      id: nextCodeNum,
      organization_id: userData.organization_id || activeChain.id,
      full_name: safeName,
      username: userData.username || safeName.toLowerCase().replace(/\s+/g, ''),
      email: emailVal,
      phone: userData.phone || '',
      role: userData.role || 'cashier',
      custom_role_id: userData.custom_role_id,
      designation: userData.designation || `${(userData.role || 'cashier').replace('_', ' ').toUpperCase()} Staff`,
      employee_code: userData.employee_code || `EMP-${nextCodeNum.toString().padStart(3, '0')}`,
      assigned_branch_id: assignedBranchPrimary,
      assigned_branches: assignedBranchesList,
      pos_pin: userData.pos_pin || '1234',
      permissions: userData.permissions || defaultPermissionsByRole(userData.role || 'cashier'),
      is_active: userData.is_active ?? true,
      account_status: userData.is_active === false ? 'inactive' : (userData.account_status || 'active'),
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
  const currentUser = getCurrentUser();
  if (!isUserSuperAdmin(currentUser)) {
    const access = getOrganizationAccessState(getActiveStoreChain());
    if (access.blocked) return { success: false, message: access.reason };
  }
  const purchases = getPurchases();
  const woodStocks = getWoodStocks().filter((w) => w.sub_category_id === data.sub_category_id);

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
  const currentUser = getCurrentUser();
  if (!isUserSuperAdmin(currentUser)) {
    const access = getOrganizationAccessState(getActiveStoreChain());
    if (access.blocked) return { success: false, message: access.reason };
  }
  if (!data.items || data.items.length === 0) {
    return { success: false, message: 'Cart is empty' };
  }

  const stocks = getWoodStocks();
  const sales = getSales();
  const saleItems = getSaleItems();

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
  const currentUser = getCurrentUser();
  if (!isUserSuperAdmin(currentUser)) {
    const access = getOrganizationAccessState(getActiveStoreChain());
    if (access.blocked) return { success: false, message: access.reason };
  }
  const payments = getPayments();

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

export function getAuthorizedBranchesForUser(user?: User | null): StoreBranch[] {
  const targetUser = user || getCurrentUser();
  const settings = getSettings();
  const allBranches = settings.branches || [];
  if (!targetUser || isUserSuperAdmin(targetUser) || targetUser.role === 'admin') {
    return allBranches;
  }
  if (
    targetUser.assigned_branch_id === 'all' ||
    (Array.isArray(targetUser.assigned_branches) && targetUser.assigned_branches.includes('all'))
  ) {
    return allBranches;
  }
  const allowedIds = new Set<string>([
    ...(Array.isArray(targetUser.assigned_branches) ? targetUser.assigned_branches : []),
    ...(targetUser.assigned_branch_id ? [targetUser.assigned_branch_id] : []),
  ]);
  const filtered = allBranches.filter((b) => allowedIds.has(b.id));
  return filtered.length > 0 ? filtered : allBranches.slice(0, 1);
}

export function getBranchesForOrg(): StoreBranch[] {
  const settings = getSettings();
  const activeChain = getActiveStoreChain();
  return (settings.branches || []).map((b) => ({
    ...b,
    organization_id: b.organization_id || activeChain.id,
    status: b.status || (b.is_active === false ? 'inactive' : 'active'),
    is_active: b.is_active !== false && b.status !== 'inactive',
  }));
}

export function saveBranchForOrg(
  branchData: Partial<StoreBranch> & { name: string }
): { success: boolean; message: string; branch?: StoreBranch } {
  const currentSettings = getSettings();
  const activeChain = getActiveStoreChain();
  const limits = getEffectiveOrgLimits(activeChain);
  let branches = [...(currentSettings.branches || [])];

  const cleanName = branchData.name.trim();
  const cleanCode = (branchData.code || `${activeChain.code}-${String(branches.length + 1).padStart(2, '0')}`)
    .trim()
    .toUpperCase();

  if (!cleanName) {
    return { success: false, message: 'Branch name is required.' };
  }

  // Unique branch code check within organization
  const duplicateCode = branches.some(
    (b) => b.id !== branchData.id && (b.code || '').trim().toUpperCase() === cleanCode
  );
  if (duplicateCode) {
    return { success: false, message: `Branch code "${cleanCode}" already exists in ${activeChain.name}.` };
  }

  if (branchData.is_head_office) {
    branches = branches.map((b) => ({ ...b, is_head_office: false }));
  }

  let savedBranch: StoreBranch;
  if (branchData.id && branches.some((b) => b.id === branchData.id)) {
    branches = branches.map((b) => {
      if (b.id !== branchData.id) return b;
      const nextStatus = branchData.status || b.status || 'active';
      savedBranch = {
        ...b,
        ...branchData,
        organization_id: activeChain.id,
        name: cleanName,
        code: cleanCode,
        status: nextStatus,
        is_active: nextStatus === 'active',
      };
      return savedBranch;
    });
    savedBranch = branches.find((b) => b.id === branchData.id)!;
    logActivity('UPDATE', 'BRANCHES', savedBranch.id, `Updated branch "${savedBranch.name}" (${savedBranch.code})`);
  } else {
    if (branches.length >= limits.maxBranches) {
      return {
        success: false,
        message: `Branch limit reached (${branches.length}/${limits.maxBranches}) for "${limits.plan.name}" plan. Please upgrade plan to add more branches.`,
      };
    }
    const nextStatus = branchData.status || 'active';
    savedBranch = {
      id: branchData.id || `br-${Date.now()}`,
      organization_id: activeChain.id,
      name: cleanName,
      code: cleanCode,
      branch_type: branchData.branch_type || (branches.length === 0 ? 'head_office' : 'retail_outlet'),
      contact_person: branchData.contact_person || '',
      manager_user_id: branchData.manager_user_id || null,
      manager_name: branchData.manager_name || '',
      address: branchData.address || '',
      address_line_2: branchData.address_line_2 || '',
      phone: branchData.phone || '',
      cell_phone: branchData.cell_phone || '',
      email: branchData.email || '',
      region: branchData.region || '',
      city: branchData.city || '',
      postal_code: branchData.postal_code || '',
      country: branchData.country || activeChain.country || 'Pakistan',
      status: nextStatus,
      opening_date: branchData.opening_date || new Date().toISOString().split('T')[0],
      is_head_office: branchData.is_head_office ?? branches.length === 0,
      is_active: nextStatus === 'active',
    };
    branches.push(savedBranch);
    logActivity('CREATE', 'BRANCHES', savedBranch.id, `Created branch "${savedBranch.name}" (${savedBranch.code})`);
  }

  saveSettings({ ...currentSettings, branches });
  return { success: true, message: `Branch "${savedBranch.name}" saved successfully.`, branch: savedBranch };
}

export function toggleBranchStatus(branchId: string): { success: boolean; message: string } {
  const currentSettings = getSettings();
  const branches = [...(currentSettings.branches || [])];
  const idx = branches.findIndex((b) => b.id === branchId);
  if (idx === -1) return { success: false, message: 'Branch not found.' };

  const currentStatus = branches[idx].status || (branches[idx].is_active === false ? 'inactive' : 'active');
  if (currentStatus === 'active') {
    const activeCount = branches.filter((b) => (b.status || 'active') === 'active').length;
    if (activeCount <= 1) {
      return { success: false, message: 'Organization must maintain at least one active branch.' };
    }
  }

  const nextStatus: 'active' | 'inactive' = currentStatus === 'active' ? 'inactive' : 'active';
  branches[idx] = { ...branches[idx], status: nextStatus, is_active: nextStatus === 'active' };
  saveSettings({ ...currentSettings, branches });
  logActivity('TOGGLE_STATUS', 'BRANCHES', branchId, `Branch "${branches[idx].name}" marked ${nextStatus.toUpperCase()}`);
  return { success: true, message: `Branch "${branches[idx].name}" is now ${nextStatus}.` };
}

export function deleteBranchForOrg(branchId: string): { success: boolean; message: string } {
  const currentSettings = getSettings();
  const branches = [...(currentSettings.branches || [])];
  if (branches.length <= 1) {
    return { success: false, message: 'Organization must maintain at least one branch.' };
  }
  const target = branches.find((b) => b.id === branchId);
  if (!target) return { success: false, message: 'Branch not found.' };
  const remaining = branches.filter((b) => b.id !== branchId);
  const nextActiveId = currentSettings.active_branch_id === branchId ? remaining[0].id : currentSettings.active_branch_id;
  saveSettings({ ...currentSettings, branches: remaining, active_branch_id: nextActiveId });
  logActivity('DELETE', 'BRANCHES', branchId, `Removed branch "${target.name}"`);
  return { success: true, message: `Branch "${target.name}" removed.` };
}

export function setActiveBranch(branchId: string): { success: boolean; message: string } {
  const current = getSettings();
  const currentUser = getCurrentUser();
  const branches = current.branches || [];
  const selected = branches.find((b) => b.id === branchId);
  if (!selected) return { success: false, message: 'Branch not found' };

  if (!isUserSuperAdmin(currentUser) && currentUser?.role !== 'admin') {
    const authorized = getAuthorizedBranchesForUser(currentUser);
    if (!authorized.some((b) => b.id === branchId)) {
      return { success: false, message: 'Access denied: You are not assigned to this branch.' };
    }
  }

  if (selected.status === 'inactive' || selected.is_active === false) {
    return { success: false, message: `Branch "${selected.name}" is inactive.` };
  }

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

export function hydrateFromPostgresSnapshot(snapshot: Record<string, unknown[]>): {
  syncedTables: number;
  totalRows: number;
} {
  if (!snapshot || typeof snapshot !== 'object') {
    return { syncedTables: 0, totalRows: 0 };
  }

  let syncedTables = 0;
  let totalRows = 0;

  const num = (val: unknown, fallback = 0): number => {
    if (val === null || val === undefined || val === '') return fallback;
    const parsed = Number(val);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  if (Array.isArray(snapshot.ITEM_GROUPS) && snapshot.ITEM_GROUPS.length > 0) {
    const mapped = snapshot.ITEM_GROUPS.map((r: any) => ({
      id: num(r.id),
      group_id: r.group_id || `GRP-${r.id}`,
      group_description: r.group_description || '',
      is_active: r.is_active !== false,
      created_by: num(r.created_by, 1),
      created_at: r.created_at || new Date().toISOString(),
    }));
    setStoredItem(STORAGE_KEYS.ITEM_GROUPS, mapped);
    syncedTables++;
    totalRows += mapped.length;
  }

  if (Array.isArray(snapshot.CATEGORIES) && snapshot.CATEGORIES.length > 0) {
    const mapped = snapshot.CATEGORIES.map((r: any) => ({
      id: num(r.id),
      item_group_id: r.item_group_id ? num(r.item_group_id) : undefined,
      name: r.name || '',
      description: r.description || '',
      is_active: r.is_active !== false,
      created_by: num(r.created_by, 1),
      created_at: r.created_at || new Date().toISOString(),
    }));
    setStoredItem(STORAGE_KEYS.CATEGORIES, mapped);
    syncedTables++;
    totalRows += mapped.length;
  }

  if (Array.isArray(snapshot.BRANDS) && snapshot.BRANDS.length > 0) {
    const mapped = snapshot.BRANDS.map((r: any) => ({
      id: num(r.id),
      code: r.code || `BRD-${r.id}`,
      name: r.name || '',
      description: r.description || '',
      is_active: r.is_active !== false,
      created_by: num(r.created_by, 1),
      created_at: r.created_at || new Date().toISOString(),
    }));
    setStoredItem(STORAGE_KEYS.BRANDS, mapped);
    syncedTables++;
    totalRows += mapped.length;
  }

  if (Array.isArray(snapshot.ITEM_DEFINITIONS) && snapshot.ITEM_DEFINITIONS.length > 0) {
    const mapped = snapshot.ITEM_DEFINITIONS.map((r: any) => ({
      id: num(r.id),
      item_group_id: r.item_group_id ? num(r.item_group_id) : undefined,
      category_id: r.category_id ? num(r.category_id) : undefined,
      brand_id: r.brand_id ? num(r.brand_id) : undefined,
      item_code: r.item_code || r.barcode || '',
      barcode: r.barcode || r.item_code || '',
      item_name: r.item_name || '',
      national_language_item_name: r.national_language_item_name || undefined,
      unit_of_measure: r.unit_of_measure || 'PCS',
      publisher_vendor: r.publisher_vendor || undefined,
      image_url: r.image_url || undefined,
      reorder_level: num(r.reorder_level, 10),
      reorder_qty: num(r.reorder_qty, 50),
      printed_price: num(r.printed_price),
      purchase_discount_percent: num(r.purchase_discount_percent),
      purchase_rate: num(r.purchase_rate),
      weighted_average_rate: num(r.weighted_average_rate),
      sale_discount_percent: num(r.sale_discount_percent),
      sale_rate: num(r.sale_rate),
      margin_percent: num(r.margin_percent),
      packing: num(r.packing, 1),
      bulk_rate: num(r.bulk_rate),
      ctn_rate: num(r.ctn_rate),
      ws_rate: num(r.ws_rate),
      bulk_qty: num(r.bulk_qty),
      stock_quantity: num(r.stock_quantity),
      is_active: r.is_active !== false,
      created_by: num(r.created_by, 1),
      created_at: r.created_at || new Date().toISOString(),
    }));
    setStoredItem(STORAGE_KEYS.ITEM_DEFINITIONS, mapped);
    syncedTables++;
    totalRows += mapped.length;
  }

  if (Array.isArray(snapshot.CUSTOMERS) && snapshot.CUSTOMERS.length > 0) {
    const mapped = snapshot.CUSTOMERS.map((r: any) => ({
      id: num(r.id),
      name: r.name || '',
      phone: r.phone || '',
      address: r.address || '',
      total_purchase: num(r.total_purchase),
      total_paid: num(r.total_paid),
      total_due: num(r.total_due),
      loyalty_points: num(r.loyalty_points),
      qr_code: r.qr_code || undefined,
      custom_redemption_rate: r.custom_redemption_rate !== null && r.custom_redemption_rate !== undefined ? num(r.custom_redemption_rate) : null,
      is_active: r.is_active !== false,
      created_by: num(r.created_by, 1),
      created_at: r.created_at || new Date().toISOString(),
    }));
    setStoredItem(STORAGE_KEYS.CUSTOMERS, mapped);
    syncedTables++;
    totalRows += mapped.length;
  }

  if (Array.isArray(snapshot.SUPPLIERS) && snapshot.SUPPLIERS.length > 0) {
    const mapped = snapshot.SUPPLIERS.map((r: any) => ({
      id: num(r.id),
      name: r.name || '',
      phone: r.phone || '',
      address: r.address || '',
      is_active: r.is_active !== false,
      created_by: num(r.created_by, 1),
      created_at: r.created_at || new Date().toISOString(),
    }));
    setStoredItem(STORAGE_KEYS.SUPPLIERS, mapped);
    syncedTables++;
    totalRows += mapped.length;
  }

  if (Array.isArray(snapshot.PURCHASES) && snapshot.PURCHASES.length > 0) {
    const mapped = snapshot.PURCHASES.map((r: any) => ({
      id: num(r.id),
      purchase_no: r.purchase_no || `PUR-${r.id}`,
      supplier_id: r.supplier_id ? num(r.supplier_id) : null,
      sub_category_id: num(r.item_id || r.sub_category_id),
      total_pieces: num(r.quantity || r.total_pieces, 1),
      total_cft: num(r.quantity || r.total_cft, 1),
      rate_per_cft: num(r.unit_cost || r.rate_per_cft),
      total_amount: num(r.total_amount),
      paid_amount: num(r.paid_amount),
      due_amount: num(r.due_amount),
      purchase_date: r.purchase_date ? String(r.purchase_date).split('T')[0] : new Date().toISOString().split('T')[0],
      notes: r.notes || '',
      status: r.status || 'completed',
      created_by: num(r.created_by, 1),
      created_at: r.created_at || new Date().toISOString(),
    }));
    setStoredItem(STORAGE_KEYS.PURCHASES, mapped);
    syncedTables++;
    totalRows += mapped.length;
  }

  if (Array.isArray(snapshot.SALES) && snapshot.SALES.length > 0) {
    const mapped = snapshot.SALES.map((r: any) => ({
      id: num(r.id),
      invoice_no: r.invoice_no || `INV-${r.id}`,
      customer_id: r.customer_id ? num(r.customer_id) : null,
      total_items: num(r.total_items, 1),
      total_cft: num(r.total_items, 1),
      subtotal: num(r.subtotal),
      tax_rate: num(r.tax_rate),
      tax_amount: num(r.tax_amount),
      discount: num(r.discount),
      grand_total: num(r.grand_total),
      paid_amount: num(r.paid_amount),
      due_amount: num(r.due_amount),
      payment_method: r.payment_method || 'cash',
      points_earned: num(r.points_earned),
      points_redeemed: num(r.points_redeemed),
      points_discount_amount: num(r.points_discount_amount),
      sale_date: r.sale_date || new Date().toISOString(),
      status: r.status || 'completed',
      notes: r.notes || '',
      created_by: num(r.created_by, 1),
      created_at: r.created_at || new Date().toISOString(),
    }));
    setStoredItem(STORAGE_KEYS.SALES, mapped);
    syncedTables++;
    totalRows += mapped.length;
  }

  if (Array.isArray(snapshot.SALE_ITEMS) && snapshot.SALE_ITEMS.length > 0) {
    const mapped = snapshot.SALE_ITEMS.map((r: any) => ({
      id: num(r.id),
      sale_id: num(r.sale_id),
      wood_stock_id: r.item_def_id ? num(r.item_def_id) : undefined,
      serial: r.serial_no || '',
      sku: r.sku || '',
      description: r.description || '',
      qty: num(r.quantity, 1),
      quantity: num(r.quantity, 1),
      rate: num(r.unit_price),
      unit_price: num(r.unit_price),
      line_total: num(r.subtotal),
      subtotal: num(r.subtotal),
    }));
    setStoredItem(STORAGE_KEYS.SALE_ITEMS, mapped);
    syncedTables++;
    totalRows += mapped.length;
  }

  if (Array.isArray(snapshot.PAYMENTS) && snapshot.PAYMENTS.length > 0) {
    const mapped = snapshot.PAYMENTS.map((r: any) => ({
      id: num(r.id),
      sale_id: r.sale_id ? num(r.sale_id) : null,
      purchase_id: r.purchase_id ? num(r.purchase_id) : null,
      payment_type: r.payment_type || 'customer_payment',
      amount: num(r.amount),
      payment_method: r.payment_method || 'cash',
      reference_no: r.reference_no || '',
      payment_date: r.payment_date ? String(r.payment_date).split('T')[0] : new Date().toISOString().split('T')[0],
      notes: r.notes || '',
      created_by: num(r.created_by, 1),
      created_at: r.created_at || new Date().toISOString(),
    }));
    setStoredItem(STORAGE_KEYS.PAYMENTS, mapped);
    syncedTables++;
    totalRows += mapped.length;
  }

  if (Array.isArray(snapshot.EXPENSES) && snapshot.EXPENSES.length > 0) {
    const mapped = snapshot.EXPENSES.map((r: any) => ({
      id: num(r.id),
      title: r.title || '',
      category: r.category || 'other',
      amount: num(r.amount),
      expense_date: r.expense_date ? String(r.expense_date).split('T')[0] : new Date().toISOString().split('T')[0],
      notes: r.notes || '',
      created_by: num(r.created_by, 1),
      created_at: r.created_at || new Date().toISOString(),
    }));
    setStoredItem(STORAGE_KEYS.EXPENSES, mapped);
    syncedTables++;
    totalRows += mapped.length;
  }

  if (Array.isArray(snapshot.ACTIVITY_LOGS) && snapshot.ACTIVITY_LOGS.length > 0) {
    const mapped = snapshot.ACTIVITY_LOGS.map((r: any) => ({
      id: num(r.id),
      user_id: num(r.user_id, 1),
      username: r.username || 'system',
      action: r.action || 'UPDATE',
      table_name: r.table_name || 'SYSTEM',
      record_id: r.record_id || '',
      details: r.details || '',
      created_at: r.created_at || new Date().toISOString(),
    }));
    setStoredItem(STORAGE_KEYS.LOGS, mapped);
    syncedTables++;
    totalRows += mapped.length;
  }

  notifyStorageChange();
  return { syncedTables, totalRows };
}

