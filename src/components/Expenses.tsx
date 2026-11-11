import React, { useState } from 'react';
import {
  CircleDollarSign,
  Plus,
  Search,
  Truck,
  Building,
  Users,
  Zap,
  Wrench,
  HelpCircle,
  Edit2,
  Trash2,
  Calendar,
  X
} from 'lucide-react';
import { getExpenses, saveExpense, deleteExpense, getSettings } from '../lib/storage';
import { Expense, UserRole } from '../types';
import { formatCurrency } from '../lib/cft';

interface ExpensesProps {
  userRole: UserRole;
}

export const Expenses: React.FC<ExpensesProps> = ({ userRole }) => {
  const expenses = getExpenses();
  const settings = getSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Expense['category']>('transport');
  const [amount, setAmount] = useState<number | ''>(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const isEditable = userRole === 'admin' || userRole === 'manager';

  const handleOpenModal = (exp?: Expense) => {
    if (exp) {
      setEditingExpense(exp);
      setTitle(exp.title);
      setCategory(exp.category);
      setAmount(exp.amount);
      setExpenseDate(exp.expense_date);
      setNotes(exp.notes || '');
    } else {
      setEditingExpense(null);
      setTitle('');
      setCategory('transport');
      setAmount('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
    setShowModal(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    const res = saveExpense({
      id: editingExpense?.id,
      title,
      category,
      amount: Number(amount),
      expense_date: expenseDate,
      notes,
    });

    if (res.success) {
      setShowModal(false);
    } else {
      alert(res.message);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Delete expense entry?')) {
      const res = deleteExpense(id);
      if (!res.success) alert(res.message);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesCat = catFilter === 'all' || e.category === catFilter;
    const matchesQuery =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const totalExpenseSum = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const getCatIcon = (cat: Expense['category']) => {
    switch (cat) {
      case 'transport':
        return <Truck className="w-3.5 h-3.5 text-blue-600" />;
      case 'rent':
        return <Building className="w-3.5 h-3.5 text-purple-600" />;
      case 'labor':
        return <Users className="w-3.5 h-3.5 text-amber-600" />;
      case 'utility':
        return <Zap className="w-3.5 h-3.5 text-yellow-600" />;
      case 'maintenance':
        return <Wrench className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <CircleDollarSign className="w-6 h-6 text-emerald-600" /> Business Operating Expenses
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Track freight transport, facility rent, labor wages, utilities, and depot maintenance.
          </p>
        </div>

        {isEditable && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Expense Entry
          </button>
        )}
      </div>

      {/* Category Pills & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expense description or notes..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500 shadow-xs"
          />
        </div>

        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-emerald-500 shadow-xs"
        >
          <option value="all">All Expense Categories</option>
          <option value="transport">Freight & Transport</option>
          <option value="rent">Facility Rent</option>
          <option value="labor">Labor Wages</option>
          <option value="utility">Utilities & Generator</option>
          <option value="maintenance">Maintenance</option>
          <option value="other">Other Expenses</option>
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs font-bold text-gray-800">
          <span>Expense Records ({filteredExpenses.length})</span>
          <span className="text-emerald-700">
            Total Outflow: {formatCurrency(totalExpenseSum, settings.currency_symbol)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-gray-100/60 border-b border-gray-100 font-bold text-gray-700 font-sans uppercase text-[10px]">
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Notes</th>
                <th className="p-3.5 text-right">Amount</th>
                {isEditable && <th className="p-3.5 text-center font-sans">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-sans">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-3.5 font-sans">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-gray-100 text-gray-800 border border-gray-200">
                        {getCatIcon(exp.category)}
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold font-sans text-gray-900">{exp.title}</td>
                    <td className="p-3.5 font-sans text-gray-500">{exp.expense_date}</td>
                    <td className="p-3.5 font-sans text-gray-600">{exp.notes || '—'}</td>
                    <td className="p-3.5 text-right font-black font-sans text-gray-900 text-sm">
                      {formatCurrency(exp.amount, settings.currency_symbol)}
                    </td>
                    {isEditable && (
                      <td className="p-3.5 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenModal(exp)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-gray-100 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-gray-900">
              {editingExpense ? 'Edit Expense Entry' : 'Record New Expense'}
            </h3>
            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Truck Freight for Lot 5"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Expense['category'])}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-semibold"
                  >
                    <option value="transport">Freight Transport</option>
                    <option value="rent">Facility Rent</option>
                    <option value="labor">Labor Wages</option>
                    <option value="utility">Utilities</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Amount ({settings.currency_symbol}) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold font-mono outline-none text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Expense Date</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Notes / Voucher #</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Remarks..."
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
