import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  CreditCard,
  Edit2,
  FileText,
  DollarSign,
  X,
  QrCode,
  Award,
  Sparkles,
  Gift
} from 'lucide-react';
import {
  getCustomers,
  getSales,
  getPayments,
  saveCustomer,
  recordPayment,
  getSettings
} from '../lib/storage';
import { Customer, UserRole } from '../types';
import { formatCurrency } from '../lib/cft';

interface CustomersProps {
  userRole: UserRole;
}

export const Customers: React.FC<CustomersProps> = ({ userRole }) => {
  const customers = getCustomers();
  const sales = getSales();
  const payments = getPayments();
  const settings = getSettings();

  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit Customer Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [customRedemptionRate, setCustomRedemptionRate] = useState<string>('');
  const [customScanBehavior, setCustomScanBehavior] = useState<string>('');

  // Customer Ledger Drawer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Customer QR Code View Modal
  const [viewQrCustomer, setViewQrCustomer] = useState<Customer | null>(null);

  // Receive Payment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('cash');
  const [payRef, setPayRef] = useState('');

  const isEditable = userRole === 'admin' || userRole === 'manager' || userRole === 'cashier';

  const handleOpenModal = (cust?: Customer) => {
    if (cust) {
      setEditingCustomer(cust);
      setName(cust.name);
      setPhone(cust.phone || '');
      setAddress(cust.address || '');
      setQrCode(cust.qr_code || `CUST-${cust.phone || cust.id}`);
      setLoyaltyPoints(cust.loyalty_points || 0);
      setCustomRedemptionRate(cust.custom_redemption_rate ? String(cust.custom_redemption_rate) : '');
      setCustomScanBehavior(cust.custom_scan_behavior || '');
    } else {
      setEditingCustomer(null);
      setName('');
      setPhone('');
      setAddress('');
      setQrCode('');
      setLoyaltyPoints(0);
      setCustomRedemptionRate('');
      setCustomScanBehavior('');
    }
    setShowModal(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const rateNum = customRedemptionRate.trim() !== '' ? Number(customRedemptionRate) : null;

    const res = saveCustomer({
      id: editingCustomer?.id,
      name,
      phone,
      address,
      qr_code: qrCode,
      loyalty_points: loyaltyPoints,
      custom_redemption_rate: rateNum,
      custom_scan_behavior: customScanBehavior ? (customScanBehavior as 'increase_qty' | 'new_line') : null,
    });

    if (res.success) {
      setShowModal(false);
    } else {
      alert(res.message);
    }
  };

  const handleReceivePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !payAmount || payAmount <= 0) return;

    const res = recordPayment({
      sale_id: null,
      payment_type: 'customer_payment',
      amount: payAmount,
      payment_method: payMethod,
      reference_no: payRef,
      payment_date: new Date().toISOString().split('T')[0],
      notes: `Received payment from ${selectedCustomer.name}`,
    });

    if (res.success) {
      setShowPayModal(false);
      setPayAmount(0);
      setPayRef('');
      // Refresh selected customer
      const updated = getCustomers().find((c) => c.id === selectedCustomer.id);
      if (updated) setSelectedCustomer(updated);
    } else {
      alert(res.message);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.qr_code && c.qr_code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const customerInvoices = selectedCustomer
    ? sales.filter((s) => s.customer_id === selectedCustomer.id)
    : [];

  const customerPaymentsList = selectedCustomer
    ? payments.filter((p) => p.payment_type === 'customer_payment' && (p.notes?.includes(selectedCustomer.name) || customerInvoices.some((s) => s.id === p.sale_id)))
    : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" /> Customer Directory & Loyalty Accounts
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Client accounts, QR cards, loyalty points balance, purchases, and payments.
          </p>
        </div>

        {isEditable && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Customer
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
          placeholder="Search by customer name, phone, or QR code..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500 shadow-xs"
        />
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{cust.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded-full flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-600" /> {cust.loyalty_points || 0} Loyalty Pts
                    </span>
                    {cust.custom_redemption_rate && (
                      <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded border border-indigo-200">
                        Custom Formula: {settings.currency_symbol}{cust.custom_redemption_rate}/pt
                      </span>
                    )}
                    {cust.custom_scan_behavior && (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold rounded border border-slate-200">
                        Scan: {cust.custom_scan_behavior === 'increase_qty' ? 'Increase Qty' : 'New Line'}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewQrCustomer(cust)}
                  title="View Customer QR Code Card"
                  className="p-2 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl border border-slate-200/80 transition-colors shrink-0"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 text-xs text-gray-500 mt-3">
                {cust.phone && (
                  <p className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {cust.phone}
                  </p>
                )}
                {cust.address && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" /> {cust.address}
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <QrCode className="w-3 h-3 text-slate-400" /> QR Code ID: {cust.qr_code || `CUST-${cust.phone || cust.id}`}
                </p>
              </div>

              {/* Financial Summary Box */}
              <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Purchased:</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(cust.total_purchase, settings.currency_symbol)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Paid:</span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(cust.total_paid, settings.currency_symbol)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold">
                  <span className="text-gray-700">Outstanding Due:</span>
                  <span className={cust.total_due > 0 ? 'text-rose-600' : 'text-gray-900'}>
                    {formatCurrency(cust.total_due, settings.currency_symbol)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
              <button
                onClick={() => setSelectedCustomer(cust)}
                className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" /> View Ledger
              </button>

              {isEditable && (
                <button
                  onClick={() => handleOpenModal(cust)}
                  className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Customer Ledger Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-base text-gray-900">{selectedCustomer.name} — Ledger</h3>
                <p className="text-xs text-gray-500">
                  Phone: {selectedCustomer.phone || 'N/A'} • Address: {selectedCustomer.address || 'N/A'}
                </p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl text-xs">
              <div>
                <span className="text-gray-500 block">Total Due:</span>
                <span className="font-black text-lg text-rose-600">
                  {formatCurrency(selectedCustomer.total_due, settings.currency_symbol)}
                </span>
              </div>

              {selectedCustomer.total_due > 0 && isEditable && (
                <button
                  onClick={() => {
                    setPayAmount(selectedCustomer.total_due);
                    setShowPayModal(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" /> Receive Payment
                </button>
              )}
            </div>

            {/* Invoices */}
            <div className="flex-1 overflow-y-auto space-y-3">
              <h4 className="font-bold text-xs text-gray-800 uppercase">Invoices History</h4>
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-gray-100 font-bold text-gray-700 text-[10px] uppercase">
                    <th className="p-2">Invoice #</th>
                    <th className="p-2">Date</th>
                    <th className="p-2 text-right">Grand Total</th>
                    <th className="p-2 text-right">Paid</th>
                    <th className="p-2 text-right">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="p-2 font-bold text-gray-900">{inv.invoice_no}</td>
                      <td className="p-2 text-gray-500 font-sans">{new Date(inv.sale_date).toLocaleDateString()}</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(inv.grand_total, settings.currency_symbol)}</td>
                      <td className="p-2 text-right text-emerald-600">{formatCurrency(inv.paid_amount, settings.currency_symbol)}</td>
                      <td className="p-2 text-right text-rose-600 font-bold">{formatCurrency(inv.due_amount, settings.currency_symbol)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Receive Payment Modal */}
      {showPayModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-gray-900">Receive Customer Payment</h3>
            <form onSubmit={handleReceivePayment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Amount Received ({settings.currency_symbol}) *</label>
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
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="bKash">bKash Mobile</option>
                  <option value="nagad">Nagad</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Reference / Note</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Receipt #..."
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

      {/* Add/Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-gray-900">
              {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Phone / Mobile Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001000020"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Customer QR Code String</label>
                <input
                  type="text"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  placeholder="Leave empty to auto-generate (e.g. CUST-03001000020)"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-mono text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" /> Loyalty Points
                  </label>
                  <input
                    type="number"
                    value={loyaltyPoints}
                    onChange={(e) => setLoyaltyPoints(Number(e.target.value))}
                    className="w-full p-2.5 bg-amber-50/50 border border-amber-200 rounded-xl font-black outline-none text-amber-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Formula Rate Override
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customRedemptionRate}
                    onChange={(e) => setCustomRedemptionRate(e.target.value)}
                    placeholder={`Default: ${settings.currency_symbol}${settings.loyalty_redemption_rate || 1.0}/pt`}
                    className="w-full p-2.5 bg-indigo-50/50 border border-indigo-200 rounded-xl font-bold outline-none text-indigo-900 text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Duplicate SKU / Barcode Scan Behavior
                </label>
                <select
                  value={customScanBehavior}
                  onChange={(e) => setCustomScanBehavior(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:border-emerald-500 text-gray-800"
                >
                  <option value="">Default (Follow System Setting: {settings.duplicate_scan_behavior === 'new_line' ? 'Option B: Add as New Line Item' : 'Option A: Increase Quantity'})</option>
                  <option value="increase_qty">Option A: Increase Quantity</option>
                  <option value="new_line">Option B: Add as New Line Item</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Controls how Z-POS handles scanning duplicate items for this customer.
                </p>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Address</label>
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer QR Code View Modal */}
      {viewQrCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 text-center relative border border-slate-100">
            <button
              onClick={() => setViewQrCustomer(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="px-3 py-1 bg-amber-100 text-amber-900 text-[10px] font-black rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600" /> Digital Loyalty Pass
              </span>
              <h3 className="font-black text-lg text-slate-900 mt-2">{viewQrCustomer.name}</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{viewQrCustomer.phone || 'No Mobile Registered'}</p>
            </div>

            {/* QR Card Visual */}
            <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-inner space-y-4 flex flex-col items-center border border-slate-700">
              <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-amber-400/50">
                <div className="w-36 h-36 bg-slate-900 flex flex-col items-center justify-center rounded-xl text-amber-400 p-2 space-y-1">
                  <QrCode className="w-20 h-20 text-white" />
                  <span className="text-[10px] font-mono tracking-widest text-amber-300 font-bold truncate max-w-full">
                    {viewQrCustomer.qr_code || `CUST-${viewQrCustomer.phone || viewQrCustomer.id}`}
                  </span>
                </div>
              </div>

              <div className="w-full text-center space-y-1 pt-1 border-t border-slate-700/80">
                <div className="flex items-center justify-between text-xs px-2">
                  <span className="text-slate-400">Points Balance:</span>
                  <span className="font-black text-amber-400 text-sm">{viewQrCustomer.loyalty_points || 0} Pts</span>
                </div>
                <div className="flex items-center justify-between text-[11px] px-2 text-slate-400">
                  <span>Formula Value:</span>
                  <span className="font-bold text-white">
                    {settings.currency_symbol}{viewQrCustomer.custom_redemption_rate || settings.loyalty_redemption_rate || 1.0} / Point
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-tight">
              Scan this QR code or enter phone number <strong className="text-slate-800 font-mono">{viewQrCustomer.phone}</strong> at the POS register during checkout to earn and redeem points instantly.
            </p>

            <button
              onClick={() => setViewQrCustomer(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
