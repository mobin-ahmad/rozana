import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Truck,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Layers,
  X,
  Download,
  Upload,
  FileSpreadsheet,
  Search,
  FileText,
  Tag,
  Box,
  Image as ImageIcon,
  RotateCcw,
  FolderOpen,
  Award
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getCategories,
  getSubCategories,
  getItemGroups,
  getBrands,
  getItemDefinitions,
  getWoodStocks,
  getUsers,
  saveCategory,
  deleteCategory,
  saveSubCategory,
  deleteSubCategory,
  saveItemGroup,
  deleteItemGroup,
  saveBrand,
  deleteBrand,
  saveItemDefinition,
  deleteItemDefinition,
  bulkImportCategories,
  bulkImportSubCategories,
  bulkImportItemGroups,
  bulkImportBrands,
  bulkImportItemDefinitions,
  getSettings,
  subscribeToStorage
} from '../lib/storage';
import { Category, SubCategory, ItemGroup, Brand, ItemDefinition, UserRole } from '../types';
import { formatCurrency, formatCft } from '../lib/cft';

interface CategoriesAndCarsProps {
  userRole: UserRole;
}

export const CategoriesAndCars: React.FC<CategoriesAndCarsProps> = ({ userRole }) => {
  const [, setRefreshKey] = useState(0);

  useEffect(() => {
    return subscribeToStorage(() => {
      setRefreshKey((prev) => prev + 1);
    });
  }, []);

  const categories = getCategories();
  const subCats = getSubCategories();
  const itemGroups = getItemGroups();
  const brands = getBrands();
  const itemDefinitions = getItemDefinitions();
  const stocks = getWoodStocks();
  const users = getUsers();
  const settings = getSettings();

  const isAdmin = userRole === 'admin';
  const isEditable = userRole === 'admin' || userRole === 'manager' || userRole === 'warehouse_staff';

  const [activeTab, setActiveTab] = useState<'lots' | 'categories' | 'groups' | 'brands' | 'items'>('lots');
  const [searchQuery, setSearchQuery] = useState('');

  // Category Modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catItemGroupId, setCatItemGroupId] = useState<string | number>('');
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Shipment Lot Modal
  const [showCarModal, setShowCarModal] = useState(false);
  const [editingCar, setEditingCar] = useState<SubCategory | null>(null);
  const [carCatId, setCarCatId] = useState<number>(categories[0]?.id || 1);
  const [carName, setCarName] = useState('');
  const [carArrivalDate, setCarArrivalDate] = useState('');
  const [carDesc, setCarDesc] = useState('');

  // Item Group Modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ItemGroup | null>(null);
  const [groupId, setGroupId] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupIsActive, setGroupIsActive] = useState(true);

  // Brand Modal
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandCode, setBrandCode] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [brandIsActive, setBrandIsActive] = useState(true);

  // Item Definition Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemDefinition | null>(null);
  const [itemGroupId, setItemGroupId] = useState<string | number>('');
  const [itemCatId, setItemCatId] = useState<string | number>('');
  const [itemBrandId, setItemBrandId] = useState<string | number>('');
  const [itemCode, setItemCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [itemName, setItemName] = useState('');
  const [nationalLanguageName, setNationalLanguageName] = useState('');
  const [reorderLevel, setReorderLevel] = useState<number>(0);
  const [reorderQty, setReorderQty] = useState<number>(0);
  const [unitOfMeasure, setUnitOfMeasure] = useState('PCS');
  const [publisherVendor, setPublisherVendor] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [printedPrice, setPrintedPrice] = useState<number>(0);
  const [purchaseDiscount, setPurchaseDiscount] = useState<number>(0);
  const [purchaseRate, setPurchaseRate] = useState<number>(0);
  const [weightedAverageRate, setWeightedAverageRate] = useState<number>(0);
  const [saleDiscount, setSaleDiscount] = useState<number>(0);
  const [saleRate, setSaleRate] = useState<number>(0);
  const [marginPercent, setMarginPercent] = useState<number>(0);
  const [packing, setPacking] = useState<number>(1);
  const [bulkRate, setBulkRate] = useState<number>(0);
  const [ctnRate, setCtnRate] = useState<number>(0);
  const [wsRate, setWsRate] = useState<number>(0);
  const [bulkQty, setBulkQty] = useState<number>(0);
  const [itemIsActive, setItemIsActive] = useState(true);

  // Bulk Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Detail Modal
  const [viewingCar, setViewingCar] = useState<SubCategory | null>(null);

  const getUserName = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.full_name : `User #${userId}`;
  };

  // --- Category Handlers ---
  const handleOpenCatModal = (cat?: Category) => {
    if (cat) {
      setEditingCat(cat);
      setCatItemGroupId(cat.item_group_id || '');
      setCatName(cat.name);
      setCatDesc(cat.description || '');
    } else {
      setEditingCat(null);
      setCatItemGroupId('');
      setCatName('');
      setCatDesc('');
    }
    setShowCatModal(true);
  };

  const handleSaveCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const res = saveCategory({
      id: editingCat?.id,
      item_group_id: catItemGroupId ? (isNaN(Number(catItemGroupId)) ? catItemGroupId : Number(catItemGroupId)) : undefined,
      name: catName,
      description: catDesc,
    });
    if (res.success) {
      setShowCatModal(false);
    } else {
      alert(res.message);
    }
  };

  const handleDeleteCat = (id: number) => {
    if (userRole !== 'admin') {
      alert('Only administrators have permission to delete categories.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this category?')) {
      const res = deleteCategory(id);
      if (!res.success) alert(res.message);
    }
  };

  // --- Shipment Lot Handlers ---
  const handleOpenCarModal = (car?: SubCategory) => {
    if (car) {
      setEditingCar(car);
      setCarCatId(car.category_id);
      setCarName(car.name);
      setCarArrivalDate(car.arrival_date || '');
      setCarDesc(car.description || '');
    } else {
      setEditingCar(null);
      setCarCatId(categories[0]?.id || 1);
      setCarName(`Lot ${subCats.length + 1}`);
      setCarArrivalDate(new Date().toISOString().split('T')[0]);
      setCarDesc('');
    }
    setShowCarModal(true);
  };

  const handleSaveCar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!carName.trim() || !carCatId) return;
    const res = saveSubCategory({
      id: editingCar?.id,
      category_id: carCatId,
      name: carName,
      arrival_date: carArrivalDate,
      description: carDesc,
    });
    if (res.success) {
      setShowCarModal(false);
    } else {
      alert(res.message);
    }
  };

  const handleDeleteCar = (id: number) => {
    if (userRole !== 'admin') {
      alert('Only administrators have permission to delete shipment lots.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this shipment lot?')) {
      const res = deleteSubCategory(id);
      if (!res.success) alert(res.message);
    }
  };

  // --- Item Group Handlers ---
  const handleOpenGroupModal = (group?: ItemGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupId(group.group_id);
      setGroupDesc(group.group_description || '');
      setGroupIsActive(group.is_active);
    } else {
      setEditingGroup(null);
      setGroupId(`GRP-${String(itemGroups.length + 1).padStart(3, '0')}`);
      setGroupDesc('');
      setGroupIsActive(true);
    }
    setShowGroupModal(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId.trim()) return;
    const res = saveItemGroup({
      id: editingGroup?.id,
      group_id: groupId,
      group_description: groupDesc,
      is_active: groupIsActive,
    });
    if (res.success) {
      setShowGroupModal(false);
    } else {
      alert(res.message);
    }
  };

  const handleDeleteGroup = (id: number) => {
    if (userRole !== 'admin') {
      alert('Only administrators have permission to delete item groups.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this item group?')) {
      const res = deleteItemGroup(id);
      if (!res.success) alert(res.message);
    }
  };

  // --- Brand Handlers ---
  const handleOpenBrandModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandCode(brand.code);
      setBrandName(brand.name);
      setBrandDesc(brand.description || '');
      setBrandIsActive(brand.is_active);
    } else {
      setEditingBrand(null);
      setBrandCode(`BRD-${String(brands.length + 1).padStart(3, '0')}`);
      setBrandName('');
      setBrandDesc('');
      setBrandIsActive(true);
    }
    setShowBrandModal(true);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      alert('Brand Name is required');
      return;
    }
    const res = saveBrand({
      id: editingBrand?.id,
      code: brandCode,
      name: brandName,
      description: brandDesc,
      is_active: brandIsActive,
    });
    if (res.success) {
      setShowBrandModal(false);
    } else {
      alert(res.message);
    }
  };

  const handleDeleteBrand = (id: number) => {
    if (userRole !== 'admin') {
      alert('Only administrators have permission to delete brands.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this brand?')) {
      const res = deleteBrand(id);
      if (!res.success) alert(res.message);
    }
  };

  // --- Item Definition Handlers ---
  const handleOpenItemModal = (item?: ItemDefinition) => {
    if (item) {
      setEditingItem(item);
      setItemGroupId(item.item_group_id || '');
      setItemCatId(item.category_id || '');
      setItemBrandId(item.brand_id || '');
      setItemCode(item.item_code);
      setBarcode(item.barcode || '');
      setItemName(item.item_name);
      setNationalLanguageName(item.national_language_item_name || item.item_name_urdu || '');
      setReorderLevel(item.reorder_level || 0);
      setReorderQty(item.reorder_qty || 0);
      setUnitOfMeasure(item.unit_of_measure || 'PCS');
      setPublisherVendor(item.publisher_vendor || '');
      setImageUrl(item.image_url || '');
      setPrintedPrice(item.printed_price || 0);
      setPurchaseDiscount(item.purchase_discount_percent || 0);
      setPurchaseRate(item.purchase_rate || 0);
      setWeightedAverageRate(item.weighted_average_rate !== undefined ? item.weighted_average_rate : (item.purchase_rate || 0));
      setSaleDiscount(item.sale_discount_percent || 0);
      setSaleRate(item.sale_rate || 0);
      setMarginPercent(item.margin_percent || 0);
      setPacking(item.packing || 1);
      setBulkRate(item.bulk_rate || 0);
      setCtnRate(item.ctn_rate || 0);
      setWsRate(item.ws_rate || 0);
      setBulkQty(item.bulk_qty || 0);
      setItemIsActive(item.is_active);
    } else {
      setEditingItem(null);
      setItemGroupId(itemGroups[0]?.id || '');
      setItemCatId(categories[0]?.id || '');
      setItemBrandId(brands[0]?.id || '');
      setItemCode(`ITM-${String(itemDefinitions.length + 1).padStart(3, '0')}`);
      setBarcode('');
      setItemName('');
      setNationalLanguageName('');
      setReorderLevel(0);
      setReorderQty(0);
      setUnitOfMeasure('PCS');
      setPublisherVendor('');
      setImageUrl('');
      setPrintedPrice(0);
      setPurchaseDiscount(0);
      setPurchaseRate(0);
      setWeightedAverageRate(0);
      setSaleDiscount(0);
      setSaleRate(0);
      setMarginPercent(0);
      setPacking(1);
      setBulkRate(0);
      setCtnRate(0);
      setWsRate(0);
      setBulkQty(0);
      setItemIsActive(true);
    }
    setShowItemModal(true);
  };

  const calculateMargin = (pRate: number, sRate: number) => {
    if (pRate > 0) {
      const m = ((sRate - pRate) / pRate) * 100;
      return Math.round(m * 100) / 100;
    }
    return 0;
  };

  const handlePurchaseRateChange = (val: number) => {
    setPurchaseRate(val);
    if (!editingItem || weightedAverageRate === 0 || weightedAverageRate === purchaseRate) {
      setWeightedAverageRate(val);
    }
    setMarginPercent(calculateMargin(val, saleRate));
  };

  const handleSaleRateChange = (val: number) => {
    setSaleRate(val);
    setMarginPercent(calculateMargin(purchaseRate, val));
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim() || !itemName.trim()) {
      alert('Item Code and Item Name are required');
      return;
    }
    const res = saveItemDefinition({
      id: editingItem?.id,
      item_group_id: itemGroupId,
      category_id: itemCatId,
      brand_id: itemBrandId,
      item_code: itemCode,
      barcode,
      item_name: itemName,
      national_language_item_name: nationalLanguageName,
      item_name_urdu: nationalLanguageName,
      unit_of_measure: unitOfMeasure,
      publisher_vendor: publisherVendor,
      image_url: imageUrl,
      reorder_level: Number(reorderLevel || 0),
      reorder_qty: Number(reorderQty || 0),
      printed_price: printedPrice,
      purchase_discount_percent: purchaseDiscount,
      purchase_rate: purchaseRate,
      weighted_average_rate: Number(weightedAverageRate || purchaseRate || 0),
      sale_discount_percent: saleDiscount,
      sale_rate: saleRate,
      margin_percent: marginPercent,
      packing,
      bulk_rate: bulkRate,
      ctn_rate: ctnRate,
      ws_rate: wsRate,
      bulk_qty: bulkQty,
      is_active: itemIsActive,
    });
    if (res.success) {
      setShowItemModal(false);
    } else {
      alert(res.message);
    }
  };

  const handleDeleteItem = (id: number) => {
    if (userRole !== 'admin') {
      alert('Only administrators have permission to delete item definitions.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this item definition?')) {
      const res = deleteItemDefinition(id);
      if (!res.success) alert(res.message);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Excel Import & Export Helpers ---
  const exportToExcelFile = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  // Option 1: Export Template
  const handleExportTemplate = () => {
    if (activeTab === 'lots') {
      const templateData = [
        {
          'Lot Code / Name': 'Lot 101',
          'Category Name': categories[0]?.name || 'Raw Wood',
          'Arrival Date': new Date().toISOString().split('T')[0],
          'Description': 'First teak batch shipment lot',
          'Is Active': 'TRUE'
        },
        {
          'Lot Code / Name': 'Lot 102',
          'Category Name': categories[1]?.name || 'Processed Wood',
          'Arrival Date': new Date().toISOString().split('T')[0],
          'Description': 'Second pine planks shipment lot',
          'Is Active': 'TRUE'
        }
      ];
      exportToExcelFile(templateData, 'Shipment_Lots_Upload_Template', 'Shipment_Lots');
    } else if (activeTab === 'categories') {
      const templateData = [
        {
          'Category Name': 'Hardwood Timber',
          'Description': 'Dense structural timber species like Oak and Teak',
          'Is Active': 'TRUE'
        },
        {
          'Category Name': 'Softwood Timber',
          'Description': 'Lightweight timber species like Pine and Fir',
          'Is Active': 'TRUE'
        }
      ];
      exportToExcelFile(templateData, 'Categories_Upload_Template', 'Categories');
    } else if (activeTab === 'groups') {
      const templateData = [
        {
          'Group ID': 'GRP-101',
          'Group Description': 'Unprocessed Raw Timber Logs',
          'Is Active': 'TRUE'
        },
        {
          'Group ID': 'GRP-102',
          'Group Description': 'Finished Hardwood Sawn Boards',
          'Is Active': 'TRUE'
        }
      ];
      exportToExcelFile(templateData, 'Item_Groups_Upload_Template', 'Item_Groups');
    } else if (activeTab === 'brands') {
      const templateData = [
        {
          'Brand Code': 'BRD-001',
          'Brand Name': 'National Timber',
          'Description': 'Premium certified timber & lumber products',
          'Is Active': 'TRUE'
        },
        {
          'Brand Code': 'BRD-002',
          'Brand Name': 'Crown Plywood',
          'Description': 'Standard commercial and marine grade plywood',
          'Is Active': 'TRUE'
        }
      ];
      exportToExcelFile(templateData, 'Brands_Upload_Template', 'Brands');
    } else if (activeTab === 'items') {
      const templateData = [
        {
          'Item Group': itemGroups[0]?.group_id || 'GRP-001',
          'Category': categories[0]?.name || 'Raw Wood',
          'Brand': brands[0]?.name || 'National Timber',
          'Item Code': 'ITM-001',
          'Barcode': '8901234567891',
          'Item Name': 'Teak Board 2x4',
          'National Language Item Name': 'ساگوان پٹی ۲x۴',
          'Unit of Measure': 'CFT',
          'Publisher/Vendor': 'Global Timber Ltd',
          'Reorder Level': 10,
          'Reorder Qty': 50,
          'Printed Price': 3200,
          'Purchase Discount (%)': 5,
          'Purchase Rate': 2500,
          'Weighted Average Rate': 2475,
          'Sale Discount (%)': 2,
          'Sale Rate': 3000,
          'Margin (%)': 20,
          'Packing': 1,
          'Bulk Rate': 2850,
          'Ctn.Rate': 2900,
          'W.S.Rate': 2800,
          'Bulk Qty': 10
        }
      ];
      exportToExcelFile(templateData, 'Item_Definitions_Upload_Template', 'Item_Definitions');
    }
  };

  // Option 2: Export Excel
  const handleExportExcel = () => {
    if (activeTab === 'lots') {
      const exportData = subCats.map((sc) => {
        const cat = categories.find((c) => c.id === sc.category_id);
        const carStocks = stocks.filter((s) => s.sub_category_id === sc.id);
        const totalPcs = carStocks.reduce((sum, s) => sum + s.qty, 0);
        const totalCft = carStocks.reduce((sum, s) => sum + s.cft * s.qty, 0);

        return {
          'ID': sc.id,
          'Lot Code / Name': sc.name,
          'Category': cat ? cat.name : 'N/A',
          'Arrival Date': sc.arrival_date || 'N/A',
          'Description': sc.description || '',
          'Total Pieces': totalPcs,
          'Total Volume (CFT)': Math.round(totalCft * 100) / 100,
          'Status': sc.is_active ? 'Active' : 'Inactive',
          'Created By': getUserName(sc.created_by),
          'Created At': new Date(sc.created_at).toLocaleString(),
        };
      });
      exportToExcelFile(exportData, 'Shipment_Lots_Export', 'Shipment_Lots');
    } else if (activeTab === 'categories') {
      const exportData = categories.map((c) => {
        const linkedLots = subCats.filter((sc) => sc.category_id === c.id);
        return {
          'ID': c.id,
          'Category Name': c.name,
          'Description': c.description || '',
          'Linked Shipment Lots': linkedLots.length,
          'Status': c.is_active ? 'Active' : 'Inactive',
          'Created By': getUserName(c.created_by),
          'Created At': new Date(c.created_at).toLocaleString(),
        };
      });
      exportToExcelFile(exportData, 'Categories_Export', 'Categories');
    } else if (activeTab === 'groups') {
      const exportData = itemGroups.map((g) => ({
        'ID': g.id,
        'Group_ID': g.group_id,
        'Group_Description': g.group_description || '',
        'Status': g.is_active ? 'Active' : 'Inactive',
        'Created_by': getUserName(g.created_by),
        'Created_at': new Date(g.created_at).toLocaleString(),
      }));
      exportToExcelFile(exportData, 'Item_Groups_Export', 'Item_Groups');
    } else if (activeTab === 'brands') {
      const exportData = brands.map((b) => {
        const linkedItems = itemDefinitions.filter(
          (itm) => Number(itm.brand_id) === Number(b.id) || itm.brand_name === b.name
        );
        return {
          'ID': b.id,
          'Brand Code': b.code,
          'Brand Name': b.name,
          'Description': b.description || '',
          'Linked Items': linkedItems.length,
          'Status': b.is_active ? 'Active' : 'Inactive',
          'Created By': getUserName(b.created_by),
          'Created At': new Date(b.created_at).toLocaleString(),
        };
      });
      exportToExcelFile(exportData, 'Brands_Export', 'Brands');
    } else if (activeTab === 'items') {
      const exportData = itemDefinitions.map((item) => {
        const grp = itemGroups.find((g) => g.id === item.item_group_id || g.group_id === item.item_group_id);
        const cat = categories.find((c) => c.id === item.category_id || c.name === item.category_id);
        const brd = brands.find((b) => b.id === Number(item.brand_id) || b.name === item.brand_name);
        return {
          'ID': item.id,
          'Item Group': grp ? grp.group_id : item.item_group_id || '',
          'Category': cat ? cat.name : item.category_id || '',
          'Brand': brd ? brd.name : item.brand_name || '',
          'Item Code': item.item_code,
          'Barcode': item.barcode,
          'Item Name': item.item_name,
          'National Language Item Name': item.national_language_item_name || item.item_name_urdu || '',
          'Unit of Measure': item.unit_of_measure,
          'Publisher/Vendor': item.publisher_vendor,
          'Reorder Level': item.reorder_level || 0,
          'Reorder Qty': item.reorder_qty || 0,
          'Printed Price': item.printed_price,
          'Purchase Discount (%)': item.purchase_discount_percent,
          'Purchase Rate': item.purchase_rate,
          'Weighted Average Rate': item.weighted_average_rate !== undefined ? item.weighted_average_rate : item.purchase_rate,
          'Sale Discount (%)': item.sale_discount_percent,
          'Sale Rate': item.sale_rate,
          'Margin (%)': item.margin_percent,
          'Packing': item.packing,
          'Bulk Rate': item.bulk_rate,
          'Ctn.Rate': item.ctn_rate,
          'W.S.Rate': item.ws_rate,
          'Bulk Qty': item.bulk_qty,
          'Status': item.is_active ? 'Active' : 'Inactive',
          'Created By': getUserName(item.created_by),
          'Created At': new Date(item.created_at).toLocaleString(),
        };
      });
      exportToExcelFile(exportData, 'Item_Definitions_Export', 'Item_Definitions');
    }
  };

  // Option 3: Bulk Upload Process
  const handleExecuteBulkUpload = () => {
    if (!selectedFile) {
      alert('Please select an Excel or CSV file to upload.');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          alert('The uploaded file contains no data rows.');
          setIsProcessing(false);
          return;
        }

        let res = { success: false, message: '', count: 0 };
        if (activeTab === 'lots') {
          res = bulkImportSubCategories(jsonData);
        } else if (activeTab === 'categories') {
          res = bulkImportCategories(jsonData);
        } else if (activeTab === 'groups') {
          res = bulkImportItemGroups(jsonData);
        } else if (activeTab === 'brands') {
          res = bulkImportBrands(jsonData);
        } else if (activeTab === 'items') {
          res = bulkImportItemDefinitions(jsonData);
        }

        alert(res.message);
        if (res.success) {
          setShowUploadModal(false);
          setSelectedFile(null);
        }
      } catch (err: any) {
        alert('Failed to parse spreadsheet file: ' + err.message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  // Car lot wood items for details view
  const carWoodItems = viewingCar
    ? stocks.filter((s) => s.sub_category_id === viewingCar.id)
    : [];

  // Filtered lists
  const filteredLots = subCats.filter((sc) => {
    const q = searchQuery.toLowerCase();
    const cat = categories.find((c) => c.id === sc.category_id);
    return (
      sc.name.toLowerCase().includes(q) ||
      (cat && cat.name.toLowerCase().includes(q)) ||
      sc.description.toLowerCase().includes(q)
    );
  });

  const filteredCategories = categories.filter((c) => {
    const q = searchQuery.toLowerCase();
    const parentGroup = itemGroups.find(
      (g) => Number(g.id) === Number(c.item_group_id) || g.group_id.toLowerCase() === String(c.item_group_id).toLowerCase()
    );
    return (
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (parentGroup &&
        (parentGroup.group_id.toLowerCase().includes(q) ||
          parentGroup.group_description.toLowerCase().includes(q)))
    );
  });

  const filteredGroups = itemGroups.filter((g) => {
    const q = searchQuery.toLowerCase();
    return g.group_id.toLowerCase().includes(q) || g.group_description.toLowerCase().includes(q);
  });

  const filteredBrands = brands.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.code.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      (b.description && b.description.toLowerCase().includes(q))
    );
  });

  const filteredItems = itemDefinitions.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.item_code.toLowerCase().includes(q) ||
      item.item_name.toLowerCase().includes(q) ||
      (item.national_language_item_name && item.national_language_item_name.toLowerCase().includes(q)) ||
      (item.item_name_urdu && item.item_name_urdu.toLowerCase().includes(q)) ||
      (item.brand_name && item.brand_name.toLowerCase().includes(q)) ||
      (item.barcode && item.barcode.toLowerCase().includes(q)) ||
      (item.publisher_vendor && item.publisher_vendor.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-emerald-600" /> Item Setup
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure wood categories, shipment lots, item groups, brands, and item definitions with bulk import & export options.
          </p>
        </div>

        {/* View Switcher Tabs (5 Segments) */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center text-xs font-bold text-gray-600 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => {
                setActiveTab('groups');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'groups' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'
              }`}
            >
              Item Groups ({itemGroups.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('categories');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'categories' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'
              }`}
            >
              Categories ({categories.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('brands');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'brands' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'
              }`}
            >
              Brands ({brands.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('items');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'items' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'
              }`}
            >
              Item Definition ({itemDefinitions.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('lots');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'lots' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'
              }`}
            >
              Shipment Lots ({subCats.length})
            </button>
          </div>
        </div>
      </div>

      {/* Segment Action Bar: Export Template, Bulk Upload, Export Excel & Add Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'lots'
                ? 'Search shipment lots by code or category...'
                : activeTab === 'categories'
                ? 'Search categories by name or description...'
                : activeTab === 'groups'
                ? 'Search item groups by Group_ID or description...'
                : activeTab === 'brands'
                ? 'Search brands by code, name, or description...'
                : 'Search item definitions by Code, Name, Brand or Barcode...'
            }
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500"
          />
        </div>

        {/* 3 Mandated Segment Options + Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Option 1: Export Template */}
          <button
            onClick={handleExportTemplate}
            title="Download blank Excel template with required columns for bulk upload"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Template</span>
          </button>

          {/* Option 2: Bulk Upload Option */}
          {isEditable && (
            <button
              onClick={() => {
                setSelectedFile(null);
                setShowUploadModal(true);
              }}
              title="Upload Excel spreadsheet to bulk import records"
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-indigo-200"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bulk Upload</span>
            </button>
          )}

          {/* Option 3: Export Excel */}
          <button
            onClick={handleExportExcel}
            title="Export all data of selected segment to Excel file"
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-emerald-200"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          {/* Single Item Add Button */}
          {isEditable && (
            <button
              onClick={() => {
                if (activeTab === 'lots') handleOpenCarModal();
                else if (activeTab === 'categories') handleOpenCatModal();
                else if (activeTab === 'groups') handleOpenGroupModal();
                else if (activeTab === 'brands') handleOpenBrandModal();
                else handleOpenItemModal();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 ml-auto sm:ml-0"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'lots'
                ? 'Add Lot'
                : activeTab === 'categories'
                ? 'Add Category'
                : activeTab === 'groups'
                ? 'Add Item Group'
                : activeTab === 'brands'
                ? 'Add Brand'
                : 'Add Item Definition'}
            </button>
          )}
        </div>
      </div>

      {/* SEGMENT 1: Shipment Lots Tab Content */}
      {activeTab === 'lots' && (
        <>
          {filteredLots.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-500">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-bold text-base text-gray-700">No shipment lots found</p>
              <p className="text-xs text-gray-400 mt-1">Try adding a new lot or performing a bulk upload.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLots.map((car) => {
                const cat = categories.find((c) => c.id === car.category_id);
                const carStocks = stocks.filter((s) => s.sub_category_id === car.id);

                const totalPcs = carStocks.reduce((sum, s) => sum + s.qty, 0);
                const availablePcs = carStocks.filter((s) => s.status === 'available').reduce((sum, s) => sum + s.qty, 0);
                const soldPcs = carStocks.filter((s) => s.status === 'sold').reduce((sum, s) => sum + s.qty, 0);
                const totalCftSum = carStocks.reduce((sum, s) => sum + s.cft * s.qty, 0);
                const totalStockValue = carStocks
                  .filter((s) => s.status === 'available')
                  .reduce((sum, s) => sum + s.sell_price, 0);

                return (
                  <div
                    key={car.id}
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-base text-gray-900 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-emerald-600" />
                          {car.name}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {cat ? cat.name : 'Category'}
                        </span>
                      </div>

                      {car.description && <p className="text-xs text-gray-500 mt-1">{car.description}</p>}

                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Arrival: {car.arrival_date || 'N/A'}</span>
                      </div>

                      {/* Aggregated Lot Statistics */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-xl space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Volume:</span>
                          <span className="font-bold text-emerald-700">{formatCft(totalCftSum)}</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Pieces:</span>
                          <span className="font-bold text-gray-900">{totalPcs} items</span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-500">Available / Sold:</span>
                          <span className="font-medium text-gray-800">
                            <span className="text-emerald-600 font-bold">{availablePcs} avail</span> / {soldPcs} sold
                          </span>
                        </div>

                        <div className="flex justify-between border-t border-gray-200/60 pt-2">
                          <span className="text-gray-600 font-semibold">Available Valuation:</span>
                          <span className="font-extrabold text-gray-900">
                            {formatCurrency(totalStockValue, settings.currency_symbol)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
                      <button
                        onClick={() => setViewingCar(car)}
                        className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Pieces ({carStocks.length})
                      </button>

                      {isEditable && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenCarModal(car)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg"
                            title="Edit shipment lot"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteCar(car.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete shipment lot (Admin only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SEGMENT 2: Categories Tab Content */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 uppercase text-[10px]">
                  <th className="p-3.5">Category Name</th>
                  <th className="p-3.5">Parent Item Group</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 text-center">Linked Lots</th>
                  <th className="p-3.5 text-center">Linked Items</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Created By</th>
                  <th className="p-3.5">Created At</th>
                  {isEditable && <th className="p-3.5 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400 font-semibold">
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => {
                    const linkedCars = subCats.filter((sc) => sc.category_id === cat.id);
                    const linkedItems = itemDefinitions.filter(
                      (itm) => Number(itm.category_id) === Number(cat.id) || itm.category_id === cat.name
                    );
                    const parentGroup = itemGroups.find(
                      (g) => Number(g.id) === Number(cat.item_group_id) || g.group_id === cat.item_group_id
                    );

                    return (
                      <tr key={cat.id} className="hover:bg-gray-50">
                        <td className="p-3.5 font-bold text-gray-900">{cat.name}</td>
                        <td className="p-3.5 font-medium">
                          {parentGroup ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg font-bold text-[11px]">
                              <Layers className="w-3 h-3 text-indigo-500" />
                              {parentGroup.group_id} — {parentGroup.group_description}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-mono text-[11px]">— Independent —</span>
                          )}
                        </td>
                        <td className="p-3.5 text-gray-600">{cat.description || '—'}</td>
                        <td className="p-3.5 text-center font-bold text-emerald-700">
                          {linkedCars.length} lots
                        </td>
                        <td className="p-3.5 text-center font-bold text-blue-700">
                          {linkedItems.length} items
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              cat.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {cat.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3.5 text-gray-600 font-medium">{getUserName(cat.created_by)}</td>
                        <td className="p-3.5 text-gray-500">{new Date(cat.created_at).toLocaleDateString()}</td>
                        {isEditable && (
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenCatModal(cat)}
                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg"
                                title="Edit category"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteCat(cat.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete category (Admin only)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEGMENT 3: Item Group Tab Content */}
      {activeTab === 'groups' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 uppercase text-[10px]">
                  <th className="p-3.5">Group_ID</th>
                  <th className="p-3.5">Group_Description</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Created_by</th>
                  <th className="p-3.5">Created_at</th>
                  {isEditable && <th className="p-3.5 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 font-semibold">
                      No item groups found.
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="p-3.5 font-black text-emerald-800 font-mono flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        {g.group_id}
                      </td>
                      <td className="p-3.5 text-gray-700 font-medium">{g.group_description || '—'}</td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            g.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {g.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-600 font-medium">{getUserName(g.created_by)}</td>
                      <td className="p-3.5 text-gray-500">{new Date(g.created_at).toLocaleDateString()}</td>
                      {isEditable && (
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenGroupModal(g)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg"
                              title="Edit item group"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteGroup(g.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete item group (Admin only)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
      )}

      {/* SEGMENT: Brand Tab Content */}
      {activeTab === 'brands' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 uppercase text-[10px]">
                  <th className="p-3.5">Brand Code</th>
                  <th className="p-3.5">Brand Name</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 text-center">Linked Items</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Created By</th>
                  <th className="p-3.5">Created At</th>
                  {isEditable && <th className="p-3.5 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBrands.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 font-semibold">
                      No brands found. Click "Add Brand" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredBrands.map((b) => {
                    const linkedItems = itemDefinitions.filter(
                      (itm) => Number(itm.brand_id) === Number(b.id) || itm.brand_name === b.name
                    );
                    return (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="p-3.5 font-mono font-bold text-emerald-800 flex items-center gap-2">
                          <Award className="w-3.5 h-3.5 text-emerald-600" />
                          {b.code}
                        </td>
                        <td className="p-3.5 font-bold text-gray-900">{b.name}</td>
                        <td className="p-3.5 text-gray-600">{b.description || '—'}</td>
                        <td className="p-3.5 text-center font-bold text-blue-700">
                          {linkedItems.length} items
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              b.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {b.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3.5 text-gray-600 font-medium">{getUserName(b.created_by)}</td>
                        <td className="p-3.5 text-gray-500">{new Date(b.created_at).toLocaleDateString()}</td>
                        {isEditable && (
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenBrandModal(b)}
                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg"
                                title="Edit brand"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteBrand(b.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete brand (Admin only)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEGMENT 4: Item Definition Tab Content */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-700 uppercase text-[10px]">
                  <th className="p-3.5">Code / Barcode</th>
                  <th className="p-3.5">Item Name</th>
                  <th className="p-3.5">National Language Item Name</th>
                  <th className="p-3.5">Group / Category / Brand</th>
                  <th className="p-3.5">UOM</th>
                  <th className="p-3.5 text-right">Purchase / Avg Rate</th>
                  <th className="p-3.5 text-right">Sale Rate</th>
                  <th className="p-3.5 text-right">Margin (%)</th>
                  <th className="p-3.5">Reorder (Lvl/Qty)</th>
                  <th className="p-3.5">Status</th>
                  {isEditable && <th className="p-3.5 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-gray-400 font-semibold">
                      No item definitions found. Click "Add Item Definition" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const grp = itemGroups.find((g) => g.id === Number(item.item_group_id) || g.group_id === item.item_group_id);
                    const cat = categories.find((c) => c.id === Number(item.category_id) || c.name === item.category_id);
                    const brd = brands.find((b) => b.id === Number(item.brand_id) || b.name === item.brand_name);

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-3.5">
                          <div className="font-bold text-gray-900 font-mono">{item.item_code}</div>
                          {item.barcode && <div className="text-[10px] text-gray-400 font-mono">{item.barcode}</div>}
                        </td>
                        <td className="p-3.5 font-bold text-gray-900 flex items-center gap-2">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-7 h-7 object-cover rounded-md border border-gray-200" />
                          ) : (
                            <Box className="w-5 h-5 text-gray-400 shrink-0" />
                          )}
                          <span>{item.item_name}</span>
                        </td>
                        <td className="p-3.5 text-gray-700 font-serif text-sm dir-rtl">{item.national_language_item_name || item.item_name_urdu || '—'}</td>
                        <td className="p-3.5 text-gray-600">
                          <div className="font-bold text-emerald-800">{grp ? grp.group_id : item.item_group_id || '—'}</div>
                          <div className="text-[10px] text-gray-400">{cat ? cat.name : item.category_id || '—'}</div>
                          {brd && (
                            <div className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                              <Award className="w-2.5 h-2.5" />
                              {brd.name}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 font-semibold text-gray-700">{item.unit_of_measure}</td>
                        <td className="p-3.5 text-right font-bold text-gray-800">
                          <div>{formatCurrency(item.purchase_rate, settings.currency_symbol)}</div>
                          {item.weighted_average_rate !== undefined && (
                            <div className="text-[10px] text-blue-600 font-mono font-medium" title="Weighted Average Rate">
                              Avg: {formatCurrency(item.weighted_average_rate, settings.currency_symbol)}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-black text-emerald-700">
                          {formatCurrency(item.sale_rate, settings.currency_symbol)}
                        </td>
                        <td className="p-3.5 text-right font-bold text-indigo-600">{item.margin_percent}%</td>
                        <td className="p-3.5">
                          <div className="text-xs font-semibold text-slate-700">
                            <span className="text-[10px] text-slate-400">Min:</span> {item.reorder_level || 0}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-medium">
                            <span className="text-slate-400">Qty:</span> {item.reorder_qty || 0}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {isEditable && (
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenItemModal(item)}
                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 rounded-lg"
                                title="Edit item definition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete item definition (Admin only)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shipment Lot Breakdown Drawer / Modal */}
      {viewingCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  Wood Pieces in {viewingCar.name}
                </h3>
                <p className="text-xs text-gray-500">
                  Total Lot: {carWoodItems.length} wood pieces ({formatCft(carWoodItems.reduce((s, i) => s + i.cft * i.qty, 0))})
                </p>
              </div>
              <button onClick={() => setViewingCar(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-gray-100 font-bold text-gray-700 text-[10px] uppercase">
                    <th className="p-2.5">Serial #</th>
                    <th className="p-2.5">Dimensions</th>
                    <th className="p-2.5 text-right">CFT</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Est. Price</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {carWoodItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-2.5 font-bold font-sans text-gray-900">{item.serial}</td>
                      <td className="p-2.5 font-sans">{item.width}" W × {item.length}' L</td>
                      <td className="p-2.5 text-right font-bold text-emerald-700">{item.cft.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-sans">{item.qty}</td>
                      <td className="p-2.5 text-right font-sans font-bold">
                        {formatCurrency(item.sell_price, settings.currency_symbol)}
                      </td>
                      <td className="p-2.5 font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'available'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-gray-900">
              {editingCat ? 'Edit Category' : 'Add New Category'}
            </h3>
            <form onSubmit={handleSaveCat} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Parent Item Group / Main Category</label>
                <select
                  value={catItemGroupId}
                  onChange={(e) => setCatItemGroupId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="">-- None (Independent Category) --</option>
                  {itemGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_id} — {g.group_description}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Select the top-level Item Group this category belongs under.</p>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Raw Wood / Sawn Boards"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Category details..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipment Lot Create/Edit Modal */}
      {showCarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-gray-900">
              {editingCar ? 'Edit Shipment Lot' : 'Add New Shipment Lot'}
            </h3>
            <form onSubmit={handleSaveCar} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Category *</label>
                <select
                  value={carCatId}
                  onChange={(e) => setCarCatId(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-semibold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Lot Name / Code *</label>
                <input
                  type="text"
                  required
                  value={carName}
                  onChange={(e) => setCarName(e.target.value)}
                  placeholder="e.g. Lot 15"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Arrival Date</label>
                <input
                  type="date"
                  value={carArrivalDate}
                  onChange={(e) => setCarArrivalDate(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={carDesc}
                  onChange={(e) => setCarDesc(e.target.value)}
                  placeholder="Lot details..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCarModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl">
                  Save Shipment Lot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Group Create/Edit Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-gray-900">
              {editingGroup ? 'Edit Item Group' : 'Add New Item Group'}
            </h3>
            <form onSubmit={handleSaveGroup} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Group_ID *</label>
                <input
                  type="text"
                  required
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  placeholder="e.g. GRP-001"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Group_Description</label>
                <textarea
                  rows={3}
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Describe the item group..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="groupIsActive"
                  checked={groupIsActive}
                  onChange={(e) => setGroupIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="groupIsActive" className="font-bold text-gray-700 cursor-pointer">
                  Is Active
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl">
                  Save Item Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Create/Edit Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              {editingBrand ? 'Edit Brand' : 'Add New Brand'}
            </h3>
            <form onSubmit={handleSaveBrand} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Brand Code *</label>
                <input
                  type="text"
                  required
                  value={brandCode}
                  onChange={(e) => setBrandCode(e.target.value)}
                  placeholder="e.g. BRD-001"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Al-Noor Timber, Burma Teak, Diamond Wood"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={brandDesc}
                  onChange={(e) => setBrandDesc(e.target.value)}
                  placeholder="Brand details, manufacturer origin, quality tier..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="brandIsActive"
                  checked={brandIsActive}
                  onChange={(e) => setBrandIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="brandIsActive" className="font-bold text-gray-700 cursor-pointer">
                  Is Active
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl">
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEGMENT 4: ITEM DEFINITION MODAL (Replicating exact layout from uploaded screenshot) */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 max-w-4xl w-full shadow-2xl space-y-4 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Box className="w-5 h-5 text-emerald-600" />
                {editingItem ? 'Edit Item Definition' : 'New Item Definition'}
              </h3>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs font-sans">
              {/* TOP SECTION: Dropdowns, Text Fields & Image Data Box */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                {/* Left/Middle Column - Fields (8 Cols) */}
                <div className="lg:col-span-8 space-y-2.5">
                  {/* Row 1: Item Group & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <label className="w-28 font-bold text-slate-700 shrink-0">Item Group</label>
                      <div className="flex items-center gap-1 flex-1">
                        <select
                          value={itemGroupId}
                          onChange={(e) => setItemGroupId(e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-medium"
                        >
                          <option value="">Select Group...</option>
                          {itemGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.group_id} - {g.group_description}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleOpenGroupModal()}
                          title="Add Item Group"
                          className="p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="w-28 font-bold text-slate-700 shrink-0">Category</label>
                      <div className="flex items-center gap-1 flex-1">
                        <select
                          value={itemCatId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItemCatId(val);
                            if (val) {
                              const matchCat = categories.find(
                                (c) => String(c.id) === String(val) || c.name === val
                              );
                              if (matchCat && matchCat.item_group_id) {
                                setItemGroupId(matchCat.item_group_id);
                              }
                            }
                          }}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-medium"
                        >
                          <option value="">Select Category...</option>
                          {categories.map((c) => {
                            const pGrp = itemGroups.find(
                              (g) => Number(g.id) === Number(c.item_group_id) || g.group_id === c.item_group_id
                            );
                            return (
                              <option key={c.id} value={c.id}>
                                {c.name} {pGrp ? `[${pGrp.group_id}]` : ''}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleOpenCatModal()}
                          title="Add Category"
                          className="p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Brand & Publisher/Vendor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <label className="w-28 font-bold text-slate-700 shrink-0 flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-600" />
                        Brand
                      </label>
                      <div className="flex items-center gap-1 flex-1">
                        <select
                          value={itemBrandId}
                          onChange={(e) => setItemBrandId(e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-medium"
                        >
                          <option value="">Select Brand...</option>
                          {brands.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleOpenBrandModal()}
                          title="Add Brand"
                          className="p-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="w-28 font-bold text-slate-700 shrink-0">Publisher/Vendor :</label>
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={publisherVendor}
                          onChange={(e) => setPublisherVendor(e.target.value)}
                          placeholder="Vendor or manufacturer"
                          className="w-full p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setPublisherVendor('')}
                          title="Clear Vendor"
                          className="p-1 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Unit of Measure & Item Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <label className="w-28 font-bold text-slate-700 shrink-0">Unit of Measure</label>
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={unitOfMeasure}
                          onChange={(e) => setUnitOfMeasure(e.target.value)}
                          placeholder="e.g. PCS, CFT, Sheet"
                          className="w-full p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setUnitOfMeasure('PCS')}
                          title="Reset UOM"
                          className="p-1 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 rounded shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="w-28 font-bold text-slate-700 shrink-0">Item Code</label>
                      <input
                        type="text"
                        required
                        value={itemCode}
                        onChange={(e) => setItemCode(e.target.value)}
                        placeholder="e.g. ITM-001"
                        className="w-full p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>

                  {/* Row 4: Barcode */}
                  <div className="flex items-center gap-2 max-w-md">
                    <label className="w-28 font-bold text-slate-700 shrink-0">Barcode</label>
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="Scan or type barcode"
                      className="w-full p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono"
                    />
                  </div>

                  {/* Row 5: Item Name */}
                  <div className="flex items-center gap-2 max-w-md">
                    <label className="w-28 font-bold text-slate-700 shrink-0">Item Name</label>
                    <input
                      type="text"
                      required
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="Full item description name"
                      className="w-full p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-semibold text-slate-900"
                    />
                  </div>

                  {/* Row 6: National Language Item Name */}
                  <div className="flex items-center gap-2 max-w-md">
                    <label className="w-28 font-bold text-slate-700 shrink-0">National Language Item Name</label>
                    <input
                      type="text"
                      value={nationalLanguageName}
                      onChange={(e) => setNationalLanguageName(e.target.value)}
                      placeholder="قومی زبان میں نام / National language name"
                      dir="rtl"
                      className="w-full p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-serif"
                    />
                  </div>

                  {/* Row 7: Reorder Level & Reorder Qty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                    <div className="flex items-center gap-2">
                      <label className="w-28 font-bold text-slate-700 shrink-0">Reorder Level</label>
                      <input
                        type="number"
                        min="0"
                        value={reorderLevel}
                        onChange={(e) => setReorderLevel(Number(e.target.value))}
                        placeholder="Min threshold"
                        className="w-full p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="w-24 font-bold text-slate-700 shrink-0">Reorder Qty</label>
                      <input
                        type="number"
                        min="0"
                        value={reorderQty}
                        onChange={(e) => setReorderQty(Number(e.target.value))}
                        placeholder="Replenish qty"
                        className="w-full p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Image Upload Box matching screenshot (4 Cols) */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center p-2">
                  <div className="w-44 h-44 bg-white border border-slate-300 rounded-lg flex flex-col items-center justify-center overflow-hidden relative shadow-inner group">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Item" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-3 text-slate-400 space-y-1">
                        <ImageIcon className="w-10 h-10 mx-auto stroke-1" />
                        <span className="text-xs text-slate-500 block">No image data</span>
                      </div>
                    )}
                  </div>

                  {/* Image Controls below image box (folder & refresh icons as in image) */}
                  <div className="flex items-center gap-3 mt-2">
                    <label
                      htmlFor="item-image-file"
                      className="p-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-md cursor-pointer text-slate-700 shadow-2xs transition-all"
                      title="Open image file"
                    >
                      <FolderOpen className="w-4 h-4 text-amber-600" />
                      <input
                        type="file"
                        id="item-image-file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      title="Clear Image"
                      className="p-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-md text-slate-700 shadow-2xs transition-all"
                    >
                      <RotateCcw className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION: Purchase & Sales Box matching exact image layout */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Header title tab */}
                <div className="bg-slate-100 px-4 py-1.5 border-b border-slate-200 text-slate-700 font-bold text-xs">
                  Purchase & Sales
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
                  {/* Left Group */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-slate-700 text-xs w-44">Printed Price</label>
                      <input
                        type="number"
                        step="any"
                        value={printedPrice}
                        onChange={(e) => setPrintedPrice(Number(e.target.value))}
                        className="w-full max-w-[200px] p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-slate-700 text-xs w-44">Purchase Discount (%)</label>
                      <input
                        type="number"
                        step="any"
                        value={purchaseDiscount}
                        onChange={(e) => setPurchaseDiscount(Number(e.target.value))}
                        className="w-full max-w-[200px] p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-slate-700 text-xs w-44">Purchase Rate</label>
                      <input
                        type="number"
                        step="any"
                        value={purchaseRate}
                        onChange={(e) => handlePurchaseRateChange(Number(e.target.value))}
                        className="w-full max-w-[200px] p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right font-bold"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-slate-700 text-xs w-44">Weighted Average Rate</label>
                      <input
                        type="number"
                        step="any"
                        value={weightedAverageRate}
                        onChange={(e) => setWeightedAverageRate(Number(e.target.value))}
                        placeholder="Weighted avg rate"
                        className="w-full max-w-[200px] p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right font-bold text-blue-700"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-slate-700 text-xs w-44">Sale Discount (%)</label>
                      <input
                        type="number"
                        step="any"
                        value={saleDiscount}
                        onChange={(e) => setSaleDiscount(Number(e.target.value))}
                        className="w-full max-w-[200px] p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-slate-700 text-xs w-44">Sale Rate</label>
                      <input
                        type="number"
                        step="any"
                        value={saleRate}
                        onChange={(e) => handleSaleRateChange(Number(e.target.value))}
                        className="w-full max-w-[200px] p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right font-bold text-emerald-800"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-slate-700 text-xs w-44">Margin (%)</label>
                      <input
                        type="number"
                        step="any"
                        value={marginPercent}
                        onChange={(e) => setMarginPercent(Number(e.target.value))}
                        className="w-full max-w-[200px] p-1.5 bg-slate-100 border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right font-bold text-indigo-700"
                      />
                    </div>
                  </div>

                  {/* Right Group */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-slate-700 text-xs w-32">Packing</label>
                      <input
                        type="number"
                        value={packing}
                        onChange={(e) => setPacking(Number(e.target.value))}
                        className="w-full max-w-[200px] p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-slate-700 text-xs w-32">Bulk Rate</label>
                      <input
                        type="number"
                        step="any"
                        value={bulkRate}
                        onChange={(e) => setBulkRate(Number(e.target.value))}
                        className="w-full max-w-[200px] p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-slate-700 text-xs w-32">Ctn.Rate</label>
                      <input
                        type="number"
                        step="any"
                        value={ctnRate}
                        onChange={(e) => setCtnRate(Number(e.target.value))}
                        className="w-full max-w-[200px] p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-slate-700 text-xs w-32">W.S.Rate</label>
                      <input
                        type="number"
                        step="any"
                        value={wsRate}
                        onChange={(e) => setWsRate(Number(e.target.value))}
                        className="w-full max-w-[200px] p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="font-bold text-slate-700 text-xs w-32">Bulk Qty</label>
                      <input
                        type="number"
                        value={bulkQty}
                        onChange={(e) => setBulkQty(Number(e.target.value))}
                        className="w-full max-w-[200px] p-1.5 bg-white border border-slate-300 rounded outline-none focus:border-blue-500 text-xs font-mono text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Footer Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="itemIsActive"
                    checked={itemIsActive}
                    onChange={(e) => setItemIsActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="itemIsActive" className="font-bold text-slate-700 cursor-pointer text-xs">
                    Is Active
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowItemModal(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all"
                  >
                    Save Item Definition
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal for Active Segment */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Bulk Upload:{' '}
                {activeTab === 'lots'
                  ? 'Shipment Lots'
                  : activeTab === 'categories'
                  ? 'Categories'
                  : activeTab === 'groups'
                  ? 'Item Groups'
                  : 'Item Definitions'}
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600">
              <p>
                Upload an Excel sheet (<strong>.xlsx</strong>, <strong>.xls</strong>) or <strong>.csv</strong> file containing your{' '}
                {activeTab === 'lots'
                  ? 'shipment lots'
                  : activeTab === 'categories'
                  ? 'categories'
                  : activeTab === 'groups'
                  ? 'item groups'
                  : 'item definitions'}{' '}
                data.
              </p>

              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-indigo-900 space-y-1">
                <p className="font-bold">Required Header Columns:</p>
                {activeTab === 'lots' && (
                  <p className="font-mono text-[11px] text-indigo-700">
                    Lot Code / Name, Category Name, Arrival Date, Description, Is Active
                  </p>
                )}
                {activeTab === 'categories' && (
                  <p className="font-mono text-[11px] text-indigo-700">
                    Category Name, Description, Is Active
                  </p>
                )}
                {activeTab === 'groups' && (
                  <p className="font-mono text-[11px] text-indigo-700">
                    Group ID, Group Description, Is Active
                  </p>
                )}
                {activeTab === 'items' && (
                  <p className="font-mono text-[11px] text-indigo-700">
                    Item Code, Item Name, Item Group, Category, Barcode, Printed Price, Purchase Rate, Sale Rate
                  </p>
                )}
              </div>

              <div className="border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl p-6 text-center cursor-pointer bg-gray-50/50 hover:bg-indigo-50/20 transition-all">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="excel-file-upload"
                />
                <label htmlFor="excel-file-upload" className="cursor-pointer space-y-2 block">
                  <FileSpreadsheet className="w-8 h-8 text-indigo-500 mx-auto" />
                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="font-bold text-gray-900">{selectedFile.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {(selectedFile.size / 1024).toFixed(1)} KB — Click to change file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-gray-700">Click to browse or drop file here</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Supports .xlsx, .xls, .csv</p>
                    </div>
                  )}
                </label>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleExportTemplate}
                  className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download Template Sheet
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteBulkUpload}
                    disabled={!selectedFile || isProcessing}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {isProcessing ? 'Processing...' : 'Upload & Import'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
