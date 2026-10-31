/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  AppState, 
  Expense, 
  InboxTransaction, 
  Plan, 
  SavingsEntry, 
  UserProfile,
  Category 
} from './types';
import { 
  storage, 
  getCurrentMonthKey,
  getGlobalCurrency,
  setGlobalCurrency
} from './lib/storage';
import { parseBulkSms } from './lib/smsParser';
import { BottomNavigation, MainTab } from './components/BottomNavigation';
import { HomeScreen } from './components/HomeScreen';
import { InboxScreen } from './components/InboxScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { QuickAddSheet } from './components/QuickAddSheet';
import { MonthlyPlanSheet } from './components/MonthlyPlanSheet';
import { SavingsModal } from './components/SavingsModal';
import { AuthModal } from './components/AuthModal';
import { ExportModal } from './components/ExportModal';
import { PinSetupModal } from './components/PinSetupModal';
import { PinLockScreen } from './components/PinLockScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LicenseUnlockModal } from './components/LicenseUnlockModal';
import { checkUrlForLicenseParams, getLicenseState, subscribeLicense } from './lib/license';
import { Lock, KeyRound } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<MainTab>('home');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [appState, setAppState] = useState<AppState>(() => storage.getLocalState());
  const [inboxItems, setInboxItems] = useState<InboxTransaction[]>(() => storage.getInboxTransactions());
  const [user, setUser] = useState<UserProfile>(() => storage.getUser());
  const [isLocked, setIsLocked] = useState<boolean>(() => storage.isAppLocked());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('moku_theme') === 'dark';
    }
    return false;
  });

  // Modals & Bottom Sheets
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState<boolean>(false);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [exportModalTab, setExportModalTab] = useState<'export' | 'restore'>('export');
  const [isPinSetupOpen, setIsPinSetupOpen] = useState<boolean>(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);
  const [licenseState, setLicenseState] = useState(() => getLicenseState());
  const [activeCurrency, setActiveCurrency] = useState<string>(() => getGlobalCurrency());

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('moku_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('moku_theme', 'light');
    }
  }, [isDarkMode]);

  // Subscribe to storage updates
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setAppState(storage.getLocalState());
      setInboxItems(storage.getInboxTransactions());
      setUser(storage.getUser());
      setIsLocked(storage.isAppLocked());
    });

    storage.triggerSync();

    // Check for first-time user onboarding:
    // When a user opens the app for the first time, automatically launch Monthly Plan & Budget
    const hasSeenOnboarding = localStorage.getItem('moku_onboarding_shown_v1');
    if (!hasSeenOnboarding) {
      localStorage.setItem('moku_onboarding_shown_v1', 'true');
      setIsPlanSheetOpen(true);
    }

    const unsubLicense = subscribeLicense(() => {
      setLicenseState(getLicenseState());
    });

    // Check for URL license activation (?unlock=MOKU-PRO-2026) or forced demo (?demo=true)
    checkUrlForLicenseParams();
    setLicenseState(getLicenseState());

    // Check for incoming SMS / Automation URL parameter (?sms=... or ?text=...)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const incomingSms = params.get('sms') || params.get('text');
      if (incomingSms && incomingSms.trim()) {
        const parsedList = parseBulkSms(incomingSms);
        if (parsedList.length > 0) {
          parsedList.forEach((parsed) => {
            storage.addInboxTransaction({
              merchant: parsed.merchant,
              amount: parsed.amount,
              type: parsed.type,
              source: 'Mobile SMS Shortcut',
              suggestedCategory: parsed.type === 'expense' ? parsed.suggestedCategory : undefined,
            });
          });
          setInboxItems(storage.getInboxTransactions());
          setCurrentTab('inbox');
        }
        // Clean URL query parameter without reloading
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    return () => {
      unsubscribe();
      unsubLicense();
    };
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const handleChangeCurrency = useCallback((newCurrency: string) => {
    setActiveCurrency(newCurrency);
    setGlobalCurrency(newCurrency);

    const { plans, expenses, savingsEntries } = storage.getLocalState();
    const updatedPlans = plans.map((p) => ({ ...p, currency: newCurrency }));
    localStorage.setItem('kakeibo_plans_v1', JSON.stringify(updatedPlans));
    setAppState({ plans: updatedPlans, expenses, savingsEntries });
  }, []);

  const handleSavePlan = useCallback((newPlan: Plan) => {
    const planWithCurrency = { ...newPlan, currency: activeCurrency };
    storage.savePlan(planWithCurrency);
    setAppState(storage.getLocalState());
  }, [activeCurrency]);

  const handleSaveExpense = useCallback((newExpense: Expense) => {
    storage.saveExpense(newExpense);
    setAppState(storage.getLocalState());
  }, []);

  const handleDeleteExpense = useCallback((id: string) => {
    storage.softDeleteExpense(id);
    setAppState(storage.getLocalState());
  }, []);

  const handleSaveSavings = useCallback((newSavings: SavingsEntry) => {
    storage.saveSavingsEntry(newSavings);
    setAppState(storage.getLocalState());
  }, []);

  const handleConfirmInboxItem = useCallback((
    id: string, 
    category: Category, 
    note?: string,
    sectorId?: string,
    sectorName?: string,
    amountOverride?: number
  ) => {
    storage.confirmInboxTransaction(id, category, note, sectorId, sectorName, selectedMonth, amountOverride);
    setInboxItems(storage.getInboxTransactions());
    setAppState(storage.getLocalState());
  }, [selectedMonth]);

  const handleConfirmInboxIncome = useCallback((
    id: string,
    creditType: 'income' | 'otherIncome' = 'income',
    note?: string
  ) => {
    storage.confirmInboxIncome(id, selectedMonth, creditType, note);
    setInboxItems(storage.getInboxTransactions());
    setAppState(storage.getLocalState());
  }, [selectedMonth]);

  const handleDismissInboxItem = useCallback((id: string) => {
    storage.dismissInboxTransaction(id);
    setInboxItems(storage.getInboxTransactions());
  }, []);

  const handleRestoreInboxItem = useCallback((id: string) => {
    storage.restoreInboxTransaction(id);
    setInboxItems(storage.getInboxTransactions());
  }, []);

  const handleDeleteInboxItem = useCallback((id: string) => {
    storage.deleteInboxTransaction(id);
    setInboxItems(storage.getInboxTransactions());
  }, []);

  const handleClearReviewedInbox = useCallback(() => {
    storage.clearReviewedInboxTransactions();
    setInboxItems(storage.getInboxTransactions());
  }, []);

  const handleResetSampleInbox = useCallback(() => {
    storage.resetSampleInboxTransactions();
    setInboxItems(storage.getInboxTransactions());
  }, []);

  const handleAddIncomingItem = useCallback((item: Omit<InboxTransaction, 'id' | 'timestamp' | 'status'>) => {
    storage.addInboxTransaction(item);
    setInboxItems(storage.getInboxTransactions());
  }, []);

  const handleSaveReflection = useCallback((reflectionText: string) => {
    const current = appState.plans.find((p) => p.monthKey === selectedMonth);
    if (current) {
      storage.savePlan({ ...current, reflection: reflectionText, updatedAt: Date.now() });
      setAppState(storage.getLocalState());
    } else {
      // Never fabricate synthetic budget data. Prompt user to initialize plan first.
      setIsPlanSheetOpen(true);
    }
  }, [appState.plans, selectedMonth]);

  const currentPlan = appState.plans.find((p) => p.monthKey === selectedMonth) || null;
  const pendingInboxCount = inboxItems.filter((i) => i.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#E4EAE5] dark:bg-[#080B09] text-[var(--moku-text-primary)] flex justify-center selection:bg-[var(--moku-primary)]/20 sm:py-6 transition-colors duration-200">
      <OfflineIndicator />
      {/* Android Device Canvas */}
      <main className="w-full max-w-md min-h-screen sm:min-h-[860px] bg-[var(--moku-background)] text-[var(--moku-text-primary)] relative overflow-x-hidden sm:rounded-[36px] sm:shadow-[0_25px_80px_rgba(0,0,0,0.28)] flex flex-col justify-between border border-[var(--moku-outline)]">
        {/* Interactive Demo Mode Top Bar (When Unlicensed) */}
        {!licenseState.isLicensed && (
          <div className="bg-amber-50 dark:bg-[#1C1607] border-b border-amber-200 dark:border-amber-500/40 px-3.5 sm:px-4 py-2.5 flex items-center justify-between text-xs transition-colors shadow-xs">
            <div className="flex items-center space-x-2 text-amber-950 dark:text-[#FFF8E7]">
              <div className="w-5 h-5 rounded-md bg-amber-200/90 dark:bg-amber-500/30 flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-400/30">
                <Lock className="w-3 h-3 text-amber-800 dark:text-[#FCD34D]" />
              </div>
              <span className="text-[12px] font-bold text-amber-950 dark:text-[#FFFDF5] tracking-tight">
                Demo Mode · App Download Locked
              </span>
            </div>
            <button
              id="top-demo-unlock-btn"
              type="button"
              onClick={() => setIsLicenseModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-[#F59E0B] dark:hover:bg-[#FBBF24] text-white dark:text-[#181002] text-[11px] font-extrabold flex items-center space-x-1.5 cursor-pointer transition-colors shrink-0 shadow-xs"
            >
              <KeyRound className="w-3 h-3 text-white dark:text-[#181002]" />
              <span>Unlock Full App</span>
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="px-5 pt-4 pb-28 flex-1">
          {currentTab === 'home' && (
            <HomeScreen
              monthKey={selectedMonth}
              onChangeMonth={setSelectedMonth}
              plan={currentPlan}
              expenses={appState.expenses}
              savingsEntries={appState.savingsEntries || []}
              allPlans={appState.plans}
              user={user}
              currency={activeCurrency}
              isDarkMode={isDarkMode}
              onToggleDarkMode={toggleDarkMode}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              onOpenInbox={() => setCurrentTab('inbox')}
              onOpenPlanSetup={() => setIsPlanSheetOpen(true)}
              onOpenSavingsModal={() => setIsSavingsModalOpen(true)}
              inboxPendingCount={pendingInboxCount}
              onDeleteExpense={handleDeleteExpense}
              onOpenReview={() => setCurrentTab('review')}
            />
          )}

          {currentTab === 'inbox' && (
            <InboxScreen
              inboxItems={inboxItems}
              onConfirmItem={handleConfirmInboxItem}
              onConfirmIncome={handleConfirmInboxIncome}
              onDismissItem={handleDismissInboxItem}
              onRestoreItem={handleRestoreInboxItem}
              onDeleteItem={handleDeleteInboxItem}
              onClearReviewed={handleClearReviewedInbox}
              onResetSampleItems={handleResetSampleInbox}
              onAddIncomingItem={handleAddIncomingItem}
              currency={activeCurrency}
              monthKey={selectedMonth}
              currentPlan={currentPlan}
            />
          )}

          {currentTab === 'review' && (
            <ReviewScreen
              monthKey={selectedMonth}
              plan={currentPlan}
              expenses={appState.expenses}
              savingsEntries={appState.savingsEntries || []}
              onSaveReflection={handleSaveReflection}
              currency={activeCurrency}
              onOpenPlanSetup={() => setIsPlanSheetOpen(true)}
              allPlans={appState.plans}
              onSelectMonth={setSelectedMonth}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileScreen
              user={user}
              currency={activeCurrency}
              onChangeCurrency={handleChangeCurrency}
              isDarkMode={isDarkMode}
              onToggleDarkMode={toggleDarkMode}
              onOpenMonthlyPlan={() => setIsPlanSheetOpen(true)}
              onOpenSavingsPortfolio={() => setIsSavingsModalOpen(true)}
              onOpenAuthModal={() => setIsAuthOpen(true)}
              onOpenExportModal={(tab?: 'export' | 'restore') => {
                setExportModalTab(tab || 'export');
                setIsExportOpen(true);
              }}
              onOpenPinSetup={() => setIsPinSetupOpen(true)}
              plan={currentPlan}
              monthKey={selectedMonth}
            />
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenQuickAdd={() => setIsQuickAddOpen(prev => !prev)}
          inboxCount={pendingInboxCount}
          isQuickAddOpen={isQuickAddOpen}
        />
      </main>

      {/* Quick Add Expense Bottom Sheet */}
      <QuickAddSheet
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSaveExpense={handleSaveExpense}
        currency={activeCurrency}
        monthKey={selectedMonth}
        currentPlan={currentPlan}
        recentExpenses={appState.expenses}
      />

      {/* Monthly Planning Flow Sheet */}
      <MonthlyPlanSheet
        isOpen={isPlanSheetOpen}
        onClose={() => setIsPlanSheetOpen(false)}
        monthKey={selectedMonth}
        existingPlan={currentPlan}
        allPlans={appState.plans}
        onSavePlan={handleSavePlan}
        currency={activeCurrency}
      />

      {/* Savings Deposit Modal */}
      <SavingsModal
        isOpen={isSavingsModalOpen}
        onClose={() => setIsSavingsModalOpen(false)}
        onSaveSavings={handleSaveSavings}
        currency={activeCurrency}
        selectedMonth={selectedMonth}
      />

      {/* Cloud Sync & Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        user={user}
        currency={activeCurrency}
        onOpenPinSetup={() => setIsPinSetupOpen(true)}
        onUserChanged={(updated) => {
          setUser(updated);
          storage.setUser(updated);
        }}
      />

      {/* Export & Data Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        monthKey={selectedMonth}
        plans={appState.plans}
        expenses={appState.expenses}
        currency={activeCurrency}
        initialTab={exportModalTab}
      />

      {/* PIN Setup & Management Modal */}
      <PinSetupModal
        isOpen={isPinSetupOpen}
        onClose={() => setIsPinSetupOpen(false)}
      />

      {/* License Key & Demo Unlock Modal */}
      <LicenseUnlockModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
      />

      {/* Fullscreen PIN Lock Protection */}
      {isLocked && (
        <PinLockScreen onUnlocked={() => setIsLocked(false)} />
      )}
    </div>
  );
}
