import React, { useState } from 'react';
import { 
  Calendar, 
  DollarSign, 
  Download, 
  Moon, 
  Sun, 
  ChevronRight, 
  PiggyBank, 
  Info,
  Lock,
  RotateCcw,
  AlertTriangle,
  Check
} from 'lucide-react';
import { Plan, UserProfile, SUPPORTED_CURRENCIES } from '../types';
import { formatCurrency, storage } from '../lib/storage';
import { AppCard } from './ui/AppCard';
import { AppButton } from './ui/AppButton';
import { ScreenHeader } from './ui/ScreenHeader';
import { PinConfirmModal } from './PinConfirmModal';

interface ProfileScreenProps {
  user: UserProfile;
  currency: string;
  onChangeCurrency: (code: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenMonthlyPlan: () => void;
  onOpenSavingsPortfolio: () => void;
  onOpenAuthModal: () => void;
  onOpenExportModal: () => void;
  onOpenPinSetup: () => void;
  plan: Plan | null;
  monthKey: string;
}

export function ProfileScreen({
  user,
  currency,
  onChangeCurrency,
  isDarkMode,
  onToggleDarkMode,
  onOpenMonthlyPlan,
  onOpenSavingsPortfolio,
  onOpenAuthModal,
  onOpenExportModal,
  onOpenPinSetup,
  plan,
  monthKey,
}: ProfileScreenProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPinConfirmModal, setShowPinConfirmModal] = useState(false);

  const pinConfig = storage.getPinConfig();
  const isPinActive = pinConfig.isEnabled && !!pinConfig.pinHash;

  const handleResetData = async () => {
    await storage.resetAllData(false);
    setResetSuccess(true);
    setTimeout(() => {
      setResetSuccess(false);
      setShowResetConfirm(false);
    }, 1500);
  };

  const handleConfirmResetClick = () => {
    if (isPinActive) {
      setShowPinConfirmModal(true);
    } else {
      handleResetData();
    }
  };

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-200">
      {/* Header */}
      <ScreenHeader
        subtitle="MOKU Space &amp; Settings"
        title="Your space."
      />

      {/* User Card */}
      <AppCard padding="md" className="flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[var(--moku-primary-container)] flex items-center justify-center text-[var(--moku-primary)] text-xl font-bold">
            {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'M'}
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--moku-text-primary)]">
              {user.displayName || 'Mindful Spender'}
            </h3>
            <p className="text-xs text-[var(--moku-text-secondary)]">
              {user.email || 'Local Offline Profile'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAuthModal}
          className="px-3 py-1.5 rounded-xl bg-[var(--moku-surface-secondary)] text-xs font-semibold text-[var(--moku-primary)] border border-[var(--moku-outline)] hover:bg-[var(--moku-surface-tertiary)] transition-colors cursor-pointer"
        >
          {user.isAnonymous ? 'Sync / Sign In' : 'Account'}
        </button>
      </AppCard>

      {/* Core Planning & Savings Navigation */}
      <div className="bg-[var(--moku-surface)] border border-[var(--moku-outline)] rounded-[24px] overflow-hidden shadow-2xs divide-y divide-[var(--moku-outline)]">
        <button
          type="button"
          onClick={onOpenMonthlyPlan}
          className="w-full p-4.5 flex items-center justify-between hover:bg-[var(--moku-surface-secondary)] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--moku-primary-container)] flex items-center justify-center text-[var(--moku-primary)]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--moku-text-primary)]">
                Monthly Plan &amp; Budget
              </div>
              <div className="text-xs text-[var(--moku-text-secondary)]">
                {plan ? `Target Savings: ${formatCurrency(plan.savingsTarget, currency)}` : 'Set up your income & savings target'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--moku-text-secondary)]" />
        </button>

        <button
          type="button"
          onClick={onOpenSavingsPortfolio}
          className="w-full p-4.5 flex items-center justify-between hover:bg-[var(--moku-surface-secondary)] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--moku-primary-container)] flex items-center justify-center text-[var(--moku-primary)]">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--moku-text-primary)]">
                Savings &amp; Investment Log
              </div>
              <div className="text-xs text-[var(--moku-text-secondary)]">
                Mutual funds, Fixed Deposits, Emergency fund
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--moku-text-secondary)]" />
        </button>
      </div>

      {/* Preferences Section */}
      <div className="bg-[var(--moku-surface)] border border-[var(--moku-outline)] rounded-[24px] overflow-hidden shadow-2xs divide-y divide-[var(--moku-outline)]">
        {/* Currency Switcher */}
        <div className="p-4.5 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--moku-surface-secondary)] flex items-center justify-center text-[var(--moku-primary)]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--moku-text-primary)]">
                Currency
              </div>
              <div className="text-xs text-[var(--moku-text-secondary)]">
                Currently: {currency}
              </div>
            </div>
          </div>

          <select
            value={currency}
            onChange={(e) => onChangeCurrency(e.target.value)}
            className="text-xs font-bold py-1.5 px-3 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] outline-none cursor-pointer"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="w-full p-4.5 flex items-center justify-between hover:bg-[var(--moku-surface-secondary)] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--moku-surface-secondary)] flex items-center justify-center text-[var(--moku-primary)]">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--moku-text-primary)]">
                Appearance
              </div>
              <div className="text-xs text-[var(--moku-text-secondary)]">
                {isDarkMode ? 'Dark theme' : 'Light calm theme'}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-[var(--moku-primary)]">
            {isDarkMode ? 'Dark' : 'Light'}
          </span>
        </button>

        {/* PIN Security & Lock Settings */}
        <button
          id="pin-security-profile-btn"
          type="button"
          onClick={onOpenPinSetup}
          className="w-full p-4.5 flex items-center justify-between hover:bg-[var(--moku-surface-secondary)] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--moku-surface-secondary)] flex items-center justify-center text-[var(--moku-primary)]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--moku-text-primary)]">
                PIN Security &amp; Authorization
              </div>
              <div className="text-xs text-[var(--moku-text-secondary)]">
                {isPinActive ? 'PIN protection active · Tap to manage or change' : 'Set up 4-digit PIN to lock ledger'}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
              isPinActive 
                ? 'bg-[var(--moku-primary-container)] text-[var(--moku-primary)]' 
                : 'bg-[var(--moku-surface-secondary)] text-[var(--moku-text-secondary)]'
            }`}>
              {isPinActive ? 'Active' : 'Off'}
            </span>
            <ChevronRight className="w-4 h-4 text-[var(--moku-text-secondary)]" />
          </div>
        </button>

        {/* Data Export & Backup */}
        <button
          type="button"
          onClick={onOpenExportModal}
          className="w-full p-4.5 flex items-center justify-between hover:bg-[var(--moku-surface-secondary)] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--moku-surface-secondary)] flex items-center justify-center text-[var(--moku-primary)]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--moku-text-primary)]">
                Export Data &amp; Backup
              </div>
              <div className="text-xs text-[var(--moku-text-secondary)]">
                CSV, JSON, and print-ready format
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--moku-text-secondary)]" />
        </button>
      </div>

      {/* Clean Slate: Reset All Entries */}
      <AppCard padding="md" className="space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--moku-danger-container)] flex items-center justify-center text-[var(--moku-danger)]">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--moku-text-primary)]">
              Reset All Entries (Clean Slate)
            </h4>
            <p className="text-xs text-[var(--moku-text-secondary)]">
              Clear all records, expenses, and inbox items at once
            </p>
          </div>
        </div>

        {!showResetConfirm ? (
          <button
            id="profile-trigger-reset-all-btn"
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-2.5 px-3 rounded-xl border border-[var(--moku-danger)]/30 text-[var(--moku-danger)] hover:bg-[var(--moku-danger-container)] text-xs font-bold transition-colors cursor-pointer"
          >
            Reset All Data at Once
          </button>
        ) : (
          <div className="p-3.5 rounded-xl bg-[var(--moku-danger-container)] border border-[var(--moku-danger)]/40 space-y-2.5">
            <div className="flex items-start space-x-2 text-xs text-[var(--moku-danger)]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="font-semibold leading-tight">
                Are you sure? This will wipe all recorded transactions and reset to an empty clean ledger.
              </p>
            </div>
            {resetSuccess ? (
              <div className="text-xs font-bold text-[var(--moku-primary)] flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>All entries wiped clean!</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  id="profile-confirm-reset-all-btn"
                  type="button"
                  onClick={handleConfirmResetClick}
                  className="flex-1 py-2 rounded-lg bg-[var(--moku-danger)] text-white text-xs font-bold cursor-pointer hover:opacity-90 flex items-center justify-center space-x-1.5"
                >
                  {isPinActive && <Lock className="w-3.5 h-3.5" />}
                  <span>{isPinActive ? 'Confirm with PIN' : 'Confirm Reset'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-2 rounded-lg bg-[var(--moku-surface)] border border-[var(--moku-outline)] text-xs font-semibold text-[var(--moku-text-secondary)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </AppCard>

      {/* PIN Confirmation Modal for Reset */}
      <PinConfirmModal
        isOpen={showPinConfirmModal}
        onClose={() => setShowPinConfirmModal(false)}
        onConfirm={handleResetData}
        title="Authorize Ledger Reset"
        description="Enter your 4-digit PIN to authorize wiping all data and resetting your financial records."
      />

      {/* Philosophy Card */}
      <div className="p-4 bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/20 rounded-[22px] space-y-1">
        <div className="flex items-center space-x-2 text-xs font-bold text-[var(--moku-primary)]">
          <Info className="w-4 h-4 shrink-0" />
          <span>About MOKU 2.0</span>
        </div>
        <p className="text-xs text-[var(--moku-text-secondary)] leading-relaxed">
          Based on traditional Japanese Kakeibo mindfulness principles, reimagined as a modern calm Android financial companion. Automate the data entry, keep the conscious decision.
        </p>
      </div>
    </div>
  );
}
