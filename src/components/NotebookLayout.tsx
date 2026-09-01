import React from 'react';
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
  Plus
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

  const navItems: { id: NavTab; label: string; subLabel: string; icon: React.ReactNode; isCenter?: boolean }[] = [
    { id: 'dashboard', label: 'Overview', subLabel: 'Summary', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'ledger', label: 'Ledger', subLabel: 'Journal', icon: <ListOrdered className="w-5 h-5" /> },
    { id: 'record', label: 'Record', subLabel: 'Add Entry', isCenter: true, icon: <Plus className="w-6 h-6 text-[#EDE8DA]" /> },
    { id: 'review', label: 'Review', subLabel: 'Reflect', icon: <CheckCircle2 className="w-5 h-5" /> },
    { id: 'setup', label: 'Plan', subLabel: 'Budget', icon: <SlidersHorizontal className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#EDE8DA] text-[#23211D] flex flex-col justify-between selection:bg-[#A8342A]/20">
      {/* Top Ledger Header */}
      <header className="sticky top-0 z-30 bg-[#EDE8DA]/95 backdrop-blur-xs border-b border-[#565248]/15 px-4 py-3 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          
          {/* Logo & title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="w-8 h-8 rounded-full border border-[#A8342A] flex items-center justify-center bg-[#EDE8DA] text-[#A8342A] shadow-xs">
              <span className="font-serif text-sm font-bold leading-none">
                家
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-serif text-lg font-bold tracking-tight text-[#23211D]">
                  {t.appTitle}
                </h1>
                <span className="text-xs font-serif text-[#A8342A] border border-[#A8342A]/30 px-1.5 py-0.5 rounded-xs bg-[#A8342A]/5 font-bold">
                  {t.appBadge}
                </span>
              </div>
              <p className="text-[11px] text-[#565248] hidden sm:block">
                {t.appSubhead}
              </p>
            </div>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center bg-[#E5DFCE] border border-[#565248]/20 rounded-md px-1.5 py-1 text-sm shadow-2xs">
            <button
              id="prev-month-btn"
              onClick={handlePrevMonth}
              className="p-1 text-[#565248] hover:text-[#23211D] hover:bg-[#D5CEBE] rounded-xs transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-1 px-2 font-serif font-semibold text-xs sm:text-sm text-[#23211D]">
              <Calendar className="w-3.5 h-3.5 text-[#565248] hidden sm:inline" />
              <span>{formatMonthName(selectedMonth)}</span>
            </div>
            <button
              id="next-month-btn"
              onClick={handleNextMonth}
              className="p-1 text-[#565248] hover:text-[#23211D] hover:bg-[#D5CEBE] rounded-xs transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right Actions: Currency, Sync & Account */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Quick Currency Selector */}
            <div className="relative flex items-center bg-[#E5DFCE] border border-[#565248]/20 rounded-md px-1.5 py-1 text-xs shadow-2xs">
              <span className="font-serif font-bold text-[#A8342A] mr-1 text-sm pl-0.5">
                {SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '₹'}
              </span>
              <select
                id="header-currency-select"
                aria-label="Currency"
                value={currency}
                onChange={(e) => onChangeCurrency(e.target.value)}
                className="bg-transparent text-xs font-serif font-bold text-[#23211D] focus:outline-hidden cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#EDE8DA] text-[#23211D]">
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <button
              id="export-btn"
              onClick={onOpenExport}
              className="p-1.5 sm:p-2 text-[#565248] hover:text-[#23211D] hover:bg-[#E5DFCE] rounded-md transition-colors"
              title="Export Ledger (CSV / JSON)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              id="auth-profile-btn"
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 text-xs bg-[#E5DFCE] hover:bg-[#DFD8C5] border border-[#565248]/20 px-2 sm:px-2.5 py-1.5 rounded-md transition-all text-[#23211D]"
              title="Account & Sync Status"
            >
              {isOnline ? (
                <span className="w-2 h-2 rounded-full bg-[#5C6E4E] inline-block" title="Online & Synced" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-[#B5652E]" title="Offline mode" />
              )}
              
              <UserIcon className="w-3.5 h-3.5 text-[#565248]" />
              <span className="hidden md:inline font-medium max-w-[90px] truncate">
                {user.isAnonymous ? 'Local Device' : user.displayName || 'Account'}
              </span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Notebook Spine Canvas Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 relative">
        
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
        <div className="relative z-0 min-h-[75vh] bg-[#EDE8DA] rounded-lg border border-[#565248]/15 shadow-xs p-4 sm:p-8 bg-ruled-paper sm:ml-4">
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
                    className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#A8342A] to-[#C24338] text-[#EDE8DA] flex items-center justify-center shadow-lg border-3 border-[#EDE8DA] hover:scale-105 active:scale-95 transition-transform cursor-pointer group"
                    title="Record Expense (記帳)"
                  >
                    <Plus className="w-7 h-7 text-[#EDE8DA] stroke-[2.5] transition-transform group-hover:rotate-90 duration-200" />
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
                <span className="text-[9px] font-serif opacity-70 leading-none">
                  {item.subLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
