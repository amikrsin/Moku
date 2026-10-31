import React, { useState, useEffect } from 'react';
import { 
  X, 
  KeyRound, 
  Lock, 
  Unlock, 
  Check, 
  Copy, 
  ExternalLink, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  ShoppingBag,
  Settings2,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  getLicenseState, 
  verifyAndActivateKey, 
  saveLicenseState, 
  switchToDemoMode, 
  hideSellerAdminMode,
  subscribeLicense,
  LicenseState 
} from '../lib/license';

interface LicenseUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'buyer' | 'seller';
}

export const LicenseUnlockModal: React.FC<LicenseUnlockModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'buyer',
}) => {
  const [license, setLicense] = useState<LicenseState>(() => getLicenseState());
  const [activeTab, setActiveTab] = useState<'buyer' | 'seller'>(
    license.isSellerAdmin ? initialTab : 'buyer'
  );
  const [inputKey, setInputKey] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Seller config state
  const [sellerKey, setSellerKey] = useState(license.customLicenseKey || 'MOKU-PRO-2026');
  const [etsyUrl, setEtsyUrl] = useState(license.etsyShopUrl || 'https://www.etsy.com');
  const [copiedType, setCopiedType] = useState<'demo' | 'unlock' | 'key' | null>(null);
  const [sellerSaved, setSellerSaved] = useState(false);

  useEffect(() => {
    const current = getLicenseState();
    setLicense(current);
    setActiveTab(current.isSellerAdmin ? initialTab : 'buyer');
  }, [initialTab, isOpen]);

  useEffect(() => {
    const unsub = subscribeLicense(() => {
      const updated = getLicenseState();
      setLicense(updated);
      setSellerKey(updated.customLicenseKey || 'MOKU-PRO-2026');
      setEtsyUrl(updated.etsyShopUrl || 'https://www.etsy.com');
      if (!updated.isSellerAdmin) {
        setActiveTab('buyer');
      }
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://your-app-url.run.app';
  const demoUrl = `${baseUrl}?demo=true`;
  const unlockUrl = `${baseUrl}?unlock=${encodeURIComponent(sellerKey.trim().toUpperCase())}`;

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    const res = verifyAndActivateKey(inputKey);
    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      setInputKey('');
      if (res.isSellerUnlocked) {
        setActiveTab('seller');
      }
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const handleSaveSellerSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = sellerKey.trim().toUpperCase() || 'MOKU-PRO-2026';
    const cleanUrl = etsyUrl.trim() || 'https://www.etsy.com';
    saveLicenseState({
      customLicenseKey: cleanKey,
      etsyShopUrl: cleanUrl,
    });
    setSellerKey(cleanKey);
    setSellerSaved(true);
    setTimeout(() => setSellerSaved(false), 2000);
  };

  const handleCopy = async (text: string, type: 'demo' | 'unlock' | 'key') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadReceiptTemplate = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>MOKU Kakeibo Budget App - Access & License Key</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F4F6F4; color: #1A1C1A; padding: 40px 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 24px; padding: 40px; border: 1px solid #DDE2DD; box-shadow: 0 12px 32px rgba(0,0,0,0.06); }
    .badge { display: inline-block; background: #D8F3E7; color: #176B52; font-weight: 700; font-size: 12px; padding: 6px 12px; border-radius: 999px; letter-spacing: 0.05em; text-transform: uppercase; }
    h1 { font-size: 28px; margin: 16px 0 8px; color: #1A1C1A; }
    p { font-size: 15px; line-height: 1.6; color: #4A4F4B; }
    .key-box { background: #F7F8F7; border: 2px dashed #176B52; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
    .key-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #6E736F; font-weight: 700; }
    .key-code { font-size: 26px; font-weight: 800; color: #176B52; letter-spacing: 0.08em; margin-top: 6px; font-family: monospace; }
    .btn { display: block; width: 100%; box-sizing: border-box; text-align: center; background: #176B52; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 16px; padding: 16px 24px; border-radius: 14px; margin: 20px 0; }
    .steps { background: #F7F8F7; border-radius: 16px; padding: 20px 24px; margin-top: 24px; }
    .steps li { margin-bottom: 10px; font-size: 14px; color: #2D312E; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Thank You For Your Order</span>
    <h1>MOKU 2.0 — Mindful Kakeibo Ledger</h1>
    <p>Thank you for purchasing the full lifetime edition of MOKU! Your purchase unlocks <strong>App Installation (iOS, Android & Desktop PWA)</strong>, <strong>CSV/JSON Data Backups</strong>, and <strong>Smart SMS Auto-Fill</strong>.</p>
    
    <a class="btn" href="${unlockUrl}" target="_blank">1-Click Launch & Auto-Unlock Full App →</a>

    <div class="key-box">
      <div class="key-label">Your Lifetime Activation License Key</div>
      <div class="key-code">${sellerKey}</div>
    </div>

    <div class="steps">
      <strong>How to Install on Your Phone (After Unlocking):</strong>
      <ol>
        <li>Click the green <strong>1-Click Launch & Auto-Unlock</strong> button above (or open the app and enter key <code>${sellerKey}</code>).</li>
        <li>Tap the <strong>Install App</strong> button inside MOKU to save it to your phone's Home Screen.</li>
        <li>All your financial data stays 100% private on your personal device!</li>
      </ol>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MOKU_Buyer_Delivery_Card.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-[var(--moku-surface)] border border-[var(--moku-outline)] rounded-[28px] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--moku-outline)]">
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              license.isLicensed 
                ? 'bg-[var(--moku-primary-container)] text-[var(--moku-primary)]' 
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}>
              {license.isLicensed ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--moku-text-primary)] leading-tight">
                {license.isLicensed ? 'MOKU Pro Licensed' : 'Unlock Full App & Download'}
              </h3>
              <p className="text-[11px] text-[var(--moku-text-secondary)]">
                {license.isLicensed ? `Active Key: ${license.licenseKey}` : 'Demo Mode — App Download Locked'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface-secondary)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs: ONLY visible when Seller Admin is unlocked! General users never see this */}
        {license.isSellerAdmin && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)]">
            <button
              type="button"
              onClick={() => setActiveTab('buyer')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'buyer'
                  ? 'bg-[var(--moku-surface)] text-[var(--moku-primary)] shadow-2xs'
                  : 'text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Buyer View</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('seller')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'seller'
                  ? 'bg-[var(--moku-surface)] text-[var(--moku-primary)] shadow-2xs'
                  : 'text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)]'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Seller Hub (Hidden)</span>
            </button>
          </div>
        )}

        {activeTab === 'buyer' || !license.isSellerAdmin ? (
          <div className="space-y-4">
            {/* Explanation Banner */}
            <div className="p-3.5 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--moku-text-primary)] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[var(--moku-primary)]" />
                  Why is Download Locked in Demo?
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  license.isLicensed
                    ? 'bg-[var(--moku-primary-container)] text-[var(--moku-primary)]'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}>
                  {license.isLicensed ? 'UNLOCKED' : 'DEMO VERSION'}
                </span>
              </div>
              <p className="text-xs text-[var(--moku-text-secondary)] leading-relaxed">
                In the free <strong>Interactive Demo</strong>, you can test budgeting, Kakeibo categories, and SMS paste in your browser, but <strong>App Installation (PWA Download)</strong> and <strong>CSV/JSON Exports</strong> are locked until activated with a paid License Key.
              </p>
            </div>

            {/* License Key Input Form */}
            {!license.isLicensed ? (
              <form onSubmit={handleActivate} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--moku-text-primary)] mb-1.5">
                    Enter Your License Key
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="license-key-input"
                      type="text"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                      placeholder="Enter your activation code"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-sm font-mono font-bold text-[var(--moku-text-primary)] uppercase tracking-wider outline-none focus:border-[var(--moku-primary)]"
                    />
                    <button
                      id="activate-license-btn"
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-[var(--moku-primary)] text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0 flex items-center space-x-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unlock</span>
                    </button>
                  </div>
                </div>

                {feedback && (
                  <div className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                    feedback.type === 'success'
                      ? 'bg-[var(--moku-primary-container)] text-[var(--moku-primary)]'
                      : 'bg-[var(--moku-danger-container)] text-[var(--moku-danger)]'
                  }`}>
                    <span>{feedback.text}</span>
                  </div>
                )}

                {/* Buy License Key CTA */}
                <div className="pt-2 border-t border-[var(--moku-outline)] space-y-2.5">
                  <p className="text-xs text-[var(--moku-text-secondary)] text-center">
                    Don&apos;t have a license key yet? Purchase the full lifetime app to unlock downloading on Android, iOS &amp; Desktop:
                  </p>
                  <a
                    href={license.etsyShopUrl && license.etsyShopUrl !== 'https://www.etsy.com' ? license.etsyShopUrl : undefined}
                    target={license.etsyShopUrl && license.etsyShopUrl !== 'https://www.etsy.com' ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!license.etsyShopUrl || license.etsyShopUrl === 'https://www.etsy.com') {
                        e.preventDefault();
                        setFeedback({
                          type: 'error',
                          text: 'Please enter your license key from your order confirmation or purchase receipt above.',
                        });
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--moku-primary)] hover:opacity-95 text-[var(--moku-on-primary)] text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Buy Full Version &amp; License Key</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/30 space-y-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--moku-primary)] text-white flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--moku-primary)]">
                      Full Version Activated!
                    </div>
                    <div className="text-[11px] text-[var(--moku-text-secondary)]">
                      You can now click &ldquo;Install App&rdquo; to download MOKU to your phone or computer.
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--moku-primary)]/20">
                  <span className="text-[11px] font-mono font-bold text-[var(--moku-primary)]">
                    KEY: {license.licenseKey}
                  </span>
                  {license.isSellerAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        switchToDemoMode();
                        setFeedback(null);
                      }}
                      className="text-[11px] font-semibold text-[var(--moku-text-secondary)] hover:text-[var(--moku-danger)] underline cursor-pointer"
                    >
                      Switch back to Demo Mode (Test Lock)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* PRIVATE SELLER HUB TAB (Hidden from general users) */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[var(--moku-primary-container)]/60 border border-[var(--moku-primary)]/25 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[var(--moku-primary)] flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Private Seller Hub (Hidden from Buyers)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    hideSellerAdminMode();
                    setActiveTab('buyer');
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--moku-surface)] border border-[var(--moku-outline)] text-[var(--moku-text-secondary)] hover:text-[var(--moku-danger)] flex items-center gap-1 cursor-pointer"
                  title="Hide Seller Hub so you see exactly what general users see"
                >
                  <EyeOff className="w-3 h-3" />
                  <span>Exit Seller Mode</span>
                </button>
              </div>
              <p className="text-[11px] text-[var(--moku-text-secondary)] leading-relaxed">
                General users and demo visitors <strong>cannot see this tab</strong>. To reopen it anytime, either type your secret seller code <code>MOKU-ADMIN-99</code> into the License Key box, or tap <strong>&ldquo;About MOKU 2.0&rdquo;</strong> 5 times in Profile.
              </p>
            </div>

            {/* Seller Quick Mode Toggle for Testing */}
            <div className="p-3 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-[var(--moku-primary)]" />
                <div>
                  <div className="text-xs font-bold text-[var(--moku-text-primary)]">
                    Preview Mode Switcher
                  </div>
                  <div className="text-[10px] text-[var(--moku-text-secondary)]">
                    Currently viewing as: <strong>{license.isLicensed ? 'Paid Buyer (Unlocked)' : 'Free Demo Visitor (Download Blocked)'}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (license.isLicensed) {
                    switchToDemoMode();
                  } else {
                    verifyAndActivateKey(sellerKey);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-[var(--moku-primary)] text-white text-[11px] font-bold cursor-pointer hover:opacity-90 shrink-0"
              >
                {license.isLicensed ? 'Test Demo Lock' : 'Unlock Now'}
              </button>
            </div>

            {/* Customize Key & Etsy Link */}
            <form onSubmit={handleSaveSellerSettings} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1">
                  Your Master License Key (For Paid Buyers)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={sellerKey}
                    onChange={(e) => setSellerKey(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-xs font-mono font-bold text-[var(--moku-text-primary)] uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(sellerKey, 'key')}
                    className="px-3 py-2 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-xs font-bold text-[var(--moku-text-primary)] hover:bg-[var(--moku-surface-tertiary)] cursor-pointer flex items-center space-x-1"
                  >
                    {copiedType === 'key' ? <Check className="w-3.5 h-3.5 text-[var(--moku-primary)]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'key' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1">
                  Your Store / Purchase Link
                </label>
                <input
                  type="url"
                  value={etsyUrl}
                  onChange={(e) => setEtsyUrl(e.target.value)}
                  placeholder="https://yourstore.com/product-link"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-xs text-[var(--moku-text-primary)]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] hover:border-[var(--moku-primary)] text-xs font-bold text-[var(--moku-primary)] cursor-pointer transition-colors"
              >
                {sellerSaved ? '✓ Saved Configuration' : 'Save Key & Store Link'}
              </button>
            </form>

            {/* Shareable Links */}
            <div className="space-y-2.5 pt-2 border-t border-[var(--moku-outline)]">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--moku-text-primary)]">
                    1. Public Demo Link (Share with Buyers)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(demoUrl, 'demo')}
                    className="text-[11px] font-bold text-[var(--moku-primary)] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedType === 'demo' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'demo' ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-[var(--moku-surface-secondary)] text-[10px] font-mono text-[var(--moku-text-secondary)] truncate">
                  {demoUrl}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--moku-text-primary)]">
                    2. Paid Buyer Auto-Unlock Link (1-Click Unlock)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(unlockUrl, 'unlock')}
                    className="text-[11px] font-bold text-[var(--moku-primary)] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedType === 'unlock' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'unlock' ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-[var(--moku-surface-secondary)] text-[10px] font-mono text-[var(--moku-text-secondary)] truncate">
                  {unlockUrl}
                </div>
              </div>
            </div>

            {/* Download Buyer Delivery Template */}
            <button
              type="button"
              onClick={handleDownloadReceiptTemplate}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--moku-primary)] text-white text-xs font-bold flex items-center justify-center space-x-2 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>Download Buyer Delivery Card (.HTML)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
