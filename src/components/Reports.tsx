import React, { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Calendar, Download, Printer, ShoppingBag } from 'lucide-react';
import { getSales, getExpenses, getSettings, getItemDefinitions } from '../lib/storage';
import { formatCurrency } from '../lib/cft';

export const Reports: React.FC = () => {
  const sales = getSales().filter((s) => s.status !== 'cancelled');
  const expenses = getExpenses();
  const items = getItemDefinitions();
  const settings = getSettings();

  const totalRevenue = sales.reduce((sum, s) => sum + s.grand_total, 0);

  // Calculate COGS based on item definitions or purchase costs
  const itemCostMap = new Map<string, number>();
  items.forEach((it) => {
    if (it.barcode) itemCostMap.set(it.barcode.toLowerCase(), it.purchase_rate || it.weighted_average_rate || 0);
    if (it.item_code) itemCostMap.set(it.item_code.toLowerCase(), it.purchase_rate || it.weighted_average_rate || 0);
  });

  const totalCost = sales.reduce((sum, s) => {
    const saleItems = (s as any).items || [];
    if (saleItems.length > 0) {
      const lineCosts = saleItems.reduce((iSum: number, item: any) => {
        const skuKey = (item.sku || item.serial || '').toLowerCase();
        const costPerUnit = item.buy_price || itemCostMap.get(skuKey) || (item.unit_price ? item.unit_price * 0.7 : 0);
        const qty = item.qty || item.quantity || 1;
        return iSum + costPerUnit * qty;
      }, 0);
      return sum + lineCosts;
    }
    // Standard retail baseline COGS ~ 72% of sales if line items not attached
    return sum + (s.subtotal * 0.72);
  }, 0);

  const grossProfit = totalRevenue - totalCost;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Financial Reports & Profitability</h1>
          <p className="text-xs text-slate-500 mt-0.5">Retail sales performance, product margins, and operational expenditure.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Statement
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Sales Revenue</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatCurrency(totalRevenue, settings.currency_symbol)}</p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">{sales.length} Completed Invoices</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Cost of Goods Sold (COGS)</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{formatCurrency(totalCost, settings.currency_symbol)}</p>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Retail Inventory Acquisition Cost</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Gross Profit</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{formatCurrency(grossProfit, settings.currency_symbol)}</p>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Margin before Expenses</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Net Operating Profit</span>
          <p className={`text-2xl font-black mt-2 ${netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            {formatCurrency(netProfit, settings.currency_symbol)}
          </p>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">After {formatCurrency(totalExpenses, settings.currency_symbol)} Expenses</span>
        </div>
      </div>

      {/* Profit Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Profit & Loss Summary Statement</h2>
        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-2.5 flex justify-between font-bold text-slate-800">
            <span>Gross Operating Revenue</span>
            <span>{formatCurrency(totalRevenue, settings.currency_symbol)}</span>
          </div>
          <div className="py-2.5 flex justify-between text-slate-600 pl-4">
            <span>Less Cost of Goods Sold (Retail Inventory Cost)</span>
            <span className="text-rose-600">({formatCurrency(totalCost, settings.currency_symbol)})</span>
          </div>
          <div className="py-2.5 flex justify-between font-bold text-emerald-700 bg-emerald-50/50 px-2 rounded-lg">
            <span>GROSS MARGIN</span>
            <span>{formatCurrency(grossProfit, settings.currency_symbol)}</span>
          </div>
          <div className="py-2.5 flex justify-between text-slate-600 pl-4">
            <span>Less Operating Expenses (Rent, Utilities, Wages, Logistics)</span>
            <span className="text-rose-600">({formatCurrency(totalExpenses, settings.currency_symbol)})</span>
          </div>
          <div className="py-3 flex justify-between font-black text-sm text-indigo-900 bg-indigo-50/50 px-2 rounded-lg border border-indigo-100">
            <span>NET OPERATING INCOME</span>
            <span>{formatCurrency(netProfit, settings.currency_symbol)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
