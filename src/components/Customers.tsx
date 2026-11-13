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

  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'credit' | 'paid' | 'loyalty'>('all');

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

  const filterCounts = {
    all: customers.length,
    due: customers.filter((c) => c.total_due > 0).length,
    credit: customers.filter((c) => c.total_due < 0).length,
    paid: customers.filter((c) => c.total_due === 0).length,
    loyalty: customers.filter((c) => (c.loyalty_points || 0) > 0).length,
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.qr_code && c.qr_code.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === 'due') return c.total_due > 0;
    if (statusFilter === 'credit') return c.total_due < 0;
    if (statusFilter === 'paid') return c.total_due === 0;
    if (statusFilter === 'loyalty') return (c.loyalty_points || 0) > 0;
    return true;
  });

  const gridTotals = filteredCustomers.reduce(
    (acc, c) => ({
      points: acc.points + (c.loyalty_points || 0),
      purchased: acc.purchased + c.total_purchase,
      paid: acc.paid + c.total_paid,
      due: acc.due + c.total_due,
    }),
    { points: 0, purchased: 0, paid: 0, due: 0 }
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
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        )}
      </div>

      {/* Search Bar & Right-Aligned Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 lg:max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone, or QR code..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500"
          />
        </div>

        {/* Right-Aligned Filter Buttons */}
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
            onClick={() => setStatusFilter('due')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'due' ? 'bg-white text-rose-700 shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            Receivable Due ({filterCounts.due})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('credit')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'credit' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            Advance Credit ({filterCounts.credit})
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
            onClick={() => setStatusFilter('loyalty')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'loyalty' ? 'bg-white text-amber-700 shadow-sm' : 'hover:text-gray-900'
            }`}
          >
            Loyalty Holders ({filterCounts.loyalty})
          </button>
        </div>
      </div>

      {/* Customers & Loyalty Accounts Data Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 uppercase text-[10px]">
                <th className="p-3.5">Customer / Account</th>
                <th className="p-3.5">Contact & Address</th>
                <th className="p-3.5">QR Card ID</th>
                <th className="p-3.5 text-center">Loyalty Pts</th>
                <th className="p-3.5 text-right">Total Purchased</th>
                <th className="p-3.5 text-right">Total Paid</th>
                <th className="p-3.5 text-right">Balance / Due</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-gray-400 font-semibold">
                    No customer accounts match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const qrValue = cust.qr_code || `CUST-${cust.phone || cust.id}`;
                  return (
                    <tr key={cust.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900">{cust.name}</div>
                        {(cust.custom_redemption_rate || cust.custom_scan_behavior) && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {cust.custom_redemption_rate && (
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded border border-indigo-200">
                                Formula: {settings.currency_symbol}{cust.custom_redemption_rate}/pt
                              </span>
                            )}
                            {cust.custom_scan_behavior && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold rounded border border-slate-200">
                                Scan: {cust.custom_scan_behavior === 'increase_qty' ? 'Inc Qty' : 'New Line'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-gray-600">
                        {cust.phone && (
                          <div className="font-mono text-[11px] flex items-center gap-1 text-gray-800">
                            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{cust.phone}</span>
                          </div>
                        )}
                        {cust.address && (
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 max-w-[220px] truncate" title={cust.address}>
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{cust.address}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => setViewQrCustomer(cust)}
                          title="View Customer QR Code Card"
                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-lg font-mono text-[11px] cursor-pointer transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5 shrink-0" />
                          <span>{qrValue}</span>
                        </button>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[11px] font-black rounded-full">
                          <Award className="w-3 h-3 text-amber-600" />
                          {cust.loyalty_points || 0}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-gray-900">
                        {formatCurrency(cust.total_purchase, settings.currency_symbol)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(cust.total_paid, settings.currency_symbol)}
                      </td>
                      <td
                        className={`p-3.5 text-right font-mono font-extrabold ${
                          cust.total_due > 0
                            ? 'text-rose-600'
                            : cust.total_due < 0
                            ? 'text-indigo-600'
                            : 'text-gray-700'
                        }`}
                      >
                        {formatCurrency(cust.total_due, settings.currency_symbol)}
                      </td>
                      <td className="p-3.5 text-center">
                        {cust.total_due > 0 ? (
                          <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                            Receivable Due
                          </span>
                        ) : cust.total_due < 0 ? (
                          <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            Advance Credit
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Paid in Full
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(cust)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
                            title="View Customer Ledger"
                          >
                            <FileText className="w-3.5 h-3.5" /> Ledger
                          </button>

                          {cust.total_due > 0 && isEditable && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setPayAmount(cust.total_due);
                                setShowPayModal(true);
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Receive Customer Payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Receive
                            </button>
                          )}

                          {isEditable && (
                            <button
                              type="button"
                              onClick={() => handleOpenModal(cust)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                              title="Edit Customer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredCustomers.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-bold text-gray-900">
                  <td colSpan={3} className="p-3.5 text-right uppercase text-[10px] tracking-wider text-gray-500">
                    Totals ({filteredCustomers.length} accounts)
                  </td>
                  <td className="p-3.5 text-center font-mono text-amber-800">{gridTotals.points} Pts</td>
                  <td className="p-3.5 text-right font-mono">{formatCurrency(gridTotals.purchased, settings.currency_symbol)}</td>
                  <td className="p-3.5 text-right font-mono text-emerald-700">{formatCurrency(gridTotals.paid, settings.currency_symbol)}</td>
                  <td
                    className={`p-3.5 text-right font-mono ${
                      gridTotals.due > 0 ? 'text-rose-700' : gridTotals.due < 0 ? 'text-indigo-700' : 'text-gray-800'
                    }`}
                  >
                    {formatCurrency(gridTotals.due, settings.currency_symbol)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
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
                  Controls how rozana handles scanning duplicate items for this customer.
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
