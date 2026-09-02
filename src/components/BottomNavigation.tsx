import React from 'react';
import { Home, Inbox, Plus, Sparkles, User } from 'lucide-react';

export type MainTab = 'home' | 'inbox' | 'review' | 'profile';

interface BottomNavigationProps {
  currentTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  onOpenQuickAdd: () => void;
  inboxCount: number;
}

export function BottomNavigation({
  currentTab,
  onSelectTab,
  onOpenQuickAdd,
  inboxCount,
}: BottomNavigationProps) {
  return (
    <nav 
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--moku-surface)]/95 backdrop-blur-md border-t border-[var(--moku-outline)] shadow-[0_-8px_30px_rgba(0,0,0,0.04)] transition-colors"
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

        {/* Central Floating Quick Add Button */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            id="nav-quick-add-btn"
            type="button"
            onClick={onOpenQuickAdd}
            className="w-14 h-14 rounded-2xl bg-[var(--moku-primary)] hover:opacity-90 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            aria-label="Add expense or income"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
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
