import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  MapPin,
  CreditCard,
  Edit2,
  FileText,
  X
} from 'lucide-react';
import {
  getSuppliers,
  getPurchases,
  getPayments,
  saveSupplier,
  recordPayment,
  getSettings
} from '../lib/storage';
import { Supplier, UserRole } from '../types';
import { formatCurrency } from '../lib/cft';

interface SuppliersProps {
  userRole: UserRole;
}

export const Suppliers: React.FC<SuppliersProps> = ({ userRole }) => {
  const suppliers = getSuppliers();
  const purchases = getPurchases();
  const payments = getPayments();
  const settings = getSettings();

  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit Supplier Modal
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Supplier Ledger Drawer
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Record Payment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('bank');
  const [payRef, setPayRef] = useState('');

  const [statusFilter, setStatusFilter] = useState<'all' | 'payable' | 'paid' | 'awaiting_po' | 'no_orders'>('all');

  const isEditable = userRole === 'admin' || userRole === 'manager';

  const handleOpenModal = (supp?: Supplier) => {
    if (supp) {
      setEditingSupplier(supp);
      setName(supp.name);
      setPhone(supp.phone || '');
      setAddress(supp.address || '');
    } else {
      setEditingSupplier(null);
      setName('');
      setPhone('');
      setAddress('');
    }
    setShowModal(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const res = saveSupplier({
      id: editingSupplier?.id,
      name,
      phone,
      address,
    });

    if (res.success) {
      setShowModal(false);
    } else {
      alert(res.message);
    }
  };

  const handlePaySupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !payAmount || payAmount <= 0) return;

    const res = recordPayment({
      purchase_id: null,
      payment_type: 'supplier_payment',
      amount: payAmount,
      payment_method: payMethod,
      reference_no: payRef,
      payment_date: new Date().toISOString().split('T')[0],
      notes: `Payment to supplier ${selectedSupplier.name}`,
    });

    if (res.success) {
      setShowPayModal(false);
      setPayAmount(0);
      setPayRef('');
      // Refresh selected supplier
      const updated = getSuppliers().find((s) => s.id === selectedSupplier.id);
      if (updated) setSelectedSupplier(updated);
    } else {
      alert(res.message);
    }
  };

  // Precompute metrics per supplier
  const supplierRows = suppliers.map((supp) => {
    const sPurchases = purchases.filter((p) => p.supplier_id === supp.id && p.status !== 'cancelled');
    const sTotal = sPurchases.reduce((sum, p) => sum + p.total_amount, 0);
    const sPaid = sPurchases.reduce((sum, p) => sum + p.paid_amount, 0);
    const sDue = Math.max(0, sTotal - sPaid);
    const pendingPoCount = sPurchases.filter((p) => p.status === 'pending').length;
    const totalOrders = sPurchases.length;

    return {
      supp,
      sTotal,
      sPaid,
      sDue,
      pendingPoCount,
      totalOrders,
    };
  });

  const filterCounts = {
    all: supplierRows.length,
    payable: supplierRows.filter((r) => r.sDue > 0).length,
    paid: supplierRows.filter((r) => r.sDue === 0 && r.totalOrders > 0).length,
    awaiting_po: supplierRows.filter((r) => r.pendingPoCount > 0).length,
    no_orders: supplierRows.filter((r) => r.totalOrders === 0).length,
  };

  const filteredSupplierRows = supplierRows.filter(({ supp, sDue, pendingPoCount, totalOrders }) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      supp.name.toLowerCase().includes(q) ||
      (supp.phone && supp.phone.toLowerCase().includes(q)) ||
      (supp.address && supp.address.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === 'payable') return sDue > 0;
    if (statusFilter === 'paid') return sDue === 0 && totalOrders > 0;
    if (statusFilter === 'awaiting_po') return pendingPoCount > 0;
    if (statusFilter === 'no_orders') return totalOrders === 0;
    return true;
  });

  const supplierPurchases = selectedSupplier
    ? purchases.filter((p) => p.supplier_id === selectedSupplier.id)
    : [];

  const totalPurchasedSum = supplierPurchases.reduce((sum, p) => sum + p.total_amount, 0);
  const totalPaidSum = supplierPurchases.reduce((sum, p) => sum + p.paid_amount, 0);
  const totalDueSum = Math.max(0, totalPurchasedSum - totalPaidSum);

  const gridTotals = filteredSupplierRows.reduce(
    (acc, r) => ({
      supplied: acc.supplied + r.sTotal,
      paid: acc.paid + r.sPaid,
      due: acc.due + r.sDue,
    }),
    { supplied: 0, paid: 0, due: 0 }
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" /> Suppliers & Vendors Directory
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage product suppliers, wholesale distributors, purchase logs, and payables.
          </p>
        </div>

        {isEditable && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        )}
      </div>

      {/* Search Bar & Right-Aligned Status Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 lg:max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by supplier name, phone, or address..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500"
          />
        </div>

        {/* Right-Aligned Filter Controls */}
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            All ({filterCounts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('payable')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'payable' ? 'bg-white text-amber-700 shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            Payable ({filterCounts.payable})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'paid' ? 'bg-white text-emerald-700 shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            Paid in Full ({filterCounts.paid})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('awaiting_po')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'awaiting_po' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            Purchase Order Awaiting ({filterCounts.awaiting_po})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('no_orders')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'no_orders' ? 'bg-white text-slate-800 shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            No Orders ({filterCounts.no_orders})
          </button>
        </div>
      </div>

      {/* Suppliers & Vendors Data Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 uppercase text-[10px]">
                <th className="p-3.5">Supplier / Vendor</th>
                <th className="p-3.5">Phone</th>
                <th className="p-3.5">Address</th>
                <th className="p-3.5 text-center">Orders / PO</th>
                <th className="p-3.5 text-right">Total Supplied</th>
                <th className="p-3.5 text-right">Total Paid</th>
                <th className="p-3.5 text-right">Payable Due</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSupplierRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-gray-400 font-semibold">
                    No suppliers match the current search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSupplierRows.map(({ supp, sTotal, sPaid, sDue, pendingPoCount, totalOrders }) => (
                  <tr key={supp.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <span>{supp.name}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-gray-600 font-mono">
                      {supp.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {supp.phone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3.5 text-gray-600 max-w-[220px] truncate" title={supp.address}>
                      {supp.address ? (
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{supp.address}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-bold text-gray-800">{totalOrders} POs</span>
                        {pendingPoCount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {pendingPoCount} awaiting
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-gray-900">
                      {formatCurrency(sTotal, settings.currency_symbol)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                      {formatCurrency(sPaid, settings.currency_symbol)}
                    </td>
                    <td className={`p-3.5 text-right font-mono font-extrabold ${sDue > 0 ? 'text-amber-600' : 'text-gray-700'}`}>
                      {formatCurrency(sDue, settings.currency_symbol)}
                    </td>
                    <td className="p-3.5 text-center">
                      {sDue > 0 ? (
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          Payable Due
                        </span>
                      ) : totalOrders > 0 ? (
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Paid in Full
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          No Orders
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSupplier(supp)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
                          title="View Supplier Ledger"
                        >
                          <FileText className="w-3.5 h-3.5" /> Ledger
                        </button>

                        {sDue > 0 && isEditable && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSupplier(supp);
                              setPayAmount(sDue);
                              setShowPayModal(true);
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Pay Supplier Due"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Pay
                          </button>
                        )}

                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => handleOpenModal(supp)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                            title="Edit Supplier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredSupplierRows.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-bold text-gray-900">
                  <td colSpan={4} className="p-3.5 text-right uppercase text-[10px] tracking-wider text-gray-500">
                    Totals ({filteredSupplierRows.length} suppliers)
                  </td>
                  <td className="p-3.5 text-right font-mono">{formatCurrency(gridTotals.supplied, settings.currency_symbol)}</td>
                  <td className="p-3.5 text-right font-mono text-emerald-700">{formatCurrency(gridTotals.paid, settings.currency_symbol)}</td>
                  <td className="p-3.5 text-right font-mono text-amber-700">{formatCurrency(gridTotals.due, settings.currency_symbol)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Supplier Ledger Drawer */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-base text-gray-900">{selectedSupplier.name} — Supplier Ledger</h3>
                <p className="text-xs text-gray-500">
                  Phone: {selectedSupplier.phone || 'N/A'} • Address: {selectedSupplier.address || 'N/A'}
                </p>
              </div>
              <button onClick={() => setSelectedSupplier(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-amber-50 p-3 rounded-xl text-xs">
              <div>
                <span className="text-gray-500 block">Total Due Balance:</span>
                <span className="font-black text-lg text-amber-700">
                  {formatCurrency(totalDueSum, settings.currency_symbol)}
                </span>
              </div>

              {totalDueSum > 0 && isEditable && (
                <button
                  onClick={() => {
                    setPayAmount(totalDueSum);
                    setShowPayModal(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" /> Pay Supplier Due
                </button>
              )}
            </div>

            {/* Purchases List */}
            <div className="flex-1 overflow-y-auto space-y-3">
              <h4 className="font-bold text-xs text-gray-800 uppercase">Purchases History</h4>
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-gray-100 font-bold text-gray-700 text-[10px] uppercase">
                    <th className="p-2">Purchase #</th>
                    <th className="p-2">Date</th>
                    <th className="p-2 text-right">Total Amount</th>
                    <th className="p-2 text-right">Paid</th>
                    <th className="p-2 text-right">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supplierPurchases.map((pur) => (
                    <tr key={pur.id} className="hover:bg-gray-50">
                      <td className="p-2 font-bold text-gray-900">{pur.purchase_no}</td>
                      <td className="p-2 text-gray-500 font-sans">{pur.purchase_date}</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(pur.total_amount, settings.currency_symbol)}</td>
                      <td className="p-2 text-right text-emerald-600">{formatCurrency(pur.paid_amount, settings.currency_symbol)}</td>
                      <td className="p-2 text-right text-amber-600 font-bold">{formatCurrency(pur.due_amount, settings.currency_symbol)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {showPayModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-gray-900">Record Supplier Payment</h3>
            <form onSubmit={handlePaySupplier} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Amount Paid ({settings.currency_symbol}) *</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold font-mono outline-none text-emerald-700"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="bKash">bKash</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Reference # / Txn ID</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. TRF-1002"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-gray-900">
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </h3>
            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Metro Wholesale Distributors"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0300-1000010"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Supplier Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
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
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
