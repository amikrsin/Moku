import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, X, Check } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';

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
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--moku-primary)] text-white text-xs font-bold shadow-2xs hover:opacity-90 transition-all cursor-pointer ${className}`}
          title="Install MOKU to your home screen"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
        </button>

        {showIOSGuide && (
          <InstallInstructionsModal onClose={() => setShowIOSGuide(false)} isIOS={isIOS} />
        )}
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
            <div className="w-10 h-10 rounded-xl bg-[var(--moku-primary-container)] flex items-center justify-center text-[var(--moku-primary)]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--moku-text-primary)]">
                Install MOKU (PWA)
              </div>
              <div className="text-xs text-[var(--moku-text-secondary)]">
                Add to your home screen for offline use and fast launch
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-[var(--moku-primary)] text-white text-xs font-bold">
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </div>
        </button>

        {showIOSGuide && (
          <InstallInstructionsModal onClose={() => setShowIOSGuide(false)} isIOS={isIOS} />
        )}
      </>
    );
  }

  // Banner variant (suitable for Home dashboard or notice)
  return (
    <>
      <div className={`p-4 rounded-2xl bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/30 flex items-center justify-between shadow-2xs ${className}`}>
        <div className="flex items-center space-x-3 pr-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--moku-primary)] text-white flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-[var(--moku-primary)] block">
              Install MOKU on your device
            </span>
            <p className="text-[11px] text-[var(--moku-text-secondary)] leading-tight">
              Enjoy offline access, full-screen view, and lightning-fast entries.
            </p>
          </div>
        </div>
        <button
          id="pwa-install-banner-btn"
          type="button"
          onClick={handleInstallClick}
          className="px-3.5 py-2 rounded-xl bg-[var(--moku-primary)] text-white text-xs font-bold shrink-0 hover:opacity-90 transition-opacity cursor-pointer shadow-xs flex items-center space-x-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
      </div>

      {showIOSGuide && (
        <InstallInstructionsModal onClose={() => setShowIOSGuide(false)} isIOS={isIOS} />
      )}
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
          className="w-full py-2.5 rounded-xl bg-[var(--moku-primary)] text-white text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity shadow-xs"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
