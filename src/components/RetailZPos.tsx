import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart,
  QrCode,
  Search,
  Plus,
  Minus,
  Trash2,
  Edit2,
  ShieldCheck,
  Lock,
  User as UserIcon,
  CreditCard,
  Building,
  Tag,
  Boxes,
  Sparkles,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Check,
  AlertCircle,
  Truck,
  Store as StoreIcon,
  Package,
  Clock,
  Settings as SettingsIcon,
  X,
  Wallet,
  Gift,
  HelpCircle,
  ChevronRight,
  UserPlus,
  Filter,
  ListFilter,
  Layers,
  FolderTree,
  Building2,
  MapPin,
  Crown,
  Database
} from 'lucide-react';
import {
  getItemDefinitions,
  getCustomers,
  getCategories,
  getSubCategories,
  getItemGroups,
  getSettings,
  getSaleItems,
  completeSale,
  saveCustomer,
  getCurrentUser,
  getActiveStoreChain,
  getStoreChains,
  setActiveStoreChain,
  setActiveBranch,
  subscribeToStorage,
  logActivity
} from '../lib/storage';
import { databaseService, DbConnectionStatus } from '../lib/databaseService';
import { DatabaseModal } from './DatabaseModal';
import { User, ItemDefinition, Customer, Sale, UserRole, Category, SubCategory, ItemGroup, StoreChain, SystemSettings } from '../types';
import { formatCurrency } from '../lib/cft';
import { InvoicePrintModal } from './InvoicePrintModal';

export interface ZPosCartItem {
  id: string; // unique row id
  serial_no: string; // tracking field for high-value electronics / warrantied items
  sku: string;
  description: string;
  packing: number; // pcs per carton
  ctn_qty: number; // carton / bags count
  quantity: number; // total units
  unit_price: number;
  subtotal: number;
  item_def_id?: number;
}

export interface HeldOrder {
  id: string;
  customer: Customer;
  cart: ZPosCartItem[];
  discountPercent: number;
  discountAmount: number;
  flatDiscount: number;
  fulfillmentType: 'carry_out' | 'ship_to_home' | 'bopis';
  heldAt: string;
  subtotal: number;
  netTotal: number;
  note?: string;
}

interface RetailZPosProps {
  userRole: UserRole;
  onNavigateToInvoices?: () => void;
}

export const RetailZPos: React.FC<RetailZPosProps> = ({ userRole, onNavigateToInvoices }) => {
  const [storeChains, setStoreChains] = useState<StoreChain[]>(() => getStoreChains());
  const [activeChain, setActiveChain] = useState<StoreChain>(() => getActiveStoreChain());
  const [settings, setSettingsState] = useState<SystemSettings>(() => getSettings());
  const [currentUser, setCurrentUserState] = useState<User>(() => getCurrentUser());
  const [syncVersion, setSyncVersion] = useState<number>(0);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbConnectionStatus>(() => databaseService.getLastStatus());

  useEffect(() => {
    databaseService.checkStatus();
    const unsubDb = databaseService.subscribe((s) => setDbStatus(s));
    return () => unsubDb();
  }, []);

  // Subscribe to storage changes to keep multi-tenant state fresh in real-time
  useEffect(() => {
    const unsubscribe = subscribeToStorage(() => {
      setStoreChains(getStoreChains());
      setActiveChain(getActiveStoreChain());
      setSettingsState(getSettings());
      setCurrentUserState(getCurrentUser());
      setSyncVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  const itemDefs = getItemDefinitions().filter((item) => item.is_active);
  const customers = getCustomers().filter((c) => c.is_active);
  const categories = getCategories().filter((c) => c.is_active);
  const subCategories = getSubCategories().filter((sc) => sc.is_active);
  const itemGroups = getItemGroups().filter((g) => g.is_active);

  // Inventory Catalog Modal State
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogGroupFilter, setCatalogGroupFilter] = useState<string>('all');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Role Checks for Header Controls
  const isSuperAdmin =
    currentUser.username.toLowerCase() === 'mobin' ||
    currentUser.is_super_admin === true ||
    Boolean(currentUser.designation && currentUser.designation.toLowerCase().includes('super admin'));

  const isStoreAdmin = !isSuperAdmin && (currentUser.role === 'admin' || currentUser.role === 'manager');

  // Store Chain and Branch Information
  const businessName = activeChain.name || settings.business_name || 'Askari Departmental Store Chain';
  const branchName = settings.branch_name || (settings.branches && settings.branches[0]?.name) || 'Main Branch';
  const branchAddress = settings.business_address || (settings.branches && settings.branches[0]?.address) || activeChain.address || '';
  const branches = settings.branches && settings.branches.length > 0
    ? settings.branches
    : [{ id: 'br-1', name: branchName, address: branchAddress, code: '01' }];

  const handleSwitchBusiness = (chainId: string) => {
    setActiveStoreChain(chainId);
    const updatedChain = getActiveStoreChain();
    const updatedSettings = getSettings();
    setActiveChain(updatedChain);
    setSettingsState(updatedSettings);
    showToast(`Switched active business to: ${updatedChain.name}`);
  };

  const handleSwitchBranch = (branchId: string) => {
    const res = setActiveBranch(branchId);
    if (res.success) {
      const updatedSettings = getSettings();
      setSettingsState(updatedSettings);
      showToast(`Branch switched to: ${updatedSettings.branch_name}`);
    }
  };

  // Real-time clock
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleString());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Top Line Inputs
  const [topSerialNo, setTopSerialNo] = useState<string>('SN-1001');
  const [topSku, setTopSku] = useState<string>('');
  const [topDescription, setTopDescription] = useState<string>('');
  const [topPacking, setTopPacking] = useState<number>(1);
  const [topCtnQty, setTopCtnQty] = useState<number>(0);
  const [topQuantity, setTopQuantity] = useState<number>(1);
  const [topUnitPrice, setTopUnitPrice] = useState<number>(0);

  // Selected Item Definition reference if matched
  const [matchedItemDef, setMatchedItemDef] = useState<ItemDefinition | null>(null);

  // Auto-calculated Line Price for Top Line
  const topExtendedPrice = (topCtnQty > 0 ? topCtnQty * topPacking : topQuantity) * topUnitPrice;

  // Search suggestions dropdown for SKU/Product
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [itemQuery, setItemQuery] = useState('');

  // 2. Customer Selection State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(
    customers.find((c) => c.name.toLowerCase().includes('walk-in')) || customers[0] || {
      id: 999,
      name: 'Walk-in Customer',
      phone: '03000000000',
      address: 'Direct Store Visit',
      total_purchase: 0,
      total_paid: 0,
      total_due: 0,
      loyalty_points: 0,
      is_active: true,
      created_by: 1,
      created_at: new Date().toISOString()
    }
  );

  // Active scan behavior determined by customer settings or system settings
  const scanBehavior: 'increase_qty' | 'new_line' =
    selectedCustomer?.custom_scan_behavior ||
    settings.duplicate_scan_behavior ||
    'increase_qty';
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [quickScanInput, setQuickScanInput] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);

  // Quick Customer Lookup by Mobile or QR Code
  const handleQuickScanCustomer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickScanInput.trim()) return;

    const term = quickScanInput.trim().toLowerCase();

    const matched = customers.find(
      (c) =>
        (c.phone && c.phone.toLowerCase() === term) ||
        (c.qr_code && c.qr_code.toLowerCase() === term) ||
        (c.phone && c.phone.replace(/\D/g, '') === term.replace(/\D/g, '') && term.length >= 4) ||
        (c.qr_code && c.qr_code.toLowerCase().includes(term))
    );

    if (matched) {
      setSelectedCustomer(matched);
      setQuickScanInput('');
      setPointsToRedeem(0);
      showToast(`Customer "${matched.name}" loaded! (${matched.loyalty_points || 0} Loyalty Pts)`);
    } else {
      alert(`No registered customer found for Mobile Number or QR Code: "${quickScanInput}". Try searching or adding a new customer.`);
    }
  };

  // Quick New Customer Form
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // 3. Grid State
  const [cart, setCart] = useState<ZPosCartItem[]>([]);

  // Special Authorization Modal State (Password / RFID Card)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] = useState<{
    type: 'delete' | 'edit';
    rowId: string;
    newQty?: number;
    newPrice?: number;
  } | null>(null);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // 5. Order Management & Logistics State
  const [transactionId] = useState<string>(`ZPOS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [fulfillmentType, setFulfillmentType] = useState<'carry_out' | 'ship_to_home' | 'bopis'>('carry_out');
  const [shippingAddress, setShippingAddress] = useState('');
  const [pickupStation, setPickupStation] = useState('Locker #04 - Front Register');

  // 6. Transaction Totals & Payment State
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [flatDiscount, setFlatDiscount] = useState<number>(0);
  const [amountTendered, setAmountTendered] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet' | 'gift' | 'store_credit'>('cash');

  // Station & Associate Info
  const [stationNumber] = useState<string>('Register #01');
  const [cashierId] = useState<string>(`EMP-${currentUser.id.toString().padStart(3, '0')} (${currentUser.full_name})`);
  const customerLoyaltyId = selectedCustomer.phone || `LOYALTY-${selectedCustomer.id}`;

  // Invoice Print Modal State
  const [createdSale, setCreatedSale] = useState<Sale | null>(null);

  // Held Orders State
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
    try {
      const saved = localStorage.getItem('zpos_held_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('zpos_held_orders', JSON.stringify(heldOrders));
    } catch (e) {
      console.error('Failed to save held orders', e);
    }
  }, [heldOrders]);

  // Handle Packing / Carton calculation
  const handleCtnChange = (ctnVal: number) => {
    setTopCtnQty(ctnVal);
    if (ctnVal > 0) {
      // Carton is selected -> automatic piece quantity calculation
      setTopQuantity(ctnVal * topPacking);
    }
  };

  // Direct Add Item from Catalog Modal to Sale Cart Grid
  const handleDirectAddDefToCart = (item: ItemDefinition) => {
    const skuToUse = item.barcode || item.item_code || `SKU-${item.id}`;
    const unitPrice = item.sale_rate || 0;
    const qty = 1;
    const lineSubtotal = qty * unitPrice;

    setCart((prevCart) => {
      if (scanBehavior === 'increase_qty') {
        const existingIdx = prevCart.findIndex((c) => c.sku.toLowerCase() === skuToUse.toLowerCase());
        if (existingIdx >= 0) {
          const updated = [...prevCart];
          const existingItem = updated[existingIdx];
          const newQty = existingItem.quantity + 1;
          updated[existingIdx] = {
            ...existingItem,
            quantity: newQty,
            subtotal: newQty * existingItem.unit_price
          };
          return updated;
        }
      }
      return [
        ...prevCart,
        {
          id: `ROW-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          serial_no: `SN-${Math.floor(1000 + Math.random() * 9000)}`,
          sku: skuToUse,
          description: `${item.item_name} ${item.unit_of_measure ? `(${item.unit_of_measure})` : ''}`,
          packing: item.packing || 1,
          ctn_qty: 0,
          quantity: 1,
          unit_price: unitPrice,
          subtotal: lineSubtotal,
          item_def_id: item.id
        }
      ];
    });
    showToast(`Added "${item.item_name}" to Sale Cart`);
  };

  // Select Item from Catalog/Barcode match
  const selectItemForTopLine = (item: ItemDefinition) => {
    setMatchedItemDef(item);
    setTopSku(item.barcode || item.item_code);
    setTopDescription(`${item.item_name} ${item.unit_of_measure ? `(${item.unit_of_measure})` : ''}`);
    setTopPacking(item.packing || 1);
    setTopCtnQty(0);
    setTopQuantity(1);
    setTopUnitPrice(item.sale_rate || 0);
    setShowItemSuggestions(false);
    setItemQuery('');
  };

  // Add Item from Top Line to Grid
  const handleAddItemToGrid = () => {
    if (!topDescription.trim() || topUnitPrice < 0) return;

    const actualQty = topCtnQty > 0 ? topCtnQty * topPacking : topQuantity;
    if (actualQty <= 0) return;

    const skuToUse = topSku.trim() || `SKU-${Math.floor(100 + Math.random() * 900)}`;
    const lineSubtotal = actualQty * topUnitPrice;

    setCart((prevCart) => {
      // Check duplicate SKU behavior based on setup setting
      if (scanBehavior === 'increase_qty') {
        const existingIdx = prevCart.findIndex((item) => item.sku.toLowerCase() === skuToUse.toLowerCase());
        if (existingIdx >= 0) {
          const updated = [...prevCart];
          const item = updated[existingIdx];
          const newQty = item.quantity + actualQty;
          const newCtn = item.packing > 1 ? Math.floor(newQty / item.packing) : 0;
          updated[existingIdx] = {
            ...item,
            quantity: newQty,
            ctn_qty: newCtn,
            subtotal: newQty * item.unit_price
          };
          return updated;
        }
      }

      // Add as new line item
      const newItem: ZPosCartItem = {
        id: `ROW-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        serial_no: topSerialNo || `SN-${Math.floor(1000 + Math.random() * 9000)}`,
        sku: skuToUse,
        description: topDescription,
        packing: topPacking,
        ctn_qty: topCtnQty,
        quantity: actualQty,
        unit_price: topUnitPrice,
        subtotal: lineSubtotal,
        item_def_id: matchedItemDef?.id,
      };
      return [...prevCart, newItem];
    });

    // Reset Top Line for next item scan
    setTopSerialNo(`SN-${Math.floor(1000 + Math.random() * 9000)}`);
    setTopSku('');
    setTopDescription('');
    setTopPacking(1);
    setTopCtnQty(0);
    setTopQuantity(1);
    setTopUnitPrice(0);
    setMatchedItemDef(null);
  };

  // SKU / Barcode Scan Handler (Note a & b)
  const handleBarcodeScanOrEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = topSku.trim();
      if (!code) return;

      // Try matching item definitions by barcode or item_code
      const matchedDef = itemDefs.find(
        (i) => i.barcode.toLowerCase() === code.toLowerCase() || i.item_code.toLowerCase() === code.toLowerCase()
      );
      if (matchedDef) {
        selectItemForTopLine(matchedDef);
        // Auto-add immediately with 1 quantity (Note a)
        setTimeout(() => {
          const skuToUse = matchedDef.barcode || matchedDef.item_code;
          const unitPrice = matchedDef.sale_rate || 0;
          const lineSubtotal = 1 * unitPrice;

          setCart((prevCart) => {
            if (scanBehavior === 'increase_qty') {
              const existingIdx = prevCart.findIndex((item) => item.sku.toLowerCase() === skuToUse.toLowerCase());
              if (existingIdx >= 0) {
                const updated = [...prevCart];
                const item = updated[existingIdx];
                const newQty = item.quantity + 1;
                updated[existingIdx] = {
                  ...item,
                  quantity: newQty,
                  subtotal: newQty * item.unit_price
                };
                return updated;
              }
            }
            return [
              ...prevCart,
              {
                id: `ROW-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                serial_no: `SN-${Math.floor(1000 + Math.random() * 9000)}`,
                sku: skuToUse,
                description: `${matchedDef.item_name} ${matchedDef.unit_of_measure ? `(${matchedDef.unit_of_measure})` : ''}`,
                packing: matchedDef.packing || 1,
                ctn_qty: 0,
                quantity: 1,
                unit_price: unitPrice,
                subtotal: lineSubtotal,
                item_def_id: matchedDef.id
              }
            ];
          });
          setTopSku('');
          setTopDescription('');
        }, 50);
        return;
      }

      // If typed product description manually
      if (topDescription.trim()) {
        handleAddItemToGrid();
      }
    }
  };

  // Special Security Authorization Trigger for Line Edit / Delete
  const requestAuthorization = (action: 'delete' | 'edit', rowId: string, newQty?: number, newPrice?: number) => {
    setPendingAuthAction({ type: action, rowId, newQty, newPrice });
    setAuthPassword('');
    setAuthError('');
    setAuthModalOpen(true);
  };

  const executeAuthorizedAction = () => {
    // Supervisor Password Check (Default password "1234" or "admin" or RFID Card bypass)
    if (authPassword === '1234' || authPassword === 'admin' || authPassword.toUpperCase().includes('RFID')) {
      if (!pendingAuthAction) return;

      if (pendingAuthAction.type === 'delete') {
        setCart((prev) => prev.filter((item) => item.id !== pendingAuthAction.rowId));
        logActivity('DELETE', 'ZPOS_GRID', pendingAuthAction.rowId, `Deleted item from Z-POS grid by supervisor approval`);
      } else if (pendingAuthAction.type === 'edit') {
        setCart((prev) =>
          prev.map((item) => {
            if (item.id === pendingAuthAction.rowId) {
              const qty = pendingAuthAction.newQty !== undefined ? pendingAuthAction.newQty : item.quantity;
              const price = pendingAuthAction.newPrice !== undefined ? pendingAuthAction.newPrice : item.unit_price;
              return {
                ...item,
                quantity: qty,
                unit_price: price,
                subtotal: qty * price
              };
            }
            return item;
          })
        );
        logActivity('UPDATE', 'ZPOS_GRID', pendingAuthAction.rowId, `Updated item in Z-POS grid by supervisor approval`);
      }

      setAuthModalOpen(false);
      setPendingAuthAction(null);
    } else {
      setAuthError('Invalid Supervisor Password or RFID Card. Authority Denied.');
    }
  };

  // Calculate Totals
  const rawSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItemsCount = cart.length;
  const totalQuantitiesCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Discount calculation
  let calculatedDiscount = 0;
  if (discountPercent > 0) {
    calculatedDiscount = (rawSubtotal * discountPercent) / 100;
  } else if (discountAmount > 0) {
    calculatedDiscount = discountAmount;
  }
  if (flatDiscount > 0) {
    calculatedDiscount += flatDiscount;
  }

  // Loyalty Points Formula & Rates
  // Customer-to-customer formula override if set, otherwise global setting formula
  const effectiveRedemptionRate = selectedCustomer.custom_redemption_rate || settings.loyalty_redemption_rate || 1.0;
  const earnAmountPerPoint = settings.loyalty_earn_amount_per_point || 100;
  const currentSalePointsToEarn = settings.loyalty_enabled !== false ? Math.floor(rawSubtotal / earnAmountPerPoint) : 0;
  const previousPoints = selectedCustomer.loyalty_points || 0;

  // Maximum redeemable points capped by customer previous balance and sale total
  const maxRedeemablePoints = Math.min(
    previousPoints,
    Math.floor(Math.max(0, rawSubtotal - calculatedDiscount) / (effectiveRedemptionRate || 1))
  );

  const validPointsToRedeem = Math.min(pointsToRedeem, maxRedeemablePoints);
  const pointsDiscountAmount = Math.round((validPointsToRedeem * effectiveRedemptionRate) * 100) / 100;

  const taxRate = typeof settings.default_tax_rate === 'number' ? settings.default_tax_rate : 5;
  const taxAmount = Math.round(rawSubtotal * (taxRate / 100) * 100) / 100;
  const netInvoiceTotal = Math.max(0, Math.round((rawSubtotal + taxAmount - calculatedDiscount - pointsDiscountAmount) * 100) / 100);

  const hasTendered = typeof amountTendered === 'number' && !isNaN(amountTendered);
  const tenderedVal = hasTendered ? amountTendered : 0;

  // Change Due = Net Invoice Total - Amount Tendered
  // Exact payment -> 0
  // Overpayment (Tendered > Net Invoice) -> negative value
  // Underpayment (Tendered < Net Invoice) -> positive balance due
  let changeDue = 0;
  if (hasTendered) {
    const rawDiff = Math.round((netInvoiceTotal - tenderedVal) * 100) / 100;
    changeDue = Math.abs(rawDiff) < 0.01 ? 0 : rawDiff;
  }

  // Complete Sale
  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      alert('Cannot finalize sale with an empty grid. Please add items to grid.');
      return;
    }

    const saleResult = completeSale({
      customer_id: selectedCustomer.id === 999 ? null : selectedCustomer.id,
      items: cart.map((item) => ({
        serial: item.serial_no || 'RETAIL',
        sku: item.sku || '',
        description: item.description,
        qty: item.quantity,
        rate: item.unit_price,
        line_total: item.subtotal,
      })),
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount: calculatedDiscount + pointsDiscountAmount,
      grand_total: netInvoiceTotal,
      paid_amount: tenderedVal > 0 ? tenderedVal : netInvoiceTotal,
      payment_method: paymentMethod,
      points_earned: currentSalePointsToEarn,
      points_redeemed: validPointsToRedeem,
      points_discount_amount: pointsDiscountAmount,
      notes: `Z-POS Terminal ${stationNumber} | Fulfillment: ${fulfillmentType.toUpperCase()} | Transaction: ${transactionId}`,
    });

    if (saleResult.success && saleResult.sale) {
      logActivity('CREATE', 'ZPOS_SALE', saleResult.sale.id, `Completed Z-POS Retail Sale #${saleResult.sale.invoice_no}`);
      setCreatedSale(saleResult.sale);
      showToast(`Sale #${saleResult.sale.invoice_no} completed successfully!`);
    } else {
      alert(saleResult.message || 'Failed to process sale.');
    }
  };

  const handleResetSale = () => {
    setCart([]);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setFlatDiscount(0);
    setPointsToRedeem(0);
    setAmountTendered('');
    setSelectedCustomer(
      customers.find((c) => c.name.toLowerCase().includes('walk-in')) || customers[0]
    );
  };

  // Hold Order Handlers
  const handleHoldOrder = () => {
    if (cart.length === 0) {
      alert('Cannot hold an empty transaction. Please add items to the sale grid first.');
      return;
    }

    const note = prompt(
      'Optional reference tag for this held order (e.g., Customer Name, Table #, Phone):',
      selectedCustomer.name
    );

    const newHold: HeldOrder = {
      id: `HOLD-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: selectedCustomer,
      cart: [...cart],
      discountPercent,
      discountAmount,
      flatDiscount,
      fulfillmentType,
      heldAt: new Date().toLocaleString(),
      subtotal: rawSubtotal,
      netTotal: netInvoiceTotal,
      note: note && note.trim() !== '' ? note.trim() : selectedCustomer.name,
    };

    setHeldOrders((prev) => [newHold, ...prev]);
    logActivity('CREATE', 'HOLD_ORDER', newHold.id, `Held order ${newHold.id} with ${cart.length} items`);

    // Reset current billing grid
    handleResetSale();
    showToast(`Order ${newHold.id} held successfully!`);
  };

  const handleRestoreHeldOrder = (heldOrder: HeldOrder) => {
    if (cart.length > 0) {
      const confirmReplace = confirm(
        'Your current sales grid contains items. Restoring this held order will replace the current items in the grid. Do you want to proceed?'
      );
      if (!confirmReplace) return;
    }

    setCart(heldOrder.cart);
    setSelectedCustomer(heldOrder.customer);
    setDiscountPercent(heldOrder.discountPercent);
    setDiscountAmount(heldOrder.discountAmount);
    setFlatDiscount(heldOrder.flatDiscount);
    setFulfillmentType(heldOrder.fulfillmentType);

    // Remove from held orders queue once loaded back to billing grid
    setHeldOrders((prev) => prev.filter((h) => h.id !== heldOrder.id));
    setShowHeldOrdersModal(false);
    logActivity('UPDATE', 'RESTORE_HOLD', heldOrder.id, `Restored held order ${heldOrder.id} back to sales grid`);
    showToast(`Order ${heldOrder.id} loaded back to billing grid!`);
  };

  const handleDeleteHeldOrder = (heldId: string) => {
    if (confirm('Are you sure you want to discard this held order?')) {
      setHeldOrders((prev) => prev.filter((h) => h.id !== heldId));
      showToast(`Held order ${heldId} removed.`);
    }
  };

  const handleCreateNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const saved = saveCustomer({
      name: newCustName,
      phone: newCustPhone || '03000000000',
      address: newCustAddress || 'Registered Store Customer',
      total_purchase: 0,
      total_paid: 0,
      total_due: 0,
      is_active: true,
      created_by: currentUser.id
    });

    if (saved.customer) {
      setSelectedCustomer(saved.customer);
    }
    setShowNewCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
  };

  // Filtered Inventory Items for Catalog Modal
  const filteredCatalogItems = itemDefs.filter((item) => {
    // Search Query
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase().trim();
      const matchName = item.item_name.toLowerCase().includes(q);
      const matchBarcode = item.barcode.toLowerCase().includes(q);
      const matchCode = item.item_code.toLowerCase().includes(q);
      if (!matchName && !matchBarcode && !matchCode) return false;
    }

    // Item Group Filter
    if (catalogGroupFilter !== 'all') {
      const g = itemGroups.find((grp) => String(grp.id) === String(catalogGroupFilter) || grp.group_id === catalogGroupFilter);
      const groupMatch = String(item.item_group_id) === String(catalogGroupFilter) || (g && item.item_group_id === g.id);
      if (!groupMatch) return false;
    }

    // Category Filter
    if (catalogCategoryFilter !== 'all') {
      const c = categories.find((cat) => String(cat.id) === String(catalogCategoryFilter) || cat.name === catalogCategoryFilter);
      const catMatch = String(item.category_id) === String(catalogCategoryFilter) || (c && item.category_id === c.id);
      if (!catMatch) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans p-2 sm:p-4 gap-3">
      {/* HEADER SECTION - STORE/BUSINESS NAME ON LEFT, SWITCHERS IN MIDDLE, BRANCH ON RIGHT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
        {/* Main Store & Branch Info Header */}
        <div className="md:col-span-8 lg:col-span-9 bg-[#0B0F19] text-white rounded-xl p-3 px-5 border border-slate-800 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
          {/* Left Side: Store / Business Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/90 text-white flex items-center justify-center font-black text-sm shrink-0 border border-indigo-400/30 shadow-xs">
              <StoreIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg lg:text-xl font-black text-white tracking-wide truncate">
                  {businessName}
                </h1>
                {activeChain.code && (
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700 shrink-0">
                    {activeChain.code}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Middle: Business & Branch Switcher Controls */}
          {isSuperAdmin && (
            <div className="flex flex-wrap items-center justify-start xl:justify-center gap-2 bg-slate-900/95 p-1.5 px-3 rounded-xl border border-amber-500/30 shadow-inner">
              {/* Business Switcher for Super Admin */}
              <div className="flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Business:</span>
                <select
                  value={activeChain.id}
                  onChange={(e) => handleSwitchBusiness(e.target.value)}
                  className="bg-slate-800 text-white text-xs font-bold rounded-lg px-2 py-1 border border-slate-700 hover:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer max-w-[160px] sm:max-w-[200px] truncate"
                  title="Switch Business Profile (Global Super Admin Only)"
                >
                  {storeChains.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-4 w-px bg-slate-700 hidden sm:block" />

              {/* Branch Switcher for Super Admin */}
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider">Branch:</span>
                <select
                  value={settings.active_branch_id || branches[0]?.id}
                  onChange={(e) => handleSwitchBranch(e.target.value)}
                  className="bg-slate-800 text-white text-xs font-bold rounded-lg px-2 py-1 border border-slate-700 hover:border-indigo-400/60 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer max-w-[140px] sm:max-w-[180px] truncate"
                  title="Switch Branch"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                      {b.name} {b.code ? `[${b.code}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {isStoreAdmin && (
            <div className="flex items-center justify-start xl:justify-center gap-2 bg-slate-900/95 p-1.5 px-3 rounded-xl border border-indigo-500/30 shadow-inner">
              <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">Switch Branch:</span>
              <select
                value={settings.active_branch_id || branches[0]?.id}
                onChange={(e) => handleSwitchBranch(e.target.value)}
                className="bg-slate-800 text-white text-xs font-bold rounded-lg px-2.5 py-1 border border-slate-700 hover:border-indigo-400/60 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer max-w-[180px] sm:max-w-[220px] truncate"
                title="Switch Store Branch"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.name} {b.code ? `[${b.code}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Right Side: Branch Name and Address */}
          <div className="text-left xl:text-right min-w-0">
            <div className="text-xs sm:text-sm font-extrabold text-slate-100 flex items-center xl:justify-end gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{branchName}</span>
            </div>
            {branchAddress && (
              <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center xl:justify-end gap-1 mt-0.5 truncate">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                <span>{branchAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Register & Operator Controls */}
        <div className="md:col-span-4 lg:col-span-3 bg-[#0B0F19] text-white rounded-xl p-3 px-4 border border-slate-800 shadow-sm flex items-center justify-between gap-3">
          {/* PostgreSQL rozana:5432 Status Badge */}
          <button
            type="button"
            onClick={() => setIsDbModalOpen(true)}
            title={`PostgreSQL Database: ${dbStatus.database || 'rozana'} on port ${dbStatus.port || 5432}`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold transition cursor-pointer shadow-xs ${
              dbStatus.connected
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60 hover:bg-emerald-900/60'
                : 'bg-amber-950/80 text-amber-400 border-amber-700/60 hover:bg-amber-900/60'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate max-w-[100px] sm:max-w-none">{dbStatus.database || 'rozana'}:{dbStatus.port || 5432}</span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                dbStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </button>

          <div className="text-right text-xs shrink-0">
            <div className="font-bold text-slate-100 text-[11px] tracking-tight flex items-center justify-end gap-2">
              <span className="px-1.5 py-0.5 bg-indigo-950 text-indigo-300 text-[9px] font-mono font-bold rounded border border-indigo-800/60">
                {stationNumber}
              </span>
              <span className="truncate max-w-[110px] sm:max-w-none">{currentUser.full_name}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5 text-right">
              {currentTime}
            </div>
          </div>
        </div>
      </div>

      {/* TOP ROW: SECTION 1 (QUICK SCAN BAR) ON LEFT + SECTION 5 (ORDER MANAGEMENT) ON RIGHT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-stretch">
        {/* 1. Quick Scan & Product Entry Bar */}
        <div className="md:col-span-7 lg:col-span-7 xl:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200/80 p-2 sm:p-2.5 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between flex-wrap gap-1">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Package className="w-3.5 h-3.5" /> Quick Scan & Product Entry Bar
            </span>
            <span className="text-[10px] font-normal text-slate-500 hidden sm:inline">
              Press <kbd className="bg-slate-100 px-1 py-0.5 rounded border text-slate-700">Enter</kbd> on SKU for instant add
            </span>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-end gap-1.5 w-full relative">
            {/* 2. SKU / Barcode */}
            <div className="w-[calc(50%-0.375rem)] sm:w-28 md:w-32 shrink-0 relative">
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">SKU / Barcode</label>
              <div className="relative">
                <input
                  type="text"
                  value={topSku}
                  onChange={(e) => {
                    setTopSku(e.target.value);
                    setItemQuery(e.target.value);
                    setShowItemSuggestions(true);
                  }}
                  onFocus={() => {
                    if (itemQuery.length > 0) setShowItemSuggestions(true);
                  }}
                  onKeyDown={handleBarcodeScanOrEnter}
                  placeholder="Scan SKU..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-2 pr-6 py-1 text-xs font-mono font-semibold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(true)}
                  className="absolute right-0.5 top-0.5 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all cursor-pointer"
                  title="Search & select from available inventory catalog"
                >
                  <Search className="w-3.5 h-3.5 text-indigo-600" />
                </button>
              </div>
            </div>

            {/* 3. Product Description */}
            <div className="w-[calc(50%-0.375rem)] sm:flex-1 min-w-[100px] relative">
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Product Description</label>
              <input
                type="text"
                value={topDescription}
                onChange={(e) => {
                  setTopDescription(e.target.value);
                  setItemQuery(e.target.value);
                  setShowItemSuggestions(true);
                }}
                onFocus={() => {
                  if (itemQuery.length > 0) setShowItemSuggestions(true);
                }}
                onKeyDown={handleBarcodeScanOrEnter}
                placeholder="Item Name, Brand..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Shared Search Suggestions Dropdown */}
            {showItemSuggestions && itemQuery.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto">
                <div className="p-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-2 border-b flex items-center justify-between">
                  <span>Item Definitions & Stock Catalog</span>
                  <button
                    type="button"
                    onClick={() => setShowItemSuggestions(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
                {itemDefs
                  .filter(
                    (i) =>
                      i.item_name.toLowerCase().includes(itemQuery.toLowerCase()) ||
                      i.barcode.toLowerCase().includes(itemQuery.toLowerCase()) ||
                      i.item_code.toLowerCase().includes(itemQuery.toLowerCase())
                  )
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectItemForTopLine(item)}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-xs border-b border-slate-100 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 block">{item.item_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Barcode/SKU: {item.barcode || item.item_code} | Packing: {item.packing} pcs</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-indigo-600 block">{formatCurrency(item.sale_rate)}</span>
                        <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded">Select Item</span>
                      </div>
                    </button>
                  ))}
              </div>
            )}

            {/* 4. Packing */}
            <div className="w-12 sm:w-14 shrink-0">
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5 text-center">Packing</label>
              <input
                type="number"
                value={topPacking}
                onChange={(e) => setTopPacking(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-100 border border-slate-300 rounded-lg px-1 py-1 text-xs font-semibold text-center text-slate-700"
                readOnly
                title="Packing quantity from item definition"
              />
            </div>

            {/* 5. Ctn / Bags */}
            <div className="w-14 sm:w-16 shrink-0">
              <label className="block text-[10px] font-bold text-indigo-700 mb-0.5 text-center">Ctn/Bags</label>
              <input
                type="number"
                min="0"
                value={topCtnQty}
                onChange={(e) => handleCtnChange(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-indigo-50 border border-indigo-300 rounded-lg px-1 py-1 text-xs font-bold text-center text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                title="Entering cartons automatically calculates unit quantity"
              />
            </div>

            {/* 6. Quantity */}
            <div className="w-12 sm:w-14 shrink-0">
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5 text-center">Quantity</label>
              <input
                type="number"
                min="1"
                disabled={topCtnQty > 0}
                value={topCtnQty > 0 ? topCtnQty * topPacking : topQuantity}
                onChange={(e) => setTopQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full border rounded-lg px-1 py-1 text-xs font-bold text-center ${
                  topCtnQty > 0 ? 'bg-slate-100 border-slate-300 text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                }`}
              />
            </div>

            {/* 7. Unit Price */}
            <div className="w-16 sm:w-20 shrink-0">
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5 text-right">Unit Price</label>
              <input
                type="number"
                min="0"
                value={topUnitPrice}
                onChange={(e) => setTopUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-800 text-right focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 8. Add Button */}
            <div className="w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleAddItemToGrid}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg font-bold shadow hover:shadow-md transition-all flex items-center justify-center gap-1 text-xs cursor-pointer whitespace-nowrap"
                title="Add Item to Sale Grid"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. 📦 ORDER MANAGEMENT & LOGISTICS (RIGHT SIDE OF TOP BAR) */}
        <div className="md:col-span-5 lg:col-span-5 xl:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200/80 p-2 sm:p-2.5 flex flex-col justify-between">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Package className="w-3.5 h-3.5 text-indigo-600" /> Order Management & Logistics
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full my-auto">
            {/* Left Box: Current Billing */}
            <div className="flex-1 flex flex-col justify-center space-y-1">
              <div className="bg-[#f4f8fc] border border-slate-200/70 rounded-lg px-2 py-1 flex items-center justify-between text-xs shadow-2xs">
                <span className="text-slate-600 font-medium text-[10px] whitespace-nowrap">Transaction ID / Receipt #</span>
                <span className="font-mono font-black text-slate-900 text-[11px] ml-1.5 whitespace-nowrap">{transactionId}</span>
              </div>

              <div className="bg-[#f4f8fc] border border-slate-200/70 rounded-lg px-2 py-1 flex items-center justify-between text-xs shadow-2xs">
                <span className="text-slate-600 font-medium text-[10px] whitespace-nowrap">Date & Time Stamp</span>
                <span className="font-mono font-semibold text-slate-800 text-[10px] ml-1.5 whitespace-nowrap">{currentTime}</span>
              </div>
            </div>

            {/* Right Box: Fulfillment Type Checklist */}
            <div className="shrink-0 flex flex-col justify-center space-y-0.5 sm:border-l sm:border-slate-100 sm:pl-2">
              <h3 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider text-left mb-0.5">Fulfillment Type</h3>
              
              <div className="space-y-0.5 text-xs">
                {/* Carry Out (1) */}
                <button
                  type="button"
                  onClick={() => setFulfillmentType('carry_out')}
                  className="flex items-center gap-1.5 w-full text-left group cursor-pointer py-0.5"
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                    fulfillmentType === 'carry_out' 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                      : 'border-slate-300 bg-white group-hover:border-slate-400'
                  }`}>
                    {fulfillmentType === 'carry_out' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className={`text-[11px] whitespace-nowrap ${fulfillmentType === 'carry_out' ? 'font-bold text-slate-900' : 'font-medium text-slate-400'}`}>
                    Carry Out (1)
                  </span>
                </button>

                {/* Ship Home (2) */}
                <button
                  type="button"
                  onClick={() => setFulfillmentType('ship_to_home')}
                  className="flex items-center gap-1.5 w-full text-left group cursor-pointer py-0.5"
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                    fulfillmentType === 'ship_to_home' 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                      : 'border-slate-300 bg-white group-hover:border-slate-400'
                  }`}>
                    {fulfillmentType === 'ship_to_home' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className={`text-[11px] whitespace-nowrap ${fulfillmentType === 'ship_to_home' ? 'font-bold text-slate-900' : 'font-medium text-slate-400'}`}>
                    Ship Home (2)
                  </span>
                </button>

                {/* Take away (3) */}
                <button
                  type="button"
                  onClick={() => setFulfillmentType('bopis')}
                  className="flex items-center gap-1.5 w-full text-left group cursor-pointer py-0.5"
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                    fulfillmentType === 'bopis' 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                      : 'border-slate-300 bg-white group-hover:border-slate-400'
                  }`}>
                    {fulfillmentType === 'bopis' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className={`text-[11px] whitespace-nowrap ${fulfillmentType === 'bopis' ? 'font-bold text-slate-900' : 'font-medium text-slate-400'}`}>
                    Take away (3)
                  </span>
                </button>
              </div>
            </div>
          </div>

          {fulfillmentType === 'ship_to_home' && (
            <div className="bg-indigo-50/70 p-1.5 rounded-lg border border-indigo-200 mt-1 space-y-0.5">
              <label className="block text-[9px] font-bold text-indigo-900 uppercase">Delivery Address</label>
              <input
                type="text"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Enter customer shipping address..."
                className="w-full bg-white border border-indigo-300 rounded px-2 py-0.5 text-xs"
              />
            </div>
          )}

          {fulfillmentType === 'bopis' && (
            <div className="bg-indigo-50/70 p-1.5 rounded-lg border border-indigo-200 mt-1 space-y-0.5">
              <label className="block text-[9px] font-bold text-indigo-900 uppercase">Pickup Location / Locker</label>
              <input
                type="text"
                value={pickupStation}
                onChange={(e) => setPickupStation(e.target.value)}
                className="w-full bg-white border border-indigo-300 rounded px-2 py-0.5 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* CUSTOMER SELECTION & LOYALTY BAR (SECTION 2) */}
      <div className="bg-slate-900 text-white rounded-xl p-3 shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-9 w-9 bg-indigo-600/30 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/30 shrink-0">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider flex items-center gap-1">
              <span>2. Customer Account & Loyalty Balance</span>
              {selectedCustomer.custom_redemption_rate && (
                <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[9px] px-1.5 py-0.2 rounded font-mono">
                  Custom Customer Formula
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white">{selectedCustomer.name}</span>
              <span className="text-xs text-slate-400 font-mono">({selectedCustomer.phone || 'No Phone'})</span>
              {selectedCustomer.name.toLowerCase().includes('walk-in') ? (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Default Walk-In
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Gift className="w-3 h-3 text-amber-400" /> Prev Pts: <strong className="text-white font-black">{previousPoints}</strong>
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" /> Current Sale Earn: <strong className="text-white font-black">+{currentSalePointsToEarn} Pts</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Number or QR Code Quick Lookup Input + Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <form onSubmit={handleQuickScanCustomer} className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <input
              type="text"
              value={quickScanInput}
              onChange={(e) => setQuickScanInput(e.target.value)}
              placeholder="Enter Mobile # or Scan QR Code..."
              className="bg-transparent border-none text-xs text-white placeholder-slate-400 px-2 py-1 outline-none w-48 font-mono"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
              title="Search customer by mobile number or scanned QR code"
            >
              <QrCode className="w-3.5 h-3.5" /> Lookup
            </button>
          </form>

          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan App QR</span>
          </button>

          <button
            onClick={() => setShowCustomerModal(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Directory</span>
          </button>

          <button
            onClick={() => setShowNewCustomerModal(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ New</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO COLUMN LAYOUT: LEFT GRID (3 & 4) vs RIGHT PANEL (5 & 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1">
        {/* LEFT COLUMN: SELECTED ITEMS GRID (3) & SUMMARY BAR (4) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* 3. Items Grid Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 flex-1 flex flex-col min-h-[380px] overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-indigo-600" /> 3. Total Items Selected for Sale Grid
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Protected Line Actions (Supervisor Password/RFID required)
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-2.5 pl-3">Serial No</th>
                    <th className="p-2.5">SKU / Barcode</th>
                    <th className="p-2.5">Product Description</th>
                    <th className="p-2.5 text-center">Quantity</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                    <th className="p-2.5 pr-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-400">
                        <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-sm text-slate-600">No items added to sale grid yet.</p>
                        <p className="text-xs text-slate-400 mt-1">Scan barcode or select an item from top bar to start transaction.</p>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 pl-3 font-mono text-[11px] text-slate-600 font-semibold">{item.serial_no}</td>
                        <td className="p-2.5 font-mono text-xs font-bold text-indigo-700">{item.sku}</td>
                        <td className="p-2.5">
                          <span className="font-semibold text-slate-800 block">{item.description}</span>
                          {item.ctn_qty > 0 && (
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-medium">
                              {item.ctn_qty} Carton(s) × {item.packing} pcs
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="inline-flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
                            <button
                              onClick={() => requestAuthorization('edit', item.id, Math.max(1, item.quantity - 1))}
                              className="p-1 hover:bg-slate-100 text-slate-600 transition-colors"
                              title="Decrease Qty (Auth Required)"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 py-0.5 text-xs font-bold text-slate-900 min-w-[28px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => requestAuthorization('edit', item.id, item.quantity + 1)}
                              className="p-1 hover:bg-slate-100 text-slate-600 transition-colors"
                              title="Increase Qty (Auth Required)"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-800">{formatCurrency(item.unit_price)}</td>
                        <td className="p-2.5 text-right font-extrabold text-emerald-700">{formatCurrency(item.subtotal)}</td>
                        <td className="p-2.5 pr-3 text-center">
                          <button
                            onClick={() => requestAuthorization('delete', item.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1 border border-transparent hover:border-red-200"
                            title="Delete Row (Supervisor Auth Required)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <Lock className="w-2.5 h-2.5 text-amber-500" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. Grid Summary Bar (Under Grid Area) */}
            <div className="bg-slate-900 text-white p-3 px-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Total Rows</span>
                  <span className="text-sm font-bold text-white font-mono">{totalItemsCount} Rows</span>
                </div>
                <div className="h-6 w-px bg-slate-700" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Total Quantity</span>
                  <span className="text-sm font-bold text-indigo-300 font-mono">{totalQuantitiesCount} Units</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block text-right font-semibold">Subtotal Sum</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">{formatCurrency(rawSubtotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TRANSACTION TOTALS & PAYMENT + CUSTOMER/STAFF IDENTIFICATION (6) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* 6. TRANSACTION TOTALS & PAYMENT + CUSTOMER/STAFF ID (VERTICAL RECTANGLE) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-3 sm:p-4 flex-1 flex flex-col justify-between">
            <div>
              {/* 💳 Transaction Totals & Payment */}
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2.5 border-b pb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" /> 💳 Transaction Totals & Payment
              </h3>

              <div className="space-y-2 text-xs">
                {/* Invoice Discount %age & Amount */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Discount %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => {
                        setDiscountPercent(parseFloat(e.target.value) || 0);
                        setDiscountAmount(0);
                      }}
                      placeholder="0%"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Disc Amount</label>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => {
                        setDiscountAmount(parseFloat(e.target.value) || 0);
                        setDiscountPercent(0);
                      }}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Flat Discount</label>
                    <input
                      type="number"
                      min="0"
                      value={flatDiscount}
                      onChange={(e) => setFlatDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 text-right"
                    />
                  </div>
                </div>

                {/* LOYALTY POINTS REDEMPTION BOX */}
                {selectedCustomer.id !== 999 && previousPoints > 0 && (
                  <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-amber-100/50 p-2.5 rounded-xl border border-amber-300 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-black text-amber-950">
                        <Gift className="w-4 h-4 text-amber-600" />
                        <span>Loyalty Points Redemption</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                        Formula: {settings.currency_symbol}{effectiveRedemptionRate}/pt
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                          Points to Redeem (Max: {maxRedeemablePoints})
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max={maxRedeemablePoints}
                            value={pointsToRedeem}
                            onChange={(e) =>
                              setPointsToRedeem(Math.max(0, Math.min(maxRedeemablePoints, parseInt(e.target.value) || 0)))
                            }
                            className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-black text-amber-950 text-right"
                          />
                          <button
                            type="button"
                            onClick={() => setPointsToRedeem(maxRedeemablePoints)}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg shrink-0"
                          >
                            Max Redeem
                          </button>
                        </div>
                      </div>

                      <div className="shrink-0 text-right pl-2 border-l border-amber-200">
                        <span className="text-[10px] font-bold text-amber-800 block">Redemption Value</span>
                        <span className="text-sm font-black text-emerald-700 font-mono">
                          -{formatCurrency(pointsDiscountAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Net Invoice Total Display */}
                <div className="bg-slate-900 text-white p-3 rounded-xl shadow-inner flex items-center justify-between border border-slate-800 my-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">Net Invoice Total</span>
                    <span className="text-xs text-slate-400">Incl. Taxes & Discounts</span>
                  </div>
                  <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                    {formatCurrency(netInvoiceTotal)}
                  </span>
                </div>

                {/* Amount Tendered & Change / Balance Due */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] font-semibold text-slate-700">Amount Tendered</label>
                      {hasTendered && (
                        <button
                          type="button"
                          onClick={() => setAmountTendered('')}
                          className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder={netInvoiceTotal.toString()}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-emerald-900 text-right focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                      Change Due
                    </label>
                    <div className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-right font-mono transition-colors ${
                      changeDue < 0
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : changeDue > 0
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}>
                      {formatCurrency(changeDue)}
                    </div>
                  </div>
                </div>

                {/* Payment Method Selector (Multi-option) */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-700 mb-1">Payment Method</label>
                  <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-1 text-[10px] font-bold rounded transition-all text-center ${
                        paymentMethod === 'cash' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Cash [1]
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`py-1 text-[10px] font-bold rounded transition-all text-center ${
                        paymentMethod === 'card' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Card [2]
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('wallet')}
                      className={`py-1 text-[10px] font-bold rounded transition-all text-center ${
                        paymentMethod === 'wallet' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Wallet [3]
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('gift')}
                      className={`py-1 text-[10px] font-bold rounded transition-all text-center ${
                        paymentMethod === 'gift' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Gift [4]
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('store_credit')}
                      className={`py-1 text-[10px] font-bold rounded transition-all text-center ${
                        paymentMethod === 'store_credit' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Credit [5]
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={handleFinalizeSale}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-extrabold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Finalize Sale & Print Receipt</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleHoldOrder}
                  className="bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  title="Hold current order items in queue"
                >
                  <Clock className="w-3.5 h-3.5" /> Hold Order
                </button>
                <button
                  type="button"
                  onClick={() => setShowHeldOrdersModal(true)}
                  className="relative bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  title="Recall held orders back to billing grid"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Recall ({heldOrders.length})
                  {heldOrders.length > 0 && (
                    <span className="bg-amber-400 text-slate-900 font-extrabold text-[10px] px-1.5 rounded-full animate-pulse ml-0.5">
                      {heldOrders.length}
                    </span>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetSale}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear POS Grid
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SUPERVISOR AUTHORIZATION MODAL */}
      {authModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-amber-600">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="font-extrabold text-base text-slate-900">Supervisor Authority Required</h3>
              </div>
              <button onClick={() => setAuthModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Line-wise edit or deletion requires special authorization via Supervisor Password or Manager RFID Card scan.
            </p>

            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-xs font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supervisor Password / RFID Card Code
                </label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeAuthorizedAction()}
                  placeholder="Enter Password (e.g. 1234)..."
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setAuthPassword('1234')}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  Use Demo PIN (1234)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(false)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeAuthorizedAction}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow"
                  >
                    Authorize Action
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER SEARCH MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-sm text-slate-900">Select Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-3">
              <input
                type="text"
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                placeholder="Search by customer name, phone number or loyalty ID..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
              {customers
                .filter(
                  (c) =>
                    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    c.phone.includes(customerSearchQuery)
                )
                .map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(cust);
                      setShowCustomerModal(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-indigo-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{cust.name}</span>
                      <span className="text-slate-500 font-mono text-[11px]">Phone: {cust.phone}</span>
                    </div>
                    <span className="text-indigo-600 font-bold text-[11px]">Select</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* APP QR SCAN MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 text-center">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm text-slate-900">Scan Mobile App QR Code</h3>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-900 text-indigo-400 p-8 rounded-xl my-4 border border-slate-800 flex flex-col items-center justify-center gap-3">
              <QrCode className="w-16 h-16 animate-pulse" />
              <p className="text-xs text-slate-300">Point scanner at Customer Mobile App QR code...</p>
            </div>
            <button
              onClick={() => {
                const randomCust = customers[Math.floor(Math.random() * customers.length)];
                setSelectedCustomer(randomCust);
                setShowQrModal(false);
              }}
              className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg text-xs"
            >
              Simulate QR Code Scan
            </button>
          </div>
        </div>
      )}

      {/* QUICK NEW CUSTOMER MODAL */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-sm text-slate-900">Register New Customer</h3>
              <button onClick={() => setShowNewCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Mobile Phone Number</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="03001234567"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Address / Notes</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Store customer address..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-3 py-1.5 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-lg shadow"
                >
                  Create & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVENTORY CATALOG & STOCK SELECTION MODAL */}
      {showCatalogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Inventory Catalog & Available Stock</h3>
                  <p className="text-xs text-slate-300">Browse and filter available items by Item Group, Category, and Shipment Lot</p>
                </div>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Controls Bar */}
            <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
              {/* Row 1: Search Keyword + Type Tabs + Reset Button */}
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search by Item Name, SKU, Barcode, or Serial #..."
                    className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  {catalogSearch && (
                    <button
                      onClick={() => setCatalogSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Reset Filters Button */}
                {(catalogSearch || catalogGroupFilter !== 'all' || catalogCategoryFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogSearch('');
                      setCatalogGroupFilter('all');
                      setCatalogCategoryFilter('all');
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear Filters
                  </button>
                )}
              </div>

              {/* Row 2: Category and Item Group Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* 1. Item Group Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <ListFilter className="w-3 h-3 text-indigo-600" /> Filter by Item Group
                  </label>
                  <select
                    value={catalogGroupFilter}
                    onChange={(e) => setCatalogGroupFilter(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Item Groups ({itemGroups.length})</option>
                    {itemGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.group_id} - {g.group_description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Category Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <FolderTree className="w-3 h-3 text-indigo-600" /> Filter by Category
                  </label>
                  <select
                    value={catalogCategoryFilter}
                    onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Categories ({categories.length})</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Catalog Items Grid / List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {filteredCatalogItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-sm">No inventory items matched your filter criteria</p>
                  <p className="text-xs text-slate-400 mt-1">Try clearing your filters or typing another search keyword.</p>
                </div>
              ) : (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" /> Standard Products & Definitions ({filteredCatalogItems.length})
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                          <th className="py-2.5 px-3">Item Description</th>
                          <th className="py-2.5 px-3 font-mono">Barcode / SKU</th>
                          <th className="py-2.5 px-3">Item Group</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3 text-center">Packing</th>
                          <th className="py-2.5 px-3 text-right">Sale Price</th>
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredCatalogItems.map((item) => {
                          const group = itemGroups.find((g) => g.id === item.item_group_id || g.group_id === item.item_group_id);
                          const cat = categories.find((c) => c.id === item.category_id || c.name === item.category_id);
                          return (
                            <tr key={`def-${item.id}`} className="hover:bg-indigo-50/40 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{item.item_name}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 font-medium">{item.barcode || item.item_code}</td>
                              <td className="py-2.5 px-3">
                                {group ? (
                                  <span className="bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded border border-indigo-100 text-[11px]">
                                    {group.group_id} - {group.group_description}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {cat ? (
                                  <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[11px]">
                                    {cat.name}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                                {item.packing} pcs
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                                {formatCurrency(item.sale_rate)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      selectItemForTopLine(item);
                                      setShowCatalogModal(false);
                                    }}
                                    className="bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] px-2.5 py-1 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                                  >
                                    Load Bar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDirectAddDefToCart(item)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Add
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 border-t border-slate-200 p-3 flex items-center justify-between text-xs font-medium text-slate-600 shrink-0">
              <div>
                Showing <span className="font-bold text-slate-900">{filteredCatalogItems.length}</span> items
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg font-bold cursor-pointer"
              >
                Close Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELD ORDERS QUEUE MODAL */}
      {showHeldOrdersModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-slate-900">Held / Paused Orders Queue</h3>
                <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  {heldOrders.length} Order(s)
                </span>
              </div>
              <button onClick={() => setShowHeldOrdersModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {heldOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-600 text-sm">No Held Orders in Queue</p>
                <p className="text-xs text-slate-400 mt-1">
                  When a customer steps away, click "Hold Order" to pause their bill and retrieve it later.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {heldOrders.map((held) => (
                  <div
                    key={held.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="space-y-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                          {held.id}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{held.customer.name}</span>
                      </div>
                      {held.note && (
                        <p className="text-[11px] text-slate-500 italic">
                          Tag/Note: <span className="text-slate-700 font-medium">"{held.note}"</span>
                        </p>
                      )}
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                        <span>{held.heldAt}</span>
                        <span>•</span>
                        <span>{held.cart.length} item(s)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Net Amount</span>
                        <span className="text-sm font-black text-emerald-600 font-mono">
                          {formatCurrency(held.netTotal)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRestoreHeldOrder(held)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition-colors flex items-center gap-1 cursor-pointer"
                          title="Restore this order back to the active POS sale grid"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore to Grid</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHeldOrder(held.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Discard held order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHeldOrdersModal(false)}
                className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE RECEIPT & PRINT MODAL */}
      {createdSale && (
        <InvoicePrintModal
          sale={createdSale}
          items={getSaleItems().filter((item) => item.sale_id === createdSale.id)}
          customer={selectedCustomer.id === 999 ? null : selectedCustomer}
          settings={settings}
          cashier={currentUser}
          onClose={() => {
            setCreatedSale(null);
            handleResetSale();
          }}
        />
      )}

      {/* POSTGRESQL DATABASE MODAL */}
      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />

      {/* TOAST POPUP FEEDBACK */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
