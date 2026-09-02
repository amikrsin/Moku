import React from 'react';
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
  Info
} from 'lucide-react';
import { Plan, UserProfile, SUPPORTED_CURRENCIES } from '../types';
import { formatCurrency } from '../lib/storage';

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
  plan,
  monthKey,
}: ProfileScreenProps) {
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
