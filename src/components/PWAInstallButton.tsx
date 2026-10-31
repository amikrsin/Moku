import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share2, PlusSquare, X, Check, Lock } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';
import { getLicenseState, subscribeLicense } from '../lib/license';
import { LicenseUnlockModal } from './LicenseUnlockModal';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'tile' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isLicensed, setIsLicensed] = useState<boolean>(() => getLicenseState().isLicensed);
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  useEffect(() => {
    const unsub = subscribeLicense(() => {
      setIsLicensed(getLicenseState().isLicensed);
    });
    return () => unsub();
  }, []);

  // If already running as an installed standalone PWA, suppress button
  if (isInstalled) {
    if (variant === 'tile') {
      return (
        <div className="w-full p-4.5 flex items-center justify-between bg-[var(--moku-surface-secondary)]/50 text-left">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--moku-primary-container)] flex items-center justify-center text-[var(--moku-primary)]">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--moku-text-primary)]">
                MOKU App Installed
              </div>
              <div className="text-xs text-[var(--moku-text-secondary)]">
                Running in standalone native mode
              </div>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--moku-primary-container)] text-[var(--moku-primary)]">
            Installed
          </span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    // Block downloading in Demo Mode until paid license is activated
    if (!isLicensed) {
      setShowLicenseModal(true);
      return;
    }

    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // For browsers where beforeinstallprompt hasn't fired yet or desktop manual
      setShowIOSGuide(true);
    }
  };

  // Compact variant (suitable for headers/toolbars)
  if (variant === 'compact') {
    return (
      <>
        <button
          id="pwa-install-compact-btn"
          type="button"
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs hover:opacity-90 transition-all cursor-pointer ${
            isLicensed
              ? 'bg-[var(--moku-primary)] text-[var(--moku-on-primary)]'
              : 'bg-amber-100 dark:bg-[#1E170A] text-amber-950 dark:text-[#FFF8E7] border border-amber-300 dark:border-amber-500/50'
          } ${className}`}
          title={isLicensed ? 'Install MOKU to your home screen' : 'Unlock Full Version to Download App'}
        >
          {isLicensed ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-[#FCD34D]" />}
          <span>
            {isInstalling
              ? 'Installing...'
              : isLicensed
              ? 'Install App'
              : 'Download Locked (Demo)'}
          </span>
        </button>

        {showIOSGuide && (
          <InstallInstructionsModal onClose={() => setShowIOSGuide(false)} isIOS={isIOS} />
        )}
        <LicenseUnlockModal
          isOpen={showLicenseModal}
          onClose={() => setShowLicenseModal(false)}
        />
      </>
    );
  }

  // Tile variant (suitable for Settings / Profile screen list)
  if (variant === 'tile') {
    return (
      <>
        <button
          id="pwa-install-tile-btn"
          type="button"
          onClick={handleInstallClick}
          className={`w-full p-4.5 flex items-center justify-between hover:bg-[var(--moku-surface-secondary)] transition-colors text-left cursor-pointer ${className}`}
        >
          <div className="flex items-center space-x-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isLicensed
                ? 'bg-[var(--moku-primary-container)] text-[var(--moku-primary)]'
                : 'bg-amber-100 dark:bg-amber-500/25 text-amber-800 dark:text-[#FCD34D]'
            }`}>
              {isLicensed ? <Smartphone className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--moku-text-primary)]">
                {isLicensed ? 'Install MOKU (PWA)' : 'Download MOKU App (Locked in Demo)'}
              </div>
              <div className="text-xs text-[var(--moku-text-secondary)]">
                {isLicensed
                  ? 'Add to your home screen for offline use and fast launch'
                  : 'Enter your paid Etsy License Key to unlock app download'}
              </div>
            </div>
          </div>
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold shrink-0 ${
            isLicensed
              ? 'bg-[var(--moku-primary)] text-[var(--moku-on-primary)]'
              : 'bg-amber-100 dark:bg-[#1E170A] text-amber-950 dark:text-[#FFF8E7] border border-amber-300 dark:border-amber-500/50'
          }`}>
            {isLicensed ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-[#FCD34D]" />}
            <span>{isLicensed ? 'Install' : 'Unlock'}</span>
          </div>
        </button>

        {showIOSGuide && (
          <InstallInstructionsModal onClose={() => setShowIOSGuide(false)} isIOS={isIOS} />
        )}
        <LicenseUnlockModal
          isOpen={showLicenseModal}
          onClose={() => setShowLicenseModal(false)}
        />
      </>
    );
  }

  // Banner variant (suitable for Home dashboard or notice)
  return (
    <>
      <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-2xs ${
        isLicensed
          ? 'bg-[var(--moku-primary-container)] border-[var(--moku-primary)]/30'
          : 'bg-amber-50 dark:bg-[#1C1607] border-amber-200 dark:border-amber-500/40'
      } ${className}`}>
        <div className="flex items-center space-x-3 pr-3">
          <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 ${
            isLicensed ? 'bg-[var(--moku-primary)]' : 'bg-amber-600 dark:bg-[#F59E0B] dark:text-[#181002]'
          }`}>
            {isLicensed ? <Smartphone className="w-5 h-5" /> : <Lock className="w-5 h-5 text-white dark:text-[#181002]" />}
          </div>
          <div className="space-y-0.5">
            <span className={`text-xs font-bold block ${
              isLicensed ? 'text-[var(--moku-primary)]' : 'text-amber-950 dark:text-[#FFFDF5]'
            }`}>
              {isLicensed ? 'Install MOKU on your device' : 'Interactive Demo — App Download Locked'}
            </span>
            <p className="text-[11px] text-[var(--moku-text-secondary)] leading-tight">
              {isLicensed
                ? 'Enjoy offline access, full-screen view, and lightning-fast entries.'
                : 'Try all features in browser. Unlock with your Etsy License Key to download the app.'}
            </p>
          </div>
        </div>
        <button
          id="pwa-install-banner-btn"
          type="button"
          onClick={handleInstallClick}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 hover:opacity-90 transition-opacity cursor-pointer shadow-xs flex items-center space-x-1.5 ${
            isLicensed 
              ? 'bg-[var(--moku-primary)] text-[var(--moku-on-primary)]' 
              : 'bg-amber-600 dark:bg-[#F59E0B] text-white dark:text-[#181002] font-extrabold'
          }`}
        >
          {isLicensed ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-white dark:text-[#181002]" />}
          <span>{isLicensed ? 'Install' : 'Unlock'}</span>
        </button>
      </div>

      {showIOSGuide && (
        <InstallInstructionsModal onClose={() => setShowIOSGuide(false)} isIOS={isIOS} />
      )}
      <LicenseUnlockModal
        isOpen={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
      />
    </>
  );
};

interface InstallInstructionsModalProps {
  onClose: () => void;
  isIOS: boolean;
}

const InstallInstructionsModal: React.FC<InstallInstructionsModalProps> = ({ onClose, isIOS }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-[24px] bg-[var(--moku-surface)] border border-[var(--moku-outline)] p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--moku-outline)]">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-[var(--moku-primary)]" />
            <h3 className="text-sm font-bold text-[var(--moku-text-primary)]">
              {isIOS ? 'Install on iPhone / iPad' : 'Install MOKU App'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface-secondary)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-3 text-xs text-[var(--moku-text-secondary)]">
            <p className="font-semibold text-[var(--moku-text-primary)]">
              To install MOKU on iOS Safari:
            </p>
            <ol className="space-y-2 list-decimal list-inside bg-[var(--moku-surface-secondary)] p-3 rounded-xl border border-[var(--moku-outline)]">
              <li className="flex items-start space-x-2">
                <span className="font-bold text-[var(--moku-primary)]">1.</span>
                <span>
                  Tap the <strong className="text-[var(--moku-text-primary)] inline-flex items-center gap-1"><Share2 className="w-3 h-3 inline" /> Share</strong> icon in the Safari navigation bar.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-[var(--moku-primary)]">2.</span>
                <span>
                  Scroll down and tap <strong className="text-[var(--moku-text-primary)] inline-flex items-center gap-1"><PlusSquare className="w-3 h-3 inline" /> Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-[var(--moku-primary)]">3.</span>
                <span>
                  Tap <strong className="text-[var(--moku-text-primary)]">Add</strong> in the top-right corner to launch MOKU full screen.
                </span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-[var(--moku-text-secondary)]">
            <p className="font-semibold text-[var(--moku-text-primary)]">
              To install MOKU on Android / Chrome:
            </p>
            <ol className="space-y-2 list-decimal list-inside bg-[var(--moku-surface-secondary)] p-3 rounded-xl border border-[var(--moku-outline)]">
              <li>Open the browser menu (three dots in top-right).</li>
              <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              <li>Confirm install to add MOKU icon to your home launcher.</li>
            </ol>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[var(--moku-primary)] text-[var(--moku-on-primary)] text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity shadow-xs"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
