const NON_TEXT_INPUT_TYPES = new Set([
  'password',
  'number',
  'date',
  'datetime-local',
  'time',
  'month',
  'week',
  'color',
  'range',
  'file',
  'checkbox',
  'radio',
  'hidden',
  'button',
  'submit',
  'reset',
  'image',
]);

/**
 * Keys whose values are internal technical identifiers, enum literals,
 * secrets, media/data URLs, ISO timestamps, or UI configuration structures
 * that must preserve their exact format rather than being uppercased.
 */
export const PRESERVED_CASE_KEYS = new Set([
  'id',
  'organization_id',
  'chain_id',
  'branch_id',
  'assigned_branch_id',
  'assigned_branches',
  'plan_id',
  'previous_plan_id',
  'new_plan_id',
  'custom_role_id',
  'role_id',
  'client_ref',
  'item_group_id',
  'category_id',
  'brand_id',
  'sub_category_id',
  'item_id',
  'item_def_id',
  'wood_stock_id',
  'customer_id',
  'supplier_id',
  'sale_id',
  'purchase_id',
  'created_by',
  'user_id',
  'manager_user_id',
  'record_id',
  // Enum / programmatic union values
  'role',
  'base_role',
  'status',
  'account_status',
  'branch_type',
  'branch_access',
  'payment_method',
  'payment_type',
  'action',
  'category',
  'duplicate_scan_behavior',
  'custom_scan_behavior',
  // Authentication secrets & currency symbols
  'password',
  'password_hash',
  'currency_symbol',
  'symbol',
  'base_currency',
  'active_display_currency',
  // Media URLs / base64 / data URIs
  'logo_url',
  'image_url',
  'image',
  // Dates & timestamps
  'created_at',
  'updated_at',
  'last_login',
  'sale_date',
  'purchase_date',
  'payment_date',
  'expense_date',
  'opening_date',
  'subscription_start_date',
  'subscription_expiry_date',
  'arrival_date',
  // Complex configuration objects
  'permissions',
  'matrix',
  'available_modules',
  'currencies',
]);

export function toUpperString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).toUpperCase();
}

export function normalizeRecordUppercase<T>(value: T, parentKey?: string): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    if (parentKey && PRESERVED_CASE_KEYS.has(parentKey)) {
      return value;
    }
    if (value.startsWith('data:') || value.startsWith('/assets/')) {
      return value;
    }
    return value.toUpperCase() as unknown as T;
  }

  if (Array.isArray(value)) {
    if (parentKey && PRESERVED_CASE_KEYS.has(parentKey)) {
      return value;
    }
    return value.map((item) => normalizeRecordUppercase(item, parentKey)) as unknown as T;
  }

  if (typeof value === 'object') {
    if (parentKey && PRESERVED_CASE_KEYS.has(parentKey)) {
      return value;
    }
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (PRESERVED_CASE_KEYS.has(k)) {
        out[k] = v;
      } else {
        out[k] = normalizeRecordUppercase(v, k);
      }
    }
    return out as T;
  }

  return value;
}

function shouldForceUppercaseElement(
  el: EventTarget | null
): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el || typeof window === 'undefined') return false;
  if (el instanceof HTMLTextAreaElement) {
    return el.dataset.preserveCase !== 'true' && !el.readOnly && !el.disabled;
  }
  if (el instanceof HTMLInputElement) {
    if (el.dataset.preserveCase === 'true' || el.readOnly || el.disabled) {
      return false;
    }
    const type = (el.type || 'text').toLowerCase();
    return !NON_TEXT_INPUT_TYPES.has(type);
  }
  return false;
}

const nativeInputValueSetter =
  typeof HTMLInputElement !== 'undefined'
    ? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    : undefined;
const nativeTextAreaValueSetter =
  typeof HTMLTextAreaElement !== 'undefined'
    ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    : undefined;

function enforceElementUppercase(el: HTMLInputElement | HTMLTextAreaElement) {
  const current = el.value;
  if (!current) return;
  const upper = current.toUpperCase();
  if (current === upper) return;

  let start: number | null = null;
  let end: number | null = null;
  try {
    start = el.selectionStart;
    end = el.selectionEnd;
  } catch {
    // Some input types (e.g. email) do not allow selectionStart/End access
  }

  // Call the native prototype setter so React's instance-level value wrapper does not
  // prematurely sync _valueTracker before React's synthetic onChange inspects the DOM value.
  const nativeSetter = el instanceof HTMLTextAreaElement ? nativeTextAreaValueSetter : nativeInputValueSetter;
  if (nativeSetter) {
    nativeSetter.call(el, upper);
  } else {
    el.value = upper;
  }

  if (start !== null && end !== null) {
    try {
      el.setSelectionRange(start, end);
    } catch {
      // Ignore if input type does not support setSelectionRange
    }
  }
}

let isHandlerInstalled = false;

/**
 * Installs global capture-phase DOM listeners so every text input and textarea
 * converts typed/pasted/autofilled characters to UPPERCASE before React's
 * synthetic onChange handlers read `event.target.value`.
 */
export function installGlobalUppercaseInputHandler(): void {
  if (typeof window === 'undefined' || isHandlerInstalled) return;
  isHandlerInstalled = true;

  const handleInputLikeEvent = (e: Event) => {
    const target = e.target;
    if (!shouldForceUppercaseElement(target)) return;
    if ('isComposing' in e && (e as InputEvent).isComposing) return;
    enforceElementUppercase(target);
  };

  window.addEventListener('input', handleInputLikeEvent, true);
  window.addEventListener('change', handleInputLikeEvent, true);
  window.addEventListener('compositionend', handleInputLikeEvent, true);
}
