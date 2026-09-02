import React, { useState } from 'react';
import { 
  Calendar, 
  DollarSign, 
  Cloud, 
  Download, 
  Shield, 
  Moon, 
  Sun, 
  ChevronRight, 
  PiggyBank, 
  Layers, 
  UserCircle2,
  Info,
  Lock,
  RotateCcw,
  AlertTriangle,
  Check
} from 'lucide-react';
import { Plan, UserProfile, SUPPORTED_CURRENCIES } from '../types';
import { formatCurrency, storage } from '../lib/storage';

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

  const pinConfig = storage.getPinConfig();
  const isPinActive = pinConfig.isEnabled && !!pinConfig.pinHash;

  const handleResetData = () => {
    storage.resetAllData(true);
    setResetSuccess(true);
    setTimeout(() => {
      setResetSuccess(false);
      setShowResetConfirm(false);
    }, 1500);
  };
  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pt-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E736F] dark:text-[#C1C7C0]">
          MOKU Account & Space
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1C1A] dark:text-[#E3E5E1] mt-0.5">
          Your space.
        </h1>
      </div>

      {/* User Card */}
      <div className="bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] rounded-[24px] p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#D8F3E7] dark:bg-[#214C3D] flex items-center justify-center text-[#176B52] dark:text-[#82D9B4] text-xl font-bold">
            {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'M'}
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
              {user.displayName || 'Mindful Spender'}
            </h3>
            <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">
              {user.email || 'Local Offline Profile'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAuthModal}
          className="px-3 py-1.5 rounded-xl bg-[#EEF1EE] dark:bg-[#252925] text-xs font-semibold text-[#176B52] dark:text-[#82D9B4] border border-[#DDE2DD] dark:border-[#414842] hover:bg-[#DDE2DD] transition-colors cursor-pointer"
        >
          {user.isAnonymous ? 'Sync / Sign In' : 'Account'}
        </button>
      </div>

      {/* Core Planning & Savings Navigation */}
      <div className="bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] rounded-[24px] overflow-hidden shadow-xs divide-y divide-[#DDE2DD] dark:divide-[#414842]">
        <button
          type="button"
          onClick={onOpenMonthlyPlan}
          className="w-full p-4.5 flex items-center justify-between hover:bg-[#F7F8F7] dark:hover:bg-[#252925] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EEF1EE] dark:bg-[#252925] flex items-center justify-center text-[#176B52] dark:text-[#82D9B4]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                Monthly Plan & Budget
              </div>
              <div className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">
                {plan ? `Target Savings: ${formatCurrency(plan.savingsTarget, currency)}` : 'Set up your income & savings target'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#6E736F]" />
        </button>

        <button
          type="button"
          onClick={onOpenSavingsPortfolio}
          className="w-full p-4.5 flex items-center justify-between hover:bg-[#F7F8F7] dark:hover:bg-[#252925] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EEF1EE] dark:bg-[#252925] flex items-center justify-center text-[#B5652E]">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                Savings & Investment Log
              </div>
              <div className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">
                Mutual funds, Fixed Deposits, Emergency fund
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#6E736F]" />
        </button>
      </div>

      {/* Preferences Section */}
      <div className="bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] rounded-[24px] overflow-hidden shadow-xs divide-y divide-[#DDE2DD] dark:divide-[#414842]">
        {/* Currency Switcher */}
        <div className="p-4.5 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EEF1EE] dark:bg-[#252925] flex items-center justify-center text-[#176B52] dark:text-[#82D9B4]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                Currency
              </div>
              <div className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">
                Currently: {currency}
              </div>
            </div>
          </div>

          <select
            value={currency}
            onChange={(e) => onChangeCurrency(e.target.value)}
            className="text-xs font-bold py-1.5 px-3 rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none cursor-pointer"
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
          className="w-full p-4.5 flex items-center justify-between hover:bg-[#F7F8F7] dark:hover:bg-[#252925] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EEF1EE] dark:bg-[#252925] flex items-center justify-center text-[#35415C]">
              {isDarkMode ? <Sun className="w-5 h-5 text-[#82D9B4]" /> : <Moon className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                Appearance
              </div>
              <div className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">
                {isDarkMode ? 'Dark theme' : 'Light calm theme'}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#176B52] dark:text-[#82D9B4]">
            {isDarkMode ? 'Dark' : 'Light'}
          </span>
        </button>

        {/* PIN Security & Lock Settings */}
        <button
          id="pin-security-profile-btn"
          type="button"
          onClick={onOpenPinSetup}
          className="w-full p-4.5 flex items-center justify-between hover:bg-[#F7F8F7] dark:hover:bg-[#252925] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EEF1EE] dark:bg-[#252925] flex items-center justify-center text-[#176B52] dark:text-[#82D9B4]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                PIN Security & Authorization
              </div>
              <div className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">
                {isPinActive ? 'PIN protection active · Tap to manage or change' : 'Set up 4-digit PIN to lock ledger'}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
              isPinActive 
                ? 'bg-[#D8F3E7] dark:bg-[#214C3D] text-[#176B52] dark:text-[#82D9B4]' 
                : 'bg-[#EEF1EE] dark:bg-[#252925] text-[#6E736F] dark:text-[#C1C7C0]'
            }`}>
              {isPinActive ? 'Active' : 'Off'}
            </span>
            <ChevronRight className="w-4 h-4 text-[#6E736F]" />
          </div>
        </button>

        {/* Data Export & Backup */}
        <button
          type="button"
          onClick={onOpenExportModal}
          className="w-full p-4.5 flex items-center justify-between hover:bg-[#F7F8F7] dark:hover:bg-[#252925] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EEF1EE] dark:bg-[#252925] flex items-center justify-center text-[#A8342A]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                Export Data & Backup
              </div>
              <div className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">
                CSV, JSON, and print-ready format
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#6E736F]" />
        </button>
      </div>

      {/* Danger Zone: Reset All Entries */}
      <div className="bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] rounded-[24px] p-4.5 shadow-xs space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#FCE8E6] dark:bg-[#3D1E1E] flex items-center justify-center text-[#BA1A1A] dark:text-[#FF897D]">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
              Reset All Entries (Clean Slate)
            </h4>
            <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">
              Clear all demo records, expenses, and inbox items at once
            </p>
          </div>
        </div>

        {!showResetConfirm ? (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-2.5 px-3 rounded-xl border border-[#BA1A1A]/30 text-[#BA1A1A] dark:text-[#FF897D] hover:bg-[#FCE8E6] dark:hover:bg-[#3D1E1E] text-xs font-bold transition-colors cursor-pointer"
          >
            Reset All Data at Once
          </button>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#FCE8E6] dark:bg-[#3D1E1E] border border-[#BA1A1A]/40 space-y-2.5">
            <div className="flex items-start space-x-2 text-xs text-[#BA1A1A] dark:text-[#FF897D]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="font-semibold leading-tight">
                Are you sure? This will wipe all recorded transactions and reset to an empty clean ledger.
              </p>
            </div>
            {resetSuccess ? (
              <div className="text-xs font-bold text-[#176B52] dark:text-[#82D9B4] flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>All entries wiped clean!</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetData}
                  className="flex-1 py-2 rounded-lg bg-[#BA1A1A] text-white text-xs font-bold cursor-pointer hover:bg-[#931515]"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-[#252925] border border-[#565248]/20 text-xs font-semibold text-[#565248] dark:text-[#C1C7C0] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Philosophy Card */}
      <div className="p-4 bg-[#D8F3E7]/50 dark:bg-[#214C3D]/40 border border-[#176B52]/15 dark:border-[#82D9B4]/20 rounded-[22px] space-y-1">
        <div className="flex items-center space-x-2 text-xs font-bold text-[#176B52] dark:text-[#82D9B4]">
          <Info className="w-4 h-4 shrink-0" />
          <span>About MOKU 2.0</span>
        </div>
        <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0] leading-relaxed">
          Based on traditional Japanese Kakeibo mindfulness principles, reimagined as a modern calm Android financial companion. Automate the data entry, keep the conscious decision.
        </p>
      </div>
    </div>
  );
}
