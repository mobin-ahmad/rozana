import { Brand, Category, ItemDefinition, ItemGroup } from '../types';

export type BulkSegmentType = 'items' | 'categories' | 'groups' | 'brands';

export interface BulkRowIssue {
  rowNumber: number;
  identifier: string;
  name?: string;
  errors: string[];
  warnings: string[];
  rawRow: Record<string, unknown>;
}

export interface BulkValidationReport<T = Record<string, unknown>> {
  segment: BulkSegmentType;
  fileName: string;
  totalRowsInFile: number;
  blankRowsSkipped: number;
  validRecords: T[];
  invalidRows: BulkRowIssue[];
  warningRows: BulkRowIssue[];
  errorSummaryCounts: Record<string, number>;
  missingHeaderError?: string;
}

export interface ValidatedItemDefinitionInput {
  rowNumber: number;
  item_group_id?: number | string;
  category_id?: number | string;
  brand_id?: number | string;
  brand_name?: string;
  item_code: string;
  barcode: string;
  item_name: string;
  national_language_item_name: string;
  item_name_urdu: string;
  unit_of_measure: string;
  publisher_vendor: string;
  image_url: string;
  reorder_level: number;
  reorder_qty: number;
  printed_price: number;
  purchase_discount_percent: number;
  purchase_rate: number;
  weighted_average_rate: number;
  sale_discount_percent: number;
  sale_rate: number;
  margin_percent: number;
  packing: string;
  bulk_rate: number;
  ctn_rate: number;
  ws_rate: number;
  bulk_qty: number;
  stock_quantity: number;
  is_active: boolean;
}

export interface ValidatedCategoryInput {
  rowNumber: number;
  item_group_id?: number | string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface ValidatedItemGroupInput {
  rowNumber: number;
  group_id: string;
  group_description: string;
  is_active: boolean;
}

export interface ValidatedBrandInput {
  rowNumber: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

function normalizeHeaderKey(key: string): string {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_/-]+/g, '_')
    .replace(/[()%]/g, '')
    .replace(/\.+/g, '_');
}

function buildNormalizedLookup(row: Record<string, unknown>): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row || {})) {
    const trimmed = k.trim();
    if (!map.has(trimmed)) {
      map.set(trimmed, v);
    }
    const lower = trimmed.toLowerCase();
    if (!map.has(lower)) {
      map.set(lower, v);
    }
    const norm = normalizeHeaderKey(trimmed);
    if (!map.has(norm)) {
      map.set(norm, v);
    }
  }
  return map;
}

function getField(lookup: Map<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    if (lookup.has(alias)) {
      const val = lookup.get(alias);
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return val;
      }
    }
    const norm = normalizeHeaderKey(alias);
    if (lookup.has(norm)) {
      const val = lookup.get(norm);
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return val;
      }
    }
  }
  return '';
}

function hasAnyKnownColumn(rows: Record<string, unknown>[], aliases: string[]): boolean {
  const normAliases = new Set(aliases.map(normalizeHeaderKey));
  for (const row of rows.slice(0, 10)) {
    for (const key of Object.keys(row || {})) {
      if (normAliases.has(normalizeHeaderKey(key))) {
        return true;
      }
    }
  }
  return false;
}

function isCompletelyBlankRow(row: Record<string, unknown>): boolean {
  return Object.entries(row || {}).every(([k, v]) => {
    if (k === '__rowNum__') return true;
    return v === undefined || v === null || String(v).trim() === '';
  });
}

function cellStr(val: unknown): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function parseBoolField(val: unknown, defaultVal = true): { value: boolean; valid: boolean } {
  const raw = cellStr(val).toUpperCase();
  if (!raw) return { value: defaultVal, valid: true };
  if (['TRUE', '1', 'YES', 'Y', 'ACTIVE'].includes(raw)) return { value: true, valid: true };
  if (['FALSE', '0', 'NO', 'N', 'INACTIVE'].includes(raw)) return { value: false, valid: true };
  return { value: defaultVal, valid: false };
}

function parseNumericField(
  rawVal: unknown,
  label: string,
  options: {
    defaultValue: number;
    min?: number;
    max?: number;
    integer?: boolean;
  }
): { value: number; error?: string } {
  const str = cellStr(rawVal);
  if (!str) {
    return { value: options.defaultValue };
  }

  // Strip thousand-separator commas cleanly (e.g. "1,250.50")
  const cleaned = str.replace(/,/g, '');
  const num = Number(cleaned);
  if (!Number.isFinite(num)) {
    return { value: options.defaultValue, error: `Invalid numeric value in "${label}": "${str}"` };
  }

  if (options.integer && !Number.isInteger(num)) {
    return { value: options.defaultValue, error: `"${label}" must be a whole number (got "${str}")` };
  }

  if (options.min !== undefined && num < options.min) {
    return { value: options.defaultValue, error: `"${label}" cannot be less than ${options.min} (got ${num})` };
  }

  if (options.max !== undefined && num > options.max) {
    return { value: options.defaultValue, error: `"${label}" cannot exceed ${options.max} (got ${num})` };
  }

  return { value: options.integer ? Math.trunc(num) : num };
}

function getSpreadsheetRowNumber(row: Record<string, unknown>, fallbackIndex: number): number {
  const rowNum = (row as { __rowNum__?: number }).__rowNum__;
  if (typeof rowNum === 'number' && Number.isFinite(rowNum)) {
    return rowNum + 1;
  }
  return fallbackIndex + 2;
}

function bumpSummary(summary: Record<string, number>, categoryLabel: string) {
  summary[categoryLabel] = (summary[categoryLabel] || 0) + 1;
}

export function validateItemDefinitionsBulk(
  rawRows: Record<string, unknown>[],
  fileName: string,
  context: {
    existingItems: ItemDefinition[];
    itemGroups: ItemGroup[];
    categories: Category[];
    brands: Brand[];
  }
): BulkValidationReport<ValidatedItemDefinitionInput> {
  const validRecords: ValidatedItemDefinitionInput[] = [];
  const invalidRows: BulkRowIssue[] = [];
  const warningRows: BulkRowIssue[] = [];
  const errorSummaryCounts: Record<string, number> = {};
  let blankRowsSkipped = 0;

  const nonBlankRows: Array<{ row: Record<string, unknown>; rowNumber: number }> = [];
  rawRows.forEach((row, idx) => {
    if (isCompletelyBlankRow(row)) {
      blankRowsSkipped++;
    } else {
      nonBlankRows.push({ row, rowNumber: getSpreadsheetRowNumber(row, idx) });
    }
  });

  if (nonBlankRows.length === 0) {
    return {
      segment: 'items',
      fileName,
      totalRowsInFile: 0,
      blankRowsSkipped,
      validRecords: [],
      invalidRows: [],
      warningRows: [],
      errorSummaryCounts,
      missingHeaderError: 'The uploaded spreadsheet contains no non-empty data rows.',
    };
  }

  const codeAliases = ['Item Code', 'Item_Code', 'item_code', 'ItemCode', 'SKU', 'Product Code', 'Code'];
  const nameAliases = ['Item Name', 'Item_Name', 'item_name', 'ItemName', 'Product Name', 'Name'];

  const hasCodeCol = hasAnyKnownColumn(
    nonBlankRows.map((x) => x.row),
    codeAliases
  );
  const hasNameCol = hasAnyKnownColumn(
    nonBlankRows.map((x) => x.row),
    nameAliases
  );

  if (!hasCodeCol || !hasNameCol) {
    const missingCols = [
      !hasCodeCol ? '"Item Code"' : null,
      !hasNameCol ? '"Item Name"' : null,
    ].filter(Boolean);
    return {
      segment: 'items',
      fileName,
      totalRowsInFile: nonBlankRows.length,
      blankRowsSkipped,
      validRecords: [],
      invalidRows: nonBlankRows.map(({ row, rowNumber }) => ({
        rowNumber,
        identifier: `Row ${rowNumber}`,
        errors: [`Missing required header column(s): ${missingCols.join(' and ')}`],
        warnings: [],
        rawRow: row,
      })),
      warningRows: [],
      errorSummaryCounts: {
        [`Missing Required Column (${missingCols.join(', ')})`]: nonBlankRows.length,
      },
      missingHeaderError: `Required header column(s) ${missingCols.join(' and ')} were not found. Download the Item Definitions template to verify exact column headers.`,
    };
  }

  const existingCodeMap = new Map<string, ItemDefinition>();
  const existingBarcodeMap = new Map<string, ItemDefinition>();
  for (const item of context.existingItems) {
    const codeKey = (item.item_code || '').trim().toLowerCase();
    if (codeKey) existingCodeMap.set(codeKey, item);
    const barcodeKey = (item.barcode || '').trim().toLowerCase();
    if (barcodeKey) existingBarcodeMap.set(barcodeKey, item);
  }

  const seenFileCodes = new Map<string, number>();
  const seenFileBarcodes = new Map<string, number>();

  for (const { row, rowNumber } of nonBlankRows) {
    const lookup = buildNormalizedLookup(row);
    const errors: string[] = [];
    const warnings: string[] = [];
    const issueBuckets = new Set<string>();

    const itemCode = cellStr(getField(lookup, codeAliases)).toUpperCase();
    const itemName = cellStr(getField(lookup, nameAliases)).toUpperCase();
    const barcodeVal = cellStr(getField(lookup, ['Barcode', 'barcode', 'Bar Code', 'EAN', 'UPC'])).toUpperCase();
    const natLangName = cellStr(
      getField(lookup, [
        'National Language Item Name',
        'National Language Name',
        'Item Name ( Urdu )',
        'Item Name (Urdu)',
        'Item Name Urdu',
        'Urdu Name',
        'national_language_item_name',
        'item_name_urdu',
      ])
    ).toUpperCase();
    const uom = (cellStr(getField(lookup, ['Unit of Measure', 'Unit', 'UOM', 'unit_of_measure'])) || 'PCS').toUpperCase();
    const vendor = cellStr(
      getField(lookup, ['Supplier/Vendor', 'Publisher/Vendor', 'Supplier', 'Vendor', 'Publisher', 'publisher_vendor'])
    ).toUpperCase();
    const imageUrl = cellStr(getField(lookup, ['Image URL', 'image_url']));

    if (!itemCode) {
      errors.push('Missing required "Item Code"');
      issueBuckets.add('Missing Item Code');
    } else if (itemCode.length > 128) {
      errors.push(`"Item Code" exceeds maximum length of 128 characters (${itemCode.length})`);
      issueBuckets.add('Field Length Exceeded');
    } else {
      const codeKey = itemCode.toLowerCase();
      const existingMatch = existingCodeMap.get(codeKey);
      if (existingMatch) {
        errors.push(`Duplicate "Item Code" "${itemCode}" (already exists in catalog: "${existingMatch.item_name}")`);
        issueBuckets.add('Duplicate Item Code (Catalog)');
      } else if (seenFileCodes.has(codeKey)) {
        errors.push(`Duplicate "Item Code" "${itemCode}" in file (first appeared on Row ${seenFileCodes.get(codeKey)})`);
        issueBuckets.add('Duplicate Item Code (In File)');
      } else {
        seenFileCodes.set(codeKey, rowNumber);
      }
    }

    if (!itemName) {
      errors.push('Missing required "Item Name"');
      issueBuckets.add('Missing Item Name');
    } else if (itemName.length > 255) {
      errors.push(`"Item Name" exceeds maximum length of 255 characters (${itemName.length})`);
      issueBuckets.add('Field Length Exceeded');
    }

    if (barcodeVal) {
      if (barcodeVal.length > 128) {
        errors.push(`"Barcode" exceeds maximum length of 128 characters (${barcodeVal.length})`);
        issueBuckets.add('Field Length Exceeded');
      } else {
        const bcKey = barcodeVal.toLowerCase();
        const existingBc = existingBarcodeMap.get(bcKey);
        if (existingBc) {
          errors.push(
            `Duplicate "Barcode" "${barcodeVal}" (already assigned to "${existingBc.item_name}" [${existingBc.item_code}])`
          );
          issueBuckets.add('Duplicate Barcode (Catalog)');
        } else if (seenFileBarcodes.has(bcKey)) {
          errors.push(`Duplicate "Barcode" "${barcodeVal}" in file (already used on Row ${seenFileBarcodes.get(bcKey)})`);
          issueBuckets.add('Duplicate Barcode (In File)');
        } else {
          seenFileBarcodes.set(bcKey, rowNumber);
        }
      }
    }

    if (uom.length > 64) {
      errors.push(`"Unit of Measure" exceeds 64 characters`);
      issueBuckets.add('Field Length Exceeded');
    }
    if (natLangName.length > 255) {
      errors.push(`"National Language Item Name" exceeds 255 characters`);
      issueBuckets.add('Field Length Exceeded');
    }
    if (vendor.length > 255) {
      errors.push(`"Supplier/Vendor" exceeds 255 characters`);
      issueBuckets.add('Field Length Exceeded');
    }

    const reorderLevel = parseNumericField(
      getField(lookup, ['Reorder Level', 'Min Stock', 'reorder_level']),
      'Reorder Level',
      { defaultValue: 0, min: 0, max: 2147483647, integer: true }
    );
    const reorderQty = parseNumericField(
      getField(lookup, ['Reorder Qty', 'reorder_qty']),
      'Reorder Qty',
      { defaultValue: 0, min: 0, max: 2147483647, integer: true }
    );
    const printedPrice = parseNumericField(
      getField(lookup, ['Printed Price', 'MRP', 'Retail Price', 'printed_price']),
      'Printed Price',
      { defaultValue: 0, min: 0, max: 999999999999 }
    );
    const purchaseDiscount = parseNumericField(
      getField(lookup, ['Purchase Discount (%)', 'Purchase Discount', 'Pur Disc %', 'purchase_discount_percent']),
      'Purchase Discount (%)',
      { defaultValue: 0, min: 0, max: 100 }
    );
    const purchaseRate = parseNumericField(
      getField(lookup, ['Purchase Rate', 'Cost', 'Cost Price', 'Purchase Price', 'purchase_rate']),
      'Purchase Rate',
      { defaultValue: 0, min: 0, max: 999999999999 }
    );
    const rawWeightedAvg = getField(lookup, ['Weighted Average Rate', 'Weighted Avg Rate', 'Avg Rate', 'weighted_average_rate']);
    const weightedAverageRate = parseNumericField(
      rawWeightedAvg,
      'Weighted Average Rate',
      { defaultValue: purchaseRate.value, min: 0, max: 999999999999 }
    );
    const saleDiscount = parseNumericField(
      getField(lookup, ['Sale Discount (%)', 'Sale Discount', 'sale_discount_percent']),
      'Sale Discount (%)',
      { defaultValue: 0, min: 0, max: 100 }
    );
    const saleRate = parseNumericField(
      getField(lookup, ['Sale Rate', 'Selling Price', 'Sale Price', 'Price', 'sale_rate']),
      'Sale Rate',
      { defaultValue: 0, min: 0, max: 999999999999 }
    );
    const rawMargin = getField(lookup, ['Margin (%)', 'Margin', 'margin_percent']);
    const autoMargin =
      purchaseRate.value > 0
        ? Math.round(((saleRate.value - purchaseRate.value) / purchaseRate.value) * 10000) / 100
        : 0;
    const marginPercent = parseNumericField(rawMargin, 'Margin (%)', {
      defaultValue: autoMargin,
      min: -999999999,
      max: 999999999,
    });
    const packingText = cellStr(getField(lookup, ['Packing', 'Packaging', 'Pack Size', 'packing'])).toUpperCase();
    if (packingText.length > 128) {
      errors.push(`"Packing" exceeds 128 characters (${packingText.length})`);
      issueBuckets.add('Field Length Exceeded');
    }
    const bulkRate = parseNumericField(getField(lookup, ['Bulk Rate', 'bulk_rate']), 'Bulk Rate', {
      defaultValue: 0,
      min: 0,
      max: 999999999999,
    });
    const ctnRate = parseNumericField(getField(lookup, ['Ctn.Rate', 'Ctn Rate', 'Carton Rate', 'ctn_rate']), 'Ctn.Rate', {
      defaultValue: 0,
      min: 0,
      max: 999999999999,
    });
    const wsRate = parseNumericField(
      getField(lookup, ['W.S.Rate', 'WS Rate', 'Wholesale Rate', 'ws_rate']),
      'W.S.Rate',
      { defaultValue: 0, min: 0, max: 999999999999 }
    );
    const bulkQty = parseNumericField(getField(lookup, ['Bulk Qty', 'bulk_qty']), 'Bulk Qty', {
      defaultValue: 0,
      min: 0,
      max: 2147483647,
      integer: true,
    });
    const stockQty = parseNumericField(
      getField(lookup, ['Stock Quantity', 'Stock', 'Opening Stock', 'Qty', 'stock_quantity']),
      'Stock Quantity',
      { defaultValue: 0, min: 0, max: 2147483647, integer: true }
    );

    const numericChecks = [
      reorderLevel,
      reorderQty,
      printedPrice,
      purchaseDiscount,
      purchaseRate,
      weightedAverageRate,
      saleDiscount,
      saleRate,
      marginPercent,
      bulkRate,
      ctnRate,
      wsRate,
      bulkQty,
      stockQty,
    ];
    for (const check of numericChecks) {
      if (check.error) {
        errors.push(check.error);
        issueBuckets.add('Invalid Number / Range');
      }
    }

    const activeCheck = parseBoolField(getField(lookup, ['Is Active', 'Status', 'is_active']), true);
    if (!activeCheck.valid) {
      errors.push(`Invalid boolean status "${cellStr(getField(lookup, ['Is Active', 'Status', 'is_active']))}" (use TRUE/FALSE)`);
      issueBuckets.add('Invalid Status');
    }

    // Resolve optional references
    const rawGroup = cellStr(getField(lookup, ['Item Group', 'Item_Group_ID', 'Item Group ID', 'item_group_id', 'Group', 'Group ID']));
    let resolvedGroupId: number | string = '';
    if (rawGroup) {
      const grpMatch = context.itemGroups.find(
        (g) =>
          String(g.id) === rawGroup ||
          g.group_id.toLowerCase() === rawGroup.toLowerCase() ||
          g.group_description.toLowerCase() === rawGroup.toLowerCase()
      );
      if (grpMatch) {
        resolvedGroupId = grpMatch.id;
      } else {
        warnings.push(`Item Group "${rawGroup}" does not match an existing Item Group and will remain unlinked.`);
      }
    }

    const rawCat = cellStr(getField(lookup, ['Category', 'Category Name', 'Category_ID', 'Category ID', 'category_id']));
    let resolvedCatId: number | string = '';
    if (rawCat) {
      const catMatch = context.categories.find(
        (c) => String(c.id) === rawCat || c.name.toLowerCase() === rawCat.toLowerCase()
      );
      if (catMatch) {
        resolvedCatId = catMatch.id;
      } else {
        warnings.push(`Category "${rawCat}" does not match an existing Category and will remain unlinked.`);
      }
    }

    const rawBrand = cellStr(getField(lookup, ['Brand', 'Brand Name', 'brand', 'brand_id', 'brand_name']));
    let resolvedBrandId: number | string = '';
    let resolvedBrandName = '';
    if (rawBrand) {
      const brandMatch = context.brands.find(
        (b) =>
          String(b.id) === rawBrand ||
          b.code.toLowerCase() === rawBrand.toLowerCase() ||
          b.name.toLowerCase() === rawBrand.toLowerCase()
      );
      if (brandMatch) {
        resolvedBrandId = brandMatch.id;
        resolvedBrandName = (brandMatch.name || '').toUpperCase();
      } else {
        resolvedBrandName = rawBrand.toUpperCase();
        warnings.push(`Brand "${rawBrand.toUpperCase()}" does not match an existing Brand entry (saved as brand text "${rawBrand.toUpperCase()}").`);
      }
    }

    if (errors.length > 0) {
      for (const bucket of issueBuckets) {
        bumpSummary(errorSummaryCounts, bucket);
      }
      invalidRows.push({
        rowNumber,
        identifier: itemCode || `Row ${rowNumber}`,
        name: itemName || undefined,
        errors,
        warnings,
        rawRow: row,
      });
    } else {
      if (warnings.length > 0) {
        warningRows.push({
          rowNumber,
          identifier: itemCode,
          name: itemName,
          errors: [],
          warnings,
          rawRow: row,
        });
      }
      validRecords.push({
        rowNumber,
        item_group_id: resolvedGroupId,
        category_id: resolvedCatId,
        brand_id: resolvedBrandId,
        brand_name: resolvedBrandName,
        item_code: itemCode,
        barcode: barcodeVal,
        item_name: itemName,
        national_language_item_name: natLangName,
        item_name_urdu: natLangName,
        unit_of_measure: uom,
        publisher_vendor: vendor,
        image_url: imageUrl,
        reorder_level: reorderLevel.value,
        reorder_qty: reorderQty.value,
        printed_price: printedPrice.value,
        purchase_discount_percent: purchaseDiscount.value,
        purchase_rate: purchaseRate.value,
        weighted_average_rate: weightedAverageRate.value,
        sale_discount_percent: saleDiscount.value,
        sale_rate: saleRate.value,
        margin_percent: marginPercent.value,
        packing: packingText,
        bulk_rate: bulkRate.value,
        ctn_rate: ctnRate.value,
        ws_rate: wsRate.value,
        bulk_qty: bulkQty.value,
        stock_quantity: stockQty.value,
        is_active: activeCheck.value,
      });
    }
  }

  return {
    segment: 'items',
    fileName,
    totalRowsInFile: nonBlankRows.length,
    blankRowsSkipped,
    validRecords,
    invalidRows,
    warningRows,
    errorSummaryCounts,
  };
}

export function validateCategoriesBulk(
  rawRows: Record<string, unknown>[],
  fileName: string,
  context: {
    existingCategories: Category[];
    itemGroups: ItemGroup[];
  }
): BulkValidationReport<ValidatedCategoryInput> {
  const validRecords: ValidatedCategoryInput[] = [];
  const invalidRows: BulkRowIssue[] = [];
  const warningRows: BulkRowIssue[] = [];
  const errorSummaryCounts: Record<string, number> = {};
  let blankRowsSkipped = 0;

  const nonBlankRows: Array<{ row: Record<string, unknown>; rowNumber: number }> = [];
  rawRows.forEach((row, idx) => {
    if (isCompletelyBlankRow(row)) blankRowsSkipped++;
    else nonBlankRows.push({ row, rowNumber: getSpreadsheetRowNumber(row, idx) });
  });

  if (nonBlankRows.length === 0) {
    return {
      segment: 'categories',
      fileName,
      totalRowsInFile: 0,
      blankRowsSkipped,
      validRecords: [],
      invalidRows: [],
      warningRows: [],
      errorSummaryCounts,
      missingHeaderError: 'The uploaded spreadsheet contains no non-empty data rows.',
    };
  }

  const nameAliases = ['Category Name', 'Name', 'name', 'Category'];
  if (!hasAnyKnownColumn(nonBlankRows.map((x) => x.row), nameAliases)) {
    return {
      segment: 'categories',
      fileName,
      totalRowsInFile: nonBlankRows.length,
      blankRowsSkipped,
      validRecords: [],
      invalidRows: nonBlankRows.map(({ row, rowNumber }) => ({
        rowNumber,
        identifier: `Row ${rowNumber}`,
        errors: ['Missing required column "Category Name"'],
        warnings: [],
        rawRow: row,
      })),
      warningRows: [],
      errorSummaryCounts: { 'Missing Required Column ("Category Name")': nonBlankRows.length },
      missingHeaderError: 'Required header column "Category Name" was not found.',
    };
  }

  const existingNames = new Set(context.existingCategories.map((c) => c.name.trim().toLowerCase()));
  const seenFileNames = new Map<string, number>();

  for (const { row, rowNumber } of nonBlankRows) {
    const lookup = buildNormalizedLookup(row);
    const errors: string[] = [];
    const warnings: string[] = [];
    const buckets = new Set<string>();

    const name = cellStr(getField(lookup, nameAliases)).toUpperCase();
    const desc = cellStr(getField(lookup, ['Description', 'description'])).toUpperCase();
    const groupInput = cellStr(
      getField(lookup, [
        'Group / Main Category',
        'Group/Main Category',
        'Item Group / Main Category',
        'Parent Item Group / Main Category',
        'Parent Item Group',
        'Item Group',
        'Main Category',
        'Item Group ID',
        'Item_Group_ID',
        'item_group_id',
        'Group',
        'Group ID',
        'group_id',
        'Group Description',
        'group_description',
      ])
    );
    const activeCheck = parseBoolField(getField(lookup, ['Is Active', 'Status', 'is_active']), true);

    if (!name) {
      errors.push('Missing required "Category Name"');
      buckets.add('Missing Category Name');
    } else if (name.length > 255) {
      errors.push(`"Category Name" exceeds 255 characters (${name.length})`);
      buckets.add('Field Length Exceeded');
    } else {
      const key = name.toLowerCase();
      if (existingNames.has(key)) {
        errors.push(`Duplicate "Category Name" "${name}" (already exists)`);
        buckets.add('Duplicate Category (Catalog)');
      } else if (seenFileNames.has(key)) {
        errors.push(`Duplicate "Category Name" "${name}" in file (first appeared on Row ${seenFileNames.get(key)})`);
        buckets.add('Duplicate Category (In File)');
      } else {
        seenFileNames.set(key, rowNumber);
      }
    }

    if (!activeCheck.valid) {
      errors.push(`Invalid "Is Active" value`);
      buckets.add('Invalid Status');
    }

    let resolvedGroupId: number | string | undefined = undefined;
    if (groupInput) {
      const groupLower = groupInput.toLowerCase();
      const splitCode = groupInput.split(/\s+[—-]\s+/)[0]?.trim().toLowerCase() || '';
      const matchGroup = context.itemGroups.find(
        (g) =>
          g.group_id.toLowerCase() === groupLower ||
          (splitCode && g.group_id.toLowerCase() === splitCode) ||
          g.group_description.toLowerCase() === groupLower ||
          String(g.id) === groupInput
      );
      if (matchGroup) {
        resolvedGroupId = matchGroup.id;
      } else {
        warnings.push(`Group / Main Category "${groupInput.toUpperCase()}" was not found and will remain unlinked.`);
      }
    }

    if (errors.length > 0) {
      for (const b of buckets) bumpSummary(errorSummaryCounts, b);
      invalidRows.push({
        rowNumber,
        identifier: name || `Row ${rowNumber}`,
        errors,
        warnings,
        rawRow: row,
      });
    } else {
      if (warnings.length > 0) {
        warningRows.push({ rowNumber, identifier: name, errors: [], warnings, rawRow: row });
      }
      validRecords.push({
        rowNumber,
        item_group_id: resolvedGroupId,
        name,
        description: desc,
        is_active: activeCheck.value,
      });
    }
  }

  return {
    segment: 'categories',
    fileName,
    totalRowsInFile: nonBlankRows.length,
    blankRowsSkipped,
    validRecords,
    invalidRows,
    warningRows,
    errorSummaryCounts,
  };
}

export function validateItemGroupsBulk(
  rawRows: Record<string, unknown>[],
  fileName: string,
  context: { existingGroups: ItemGroup[] }
): BulkValidationReport<ValidatedItemGroupInput> {
  const validRecords: ValidatedItemGroupInput[] = [];
  const invalidRows: BulkRowIssue[] = [];
  const errorSummaryCounts: Record<string, number> = {};
  let blankRowsSkipped = 0;

  const nonBlankRows: Array<{ row: Record<string, unknown>; rowNumber: number }> = [];
  rawRows.forEach((row, idx) => {
    if (isCompletelyBlankRow(row)) blankRowsSkipped++;
    else nonBlankRows.push({ row, rowNumber: getSpreadsheetRowNumber(row, idx) });
  });

  if (nonBlankRows.length === 0) {
    return {
      segment: 'groups',
      fileName,
      totalRowsInFile: 0,
      blankRowsSkipped,
      validRecords: [],
      invalidRows: [],
      warningRows: [],
      errorSummaryCounts,
      missingHeaderError: 'The uploaded spreadsheet contains no non-empty data rows.',
    };
  }

  const groupIdAliases = ['Group ID', 'Group_ID', 'group_id', 'Group Code'];
  if (!hasAnyKnownColumn(nonBlankRows.map((x) => x.row), groupIdAliases)) {
    return {
      segment: 'groups',
      fileName,
      totalRowsInFile: nonBlankRows.length,
      blankRowsSkipped,
      validRecords: [],
      invalidRows: nonBlankRows.map(({ row, rowNumber }) => ({
        rowNumber,
        identifier: `Row ${rowNumber}`,
        errors: ['Missing required column "Group ID"'],
        warnings: [],
        rawRow: row,
      })),
      warningRows: [],
      errorSummaryCounts: { 'Missing Required Column ("Group ID")': nonBlankRows.length },
      missingHeaderError: 'Required header column "Group ID" was not found.',
    };
  }

  const existingIds = new Set(context.existingGroups.map((g) => g.group_id.trim().toLowerCase()));
  const seenIds = new Map<string, number>();

  for (const { row, rowNumber } of nonBlankRows) {
    const lookup = buildNormalizedLookup(row);
    const errors: string[] = [];
    const buckets = new Set<string>();

    const groupId = cellStr(getField(lookup, groupIdAliases)).toUpperCase();
    const desc = cellStr(getField(lookup, ['Group Description', 'Group_Description', 'group_description', 'Description'])).toUpperCase();
    const activeCheck = parseBoolField(getField(lookup, ['Is Active', 'Status', 'is_active']), true);

    if (!groupId) {
      errors.push('Missing required "Group ID"');
      buckets.add('Missing Group ID');
    } else if (groupId.length > 64) {
      errors.push(`"Group ID" exceeds 64 characters (${groupId.length})`);
      buckets.add('Field Length Exceeded');
    } else {
      const key = groupId.toLowerCase();
      if (existingIds.has(key)) {
        errors.push(`Duplicate "Group ID" "${groupId}" (already exists)`);
        buckets.add('Duplicate Group ID (Catalog)');
      } else if (seenIds.has(key)) {
        errors.push(`Duplicate "Group ID" "${groupId}" in file (first appeared on Row ${seenIds.get(key)})`);
        buckets.add('Duplicate Group ID (In File)');
      } else {
        seenIds.set(key, rowNumber);
      }
    }

    if (!activeCheck.valid) {
      errors.push(`Invalid "Is Active" value`);
      buckets.add('Invalid Status');
    }

    if (errors.length > 0) {
      for (const b of buckets) bumpSummary(errorSummaryCounts, b);
      invalidRows.push({
        rowNumber,
        identifier: groupId || `Row ${rowNumber}`,
        name: desc || undefined,
        errors,
        warnings: [],
        rawRow: row,
      });
    } else {
      validRecords.push({
        rowNumber,
        group_id: groupId,
        group_description: desc,
        is_active: activeCheck.value,
      });
    }
  }

  return {
    segment: 'groups',
    fileName,
    totalRowsInFile: nonBlankRows.length,
    blankRowsSkipped,
    validRecords,
    invalidRows,
    warningRows: [],
    errorSummaryCounts,
  };
}

export function validateBrandsBulk(
  rawRows: Record<string, unknown>[],
  fileName: string,
  context: { existingBrands: Brand[] }
): BulkValidationReport<ValidatedBrandInput> {
  const validRecords: ValidatedBrandInput[] = [];
  const invalidRows: BulkRowIssue[] = [];
  const errorSummaryCounts: Record<string, number> = {};
  let blankRowsSkipped = 0;

  const nonBlankRows: Array<{ row: Record<string, unknown>; rowNumber: number }> = [];
  rawRows.forEach((row, idx) => {
    if (isCompletelyBlankRow(row)) blankRowsSkipped++;
    else nonBlankRows.push({ row, rowNumber: getSpreadsheetRowNumber(row, idx) });
  });

  if (nonBlankRows.length === 0) {
    return {
      segment: 'brands',
      fileName,
      totalRowsInFile: 0,
      blankRowsSkipped,
      validRecords: [],
      invalidRows: [],
      warningRows: [],
      errorSummaryCounts,
      missingHeaderError: 'The uploaded spreadsheet contains no non-empty data rows.',
    };
  }

  const nameAliases = ['Brand Name', 'Brand', 'name', 'Name'];
  if (!hasAnyKnownColumn(nonBlankRows.map((x) => x.row), nameAliases)) {
    return {
      segment: 'brands',
      fileName,
      totalRowsInFile: nonBlankRows.length,
      blankRowsSkipped,
      validRecords: [],
      invalidRows: nonBlankRows.map(({ row, rowNumber }) => ({
        rowNumber,
        identifier: `Row ${rowNumber}`,
        errors: ['Missing required column "Brand Name"'],
        warnings: [],
        rawRow: row,
      })),
      warningRows: [],
      errorSummaryCounts: { 'Missing Required Column ("Brand Name")': nonBlankRows.length },
      missingHeaderError: 'Required header column "Brand Name" was not found.',
    };
  }

  const existingNames = new Set(context.existingBrands.map((b) => b.name.trim().toLowerCase()));
  const existingCodes = new Set(context.existingBrands.map((b) => b.code.trim().toLowerCase()));
  const seenNames = new Map<string, number>();
  const seenCodes = new Map<string, number>();
  let autoSeq = context.existingBrands.length + 1;

  for (const { row, rowNumber } of nonBlankRows) {
    const lookup = buildNormalizedLookup(row);
    const errors: string[] = [];
    const buckets = new Set<string>();

    const name = cellStr(getField(lookup, nameAliases)).toUpperCase();
    const rawCode = cellStr(getField(lookup, ['Brand Code', 'Code', 'code'])).toUpperCase();
    const desc = cellStr(getField(lookup, ['Description', 'description'])).toUpperCase();
    const activeCheck = parseBoolField(getField(lookup, ['Is Active', 'Status', 'is_active']), true);

    if (!name) {
      errors.push('Missing required "Brand Name"');
      buckets.add('Missing Brand Name');
    } else if (name.length > 255) {
      errors.push(`"Brand Name" exceeds 255 characters (${name.length})`);
      buckets.add('Field Length Exceeded');
    } else {
      const key = name.toLowerCase();
      if (existingNames.has(key)) {
        errors.push(`Duplicate "Brand Name" "${name}" (already exists)`);
        buckets.add('Duplicate Brand Name (Catalog)');
      } else if (seenNames.has(key)) {
        errors.push(`Duplicate "Brand Name" "${name}" in file (first appeared on Row ${seenNames.get(key)})`);
        buckets.add('Duplicate Brand Name (In File)');
      } else {
        seenNames.set(key, rowNumber);
      }
    }

    let code = rawCode.toUpperCase();
    if (!code) {
      while (true) {
        const candidate = `BRD-${String(autoSeq++).padStart(3, '0')}`;
        if (!existingCodes.has(candidate.toLowerCase()) && !seenCodes.has(candidate.toLowerCase())) {
          code = candidate;
          break;
        }
      }
    }

    if (code.length > 64) {
      errors.push(`"Brand Code" exceeds 64 characters (${code.length})`);
      buckets.add('Field Length Exceeded');
    } else {
      const cKey = code.toLowerCase();
      if (existingCodes.has(cKey)) {
        errors.push(`Duplicate "Brand Code" "${code}" (already exists)`);
        buckets.add('Duplicate Brand Code (Catalog)');
      } else if (seenCodes.has(cKey)) {
        errors.push(`Duplicate "Brand Code" "${code}" in file (first appeared on Row ${seenCodes.get(cKey)})`);
        buckets.add('Duplicate Brand Code (In File)');
      } else {
        seenCodes.set(cKey, rowNumber);
      }
    }

    if (!activeCheck.valid) {
      errors.push(`Invalid "Is Active" value`);
      buckets.add('Invalid Status');
    }

    if (errors.length > 0) {
      for (const b of buckets) bumpSummary(errorSummaryCounts, b);
      invalidRows.push({
        rowNumber,
        identifier: rawCode || name || `Row ${rowNumber}`,
        name: name || undefined,
        errors,
        warnings: [],
        rawRow: row,
      });
    } else {
      validRecords.push({
        rowNumber,
        code,
        name,
        description: desc,
        is_active: activeCheck.value,
      });
    }
  }

  return {
    segment: 'brands',
    fileName,
    totalRowsInFile: nonBlankRows.length,
    blankRowsSkipped,
    validRecords,
    invalidRows,
    warningRows: [],
    errorSummaryCounts,
  };
}
