export interface LicenseState {
  isLicensed: boolean;
  licenseKey: string | null;
  activatedAt: number | null;
  etsyShopUrl: string;
  customLicenseKey: string;
  isSellerAdmin: boolean;
}

const LICENSE_STORAGE_KEY = 'moku_license_state_v1';
const DEFAULT_LICENSE_KEY = 'MOKU-PRO-2026';
const DEFAULT_ETSY_SHOP_URL = 'https://www.etsy.com';
const SELLER_MASTER_PASSCODE = 'MOKU-ADMIN-99';

// Valid built-in activation keys (case-insensitive) plus any custom key configured by seller
const BUILTIN_VALID_KEYS = [
  'MOKU-PRO-2026',
  'MOKU-ETSY-VIP',
  'KAKEIBO-FULL-2026',
  'MOKU-LIFETIME',
];

type LicenseListener = () => void;
const listeners: LicenseListener[] = [];

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function subscribeLicense(listener: LicenseListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function getLicenseState(): LicenseState {
  if (typeof window === 'undefined') {
    return {
      isLicensed: false,
      licenseKey: null,
      activatedAt: null,
      etsyShopUrl: DEFAULT_ETSY_SHOP_URL,
      customLicenseKey: DEFAULT_LICENSE_KEY,
      isSellerAdmin: false,
    };
  }

  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isLicensed: Boolean(parsed.isLicensed),
        licenseKey: parsed.licenseKey || null,
        activatedAt: parsed.activatedAt || null,
        etsyShopUrl: parsed.etsyShopUrl || DEFAULT_ETSY_SHOP_URL,
        customLicenseKey: parsed.customLicenseKey || DEFAULT_LICENSE_KEY,
        isSellerAdmin: Boolean(parsed.isSellerAdmin),
      };
    }
  } catch (e) {
    console.warn('Failed to read license state', e);
  }

  // Default to Demo Mode (unlicensed) and Seller Admin hidden from general users
  return {
    isLicensed: false,
    licenseKey: null,
    activatedAt: null,
    etsyShopUrl: DEFAULT_ETSY_SHOP_URL,
    customLicenseKey: DEFAULT_LICENSE_KEY,
    isSellerAdmin: false,
  };
}

export function saveLicenseState(next: Partial<LicenseState>): LicenseState {
  const current = getLicenseState();
  const updated: LicenseState = {
    ...current,
    ...next,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(updated));
  }
  notifyListeners();
  return updated;
}

export function verifyAndActivateKey(inputKey: string): {
  success: boolean;
  isSellerUnlocked?: boolean;
  message: string;
} {
  const clean = inputKey.trim().toUpperCase();
  if (!clean) {
    return { success: false, message: 'Please enter a valid Etsy License Key.' };
  }

  // Secret Seller Passcode entered inside the License Key box unlocks Seller Hub!
  if (clean === SELLER_MASTER_PASSCODE || clean === 'SELLER-ADMIN') {
    saveLicenseState({
      isSellerAdmin: true,
    });
    return {
      success: true,
      isSellerUnlocked: true,
      message: 'Seller Admin Hub Unlocked! Only you can see the Etsy Seller controls now.',
    };
  }

  const state = getLicenseState();
  const customUpper = (state.customLicenseKey || DEFAULT_LICENSE_KEY).trim().toUpperCase();

  if (BUILTIN_VALID_KEYS.includes(clean) || clean === customUpper) {
    saveLicenseState({
      isLicensed: true,
      licenseKey: clean,
      activatedAt: Date.now(),
    });
    return {
      success: true,
      message: 'Full Version Unlocked! App Download (PWA Install) and Data Exports are now enabled.',
    };
  }

  return {
    success: false,
    message: 'Invalid License Key. Please check your Etsy Order Receipt PDF or message the seller.',
  };
}

export function switchToDemoMode(): void {
  saveLicenseState({
    isLicensed: false,
    licenseKey: null,
    activatedAt: null,
  });
}

export function hideSellerAdminMode(): void {
  saveLicenseState({
    isSellerAdmin: false,
  });
}

export function enableSellerAdminMode(): void {
  saveLicenseState({
    isSellerAdmin: true,
  });
}

export function checkUrlForLicenseParams(): { unlocked: boolean; demoForced: boolean } {
  if (typeof window === 'undefined') return { unlocked: false, demoForced: false };

  const params = new URLSearchParams(window.location.search);
  const unlockParam = params.get('unlock') || params.get('key') || params.get('license');
  const demoParam = params.get('demo');
  const sellerParam = params.get('seller') || params.get('admin');

  if (sellerParam === 'moku2026' || sellerParam === 'admin' || sellerParam === 'true') {
    saveLicenseState({ isSellerAdmin: true });
    params.delete('seller');
    params.delete('admin');
    const newQuery = params.toString();
    const cleanUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '') + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  if (unlockParam) {
    const result = verifyAndActivateKey(unlockParam);
    if (result.success) {
      params.delete('unlock');
      params.delete('key');
      params.delete('license');
      const newQuery = params.toString();
      const cleanUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '') + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
      return { unlocked: true, demoForced: false };
    }
  }

  if (demoParam === 'true' || demoParam === '1') {
    // Public demo link ALWAYS hides Seller Admin Hub so shoppers never see it
    saveLicenseState({
      isLicensed: false,
      licenseKey: null,
      activatedAt: null,
      isSellerAdmin: false,
    });
    return { unlocked: false, demoForced: true };
  }

  return { unlocked: false, demoForced: false };
}
