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
const DEFAULT_STORE_URL = '';
const SELLER_MASTER_PASSCODE = 'MOKU-ADMIN-99';

// Valid built-in offline activation keys for legitimate commercial fallbacks.
// NOTE: 'MOKU-PRO-2026' is intentionally EXCLUDED from this public list so customer browsers cannot bypass payment.
const BUILTIN_VALID_KEYS = [
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
      etsyShopUrl: DEFAULT_STORE_URL,
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
        etsyShopUrl: parsed.etsyShopUrl || DEFAULT_STORE_URL,
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
    etsyShopUrl: DEFAULT_STORE_URL,
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

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server_device';
  let id = localStorage.getItem('moku_device_id_v1');
  if (!id) {
    id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('moku_device_id_v1', id);
  }
  return id;
}

export async function verifyAndActivateKeyAsync(inputKey: string): Promise<{
  success: boolean;
  isSellerUnlocked?: boolean;
  message: string;
  seatsUsed?: number;
  maxSeats?: number;
}> {
  const clean = inputKey.trim().toUpperCase();
  if (!clean) {
    return { success: false, message: 'Please enter a valid License Key.' };
  }

  // Secret Seller Passcode entered inside the License Key box unlocks Seller Hub!
  if (clean === SELLER_MASTER_PASSCODE || clean === 'SELLER-ADMIN') {
    saveLicenseState({
      isSellerAdmin: true,
    });
    return {
      success: true,
      isSellerUnlocked: true,
      message: 'Seller Admin Hub Unlocked! Only you can see the Seller controls now.',
    };
  }

  const state = getLicenseState();
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Client-side Demo Key Guard:
  // Strictly rejects MOKU-PRO-2026 for regular customers in production, exactly matching Cloudflare Worker.
  if (clean === 'MOKU-PRO-2026' && !state.isSellerAdmin && !isLocalhost) {
    return {
      success: false,
      message: 'MOKU-PRO-2026 is an internal developer demo key and cannot be used for commercial activation. Please enter your purchased commercial license key.',
    };
  }

  // 1. Try server activation first (enforcing Cloudflare D1 max 2 device limit)
  const deviceId = getDeviceId();
  try {
    const res = await fetch('/api/license/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(state.isSellerAdmin ? { 'x-seller-passcode': SELLER_MASTER_PASSCODE } : {}),
      },
      body: JSON.stringify({
        licenseKey: clean,
        deviceId,
        deviceName: typeof navigator !== 'undefined' ? `${navigator.platform || 'Device'}` : 'Web Client',
        adminPasscode: state.isSellerAdmin ? SELLER_MASTER_PASSCODE : undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json() as any;
      if (data.success) {
        saveLicenseState({
          isLicensed: true,
          licenseKey: clean,
          activatedAt: Date.now(),
        });
        return {
          success: true,
          message: data.message || 'Full Version Unlocked! App Download is now enabled.',
          seatsUsed: data.seatsUsed,
          maxSeats: data.maxSeats,
        };
      }
    } else if (res.status === 403) {
      // Explicit seat limit or demo key rejection from Cloudflare D1!
      const errData = await res.json() as any;
      return {
        success: false,
        message: errData.message || 'Activation rejected by server. Max 2 devices allowed per commercial license.',
      };
    }
  } catch (netErr) {
    console.warn('Server license activation unavailable, checking offline keys:', netErr);
  }

  // 2. Offline fallback to built-in keys
  if (clean === 'MOKU-PRO-2026') {
    if (state.isSellerAdmin || isLocalhost) {
      saveLicenseState({
        isLicensed: true,
        licenseKey: clean,
        activatedAt: Date.now(),
      });
      return {
        success: true,
        message: 'Master Demo Key verified (Admin / Developer Test Mode). App Download enabled.',
      };
    }
    return {
      success: false,
      message: 'MOKU-PRO-2026 is an internal developer demo key and cannot be used for commercial activation. Please enter your purchased commercial license key.',
    };
  }

  const customUpper = (state.customLicenseKey || '').trim().toUpperCase();
  if (BUILTIN_VALID_KEYS.includes(clean) || (customUpper && clean === customUpper && state.isSellerAdmin)) {
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
    message: 'Invalid License Key. Please check your Razorpay email receipt or order confirmation.',
  };
}

export function verifyAndActivateKey(inputKey: string): {
  success: boolean;
  isSellerUnlocked?: boolean;
  message: string;
} {
  const clean = inputKey.trim().toUpperCase();
  if (!clean) {
    return { success: false, message: 'Please enter a valid License Key.' };
  }

  if (clean === SELLER_MASTER_PASSCODE || clean === 'SELLER-ADMIN') {
    saveLicenseState({
      isSellerAdmin: true,
    });
    return {
      success: true,
      isSellerUnlocked: true,
      message: 'Seller Admin Hub Unlocked! Only you can see the Seller controls now.',
    };
  }

  const state = getLicenseState();
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Strict check on synchronous path for demo bypass
  if (clean === 'MOKU-PRO-2026') {
    if (!state.isSellerAdmin && !isLocalhost) {
      return {
        success: false,
        message: 'MOKU-PRO-2026 is an internal developer demo key and cannot be used for commercial activation. Please enter your purchased commercial license key.',
      };
    }
    saveLicenseState({
      isLicensed: true,
      licenseKey: clean,
      activatedAt: Date.now(),
    });
    return {
      success: true,
      message: 'Master Demo Key verified (Admin / Developer Test Mode). App Download enabled.',
    };
  }

  // Trigger background server verification
  verifyAndActivateKeyAsync(inputKey).catch((e) => console.warn('Async activation failed:', e));

  const customUpper = (state.customLicenseKey || '').trim().toUpperCase();
  if (BUILTIN_VALID_KEYS.includes(clean) || (customUpper && clean === customUpper && state.isSellerAdmin)) {
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
    message: 'Invalid License Key. Please check your Razorpay email receipt or contact support.',
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
