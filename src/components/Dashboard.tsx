import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Boxes,
  Users,
  Building2,
  ArrowUpRight,
  Clock,
  CircleDollarSign,
  ShoppingCart,
  Store,
  FolderTree,
  Tag,
  Package,
  AlertTriangle,
  Database
} from 'lucide-react';
import {
  getSales,
  getItemDefinitions,
  getCategories,
  getBrands,
  getCustomers,
  getSuppliers,
  getExpenses,
  getActivityLogs,
  getSettings
} from '../lib/storage';
import { UserRole } from '../types';
import { formatCurrency } from '../lib/cft';
import {
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface DashboardProps {
  userRole: UserRole;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userRole, onNavigate }) => {
  const sales = getSales().filter((s) => s.status !== 'cancelled');
  const items = getItemDefinitions();
  const categories = getCategories();
  const brands = getBrands();
  const customers = getCustomers();
  const suppliers = getSuppliers();
  const expenses = getExpenses();
  const logs = getActivityLogs();
  const settings = getSettings();

  const todayStr = new Date().toISOString().split('T')[0];

  // KPIs
  const todaySales = sales.filter((s) => s.sale_date.startsWith(todayStr));
  const todaySalesAmt = todaySales.reduce((sum, s) => sum + s.grand_total, 0);
  const todayCollectedAmt = todaySales.reduce((sum, s) => sum + s.paid_amount, 0);

  // Total retail products count and catalog valuation
  const activeItems = items.filter((i) => i.is_active !== false);
  const totalCatalogEstValue = activeItems.reduce(
    (sum, item) => sum + (item.sale_rate || 0) * (item.reorder_qty || 10),
    0
  );

  const totalCustomerDue = customers.reduce((sum, c) => sum + (c.total_due || 0), 0);

  // Low stock products reaching or below threshold
  const lowStockItems = activeItems.filter((item) => {
    const currentStock = item.stock_quantity ?? 0;
    const threshold = item.reorder_level ?? 10;
    return currentStock <= threshold;
  });

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  const thisMonthExpenses = expenses
    .filter((e) => new Date(e.expense_date) >= thisMonthStart)
    .reduce((sum, e) => sum + e.amount, 0);

  // Daily Sales Last 14 Days for Chart
  const salesChartData = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split('T')[0];
    const daySales = sales.filter((s) => s.sale_date.startsWith(dateStr));
    const total = daySales.reduce((sum, s) => sum + s.grand_total, 0);
    return {
      date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      sales: total,
    };
  });

  // Sales by payment method distribution
  const paymentMethodCounts = sales.reduce((acc: Record<string, number>, s) => {
    const method = (s.payment_method || 'cash').toLowerCase();
    acc[method] = (acc[method] || 0) + s.grand_total;
    return acc;
  }, {});

  const pieColors: Record<string, string> = {
    cash: '#10b981',
    card: '#4f46e5',
    bank: '#3b82f6',
    wallet: '#f59e0b',
    gift: '#ec4899',
    credit: '#8b5cf6',
  };

  const pieData = Object.entries(paymentMethodCounts).map(([method, value]) => ({
    name: method.charAt(0).toUpperCase() + method.slice(1),
    value: Math.round(value),
    color: pieColors[method] || '#64748b',
  }));

  const safePieData = pieData.length > 0 ? pieData : [
    { name: 'Cash', value: 100, color: '#10b981' }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold shrink-0 overflow-hidden">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Store Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Store className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {settings.business_name || 'Retail Supermarket & Departmental Store'}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Overview & Analytics
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time POS retail operations, product inventory, sales revenue, and receivables.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {userRole === 'admin' && (
            <button
              onClick={() => onNavigate('businesses')}
              className="flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-98 uppercase tracking-wider cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-indigo-400" />
              Business Profiles
            </button>
          )}
          <button
            onClick={() => onNavigate('categories')}
            className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200 active:scale-98 uppercase tracking-wider cursor-pointer"
          >
            <FolderTree className="w-4 h-4 text-slate-600" />
            Item Setup
          </button>
          {(userRole === 'admin' || userRole === 'manager' || userRole === 'cashier') && (
            <button
              onClick={() => onNavigate('zpos')}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-98 uppercase tracking-wider cursor-pointer"
            >
              <Store className="w-4 h-4" />
              Open Z-POS Retail
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Today's Revenue
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">
            {formatCurrency(todaySalesAmt, settings.currency_symbol)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>Collected: {formatCurrency(todayCollectedAmt, settings.currency_symbol)}</span>
            <span className="font-semibold text-emerald-600">{todaySales.length} invoices</span>
          </div>
        </div>

        {/* Retail Products Catalog */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Catalog Items
            </span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">
            {activeItems.length} Products
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>{categories.length} Categories • {brands.length} Brands</span>
            <button onClick={() => onNavigate('categories')} className="text-indigo-600 font-semibold hover:underline">
              Manage →
            </button>
          </div>
        </div>

        {/* Receivables Due */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Customer Receivables
            </span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-3">
            {formatCurrency(totalCustomerDue, settings.currency_symbol)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>{customers.length} registered accounts</span>
            <button onClick={() => onNavigate('customers')} className="text-indigo-600 font-semibold hover:underline">
              Ledger →
            </button>
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Monthly Expenses
            </span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <CircleDollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">
            {formatCurrency(thisMonthExpenses, settings.currency_symbol)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>Operational expenses</span>
            <button onClick={() => onNavigate('expenses')} className="text-blue-600 font-semibold hover:underline">
              Details →
            </button>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">14-Day Sales Revenue Trend</h2>
              <p className="text-xs text-slate-500">Daily gross revenue in {settings.currency_symbol}</p>
            </div>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              All Invoices <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val, settings.currency_symbol), 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Payment Method Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Sales by Payment Mode</h2>
            <p className="text-xs text-slate-500 mb-4">Revenue breakdown by payment channel</p>
            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={safePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {safePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => [formatCurrency(val, settings.currency_symbol), 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100">
            {safePieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 font-medium truncate">{item.name}:</span>
                <span className="font-bold text-slate-900">{formatCurrency(item.value, settings.currency_symbol)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low-Stock Threshold Alert Widget */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl flex items-center justify-center ${
              lowStockItems.length > 0
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Low-Stock Threshold Alerts
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  lowStockItems.length > 0
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {lowStockItems.length} Products Requiring Attention
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Highlighting retail products at or below designated reorder threshold levels.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('purchases')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Initiate Purchase Stock-In
            </button>
            <button
              type="button"
              onClick={() => onNavigate('categories')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-200 cursor-pointer"
            >
              Manage Catalog
            </button>
          </div>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-800 text-xs flex items-center gap-3 font-medium">
            <Package className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Optimal inventory health: All active catalog items currently have stock counts safely above their reorder threshold levels.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {lowStockItems.slice(0, 6).map((item) => {
              const current = item.stock_quantity ?? 0;
              const threshold = item.reorder_level ?? 10;
              const isCriticallyOut = current <= 0;
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border bg-slate-50/80 border-slate-200/90 flex flex-col justify-between gap-3 hover:bg-white hover:border-indigo-300 transition shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          isCriticallyOut
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isCriticallyOut ? 'OUT OF STOCK' : 'LOW THRESHOLD'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.item_code}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-xs truncate" title={item.item_name}>
                        {item.item_name}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                        Barcode: {item.barcode}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-sm font-black font-mono ${
                        isCriticallyOut ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        {current} {item.unit_of_measure || 'PCS'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Limit: {threshold}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-[11px]">
                    <span className="text-slate-500">
                      Rate: <strong className="text-slate-800">{formatCurrency(item.sale_rate || 0, settings.currency_symbol)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('purchases')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      Reorder →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Section: Recent Invoices & System Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Recent Sales Invoices</h2>
            <button onClick={() => onNavigate('sales')} className="text-xs text-indigo-600 font-semibold hover:underline">
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {sales.slice(0, 5).map((sale) => {
              const cust = customers.find((c) => c.id === sale.customer_id);
              return (
                <div key={sale.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{sale.invoice_no}</span>
                    <span className="text-slate-500">{cust ? cust.name : 'Walk-in Customer'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">
                      {formatCurrency(sale.grand_total, settings.currency_symbol)}
                    </span>
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                        sale.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {sale.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Activity Stream */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Live Activity Trail</h2>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Real-time
            </span>
          </div>

          <div className="space-y-3">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="px-2 py-0.5 bg-slate-900 text-indigo-300 font-mono font-bold rounded text-[10px] uppercase shrink-0">
                  {log.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-medium truncate">{log.details || `${log.action} on ${log.table_name}`}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    By <span className="font-semibold text-slate-600">{log.username}</span> •{' '}
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
