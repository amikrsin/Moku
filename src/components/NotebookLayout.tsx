import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, 
  PlusCircle, 
  ListOrdered, 
  CheckCircle2, 
  SlidersHorizontal, 
  Cloud, 
  CloudOff, 
  User as UserIcon, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Calendar,
  Coins,
  Plus,
  Settings,
  FileSpreadsheet,
  ChevronDown,
  Check,
  LogOut,
  Sparkles
} from 'lucide-react';
import { formatMonthName } from '../lib/storage';
import { UserProfile, SUPPORTED_CURRENCIES } from '../types';
import { getT } from '../lib/i18n';

export type NavTab = 'dashboard' | 'record' | 'ledger' | 'review' | 'setup';

interface NotebookLayoutProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  selectedMonth: string;
  onChangeMonth: (monthKey: string) => void;
  user: UserProfile;
  onOpenAuth: () => void;
  onOpenExport: () => void;
  isOnline: boolean;
  currency: string;
  onChangeCurrency: (currency: string) => void;
  children: React.ReactNode;
}

export const NotebookLayout: React.FC<NotebookLayoutProps> = ({
  currentTab,
  onSelectTab,
  selectedMonth,
  onChangeMonth,
  user,
  onOpenAuth,
  onOpenExport,
  isOnline,
  currency,
  onChangeCurrency,
  children,
}) => {
  const t = getT(currency);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Compute previous and next month
  const handlePrevMonth = () => {
    const [yStr, mStr] = selectedMonth.split('-');
    let year = parseInt(yStr, 10);
    let month = parseInt(mStr, 10) - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    onChangeMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [yStr, mStr] = selectedMonth.split('-');
    let year = parseInt(yStr, 10);
    let month = parseInt(mStr, 10) + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    onChangeMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  // Format short month name, e.g. "Sep 2026"
  const formatShortMonth = (monthKey: string) => {
    const [y, m] = monthKey.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(m, 10) - 1;
    return `${monthNames[mIdx] || m} ${y}`;
  };

  const currentCurrencySymbol = SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '₹';

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; isCenter?: boolean }[] = [
    { id: 'dashboard', label: 'Overview', icon: <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'ledger', label: 'Records', icon: <ListOrdered className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'record', label: 'Record', isCenter: true, icon: <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-[#EDE8DA]" /> },
    { id: 'review', label: 'Review', icon: <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'setup', label: 'Plan', icon: <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#EDE8DA] text-[#23211D] flex flex-col justify-between selection:bg-[#A8342A]/20">
      {/* Compact Minimal Header */}
      <header className="sticky top-0 z-30 bg-[#EDE8DA]/95 backdrop-blur-xs border-b border-[#565248]/15 px-3 py-2 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          
          {/* Brand Logo & Name (Clean MOKU without BUDGET tag) */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-[#A8342A] flex items-center justify-center bg-[#EDE8DA] text-[#A8342A] shadow-2xs">
              <span className="font-serif text-xs font-bold leading-none">
                M
              </span>
            </div>
            <h1 className="font-serif text-base sm:text-lg font-bold tracking-tight text-[#23211D]">
              MOKU
            </h1>
          </div>

          {/* Month Navigator (Shorter & Compact) */}
          <div className="flex items-center bg-[#E5DFCE] border border-[#565248]/20 rounded-md px-1 py-0.5 text-xs shadow-2xs">
            <button
              id="prev-month-btn"
              onClick={handlePrevMonth}
              className="p-1 text-[#565248] hover:text-[#23211D] hover:bg-[#D5CEBE] rounded-xs transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center space-x-1 px-1.5 font-serif font-semibold text-xs text-[#23211D]">
              <span>{formatShortMonth(selectedMonth)}</span>
            </div>
            <button
              id="next-month-btn"
              onClick={handleNextMonth}
              className="p-1 text-[#565248] hover:text-[#23211D] hover:bg-[#D5CEBE] rounded-xs transition-colors cursor-pointer"
              title="Next month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Combined Menu Dropdown (Currency + Export/Download + Account) */}
          <div className="relative" ref={menuRef}>
            <button
              id="combined-header-menu-btn"
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex items-center space-x-1.5 bg-[#E5DFCE] hover:bg-[#DFD8C5] border border-[#565248]/20 px-2 py-1 rounded-md text-xs font-serif font-medium text-[#23211D] transition-all shadow-2xs cursor-pointer"
              title="Settings & Options (Currency, Export, Account)"
            >
              <span className="font-bold text-[#A8342A]">
                {currentCurrencySymbol}
              </span>
              <span className="w-1 h-1 rounded-full bg-[#565248]/40" />
              {isOnline ? (
                <span className="w-1.5 h-1.5 rounded-full bg-[#5C6E4E] inline-block" title="Online" />
              ) : (
                <CloudOff className="w-3 h-3 text-[#B5652E]" title="Offline" />
              )}
              <UserIcon className="w-3.5 h-3.5 text-[#565248]" />
              <ChevronDown className={`w-3 h-3 text-[#565248] transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {isMenuOpen && (
              <div 
                className="absolute right-0 mt-1.5 w-64 bg-[#EDE8DA] border-2 border-[#565248]/30 rounded-lg shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                {/* 1. Currency Conversion Section */}
                <div className="px-3 py-1.5 border-b border-[#565248]/15">
                  <div className="text-[10px] font-serif uppercase tracking-wider text-[#565248] font-bold mb-1.5 flex items-center justify-between">
                    <span>Currency</span>
                    <Coins className="w-3 h-3 text-[#A8342A]" />
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {SUPPORTED_CURRENCIES.map((c) => {
                      const isSel = currency === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            onChangeCurrency(c.code);
                          }}
                          className={`flex items-center justify-between px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                            isSel
                              ? 'bg-[#A8342A] text-[#EDE8DA] font-bold'
                              : 'bg-[#E5DFCE]/70 text-[#23211D] hover:bg-[#E5DFCE]'
                          }`}
                        >
                          <span className="font-serif">{c.code} ({c.symbol})</span>
                          {isSel && <Check className="w-3 h-3 text-[#EDE8DA]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Download / Export Section */}
                <div className="px-3 py-1.5 border-b border-[#565248]/15">
                  <div className="text-[10px] font-serif uppercase tracking-wider text-[#565248] font-bold mb-1 flex items-center justify-between">
                    <span>Download & Backup</span>
                    <Download className="w-3 h-3 text-[#565248]" />
                  </div>
                  <button
                    id="menu-open-export-btn"
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenExport();
                    }}
                    className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-md text-xs text-[#23211D] bg-[#E5DFCE]/60 hover:bg-[#E5DFCE] transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#5C6E4E]" />
                    <div className="text-left">
                      <span className="font-serif font-semibold block">Export Records</span>
                      <span className="text-[10px] text-[#565248] block">Download CSV / JSON backup</span>
                    </div>
                  </button>
                </div>

                {/* 3. Account & Sync Section */}
                <div className="px-3 pt-1.5 pb-1">
                  <div className="text-[10px] font-serif uppercase tracking-wider text-[#565248] font-bold mb-1 flex items-center justify-between">
                    <span>Account & Cloud Sync</span>
                    {isOnline ? (
                      <span className="text-[9px] text-[#5C6E4E] font-medium flex items-center space-x-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5C6E4E]" />
                        <span>Online</span>
                      </span>
                    ) : (
                      <span className="text-[9px] text-[#B5652E]">Offline</span>
                    )}
                  </div>

                  <button
                    id="menu-open-auth-btn"
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-[#23211D] bg-[#E5DFCE]/60 hover:bg-[#E5DFCE] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <UserIcon className="w-3.5 h-3.5 text-[#A8342A]" />
                      <div className="text-left">
                        <span className="font-serif font-semibold block truncate max-w-[130px]">
                          {user.isAnonymous ? 'Local Guest Profile' : user.displayName || 'Account'}
                        </span>
                        <span className="text-[10px] text-[#565248] block">
                          {user.isAnonymous ? 'Click to sign in & sync' : user.email || 'Cloud synced'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#565248]" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Notebook Spine Canvas Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-5 relative">
        
        {/* Notebook Spine Visual Motif */}
        <div className="hidden sm:block absolute left-2 top-0 bottom-0 pointer-events-none z-10">
          <div className="h-full border-l border-dashed border-[#565248]/25 pl-1.5 flex flex-col justify-around py-12">
            {[...Array(6)].map((_, idx) => (
              <div
                key={idx}
                className="w-2 h-2 rounded-full border border-[#565248]/40 bg-[#D5CEBE] shadow-inner -ml-2.5"
                title="Notebook Binding Stitch"
              />
            ))}
          </div>
        </div>

        {/* Content Sheet with Ruled Paper lines */}
        <div className="relative z-0 min-h-[75vh] bg-[#EDE8DA] rounded-lg border border-[#565248]/15 shadow-xs p-3 sm:p-6 bg-ruled-paper sm:ml-4">
          {children}
        </div>
      </main>

      {/* Mobile-first Bottom Navigation Bar with Centered Floating + Record Button */}
      <nav className="sticky bottom-0 z-30 bg-[#EDE8DA]/95 backdrop-blur-md border-t border-[#565248]/20 px-2 py-1 sm:py-1.5 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-5 items-end gap-1 relative">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;

            if (item.isCenter) {
              return (
                <div key={item.id} className="flex flex-col items-center justify-center -mt-6">
                  <button
                    id={`nav-${item.id}`}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-[#A8342A] to-[#C24338] text-[#EDE8DA] flex items-center justify-center shadow-lg border-3 border-[#EDE8DA] hover:scale-105 active:scale-95 transition-transform cursor-pointer group"
                    title="Record Expense"
                  >
                    <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-[#EDE8DA] stroke-[2.5] transition-transform group-hover:rotate-90 duration-200" />
                  </button>
                  <span className="text-[10px] font-serif font-bold text-[#A8342A] mt-0.5 tracking-tight">
                    {item.label}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-md transition-all text-center cursor-pointer ${
                  isActive
                    ? 'text-[#A8342A] bg-[#E5DFCE] font-semibold shadow-2xs'
                    : 'text-[#565248] hover:text-[#23211D] hover:bg-[#EDE8DA]/60'
                }`}
              >
                <div className="relative">
                  {item.icon}
                </div>
                <span className="text-[10px] sm:text-xs mt-0.5 tracking-tight font-sans">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
