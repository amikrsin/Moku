import React, { useState, useMemo } from 'react';
import { 
  Category, 
  Expense, 
  Plan 
} from '../types';
import { formatCurrency, formatMonthName } from '../lib/storage';
import { getT, getCategoriesForCurrency } from '../lib/i18n';
import { 
  Trash2, 
  Search, 
  Filter, 
  PlusCircle, 
  RotateCcw, 
  Calendar as CalendarIcon,
  CheckCircle2
} from 'lucide-react';

interface LedgerViewProps {
  monthKey: string;
  plan: Plan | null;
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  onRestoreExpense: (id: string) => void;
  onRecordExpense: () => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  monthKey,
  plan,
  expenses,
  onDeleteExpense,
  onRestoreExpense,
  onRecordExpense,
}) => {
  const currency = plan?.currency || 'INR';
  const t = getT(currency);
  const categories = getCategoriesForCurrency(currency);

  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentlyDeletedId, setRecentlyDeletedId] = useState<string | null>(null);

  // Filter active expenses for this month
  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => !e.deleted && e.monthKey === monthKey);
  }, [expenses, monthKey]);

  // Filtered by category and search query
  const filteredExpenses = useMemo(() => {
    return monthExpenses.filter((e) => {
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      const matchSearch = 
        !searchQuery.trim() ||
        e.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
        categories[e.category].name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(e.amount).includes(searchQuery);
      return matchCat && matchSearch;
    });
  }, [monthExpenses, selectedCategory, searchQuery, categories]);

  // Group by day string (e.g. "2026-08-31")
  const groupedByDay = useMemo(() => {
    const map = new Map<string, Expense[]>();
    // Sort descending by date
    const sorted = [...filteredExpenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sorted.forEach((item) => {
      const dayKey = item.date.split('T')[0];
      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      map.get(dayKey)!.push(item);
    });

    return Array.from(map.entries());
  }, [filteredExpenses]);

  const totalFilteredSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleDelete = (id: string) => {
    onDeleteExpense(id);
    setRecentlyDeletedId(id);
    setTimeout(() => {
      setRecentlyDeletedId(null);
    }, 6000);
  };

  const handleUndo = () => {
    if (recentlyDeletedId) {
      onRestoreExpense(recentlyDeletedId);
      setRecentlyDeletedId(null);
    }
  };

  const formatDayHeader = (dayStr: string) => {
    const [y, m, d] = dayStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const today = new Date();
    const isToday = 
      today.getFullYear() === y && 
      today.getMonth() === m - 1 && 
      today.getDate() === d;

    const formatted = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    return isToday ? `Today • ${formatted}` : formatted;
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto py-1">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#565248]/20 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-serif text-[#A8342A] uppercase tracking-wider font-bold">
              {t.ledgerHeaderSubtitle}
            </span>
            <span className="text-xs text-[#565248]">({monthExpenses.length} {t.ledgerTotalEntries})</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#23211D] mt-0.5">
            {formatMonthName(monthKey)} {t.ledgerHeaderTitle}
          </h2>
        </div>

        <button
          id="ledger-record-btn"
          onClick={onRecordExpense}
          className="flex items-center justify-center space-x-2 bg-[#A8342A] hover:bg-[#8F2B22] text-[#EDE8DA] font-serif font-bold px-4 py-2 rounded-md shadow-xs transition-colors self-start sm:self-auto cursor-pointer text-xs sm:text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.recordButton}</span>
        </button>
      </div>

      {/* Undo snackbar if recently deleted */}
      {recentlyDeletedId && (
        <div className="bg-[#23211D] text-[#EDE8DA] px-4 py-2.5 rounded-md flex items-center justify-between shadow-md text-xs sm:text-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#5C6E4E]" />
            <span>Entry removed from ledger.</span>
          </div>
          <button
            id="undo-delete-btn"
            onClick={handleUndo}
            className="text-[#A8342A] hover:underline font-bold flex items-center space-x-1 cursor-pointer bg-[#EDE8DA] px-2 py-0.5 rounded-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.ledgerUndo}</span>
          </button>
        </div>
      )}

      {/* Filters and Search toolbar */}
      <div className="bg-[#E5DFCE]/70 border border-[#565248]/20 rounded-lg p-3 sm:p-4 shadow-2xs space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#565248] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="ledger-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.ledgerSearchPlaceholder}
            className="w-full bg-[#EDE8DA] border border-[#565248]/30 rounded-md pl-9 pr-3 py-1.5 text-xs sm:text-sm text-[#23211D] focus:outline-hidden focus:border-[#23211D]"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[#565248] flex items-center space-x-1 pr-1">
            <Filter className="w-3 h-3" />
            <span>Filter:</span>
          </span>

          <button
            id="filter-all"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-md transition-colors font-medium whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#23211D] text-[#EDE8DA]'
                : 'bg-[#EDE8DA] text-[#565248] hover:bg-[#DFD8C5] border border-[#565248]/25'
            }`}
          >
            {t.ledgerAllCategories} ({monthExpenses.length})
          </button>

          {(Object.keys(categories) as Category[]).map((catKey) => {
            const cat = categories[catKey];
            const isSelected = selectedCategory === catKey;
            const count = monthExpenses.filter((e) => e.category === catKey).length;

            return (
              <button
                key={catKey}
                id={`filter-${catKey}`}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                  isSelected
                    ? 'text-[#EDE8DA] shadow-2xs'
                    : 'bg-[#EDE8DA] text-[#565248] hover:bg-[#DFD8C5] border border-[#565248]/25'
                }`}
                style={{
                  backgroundColor: isSelected ? cat.color : undefined,
                }}
              >
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtered Total Bar */}
      <div className="flex items-center justify-between text-xs sm:text-sm px-1 text-[#565248]">
        <span>
          Showing {filteredExpenses.length} of {monthExpenses.length} entries
        </span>
        <span className="font-medium text-[#23211D]">
          Sum: <strong className="font-serif font-bold text-base font-tabular text-[#A8342A]">{formatCurrency(totalFilteredSpent, currency)}</strong>
        </span>
      </div>

      {/* Ledger Days List */}
      {groupedByDay.length === 0 ? (
        <div className="text-center py-12 bg-[#E5DFCE]/40 rounded-lg border border-[#565248]/20 p-6 space-y-3">
          <CalendarIcon className="w-8 h-8 text-[#565248] mx-auto opacity-60" />
          <p className="text-sm text-[#565248]">
            {searchQuery || selectedCategory !== 'all'
              ? t.ledgerNoEntriesMatch
              : t.dashboardNoExpenses}
          </p>
          <button
            id="empty-ledger-record-btn"
            onClick={onRecordExpense}
            className="inline-flex items-center space-x-1.5 text-xs bg-[#A8342A] text-[#EDE8DA] px-3.5 py-1.5 rounded-md font-serif font-bold hover:bg-[#8F2B22] cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t.recordButton}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map(([dayStr, dayEntries]) => {
            const dayTotal = dayEntries.reduce((sum, e) => sum + e.amount, 0);

            return (
              <div
                key={dayStr}
                className="bg-[#E5DFCE]/60 rounded-lg border border-[#565248]/20 overflow-hidden shadow-2xs"
              >
                {/* Day Header */}
                <div className="bg-[#DFD8C5] px-3.5 py-2 border-b border-[#565248]/20 flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-serif font-bold text-xs sm:text-sm text-[#23211D]">
                    <span>{formatDayHeader(dayStr)}</span>
                    <span className="text-[11px] font-normal text-[#565248]">
                      ({dayEntries.length} {t.dashboardEntries})
                    </span>
                  </div>
                  <span className="font-serif font-bold text-xs sm:text-sm font-tabular text-[#23211D]">
                    {formatCurrency(dayTotal, currency)}
                  </span>
                </div>

                {/* Day Entries List */}
                <div className="divide-y divide-[#565248]/15 bg-[#EDE8DA]/60">
                  {dayEntries.map((item) => {
                    const cat = categories[item.category];
                    const timeStr = new Date(item.date).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    });

                    return (
                      <div
                        key={item.id}
                        className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#E5DFCE]/40 transition-colors group"
                      >
                        <div className="flex items-center space-x-3 min-w-0 pr-2">
                          {/* Category Icon */}
                          <div
                            className="w-7 h-7 rounded-sm flex items-center justify-center font-serif text-xs font-bold text-[#EDE8DA] shrink-0"
                            style={{ backgroundColor: cat.color }}
                            title={`${cat.name} (${cat.badge}) - ${cat.subhead}`}
                          >
                            {cat.name[0]}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-medium text-[#23211D] truncate">
                              {item.note || <span className="italic text-[#565248]">{cat.name}</span>}
                            </div>
                            <div className="text-[11px] text-[#565248] flex items-center space-x-1.5">
                              <span>{timeStr}</span>
                              <span>•</span>
                              <span style={{ color: cat.color }} className="font-semibold">
                                {cat.name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount & Delete Action */}
                        <div className="flex items-center space-x-3 shrink-0 font-tabular">
                          <span className="font-serif font-bold text-sm sm:text-base text-[#23211D]">
                            {formatCurrency(item.amount, currency)}
                          </span>

                          <button
                            id={`delete-expense-${item.id}`}
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-[#565248]/60 hover:text-[#A8342A] hover:bg-[#DFD8C5] rounded-xs transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                            title="Remove entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
