import React, { useState } from 'react';
import { Building2, X, Plus, Upload, Check, ShieldCheck, Mail, Lock, Phone, MapPin, User, Sparkles, Image as ImageIcon } from 'lucide-react';
import { registerNewStoreChain } from '../lib/storage';
import { StoreChain } from '../types';

interface RegisterStoreChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChainRegistered?: (chain: StoreChain) => void;
}

export const RegisterStoreChainModal: React.FC<RegisterStoreChainModalProps> = ({
  isOpen,
  onClose,
  onChainRegistered,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    logo_url: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    phone: '',
    address: '',
  });

  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please provide a valid Store Chain / Organization Name.');
      return;
    }
    if (!formData.admin_email.trim() || !formData.admin_email.includes('@')) {
      setError('Please provide a valid Admin Email Address.');
      return;
    }
    if (!formData.admin_name.trim()) {
      setError('Please enter the Primary Admin Name.');
      return;
    }

    try {
      const createdChain = registerNewStoreChain({
        name: formData.name.trim(),
        code: formData.code.trim() || formData.name.substring(0, 4).toUpperCase(),
        logo_url: formData.logo_url,
        admin_name: formData.admin_name.trim(),
        admin_email: formData.admin_email.trim(),
        admin_password: formData.admin_password || 'Admin@123',
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        if (onChainRegistered) onChainRegistered(createdChain);
        onClose();
        // Reset form
        setFormData({
          name: '',
          code: '',
          logo_url: '',
          admin_name: '',
          admin_email: '',
          admin_password: '',
          phone: '',
          address: '',
        });
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to register new store chain.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-600/90 text-white rounded-xl flex items-center justify-center shadow-md border border-indigo-400/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 block">
                SaaS Multi-Tenant Onboarding
              </span>
              <h3 className="text-xl font-black tracking-tight text-white">
                Register New Store Chain
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md">
            Create an independent, isolated departmental store chain with its own dedicated users, inventory, customers, settings, and sales data.
          </p>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              ⚠️ {error}
            </div>
          )}

          {isSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm rounded-xl font-bold flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              Store chain created successfully! Switching context...
            </div>
          )}

          {/* Section 1: Store Chain Identity */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" /> 1. Store Chain Identity
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Store Chain Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Fatah Departmental Store Chain"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chain Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ALFATAH"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase font-bold"
                />
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Store Logo (Optional)
              </label>
              <div className="flex items-center gap-3">
                {formData.logo_url ? (
                  <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg p-1 shrink-0 relative overflow-hidden group">
                    <img src={formData.logo_url} alt="Logo Preview" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-slate-100 border border-dashed border-slate-300 rounded-lg flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-200 inline-flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5 text-slate-500" /> Upload File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData((prev) => ({ ...prev, logo_url: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="Or paste image URL"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      className="flex-1 px-2.5 py-1 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Primary Admin Account */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> 2. Primary Admin Account
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Admin Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. System Administrator"
                    value={formData.admin_name}
                    onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Admin Login Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="admin@alfatah.com"
                    value={formData.admin_email}
                    onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Defaults to Admin@123"
                    value={formData.admin_password}
                    onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Phone
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="+92 300 0000000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Head Office Location */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" /> 3. Head Office Location
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Head Office Address
              </label>
              <input
                type="text"
                placeholder="e.g. Main Commercial Plaza, Gulberg III, Lahore, Pakistan"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/25 transition-all inline-flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" /> Register & Switch to Chain
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
