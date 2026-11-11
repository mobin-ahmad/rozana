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
  Truck,
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

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  );

  const supplierPurchases = selectedSupplier
    ? purchases.filter((p) => p.supplier_id === selectedSupplier.id)
    : [];

  const totalPurchasedSum = supplierPurchases.reduce((sum, p) => sum + p.total_amount, 0);
  const totalPaidSum = supplierPurchases.reduce((sum, p) => sum + p.paid_amount, 0);
  const totalDueSum = Math.max(0, totalPurchasedSum - totalPaidSum);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" /> Timber Suppliers Directory
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Log sawmills, timber import vendors, purchase logs, and payables.
          </p>
        </div>

        {isEditable && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by supplier name or phone..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500 shadow-xs"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supp) => {
          const sPurchases = purchases.filter((p) => p.supplier_id === supp.id);
          const sTotal = sPurchases.reduce((sum, p) => sum + p.total_amount, 0);
          const sPaid = sPurchases.reduce((sum, p) => sum + p.paid_amount, 0);
          const sDue = Math.max(0, sTotal - sPaid);

          return (
            <div
              key={supp.id}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">{supp.name}</h3>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      sDue > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {sDue > 0 ? 'Payable Due' : 'Paid in Full'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-gray-500 mt-2">
                  {supp.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> {supp.phone}
                    </p>
                  )}
                  {supp.address && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" /> {supp.address}
                    </p>
                  )}
                </div>

                {/* Summary */}
                <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Supplied:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(sTotal, settings.currency_symbol)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Paid:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(sPaid, settings.currency_symbol)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold">
                    <span className="text-gray-700">Payable Due:</span>
                    <span className={sDue > 0 ? 'text-amber-600' : 'text-gray-900'}>
                      {formatCurrency(sDue, settings.currency_symbol)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
                <button
                  onClick={() => setSelectedSupplier(supp)}
                  className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" /> View Supplier Ledger
                </button>

                {isEditable && (
                  <button
                    onClick={() => handleOpenModal(supp)}
                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
              {editingSupplier ? 'Edit Supplier' : 'Add New Timber Supplier'}
            </h3>
            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Evergreen Sawmills Ltd"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1700-000000"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Depot Address</label>
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
