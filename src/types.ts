export type UserRole = 'admin' | 'manager' | 'cashier' | 'warehouse_staff' | 'inventory_manager' | 'accountant';

export interface UserPermissions {
  pos_billing: boolean;
  sales_view: boolean;
  sales_discount: boolean;
  sales_refund: boolean;
  inventory_view: boolean;
  inventory_manage: boolean;
  purchases_manage: boolean;
  customers_manage: boolean;
  suppliers_manage: boolean;
  expenses_manage: boolean;
  reports_view: boolean;
  settings_manage: boolean;
  users_manage: boolean;
  audit_logs_view: boolean;
}

export interface User {
  id: number;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  designation?: string;
  employee_code?: string;
  assigned_branch_id?: string; // 'all' or branch id like 'br-1'
  pos_pin?: string;
  password?: string;
  permissions?: UserPermissions;
  avatar?: string;
  is_active: boolean;
  is_super_admin?: boolean; // Global SaaS Super Admin across all businesses
  last_login?: string;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  item_group_id?: number | string;
  name: string;
  description: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
}

export interface SubCategory {
  id: number;
  category_id: number;
  name: string; // e.g. "Lot 1", "Lot 5"
  arrival_date: string;
  description: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
}

export interface ItemGroup {
  id: number;
  group_id: string; // e.g. "GRP-001"
  group_description: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
}

export interface Brand {
  id: number;
  code: string; // e.g. "BRD-001"
  name: string; // e.g. "Golden Teak Intl"
  description?: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
}

export interface ItemDefinition {
  id: number;
  item_group_id?: number | string;
  category_id?: number | string;
  brand_id?: number | string;
  brand_name?: string;
  item_code: string;
  barcode: string;
  item_name: string;
  national_language_item_name?: string;
  item_name_urdu?: string;
  unit_of_measure?: string;
  publisher_vendor?: string;
  image_url?: string;
  // Inventory & Reorder
  stock_quantity?: number;
  reorder_level?: number;
  reorder_qty?: number;
  // Purchase & Sales
  printed_price: number;
  purchase_discount_percent: number;
  purchase_rate: number;
  weighted_average_rate?: number;
  sale_discount_percent: number;
  sale_rate: number;
  margin_percent: number;
  packing: number;
  bulk_rate: number;
  ctn_rate: number;
  ws_rate: number;
  bulk_qty: number;
  is_active: boolean;
  created_by: number;
  created_at: string;
}

export type WoodStockStatus = 'available' | 'sold' | 'reserved' | 'damaged';

export interface WoodStock {
  id: number;
  serial: string;
  sub_category_id: number;
  purchase_id?: number | null;
  width: number; // in inches
  length: number; // in feet
  cft: number; // cubic feet: (w * w * l) / 2304
  qty: number;
  buy_rate: number;
  buy_price: number;
  sell_rate: number;
  sell_price: number;
  status: WoodStockStatus;
  notes?: string;
  sku?: string;
  description?: string;
  title?: string;
  image?: string;
  branch_id?: string;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

export type PurchaseStatus = 'pending' | 'completed' | 'cancelled';

export interface Purchase {
  id: number;
  purchase_no: string;
  supplier_id?: number | null;
  sub_category_id: number;
  total_pieces: number;
  total_cft: number;
  rate_per_cft: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  purchase_date: string;
  notes?: string;
  status: PurchaseStatus;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  address: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  total_purchase: number;
  total_paid: number;
  total_due: number;
  loyalty_points?: number;
  qr_code?: string;
  custom_redemption_rate?: number | null;
  custom_scan_behavior?: 'increase_qty' | 'new_line' | null;
  is_active: boolean;
  created_by: number;
  created_at: string;
}

export type SaleStatus = 'completed' | 'pending' | 'cancelled';

export interface Sale {
  id: number;
  invoice_no: string;
  customer_id?: number | null;
  total_items: number;
  total_cft: number;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  discount: number;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  payment_method: string;
  points_earned?: number;
  points_redeemed?: number;
  points_discount_amount?: number;
  sale_date: string;
  status: SaleStatus;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  wood_stock_id?: number;
  serial?: string;
  sku?: string;
  description?: string;
  width?: number;
  length?: number;
  cft?: number;
  qty?: number;
  quantity?: number;
  rate?: number;
  unit_price?: number;
  line_total?: number;
  subtotal?: number;
}

export type PaymentType = 'customer_payment' | 'supplier_payment';

export interface Payment {
  id: number;
  sale_id?: number | null;
  purchase_id?: number | null;
  payment_type: PaymentType;
  amount: number;
  payment_method: string;
  reference_no?: string;
  payment_date: string;
  notes?: string;
  created_by: number;
  created_at: string;
}

export interface Expense {
  id: number;
  title: string;
  category: 'transport' | 'rent' | 'labor' | 'utility' | 'maintenance' | 'other';
  amount: number;
  expense_date: string;
  notes?: string;
  created_by: number;
  created_at: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number; // relative to base currency (base currency = 1.0)
  is_base: boolean;
  is_active: boolean;
}

export interface StoreChain {
  id: string;
  name: string;
  code: string;
  business_type?: string; // e.g. 'Timber & Wood Mart', 'Retail Chain', 'Superstore'
  industry?: string;
  description?: string;
  tax_id?: string;
  logo_url?: string;
  admin_email: string;
  admin_name: string;
  phone?: string;
  address?: string;
  created_at: string;
  is_active: boolean;
}

export interface StoreBranch {
  id: string;
  name: string;
  code: string;
  address: string;
  address_line_2?: string;
  phone?: string;
  cell_phone?: string;
  email?: string;
  region?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  is_head_office?: boolean;
}

export interface SystemSettings {
  business_name: string;
  logo_url?: string;
  active_branch_id?: string;
  branches?: StoreBranch[];
  branch_name?: string;
  business_address: string;
  address_line_2?: string;
  business_phone: string;
  cell_phone?: string;
  email?: string;
  region?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  tax_id?: string;
  phone?: string;
  address?: string;
  currency_symbol: string;
  base_currency: string;
  active_display_currency: string;
  currencies: Currency[];
  default_buy_rate: number;
  default_sell_rate: number;
  invoice_prefix: string;
  purchase_prefix: string;
  invoice_footer: string;
  receipt_footer_note?: string;
  receipt_footer_national?: string;
  default_tax_rate?: number;
  loyalty_enabled?: boolean;
  loyalty_earn_amount_per_point?: number;
  loyalty_redemption_rate?: number;
  loyalty_min_points_to_redeem?: number;
  duplicate_scan_behavior?: 'increase_qty' | 'new_line';
}

export interface ActivityLog {
  id: number;
  user_id: number;
  username: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'BULK_IMPORT' | 'CANCEL' | 'RETURN_ITEM' | 'TOGGLE_STATUS' | 'RESET_PWD';
  table_name: string;
  record_id?: string | number;
  details: string;
  created_at: string;
}

export interface ImportLog {
  id: number;
  file_name: string;
  sub_category_id: number;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  status: string;
  error_log: string;
  created_by: number;
  created_at: string;
}

export interface CartItem {
  wood_stock: WoodStock;
  qty: number;
  rate: number; // sell rate per cft
  line_total: number;
}
