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
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1B1E1B]/95 backdrop-blur-md border-t border-[#DDE2DD] dark:border-[#414842] shadow-[0_-8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)] transition-colors"
    >
      <div className="max-w-md mx-auto px-4 h-20 flex items-center justify-around relative">
        {/* Home Tab */}
        <button
          id="nav-tab-home"
          type="button"
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'home'
              ? 'text-[#176B52] dark:text-[#82D9B4] font-semibold scale-105'
              : 'text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-[#E3E5E1]'
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
          className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-all ${
            currentTab === 'inbox'
              ? 'text-[#176B52] dark:text-[#82D9B4] font-semibold scale-105'
              : 'text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-[#E3E5E1]'
          }`}
        >
          <div className="relative">
            <Inbox className="w-5 h-5 mb-1 stroke-[2.2]" />
            {inboxCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#BA1A1A] text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-tabular shadow-sm">
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
            className="w-14 h-14 rounded-2xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] flex items-center justify-center shadow-[0_10px_24px_rgba(23,107,82,0.35)] dark:shadow-[0_10px_24px_rgba(130,217,180,0.25)] active:scale-95 transition-all cursor-pointer"
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
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'review'
              ? 'text-[#176B52] dark:text-[#82D9B4] font-semibold scale-105'
              : 'text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-[#E3E5E1]'
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
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'profile'
              ? 'text-[#176B52] dark:text-[#82D9B4] font-semibold scale-105'
              : 'text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-[#E3E5E1]'
          }`}
        >
          <User className="w-5 h-5 mb-1 stroke-[2.2]" />
          <span className="text-[11px] tracking-tight">Me</span>
        </button>
      </div>
    </nav>
  );
}
