import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Eye,
  CreditCard,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle,
  X,
  Package
} from 'lucide-react';
import {
  getPurchases,
  getSuppliers,
  getItemDefinitions,
  getPayments,
  savePurchase,
  recordPayment,
  getSettings
} from '../lib/storage';
import { Purchase, UserRole } from '../types';
import { formatCurrency } from '../lib/cft';

interface PurchasesProps {
  userRole: UserRole;
}

export const Purchases: React.FC<PurchasesProps> = ({ userRole }) => {
  const purchases = getPurchases();
  const suppliers = getSuppliers();
  const items = getItemDefinitions();
  const payments = getPayments();
  const settings = getSettings();

  const [searchQuery, setSearchQuery] = useState('');

  // Create Purchase Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [supplierId, setSupplierId] = useState<number | ''>(suppliers[0]?.id || '');
  const [selectedItemId, setSelectedItemId] = useState<number | ''>(items[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(items[0]?.purchase_rate || 100);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  // Purchase Detail / Record Payment Modal
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmt, setPaymentMethodAmt] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [payRef, setPayRef] = useState('');

  const isEditable = userRole === 'admin' || userRole === 'manager' || userRole === 'warehouse_staff';

  const handleItemSelectChange = (itemId: number) => {
    setSelectedItemId(itemId);
    const matched = items.find((i) => i.id === itemId);
    if (matched && matched.purchase_rate) {
      setUnitCost(matched.purchase_rate);
    }
  };

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedItem = items.find((i) => i.id === Number(selectedItemId));
    const itemName = matchedItem ? matchedItem.item_name : 'Retail Stock Inventory';
    const computedTotal = Math.round(quantity * unitCost * 100) / 100;

    const res = savePurchase({
      supplier_id: supplierId ? Number(supplierId) : null,
      sub_category_id: 1,
      rate_per_cft: unitCost,
      paid_amount: paidAmount,
      purchase_date: purchaseDate,
      notes: notes ? `${itemName} (Qty: ${quantity} @ ${unitCost}) - ${notes}` : `${itemName} (Qty: ${quantity} @ ${unitCost})`,
    });

    if (res.success) {
      setShowAddModal(false);
      setPaidAmount(0);
      setNotes('');
    } else {
      alert(res.message);
    }
  };

  const handleRecordSupplierPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingPurchase || !paymentAmt || paymentAmt <= 0) return;

    const res = recordPayment({
      purchase_id: viewingPurchase.id,
      payment_type: 'supplier_payment',
      amount: paymentAmt,
      payment_method: paymentMethod,
      reference_no: payRef,
      payment_date: new Date().toISOString().split('T')[0],
      notes: `Supplier payment for ${viewingPurchase.purchase_no}`,
    });

    if (res.success) {
      setShowPaymentModal(false);
      setPaymentMethodAmt(0);
      setPayRef('');
      // Refresh viewing purchase
      const updated = getPurchases().find((p) => p.id === viewingPurchase.id);
      if (updated) setViewingPurchase(updated);
    } else {
      alert(res.message);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const supp = suppliers.find((s) => s.id === p.supplier_id);
    const q = searchQuery.toLowerCase();
    return (
      p.purchase_no.toLowerCase().includes(q) ||
      (supp && supp.name.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-600" /> Stock Purchases & Deliveries
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Log supplier shipments, purchase invoices, product stock replenishment, and payables.
          </p>
        </div>

        {isEditable && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Record New Purchase
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
          placeholder="Search by purchase #, supplier, or product notes..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500 shadow-xs"
        />
      </div>

      {/* Purchases List Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 font-sans uppercase text-[10px]">
                <th className="p-3.5">Purchase #</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Details / Items</th>
                <th className="p-3.5 text-right">Total Amount</th>
                <th className="p-3.5 text-right">Paid</th>
                <th className="p-3.5 text-right">Due Balance</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center font-sans">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 font-sans">
                    No purchase transactions recorded yet.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => {
                  const supp = suppliers.find((s) => s.id === purchase.supplier_id);
                  return (
                    <tr key={purchase.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-indigo-700">{purchase.purchase_no}</td>
                      <td className="p-3.5 font-sans font-semibold text-gray-900">
                        {supp ? supp.name : 'Unknown Supplier'}
                      </td>
                      <td className="p-3.5 font-sans text-gray-500">
                        {new Date(purchase.purchase_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-3.5 font-sans text-gray-600 max-w-xs truncate">
                        {purchase.notes || 'Retail Inventory Stock'}
                      </td>
                      <td className="p-3.5 text-right font-bold text-gray-900">
                        {formatCurrency(purchase.total_amount, settings.currency_symbol)}
                      </td>
                      <td className="p-3.5 text-right text-emerald-600 font-bold">
                        {formatCurrency(purchase.paid_amount, settings.currency_symbol)}
                      </td>
                      <td
                        className={`p-3.5 text-right font-bold ${
                          purchase.due_amount > 0 ? 'text-rose-600' : 'text-gray-400'
                        }`}
                      >
                        {formatCurrency(purchase.due_amount, settings.currency_symbol)}
                      </td>
                      <td className="p-3.5 font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            purchase.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {purchase.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingPurchase(purchase)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="View purchase details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isEditable && purchase.due_amount > 0 && (
                            <button
                              onClick={() => {
                                setViewingPurchase(purchase);
                                setPaymentMethodAmt(purchase.due_amount);
                                setShowPaymentModal(true);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Pay supplier"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Pay
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

      {/* Record Purchase Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" /> Record Supplier Purchase
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Select Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500"
                >
                  <option value="">-- No Supplier (Cash/Walk-in) --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Catalog Item / Product</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => handleItemSelectChange(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.item_name} [{it.item_code}] - Default Cost: {formatCurrency(it.purchase_rate, settings.currency_symbol)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Purchase Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Unit Purchase Cost</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Math.max(0, Number(e.target.value)))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
                <span className="font-medium text-indigo-900">Calculated Invoice Amount:</span>
                <span className="font-extrabold text-base text-indigo-700">
                  {formatCurrency(quantity * unitCost, settings.currency_symbol)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Initial Paid Amount</label>
                  <input
                    type="number"
                    min="0"
                    max={quantity * unitCost}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Memo / Invoice Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Invoice number, batch lot, freight details..."
                  rows={2}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Detail Modal */}
      {viewingPurchase && !showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-base text-gray-900">
                Purchase #{viewingPurchase.purchase_no}
              </h3>
              <button
                onClick={() => setViewingPurchase(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl font-mono">
                <div>
                  <span className="text-gray-400 block font-sans">Total Amount:</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(viewingPurchase.total_amount, settings.currency_symbol)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-sans">Paid to Date:</span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(viewingPurchase.paid_amount, settings.currency_symbol)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-sans">Outstanding Balance:</span>
                  <span className="font-bold text-rose-600">
                    {formatCurrency(viewingPurchase.due_amount, settings.currency_symbol)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-sans">Status:</span>
                  <span className="font-bold uppercase text-gray-700">{viewingPurchase.status}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 block mb-0.5">Notes:</span>
                <p className="p-3 bg-gray-50 rounded-xl text-gray-700">
                  {viewingPurchase.notes || 'No notes specified.'}
                </p>
              </div>

              {/* Payments History on this Purchase */}
              <div>
                <h4 className="font-bold text-gray-800 uppercase text-[10px] tracking-wider mb-2">
                  Payment History
                </h4>
                {payments.filter((p) => p.purchase_id === viewingPurchase.id).length === 0 ? (
                  <p className="text-gray-400 py-3 text-center bg-gray-50 rounded-xl">
                    No supplier payments recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {payments
                      .filter((p) => p.purchase_id === viewingPurchase.id)
                      .map((pay) => (
                        <div
                          key={pay.id}
                          className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl text-xs"
                        >
                          <div>
                            <span className="font-bold text-gray-900 block">
                              {formatCurrency(pay.amount, settings.currency_symbol)}
                            </span>
                            <span className="text-gray-400 text-[10px]">
                              {pay.payment_date} via {pay.payment_method.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {pay.reference_no || 'Ref: Direct'}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              {viewingPurchase.due_amount > 0 && isEditable && (
                <button
                  onClick={() => {
                    setPaymentMethodAmt(viewingPurchase.due_amount);
                    setShowPaymentModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Record Payment
                </button>
              )}
              <button
                onClick={() => setViewingPurchase(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Dialog */}
      {showPaymentModal && viewingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-gray-900">Record Supplier Payment</h3>
            <p className="text-xs text-gray-500">
              Invoice #{viewingPurchase.purchase_no} • Due:{' '}
              {formatCurrency(viewingPurchase.due_amount, settings.currency_symbol)}
            </p>

            <form onSubmit={handleRecordSupplierPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Amount</label>
                <input
                  type="number"
                  min="1"
                  max={viewingPurchase.due_amount}
                  value={paymentAmt}
                  onChange={(e) => setPaymentMethodAmt(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Reference / Cheque #</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. TXN-10291"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
