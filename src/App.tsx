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
  const [isPinSetupOpen, setIsPinSetupOpen] = useState<boolean>(false);
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
    return () => unsubscribe();
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

  const handleSaveSavings = useCallback((newSavings: SavingsEntry) => {
    storage.saveSavingsEntry(newSavings);
    setAppState(storage.getLocalState());
  }, []);

  const handleConfirmInboxItem = useCallback((
    id: string, 
    category: Category, 
    note?: string,
    sectorId?: string,
    sectorName?: string
  ) => {
    storage.confirmInboxTransaction(id, category, note, sectorId, sectorName);
    setInboxItems(storage.getInboxTransactions());
    setAppState(storage.getLocalState());
  }, []);

  const handleDismissInboxItem = useCallback((id: string) => {
    storage.dismissInboxTransaction(id);
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
    } else {
      const defaultPlan: Plan = {
        monthKey: selectedMonth,
        income: 50000,
        savingsTarget: 10000,
        totalExpenses: 40000,
        improvementNotes: '',
        categoryBudgets: {
          survival: 20000,
          optional: 10000,
          culture: 5000,
          extra: 5000,
        },
        currency: activeCurrency,
        reflection: reflectionText,
        updatedAt: Date.now(),
      };
      storage.savePlan(defaultPlan);
    }
    setAppState(storage.getLocalState());
  }, [appState.plans, selectedMonth, activeCurrency]);

  const currentPlan = appState.plans.find((p) => p.monthKey === selectedMonth) || null;
  const pendingInboxCount = inboxItems.filter((i) => i.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#E8ECE8] dark:bg-[#0E100E] text-[#1A1C1A] dark:text-[#E3E5E1] flex justify-center selection:bg-[#176B52]/20 sm:py-6">
      <OfflineIndicator />
      {/* Android Device Canvas */}
      <main className="w-full max-w-md min-h-screen sm:min-h-[860px] bg-[#F7F8F7] dark:bg-[#121412] relative overflow-x-hidden sm:rounded-[36px] sm:shadow-[0_25px_80px_rgba(0,0,0,0.18)] flex flex-col justify-between border border-[#DDE2DD]/50 dark:border-[#343B35]">
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
            />
          )}

          {currentTab === 'inbox' && (
            <InboxScreen
              inboxItems={inboxItems}
              onConfirmItem={handleConfirmInboxItem}
              onDismissItem={handleDismissInboxItem}
              onAddIncomingItem={handleAddIncomingItem}
              currency={activeCurrency}
              currentPlan={currentPlan}
            />
          )}

          {currentTab === 'review' && (
            <ReviewScreen
              monthKey={selectedMonth}
              plan={currentPlan}
              expenses={appState.expenses}
              onSaveReflection={handleSaveReflection}
              currency={activeCurrency}
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
              onOpenExportModal={() => setIsExportOpen(true)}
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
      />

      {/* Monthly Planning Flow Sheet */}
      <MonthlyPlanSheet
        isOpen={isPlanSheetOpen}
        onClose={() => setIsPlanSheetOpen(false)}
        monthKey={selectedMonth}
        existingPlan={currentPlan}
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
      />

      {/* PIN Setup & Management Modal */}
      <PinSetupModal
        isOpen={isPinSetupOpen}
        onClose={() => setIsPinSetupOpen(false)}
      />

      {/* Fullscreen PIN Lock Protection */}
      {isLocked && (
        <PinLockScreen onUnlocked={() => setIsLocked(false)} />
      )}
    </div>
  );
}
