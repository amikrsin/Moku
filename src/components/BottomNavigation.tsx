import React from 'react';
import { Home, Inbox, Plus, Sparkles, User } from 'lucide-react';

export type MainTab = 'home' | 'inbox' | 'review' | 'profile';

interface BottomNavigationProps {
  currentTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  onOpenQuickAdd: () => void;
  inboxCount: number;
  isQuickAddOpen?: boolean;
}

export function BottomNavigation({
  currentTab,
  onSelectTab,
  onOpenQuickAdd,
  inboxCount,
  isQuickAddOpen = false,
}: BottomNavigationProps) {
  return (
    <nav 
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--moku-surface)]/95 backdrop-blur-md border-t border-[var(--moku-outline)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-colors"
    >
      <div className="max-w-md mx-auto px-4 h-20 flex items-center justify-around relative">
        {/* Home Tab */}
        <button
          id="nav-tab-home"
          type="button"
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            currentTab === 'home'
              ? 'text-[var(--moku-primary)] font-semibold scale-105'
              : 'text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)]'
          }`}
        >
          <Home className="w-5 h-5 mb-1 stroke-[2.2]" />
          <span className="text-[11px] tracking-tight">Home</span>
        </button>

        {/* Inbox Tab with Badge */}
        <button
          id="nav-tab-inbox"
          type="button"
          onClick={() => onSelectTab('inbox')}
          className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-all cursor-pointer ${
            currentTab === 'inbox'
              ? 'text-[var(--moku-primary)] font-semibold scale-105'
              : 'text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)]'
          }`}
        >
          <div className="relative">
            <Inbox className="w-5 h-5 mb-1 stroke-[2.2]" />
            {inboxCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[var(--moku-danger)] text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-tabular shadow-xs">
                {inboxCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-tight">Inbox</span>
        </button>

        {/* Middle Spacer for the Center-Docked Action Button */}
        <div className="flex-1 flex justify-center pointer-events-none" aria-hidden="true" />

        {/* Center-Docked Android FAB Button (Center-Aligned with the Top Border of the Nav Bar) */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            id="nav-quick-add-btn"
            type="button"
            onClick={onOpenQuickAdd}
            className={`w-14 h-14 rounded-full bg-[var(--moku-primary)] hover:opacity-95 text-white dark:text-[#121412] flex items-center justify-center shadow-[0_6px_20px_rgba(23,107,82,0.35)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.5)] ring-4 ring-[var(--moku-surface)] border border-[var(--moku-outline-variant)] active:scale-95 hover:scale-105 transition-all cursor-pointer ${
              isQuickAddOpen ? 'rotate-45 bg-[var(--moku-danger)] ring-red-100 dark:ring-red-950/40 text-white' : ''
            }`}
            aria-label={isQuickAddOpen ? 'Close add expense' : 'Add expense or income'}
            title={isQuickAddOpen ? 'Close add expense' : 'Add transaction'}
          >
            <Plus className="w-7 h-7 stroke-[2.5] transition-transform duration-200" />
          </button>
        </div>

        {/* Review Tab */}
        <button
          id="nav-tab-review"
          type="button"
          onClick={() => onSelectTab('review')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            currentTab === 'review'
              ? 'text-[var(--moku-primary)] font-semibold scale-105'
              : 'text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)]'
          }`}
        >
          <Sparkles className="w-5 h-5 mb-1 stroke-[2.2]" />
          <span className="text-[11px] tracking-tight">Review</span>
        </button>

        {/* Profile / Me Tab */}
        <button
          id="nav-tab-profile"
          type="button"
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            currentTab === 'profile'
              ? 'text-[var(--moku-primary)] font-semibold scale-105'
              : 'text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)]'
          }`}
        >
          <User className="w-5 h-5 mb-1 stroke-[2.2]" />
          <span className="text-[11px] tracking-tight">Me</span>
        </button>
      </div>
    </nav>
  );
}
