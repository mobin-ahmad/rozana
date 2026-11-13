import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Printer,
  XCircle,
  RotateCcw,
  CheckCircle,
  Eye,
  AlertTriangle,
  User,
  X,
  Package,
  Store
} from 'lucide-react';
import {
  getSales,
  getSaleItems,
  getCustomers,
  getSettings,
  cancelSale,
  returnSaleItem,
  getCurrentUser
} from '../lib/storage';
import { Sale, SaleItem, UserRole } from '../types';
import { formatCurrency } from '../lib/cft';
import { InvoicePrintModal } from './InvoicePrintModal';

interface SalesProps {
  userRole: UserRole;
  onNavigateToPos?: () => void;
}

export const Sales: React.FC<SalesProps> = ({ userRole, onNavigateToPos }) => {
  const sales = getSales();
  const saleItems = getSaleItems();
  const customers = getCustomers();
  const settings = getSettings();
  const currentUser = getCurrentUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Printable Invoice Modal
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);

  // Return Item / Cancel Sale Dialog
  const [selectedSaleForDetail, setSelectedSaleForDetail] = useState<Sale | null>(null);

  const isEditable = userRole === 'admin' || userRole === 'manager';

  const handleCancelSale = (saleId: number) => {
    const reason = prompt('Enter reason for cancelling this sale:');
    if (reason !== null) {
      const res = cancelSale(saleId, reason);
      alert(res.message);
      if (res.success && selectedSaleForDetail?.id === saleId) {
        setSelectedSaleForDetail(null);
      }
    }
  };

  const handleReturnItem = (itemId: number) => {
    if (window.confirm('Return this item back to available inventory?')) {
      const res = returnSaleItem(itemId, 'Customer returned item');
      alert(res.message);
      if (res.success && selectedSaleForDetail) {
        const updated = getSales().find((s) => s.id === selectedSaleForDetail.id);
        if (updated) setSelectedSaleForDetail(updated);
      }
    }
  };

  const filteredSales = sales.filter((sale) => {
    const cust = customers.find((c) => c.id === sale.customer_id);
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      sale.invoice_no.toLowerCase().includes(q) ||
      (cust && cust.name.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const detailItems = selectedSaleForDetail
    ? saleItems.filter((si) => si.sale_id === selectedSaleForDetail.id)
    : [];

  const detailCustomer = selectedSaleForDetail
    ? customers.find((c) => c.id === selectedSaleForDetail.customer_id)
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-600" /> Sales & Invoices
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit POS sales receipts, inspect customer purchases, and process returns or cancellations.
          </p>
        </div>

        {onNavigateToPos && (
          <button
            onClick={onNavigateToPos}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Store className="w-4 h-4" /> Open rozana Terminal
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice # or customer name..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-xs rounded-xl px-3 py-2 font-medium text-gray-700 outline-none"
          >
            <option value="all">All Invoices ({sales.length})</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending Balance</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 font-sans uppercase text-[10px]">
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-center">Items</th>
                <th className="p-3.5 text-right">Subtotal</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-right">Paid</th>
                <th className="p-3.5 text-right">Due Balance</th>
                <th className="p-3.5">Method</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center font-sans">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400 font-sans">
                    No sales invoice records found.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const cust = customers.find((c) => c.id === sale.customer_id);
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-indigo-700">{sale.invoice_no}</td>
                      <td className="p-3.5 font-sans font-medium text-gray-900">
                        {cust ? cust.name : 'Walk-in Customer'}
                      </td>
                      <td className="p-3.5 text-gray-500 font-sans">
                        {new Date(sale.sale_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3.5 text-center font-sans font-semibold text-gray-700">
                        {sale.total_items}
                      </td>
                      <td className="p-3.5 text-right font-medium text-gray-600">
                        {formatCurrency(sale.subtotal, settings.currency_symbol)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-gray-900">
                        {formatCurrency(sale.grand_total, settings.currency_symbol)}
                      </td>
                      <td className="p-3.5 text-right text-emerald-600 font-bold">
                        {formatCurrency(sale.paid_amount, settings.currency_symbol)}
                      </td>
                      <td
                        className={`p-3.5 text-right font-bold ${
                          sale.due_amount > 0 ? 'text-rose-600' : 'text-gray-400'
                        }`}
                      >
                        {formatCurrency(sale.due_amount, settings.currency_symbol)}
                      </td>
                      <td className="p-3.5 uppercase text-[10px] font-sans font-bold text-gray-600">
                        {sale.payment_method}
                      </td>
                      <td className="p-3.5 font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            sale.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : sale.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedSaleForDetail(sale)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="View sale line items"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedSaleForPrint(sale)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Print invoice receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {isEditable && sale.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelSale(sale.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Cancel invoice"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail & Itemized Return Modal */}
      {selectedSaleForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Invoice #{selectedSaleForDetail.invoice_no}
                </h3>
                <p className="text-xs text-gray-500 font-sans">
                  Customer: {detailCustomer ? detailCustomer.name : 'Walk-in Customer'} •{' '}
                  {new Date(selectedSaleForDetail.sale_date).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const saleToPrint = selectedSaleForDetail;
                    setSelectedSaleForDetail(null);
                    setSelectedSaleForPrint(saleToPrint);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>
                <button
                  onClick={() => setSelectedSaleForDetail(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-xl text-xs font-mono">
              <div>
                <span className="text-gray-400 block font-sans">Grand Total:</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(selectedSaleForDetail.grand_total, settings.currency_symbol)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block font-sans">Paid:</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(selectedSaleForDetail.paid_amount, settings.currency_symbol)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block font-sans">Balance Due:</span>
                <span className="font-bold text-rose-600">
                  {formatCurrency(selectedSaleForDetail.due_amount, settings.currency_symbol)}
                </span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <h4 className="font-bold text-xs text-gray-800 uppercase font-sans">Itemized Purchased Products</h4>
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-gray-100 font-bold text-gray-700 text-[10px] uppercase font-sans">
                    <th className="p-2">SKU / Code</th>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Line Total</th>
                    {isEditable && selectedSaleForDetail.status !== 'cancelled' && (
                      <th className="p-2 text-center font-sans">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailItems.map((si) => (
                    <tr key={si.id} className="hover:bg-gray-50">
                      <td className="p-2 font-bold text-gray-900">{si.sku || si.serial || 'SKU'}</td>
                      <td className="p-2 font-sans">{si.description || 'Retail Product Item'}</td>
                      <td className="p-2 text-center font-bold text-indigo-700 font-sans">
                        {si.quantity || si.qty || 1}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(si.unit_price || si.rate || 0, settings.currency_symbol)}
                      </td>
                      <td className="p-2 text-right font-bold">
                        {formatCurrency(si.line_total || si.subtotal || 0, settings.currency_symbol)}
                      </td>
                      {isEditable && selectedSaleForDetail.status !== 'cancelled' && (
                        <td className="p-2 text-center font-sans">
                          <button
                            onClick={() => handleReturnItem(si.id)}
                            className="text-[10px] font-bold text-rose-600 hover:bg-rose-50 px-2 py-0.5 rounded border border-rose-200 cursor-pointer"
                          >
                            Return Item
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {detailItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400 font-sans">
                        No itemized lines recorded for this transaction.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedSaleForDetail(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal Component */}
      {selectedSaleForPrint && (
        <InvoicePrintModal
          sale={selectedSaleForPrint}
          items={saleItems.filter((si) => si.sale_id === selectedSaleForPrint.id)}
          customer={customers.find((c) => c.id === selectedSaleForPrint.customer_id)}
          settings={settings}
          cashier={currentUser}
          onClose={() => setSelectedSaleForPrint(null)}
        />
      )}
    </div>
  );
};
