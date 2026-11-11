import React, { useState } from 'react';
import { Sale, SaleItem, Customer, SystemSettings, User } from '../types';
import { formatCurrency, formatCft } from '../lib/cft';
import { formatDualCurrency } from '../lib/currency';
import { Printer, X, CheckCircle, MapPin, Phone, Coins, ExternalLink } from 'lucide-react';

interface InvoicePrintModalProps {
  sale: Sale;
  items?: SaleItem[];
  customer?: Customer | null;
  settings: SystemSettings;
  cashier?: User | null;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  sale,
  items = [],
  customer,
  settings,
  cashier,
  onClose,
}) => {
  if (!sale) return null;

  const safeSettings = settings;
  const activeCurrencyCode = safeSettings.active_display_currency || safeSettings.base_currency || 'BDT';
  const availableCurrencies = (safeSettings.currencies || []).filter((c) => c.is_active);

  const [invoiceCurrency, setInvoiceCurrency] = useState<string>(activeCurrencyCode);
  const [showDualCurrency, setShowDualCurrency] = useState<boolean>(
    invoiceCurrency !== (safeSettings.base_currency || 'BDT')
  );

  const generatePrintableHtml = () => {
    const printEl = document.getElementById('printable-invoice');
    if (!printEl) return '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Sale Invoice ${sale.invoice_no || sale.id}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              @page { size: auto; margin: 8mm; }
              body { background: white !important; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; padding: 0; }
              .no-print { display: none !important; }
              .print-card { box-shadow: none !important; border: none !important; padding: 0 !important; max-width: 100% !important; }
            }
            body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; background: #f1f5f9; color: #0f172a; }
            .print-card { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="no-print" style="max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: white; padding: 12px 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; font-size: 14px;">Sale Invoice #${sale.invoice_no || sale.id}</span>
            </div>
            <button onclick="window.print()" style="background: #10b981; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(16,185,129,0.3);">
              🖨️ Click to Print / Save PDF
            </button>
          </div>
          <div class="print-card">
            ${printEl.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                try {
                  window.print();
                } catch(e) {
                  console.warn('Auto print failed:', e);
                }
              }, 350);
            };
          </script>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const htmlContent = generatePrintableHtml();
    if (!htmlContent) return;

    // Method 1: Blob URL window.open (bypasses iframe sandbox restrictions)
    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const printWin = window.open(blobUrl, '_blank');
      if (printWin) {
        printWin.focus();
        return;
      }
    } catch (e) {
      console.warn('Blob window.open failed:', e);
    }

    // Method 2: Direct window.open
    try {
      const printWin = window.open('', '_blank', 'width=850,height=900');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        return;
      }
    } catch (e) {
      console.warn('Direct window.open failed:', e);
    }

    // Method 3: Fallback iframe print
    printViaIframe();

    // Method 4: Direct window.print
    try {
      window.print();
    } catch (e) {
      console.warn('Direct window.print failed:', e);
    }
  };

  const handleOpenInNewTab = () => {
    const htmlContent = generatePrintableHtml();
    if (!htmlContent) return;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  };

  const printViaIframe = () => {
    const printEl = document.getElementById('printable-invoice');
    if (!printEl) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sale Invoice ${sale.invoice_no || sale.id}</title>
          <style>
            @media print {
              @page { size: auto; margin: 8mm; }
              body { background: white; color: black; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; background: #fff; color: #111827; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e5e7eb; padding: 6px 10px; }
            th { background-color: #f9fafb; font-weight: bold; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div>
            ${printEl.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Iframe print error:', err);
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 400);
  };

  const getPriceFormatted = (baseAmount: number = 0) => {
    const amt = typeof baseAmount === 'number' ? baseAmount : 0;
    if (showDualCurrency && invoiceCurrency !== (safeSettings.base_currency || 'BDT')) {
      const dual = formatDualCurrency(amt, safeSettings, invoiceCurrency);
      return `${dual.primary} ${dual.secondary}`;
    }
    return formatCurrency(amt, invoiceCurrency);
  };

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header Controls (Hidden on Print) */}
        <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-semibold text-gray-900">Sale Invoice #{sale.invoice_no || sale.id}</h3>
              <p className="text-xs text-gray-500">Transaction recorded in {safeSettings.base_currency || 'BDT'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Invoice Currency Switcher */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs">
              <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                value={invoiceCurrency}
                onChange={(e) => {
                  const code = e.target.value;
                  setInvoiceCurrency(code);
                  setShowDualCurrency(code !== (safeSettings.base_currency || 'BDT'));
                }}
                className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer"
              >
                {availableCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
            </div>

            {invoiceCurrency !== (safeSettings.base_currency || 'BDT') && (
              <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDualCurrency}
                  onChange={(e) => setShowDualCurrency(e.target.checked)}
                  className="w-3.5 h-3.5 text-emerald-600 rounded"
                />
                Dual Currency
              </label>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
            <button
              type="button"
              onClick={handleOpenInNewTab}
              title="Open receipt in standalone tab to print"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all border border-slate-200 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              New Tab
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Area */}
        <div id="printable-invoice" className="p-8 overflow-y-auto flex-1 text-gray-800 space-y-6">
          {/* Header & Logo */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-6">
            <div className="flex items-start gap-3.5">
              {safeSettings.logo_url && (
                <img
                  src={safeSettings.logo_url}
                  alt="Store Logo"
                  className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 shrink-0"
                />
              )}
              <div>
                <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">
                  {safeSettings.business_name || 'Wood Trading POS'}
                </h1>
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {safeSettings.business_address || 'Timber Depot Road'}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {safeSettings.business_phone || '+880 1700-000000'}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase rounded-md tracking-wider mb-2">
                SALES INVOICE
              </span>
              <p className="text-lg font-bold text-gray-900">{sale.invoice_no}</p>
              <p className="text-xs text-gray-500">
                Date: {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
              </p>
              <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                Currency: {invoiceCurrency}
              </p>
            </div>
          </div>

          {/* Customer & Sale Info */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-xs">
            <div>
              <span className="text-gray-400 font-medium uppercase text-[10px] tracking-wider block mb-1">
                Billed To
              </span>
              <p className="font-bold text-sm text-gray-900">{customer ? customer.name : 'Walk-in Customer'}</p>
              {customer?.phone && <p className="text-gray-600 mt-0.5">Phone: {customer.phone}</p>}
              {customer?.address && <p className="text-gray-600">{customer.address}</p>}
            </div>

            <div className="text-right">
              <span className="text-gray-400 font-medium uppercase text-[10px] tracking-wider block mb-1">
                Payment Info
              </span>
              <p className="font-medium text-gray-900 uppercase">Method: {sale.payment_method || 'cash'}</p>
              <p className="text-gray-600">Cashier: {cashier ? cashier.full_name : 'Staff'}</p>
              <p className="text-gray-600">Status: <span className="font-semibold text-emerald-600 uppercase">{sale.status || 'completed'}</span></p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-hidden border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100/80 text-gray-700 uppercase font-bold border-b border-gray-200 text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Serial / SKU</th>
                  <th className="py-2.5 px-3">Product Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price ({invoiceCurrency})</th>
                  <th className="py-2.5 px-3 text-right">Total ({invoiceCurrency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                {safeItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-gray-400 font-sans">
                      No line items recorded for this invoice.
                    </td>
                  </tr>
                ) : (
                  safeItems.map((item, index) => {
                    const qtyVal = item?.qty || item?.quantity || 1;
                    const rateVal = typeof item?.rate === 'number' ? item.rate : (item?.unit_price || 0);
                    const lineTotalVal = typeof item?.line_total === 'number' ? item.line_total : (item?.subtotal || 0);
                    const serialVal = item?.serial || '';
                    const skuVal = item?.sku || '';
                    const descVal = item?.description || item?.serial || 'Item';
                    const widthVal = item?.width || 0;
                    const lengthVal = item?.length || 0;
                    const cftVal = item?.cft || 0;

                    const codeDisplay = [serialVal, skuVal].filter(Boolean).join(' / ') || '—';
                    const hasDimensions = widthVal > 0 || lengthVal > 0 || cftVal > 0;

                    return (
                      <tr key={item?.id || index} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 font-sans text-gray-500">{index + 1}</td>
                        <td className="py-2.5 px-3 font-semibold font-sans text-gray-900">{codeDisplay}</td>
                        <td className="py-2.5 px-3 font-sans text-gray-800">
                          <div className="font-semibold text-gray-900">{descVal}</div>
                          {hasDimensions && (
                            <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                              Dim: {widthVal}" W × {lengthVal}' L {cftVal > 0 ? `(${cftVal.toFixed(2)} CFT)` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold font-sans text-gray-900">{qtyVal}</td>
                        <td className="py-2.5 px-3 text-right font-sans">{formatCurrency(rateVal, invoiceCurrency)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900 font-sans">
                          {formatCurrency(lineTotalVal, invoiceCurrency)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Calculation */}
          <div className="flex justify-between items-start pt-2">
            <div className="text-xs text-gray-500 max-w-xs space-y-1">
              <p className="font-semibold text-gray-700">Total Items: {sale.total_items || 0} pcs</p>
              {(sale.total_cft || 0) > 0 && (
                <p className="font-semibold text-gray-700">Total Timber CFT: {formatCft(sale.total_cft || 0)}</p>
              )}
              {sale.notes && <p className="italic text-gray-500 mt-2">Note: {sale.notes}</p>}
            </div>

            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-medium">{getPriceFormatted(sale.subtotal || 0)}</span>
              </div>

              {(sale.tax_amount || 0) > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Tax {sale.tax_rate ? `(${sale.tax_rate}%)` : ''}:</span>
                  <span className="font-medium">+{getPriceFormatted(sale.tax_amount || 0)}</span>
                </div>
              )}

              {(sale.discount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Regular Discount:</span>
                  <span className="font-medium">-{getPriceFormatted(sale.discount || 0)}</span>
                </div>
              )}

              {(sale.points_redeemed || 0) > 0 && (
                <div className="flex justify-between text-amber-700 bg-amber-50 p-1 rounded border border-amber-200">
                  <span>Points Redeemed ({sale.points_redeemed} Pts):</span>
                  <span className="font-bold">-{getPriceFormatted(sale.points_discount_amount || 0)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-sm text-gray-900 border-t border-gray-200 pt-2">
                <span>Grand Total:</span>
                <span>{getPriceFormatted(sale.grand_total || 0)}</span>
              </div>

              {(sale.points_earned || 0) > 0 && (
                <div className="flex justify-between text-[11px] font-bold text-emerald-700 pt-1 border-t border-dashed border-gray-200">
                  <span>Loyalty Points Earned:</span>
                  <span>+{sale.points_earned} Pts</span>
                </div>
              )}

              <div className="flex justify-between text-gray-700">
                <span>Amount Paid:</span>
                <span className="font-medium text-emerald-700">{getPriceFormatted(sale.paid_amount || 0)}</span>
              </div>

              {(sale.due_amount || 0) > 0 ? (
                <div className="flex justify-between font-semibold text-rose-600 border-t border-dashed border-gray-200 pt-1">
                  <span>Balance Due:</span>
                  <span>{getPriceFormatted(sale.due_amount || 0)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-xs font-semibold text-emerald-600 pt-1">
                  <span>Payment Status:</span>
                  <span>PAID IN FULL</span>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Footer / Signatures */}
          <div className="border-t border-gray-200 pt-8 mt-6">
            <p className="text-[11px] text-center text-gray-500 italic mb-10">
              "{safeSettings.invoice_footer || 'Thank you for trading with us!'}"
            </p>

            <div className="flex justify-between text-xs text-gray-400 pt-4 px-4 border-t border-gray-100">
              <div className="text-center">
                <div className="w-32 border-b border-gray-300 mb-1"></div>
                <span>Customer Signature</span>
              </div>
              <div className="text-center">
                <div className="w-32 border-b border-gray-300 mb-1"></div>
                <span>Authorized Signature</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

