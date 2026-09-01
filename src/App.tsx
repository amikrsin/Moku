/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  AppState, 
  Expense, 
  Plan, 
  SavingsEntry, 
  UserProfile 
} from './types';
import { 
  storage, 
  getCurrentMonthKey,
  getGlobalCurrency,
  setGlobalCurrency
} from './lib/storage';
import { 
  NotebookLayout, 
  NavTab 
} from './components/NotebookLayout';
import { DashboardView } from './components/DashboardView';
import { RecordExpenseView } from './components/RecordExpenseView';
import { LedgerView } from './components/LedgerView';
import { ReviewView } from './components/ReviewView';
import { MonthlySetupView } from './components/MonthlySetupView';
import { AuthModal } from './components/AuthModal';
import { ExportModal } from './components/ExportModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [appState, setAppState] = useState<AppState>(() => storage.getLocalState());
  const [user, setUser] = useState<UserProfile>(() => storage.getUser());
  const [isOnline, setIsOnline] = useState<boolean>(storage.getOnlineStatus());
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [recentlyAddedExpenseId, setRecentlyAddedExpenseId] = useState<string | null>(null);
  const [activeCurrency, setActiveCurrency] = useState<string>(() => getGlobalCurrency());
  const [copySourcePlan, setCopySourcePlan] = useState<Plan | null>(null);

  // Subscribe to storage changes & online status
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setAppState(storage.getLocalState());
      setUser(storage.getUser());
      setIsOnline(storage.getOnlineStatus());
    });

    // Run initial background sync
    storage.triggerSync();

    return () => {
      unsubscribe();
    };
  }, []);

  // Find plan for currently selected month
  const rawPlan = appState.plans.find((p) => p.monthKey === selectedMonth) || null;
  const currentPlan = rawPlan ? { ...rawPlan, currency: activeCurrency } : null;

  const handleChangeCurrency = useCallback((newCurrency: string) => {
    setActiveCurrency(newCurrency);
    setGlobalCurrency(newCurrency);

    // Update existing plans in storage to the new currency
    const { plans, expenses, savingsEntries } = storage.getLocalState();
    const updatedPlans = plans.map(p => ({ ...p, currency: newCurrency }));
    localStorage.setItem('kakeibo_plans_v1', JSON.stringify(updatedPlans));
    setAppState({ plans: updatedPlans, expenses, savingsEntries });
  }, []);

  // Auto-switch to setup if user lands on dashboard for a month with no plan and clicks start
  const handleSavePlan = useCallback((newPlan: Plan) => {
    const planWithCurrency = { ...newPlan, currency: activeCurrency };
    storage.savePlan(planWithCurrency);
    setAppState(storage.getLocalState());
    setCurrentTab('dashboard');
  }, [activeCurrency]);

  const handleSaveExpense = useCallback((newExpense: Expense) => {
    storage.saveExpense(newExpense);
    setAppState(storage.getLocalState());
    setRecentlyAddedExpenseId(newExpense.id);
  }, []);

  const handleDeleteExpense = useCallback((id: string) => {
    storage.softDeleteExpense(id);
    setAppState(storage.getLocalState());
  }, []);

  const handleRestoreExpense = useCallback((id: string) => {
    storage.restoreExpense(id);
    setAppState(storage.getLocalState());
  }, []);

  const handleSaveSavings = useCallback((newSavings: SavingsEntry) => {
    storage.saveSavingsEntry(newSavings);
    setAppState(storage.getLocalState());
  }, []);

  const handleDeleteSavings = useCallback((id: string) => {
    storage.softDeleteSavingsEntry(id);
    setAppState(storage.getLocalState());
  }, []);

  return (
    <NotebookLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      selectedMonth={selectedMonth}
      onChangeMonth={setSelectedMonth}
      user={user}
      onOpenAuth={() => setIsAuthOpen(true)}
      onOpenExport={() => setIsExportOpen(true)}
      isOnline={isOnline}
      currency={activeCurrency}
      onChangeCurrency={handleChangeCurrency}
    >
      {/* View Switcher */}
      {currentTab === 'dashboard' && (
        <DashboardView
          monthKey={selectedMonth}
          plan={currentPlan}
          expenses={appState.expenses}
          savingsEntries={appState.savingsEntries || []}
          allPlans={appState.plans}
          onSaveExpense={handleSaveExpense}
          onSaveSavings={handleSaveSavings}
          onDeleteSavings={handleDeleteSavings}
          onRecordExpense={() => setCurrentTab('record')}
          onOpenLedger={() => setCurrentTab('ledger')}
          onOpenSetup={() => {
            setCopySourcePlan(null);
            setCurrentTab('setup');
          }}
          onOpenSetupWithCopy={(sourcePlan) => {
            setCopySourcePlan(sourcePlan);
            setCurrentTab('setup');
          }}
          onOpenReview={() => setCurrentTab('review')}
          recentlyAddedId={recentlyAddedExpenseId}
        />
      )}

      {currentTab === 'record' && (
        <RecordExpenseView
          monthKey={selectedMonth}
          plan={currentPlan}
          onSaveExpense={handleSaveExpense}
          onBackToDashboard={() => setCurrentTab('dashboard')}
        />
      )}

      {currentTab === 'ledger' && (
        <LedgerView
          monthKey={selectedMonth}
          plan={currentPlan}
          expenses={appState.expenses}
          onDeleteExpense={handleDeleteExpense}
          onRestoreExpense={handleRestoreExpense}
          onRecordExpense={() => setCurrentTab('record')}
        />
      )}

      {currentTab === 'review' && (
        <ReviewView
          monthKey={selectedMonth}
          plan={currentPlan}
          expenses={appState.expenses}
          onSavePlan={handleSavePlan}
          onOpenLedger={() => setCurrentTab('ledger')}
          onOpenSetup={() => {
            setCopySourcePlan(null);
            setCurrentTab('setup');
          }}
        />
      )}

      {currentTab === 'setup' && (
        <MonthlySetupView
          monthKey={selectedMonth}
          existingPlan={currentPlan}
          allPlans={appState.plans}
          initialCopySourcePlan={copySourcePlan}
          currency={activeCurrency}
          onSavePlan={handleSavePlan}
          onDone={() => {
            setCopySourcePlan(null);
            setCurrentTab('dashboard');
          }}
        />
      )}

      {/* Auth / Sync Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        user={user}
        currency={activeCurrency}
        onUserChanged={(updatedUser) => {
          setUser(updatedUser);
          storage.setUser(updatedUser);
        }}
      />

      {/* Export Ledger Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        monthKey={selectedMonth}
        plans={appState.plans}
        expenses={appState.expenses}
        currency={activeCurrency}
      />
    </NotebookLayout>
  );
}
