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
  CheckCircle2,
  PieChart as PieChartIcon
} from 'lucide-react';

interface LedgerViewProps {
  monthKey: string;
  plan: Plan | null;
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  onRestoreExpense: (id: string) => void;
  onRecordExpense: () => void;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArcSlice(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  const delta = endAngle - startAngle;
  const clampedEnd = delta >= 360 ? startAngle + 359.99 : endAngle;
  const startOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const endOuter = polarToCartesian(x, y, outerRadius, clampedEnd);
  const startInner = polarToCartesian(x, y, innerRadius, clampedEnd);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);

  const largeArcFlag = delta <= 180 ? '0' : '1';

  return [
    'M', startOuter.x, startOuter.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 1, endOuter.x, endOuter.y,
    'L', startInner.x, startInner.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 0, endInner.x, endInner.y,
    'Z',
  ].join(' ');
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
  const [hoveredCategory, setHoveredCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentlyDeletedId, setRecentlyDeletedId] = useState<string | null>(null);

  // Filter active expenses for this month
  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => !e.deleted && e.monthKey === monthKey);
  }, [expenses, monthKey]);

  // Total month spending
  const totalMonthSpent = useMemo(() => {
    return monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthExpenses]);

  // Category Breakdown for Donut Graph
  const categorySlices = useMemo(() => {
    const catKeys = Object.keys(categories) as Category[];
    let currentAngle = 0;

    return catKeys.map((catKey) => {
      const cat = categories[catKey];
      const items = monthExpenses.filter((e) => e.category === catKey);
      const amount = items.reduce((sum, e) => sum + e.amount, 0);
      const percentage = totalMonthSpent > 0 ? (amount / totalMonthSpent) * 100 : 0;
      const angleSweep = totalMonthSpent > 0 ? (amount / totalMonthSpent) * 360 : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSweep;
      currentAngle += angleSweep;

      return {
        key: catKey,
        name: cat.name,
        color: cat.color,
        amount,
        percentage,
        count: items.length,
        startAngle,
        endAngle,
      };
    });
  }, [categories, monthExpenses, totalMonthSpent]);

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

  const activeHoverData = hoveredCategory 
    ? categorySlices.find((s) => s.key === hoveredCategory) 
    : null;

  return (
    <div className="space-y-5 max-w-3xl mx-auto py-1">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#565248]/20 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-serif text-[#A8342A] uppercase tracking-wider font-bold">
              Record History
            </span>
            <span className="text-xs text-[#565248]">({monthExpenses.length} entries)</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#23211D] mt-0.5">
            {formatMonthName(monthKey)} Ledger
          </h2>
        </div>

        <button
          id="ledger-record-btn"
          onClick={onRecordExpense}
          className="flex items-center justify-center space-x-2 bg-[#A8342A] hover:bg-[#8F2B22] text-[#EDE8DA] font-serif font-bold px-4 py-2 rounded-md shadow-xs transition-colors self-start sm:self-auto cursor-pointer text-xs sm:text-sm active:scale-98"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Log Expense</span>
        </button>
      </div>

      {/* Undo snackbar if recently deleted */}
      {recentlyDeletedId && (
        <div className="bg-[#23211D] text-[#EDE8DA] px-4 py-2.5 rounded-md flex items-center justify-between shadow-md text-xs sm:text-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#5C6E4E]" />
            <span>Entry removed.</span>
          </div>
          <button
            id="undo-delete-btn"
            onClick={handleUndo}
            className="text-[#A8342A] hover:underline font-bold flex items-center space-x-1 cursor-pointer bg-[#EDE8DA] px-2 py-0.5 rounded-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Donut Graph / Circle Slice Chart Section */}
      <div className="bg-[#E5DFCE]/80 border-2 border-[#565248]/25 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#565248]/15 pb-2.5">
          <div className="flex items-center space-x-2">
            <PieChartIcon className="w-4 h-4 text-[#A8342A]" />
            <h3 className="font-serif text-base font-bold text-[#23211D]">
              Pillar Spending Distribution
            </h3>
          </div>
          <span className="text-xs text-[#565248] font-serif">
            {totalMonthSpent > 0 ? `${categorySlices.filter(s => s.amount > 0).length} Active Pillars` : 'No spend yet'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
          {/* Donut Chart Visual */}
          <div className="sm:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                {/* Background Ring when 0 spend */}
                {totalMonthSpent === 0 ? (
                  <circle
                    cx="100"
                    cy="100"
                    r="65"
                    fill="none"
                    stroke="#565248"
                    strokeOpacity="0.2"
                    strokeWidth="28"
                  />
                ) : (
                  categorySlices.map((slice) => {
                    if (slice.amount <= 0) return null;
                    const isHovered = hoveredCategory === slice.key;
                    const isSelected = selectedCategory === slice.key;
                    const outerRadius = (isHovered || isSelected) ? 82 : 78;
                    const innerRadius = (isHovered || isSelected) ? 46 : 50;

                    const d = describeArcSlice(
                      100,
                      100,
                      innerRadius,
                      outerRadius,
                      slice.startAngle,
                      slice.endAngle
                    );

                    return (
                      <path
                        key={slice.key}
                        d={d}
                        fill={slice.color}
                        className="transition-all duration-200 cursor-pointer opacity-95 hover:opacity-100"
                        stroke="#EDE8DA"
                        strokeWidth="2"
                        onMouseEnter={() => setHoveredCategory(slice.key)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={() => setSelectedCategory(selectedCategory === slice.key ? 'all' : slice.key)}
                      />
                    );
                  })
                )}
              </svg>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                <span className="text-[10px] font-serif uppercase tracking-wider text-[#565248] font-bold truncate max-w-[110px]">
                  {activeHoverData ? activeHoverData.name : (selectedCategory !== 'all' ? categories[selectedCategory].name : 'Total Outlay')}
                </span>
                <span className="font-serif font-bold text-base sm:text-lg text-[#23211D] font-tabular">
                  {formatCurrency(
                    activeHoverData ? activeHoverData.amount : (selectedCategory !== 'all' ? (categorySlices.find(s => s.key === selectedCategory)?.amount || 0) : totalMonthSpent),
                    currency
                  )}
                </span>
                <span className="text-[10px] text-[#5C6E4E] font-medium font-tabular">
                  {activeHoverData 
                    ? `${activeHoverData.percentage.toFixed(1)}% of total` 
                    : (selectedCategory !== 'all' 
                      ? `${(categorySlices.find(s => s.key === selectedCategory)?.percentage || 0).toFixed(1)}% of total`
                      : `${monthExpenses.length} records`
                    )
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Slices Legend & Interactive Filter Cards */}
          <div className="sm:col-span-7 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categorySlices.map((slice) => {
                const isSelected = selectedCategory === slice.key;
                const isHovered = hoveredCategory === slice.key;

                return (
                  <div
                    key={slice.key}
                    onClick={() => setSelectedCategory(selectedCategory === slice.key ? 'all' : slice.key)}
                    onMouseEnter={() => setHoveredCategory(slice.key)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EDE8DA] border-[#23211D] ring-2 ring-[#23211D] shadow-xs'
                        : isHovered
                        ? 'bg-[#EDE8DA] border-[#565248]/40 shadow-2xs'
                        : 'bg-[#EDE8DA]/70 border-[#565248]/20 hover:bg-[#EDE8DA]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="font-serif font-bold text-xs text-[#23211D] truncate">
                          {slice.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-tabular font-bold px-1.5 py-0.2 rounded-xs bg-[#E5DFCE] border border-[#565248]/15 text-[#565248]">
                        {slice.percentage.toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-[#565248]/10 text-xs font-tabular">
                      <span className="text-[#565248] text-[11px]">{slice.count} entries</span>
                      <span className="font-serif font-bold text-[#A8342A]">
                        {formatCurrency(slice.amount, currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="w-full text-center text-xs text-[#A8342A] hover:underline font-serif py-1 cursor-pointer"
              >
                Clear Pillar Filter (Showing All)
              </button>
            )}
          </div>
        </div>
      </div>

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
            placeholder="Search records by note, category, or amount..."
            className="w-full bg-[#EDE8DA] border border-[#565248]/30 rounded-md pl-9 pr-3 py-2 text-xs sm:text-sm text-[#23211D] focus:outline-hidden focus:border-[#23211D]"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[#565248] flex items-center space-x-1 pr-1 shrink-0">
            <Filter className="w-3 h-3" />
            <span>Pillars:</span>
          </span>

          <button
            id="filter-all"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full transition-colors font-medium whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#23211D] text-[#EDE8DA] font-bold shadow-xs'
                : 'bg-[#EDE8DA] text-[#565248] hover:bg-[#DFD8C5] border border-[#565248]/25'
            }`}
          >
            All Records ({monthExpenses.length})
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
                className={`px-3 py-1 rounded-full transition-colors font-medium whitespace-nowrap flex items-center space-x-1.5 cursor-pointer border ${
                  isSelected
                    ? 'border-[#23211D] bg-[#EDE8DA] ring-2 ring-[#23211D] font-bold text-[#23211D] shadow-xs'
                    : 'bg-[#EDE8DA] text-[#565248] hover:bg-[#DFD8C5] border-[#565248]/25'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: cat.color }}
                />
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-80 font-tabular">({count})</span>
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
              ? 'No matching expenses found for this filter.'
              : 'No expenses recorded for this month yet.'}
          </p>
          <button
            id="empty-ledger-record-btn"
            onClick={onRecordExpense}
            className="inline-flex items-center space-x-1.5 text-xs bg-[#A8342A] text-[#EDE8DA] px-3.5 py-1.5 rounded-md font-serif font-bold hover:bg-[#8F2B22] cursor-pointer shadow-xs active:scale-98"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Log First Expense</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map(([dayStr, dayEntries]) => {
            const dayTotal = dayEntries.reduce((sum, e) => sum + e.amount, 0);
            const [y, m, d] = dayStr.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);
            const dayFormatted = dateObj.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={dayStr}
                className="bg-[#E5DFCE]/60 rounded-xl border border-[#565248]/20 overflow-hidden shadow-2xs space-y-0.5"
              >
                {/* Day Header */}
                <div className="bg-[#DFD8C5] px-3.5 py-2 border-b border-[#565248]/20 flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-serif font-bold text-xs sm:text-sm text-[#23211D]">
                    <span>{dayFormatted}</span>
                    <span className="text-[11px] font-normal text-[#565248]">
                      ({dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'})
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
                        className="p-3 hover:bg-[#E5DFCE]/40 transition-colors space-y-1.5 group"
                      >
                        {/* Top Row: Category Pillar Pill + Budget Line Tag (Left), Spent Amount in Button Box (Right) */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            {/* Category Pillar Pill */}
                            <span 
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-serif font-bold text-[#EDE8DA] shadow-2xs"
                              style={{ backgroundColor: cat.color }}
                            >
                              <span>{cat.name}</span>
                            </span>

                            {/* Budget Line Tag if present */}
                            {item.budgetLineName && (
                              <span className="text-[10px] bg-[#E5DFCE] border border-[#565248]/25 px-1.5 py-0.5 rounded-md font-serif text-[#23211D]">
                                🏷️ {item.budgetLineName}
                              </span>
                            )}
                          </div>

                          {/* Spent Amount Pill on Top Right with Delete Action */}
                          <div className="flex items-center space-x-2">
                            <div className="bg-[#E5DFCE] border border-[#565248]/25 px-2.5 py-0.5 rounded-md shadow-2xs font-tabular">
                              <span className="font-serif font-bold text-sm sm:text-base text-[#A8342A]">
                                -{formatCurrency(item.amount, currency)}
                              </span>
                            </div>

                            <button
                              id={`delete-expense-${item.id}`}
                              onClick={() => handleDelete(item.id)}
                              className="p-1 text-[#565248]/50 hover:text-[#A8342A] hover:bg-[#DFD8C5] rounded-xs transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                              title="Remove entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Row: Description in clean text, with time at bottom right */}
                        <div className="flex items-center justify-between text-xs text-[#565248] pt-0.5">
                          <span className="text-xs sm:text-sm font-medium text-[#23211D] truncate max-w-[70%]">
                            {item.note || <span className="italic text-[#565248]">{cat.name}</span>}
                          </span>

                          <span className="text-[11px] text-[#565248] font-tabular whitespace-nowrap">
                            {timeStr}
                          </span>
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
