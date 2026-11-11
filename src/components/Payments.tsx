import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  DollarSign,
  Filter
} from 'lucide-react';
import {
  getPayments,
  getCustomers,
  getSuppliers,
  getSales,
  getPurchases,
  recordPayment,
  getSettings
} from '../lib/storage';
import { Payment, PaymentType, UserRole } from '../types';
import { formatCurrency } from '../lib/cft';

interface PaymentsProps {
  userRole: UserRole;
}

export const Payments: React.FC<PaymentsProps> = ({ userRole }) => {
  const payments = getPayments();
  const customers = getCustomers();
  const suppliers = getSuppliers();
  const sales = getSales();
  const purchases = getPurchases();
  const settings = getSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Record Payment Modal
  const [showModal, setShowModal] = useState(false);
  const [payType, setPayType] = useState<PaymentType>('customer_payment');
  const [partyId, setPartyId] = useState<number | ''>('');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<string>('cash');
  const [refNo, setRefNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const isEditable = userRole === 'admin' || userRole === 'manager' || userRole === 'cashier';

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    let targetSaleId: number | null = null;
    let targetPurchaseId: number | null = null;

    if (payType === 'customer_payment' && partyId) {
      const custSale = sales.find((s) => s.customer_id === Number(partyId) && s.due_amount > 0);
      if (custSale) targetSaleId = custSale.id;
    } else if (payType === 'supplier_payment' && partyId) {
      const suppPur = purchases.find((p) => p.supplier_id === Number(partyId) && p.due_amount > 0);
      if (suppPur) targetPurchaseId = suppPur.id;
    }

    const res = recordPayment({
      sale_id: targetSaleId,
      purchase_id: targetPurchaseId,
      payment_type: payType,
      amount,
      payment_method: method,
      reference_no: refNo,
      payment_date: new Date().toISOString().split('T')[0],
      notes,
    });

    if (res.success) {
      setShowModal(false);
      setAmount(0);
      setRefNo('');
      setNotes('');
    } else {
      alert(res.message);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesType = typeFilter === 'all' || p.payment_type === typeFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      p.reference_no?.toLowerCase().includes(q) ||
      p.payment_method.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q);
    return matchesType && matchesQuery;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600" /> Financial Payments Ledger
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit history of customer collections (receivables) and supplier payments (payables).
          </p>
        </div>

        {isEditable && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Record Payment Entry
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reference #, method, or notes..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500 shadow-xs"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-emerald-500 shadow-xs"
        >
          <option value="all">All Payment Types</option>
          <option value="customer_payment">Customer Collections (Inflow)</option>
          <option value="supplier_payment">Supplier Payables (Outflow)</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 font-sans uppercase text-[10px]">
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Method & Ref</th>
                <th className="p-3.5">Details / Notes</th>
                <th className="p-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 font-sans">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((pay) => {
                  const isCustomer = pay.payment_type === 'customer_payment';

                  return (
                    <tr key={pay.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="p-3.5 font-sans">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                            isCustomer
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isCustomer ? (
                            <ArrowDownLeft className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          {isCustomer ? 'Collection' : 'Supplier Paid'}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans text-gray-500">{pay.payment_date}</td>
                      <td className="p-3.5 font-sans font-medium text-gray-900">
                        <span className="uppercase font-bold">{pay.payment_method}</span>
                        {pay.reference_no && (
                          <span className="text-gray-500 font-mono block text-[10px]">
                            Ref: {pay.reference_no}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans text-gray-600 max-w-xs truncate">
                        {pay.notes || '—'}
                      </td>
                      <td
                        className={`p-3.5 text-right font-black font-sans text-sm ${
                          isCustomer ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {isCustomer ? '+' : '-'}{formatCurrency(pay.amount, settings.currency_symbol)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-gray-900">Record Financial Payment</h3>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Transaction Category *</label>
                <select
                  value={payType}
                  onChange={(e) => setPayType(e.target.value as PaymentType)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-emerald-700"
                >
                  <option value="customer_payment">Customer Receivable (Inflow)</option>
                  <option value="supplier_payment">Supplier Payable (Outflow)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Select {payType === 'customer_payment' ? 'Customer' : 'Supplier'}
                </label>
                <select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold"
                >
                  <option value="">General Party / Unlinked</option>
                  {payType === 'customer_payment'
                    ? customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Due: {formatCurrency(c.total_due)})
                        </option>
                      ))
                    : suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Amount ({settings.currency_symbol}) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-900 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="nagad">Nagad</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Reference / Cheque #</label>
                <input
                  type="text"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="e.g. TRF-90210"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment remarks..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl">
                  Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
