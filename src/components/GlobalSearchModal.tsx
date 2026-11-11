import React, { useState, useEffect } from 'react';
import { Search, X, Package, User, FileText, Building, Tag } from 'lucide-react';
import { globalSearch } from '../lib/storage';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReturnType<typeof globalSearch>>([]);

  useEffect(() => {
    if (query.trim().length >= 2) {
      setResults(globalSearch(query));
    } else {
      setResults([]);
    }
  }, [query]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'Product':
        return <Package className="w-4 h-4 text-indigo-600" />;
      case 'Customer':
        return <User className="w-4 h-4 text-emerald-600" />;
      case 'Invoice':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'Supplier':
        return <Building className="w-4 h-4 text-purple-600" />;
      default:
        return <Search className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 border-b border-gray-100 bg-gray-50/50">
          <Search className="w-5 h-5 text-gray-400 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product name, barcode, SKU, customer, invoice #, supplier..."
            className="w-full py-4 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {query.trim().length >= 2 && results.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              No matching records found for "{query}"
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="py-6 text-center text-xs text-gray-400">
              Type at least 2 characters to search across products, inventory, customers, sales, and suppliers
            </div>
          )}

          {results.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectTab(item.linkTag);
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50/60 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-indigo-100 transition-colors">
                  {getIcon(item.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{item.title}</span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Go to module →
              </span>
            </button>
          ))}
        </div>

        <div className="p-3 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
          <span>Press ESC to close</span>
          <span>Tip: Press Ctrl+K anytime</span>
        </div>
      </div>
    </div>
  );
};
