import React, { useState } from 'react';
import { 
  Category, 
  Expense, 
  Plan, 
  SUPPORTED_CURRENCIES 
} from '../types';
import { formatCurrency, generateUUID } from '../lib/storage';
import { HankoStamp } from './HankoStamp';
import { getT, getCategoriesForCurrency } from '../lib/i18n';
import { PlusCircle, Check, ArrowLeft, RotateCcw, Tag } from 'lucide-react';

interface RecordExpenseViewProps {
  monthKey: string;
  plan: Plan | null;
  onSaveExpense: (expense: Expense) => void;
  onBackToDashboard: () => void;
}

export const RecordExpenseView: React.FC<RecordExpenseViewProps> = ({
  monthKey,
  plan,
  onSaveExpense,
  onBackToDashboard,
}) => {
  const currency = plan?.currency || 'INR';
  const t = getT(currency);
  const categories = getCategoriesForCurrency(currency);
  const currencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || '₹';

  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<Category>('survival');
  const [selectedBudgetLineId, setSelectedBudgetLineId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [lastSavedAmount, setLastSavedAmount] = useState<number>(0);
  const [lastSavedCategory, setLastSavedCategory] = useState<Category>('survival');
  const [lastSavedLineName, setLastSavedLineName] = useState<string>('');
  const [lastSavedNote, setLastSavedNote] = useState<string>('');

  // Available lines for the chosen category
  const activeCategoryLines = plan?.categoryBudgetLines?.[category] || [];

  const handleCategoryChange = (newCat: Category) => {
    setCategory(newCat);
    setSelectedBudgetLineId(''); // reset line selection for new category
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;

    // Create datetime from selected date and current time
    const now = new Date();
    const [y, m, d] = date.split('-').map((v) => parseInt(v, 10));
    const finalDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());

    const expenseMonthKey = `${y}-${String(m).padStart(2, '0')}`;

    const chosenLine = activeCategoryLines.find((l) => l.id === selectedBudgetLineId);

    const newExpense: Expense = {
      id: generateUUID(),
      monthKey: expenseMonthKey,
      amount: num,
      category,
      budgetLineId: chosenLine?.id,
      budgetLineName: chosenLine?.name,
      note: note.trim(),
      date: finalDate.toISOString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deleted: false,
    };

    setLastSavedAmount(num);
    setLastSavedCategory(category);
    setLastSavedLineName(chosenLine?.name || '');
    setLastSavedNote(note.trim());
    setIsConfirmed(true);

    onSaveExpense(newExpense);
  };

  const handleRecordAnother = () => {
    setAmount('');
    setNote('');
    setSelectedBudgetLineId('');
    setIsConfirmed(false);
  };

  if (isConfirmed) {
    const savedCat = categories[lastSavedCategory];
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-6">
        
        {/* Animated Hanko Stamp */}
        <div className="flex justify-center py-4">
          <HankoStamp size="xl" text={t.stampRecorded} animate={true} />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-serif text-[#A8342A] uppercase tracking-widest font-bold">
            {t.recordSuccessBadge}
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#23211D]">
            {formatCurrency(lastSavedAmount, currency)}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-[#565248]">
            <span 
              className="w-2.5 h-2.5 rounded-xs inline-block" 
              style={{ backgroundColor: savedCat.color }} 
            />
            <span className="font-medium text-[#23211D]">{savedCat.name}</span>
            {lastSavedLineName && (
              <span className="bg-[#E5DFCE] border border-[#565248]/20 px-1.5 py-0.5 rounded-xs text-xs font-semibold text-[#23211D]">
                🏷️ {lastSavedLineName}
              </span>
            )}
            {lastSavedNote && <span>• "{lastSavedNote}"</span>}
          </div>
        </div>

        <p className="text-xs text-[#565248] italic max-w-xs mx-auto leading-relaxed">
          {t.recordSuccessQuote}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            id="record-another-btn"
            onClick={handleRecordAnother}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#E5DFCE] hover:bg-[#DFD8C5] border border-[#565248]/30 px-5 py-2.5 rounded-md text-sm font-medium text-[#23211D] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#565248]" />
            <span>{t.recordAnother}</span>
          </button>

          <button
            id="return-overview-btn"
            onClick={onBackToDashboard}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#A8342A] hover:bg-[#8F2B22] text-[#EDE8DA] font-serif font-bold px-6 py-2.5 rounded-md text-sm shadow-xs transition-colors cursor-pointer"
          >
            <span>{t.recordReturnOverview}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-2">
      {/* Header */}
      <div className="border-b border-[#565248]/20 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-serif text-[#A8342A] uppercase tracking-wider font-bold">
              {t.recordHeaderSubtitle}
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#23211D] mt-0.5">
              {t.recordHeaderTitle}
            </h2>
          </div>
          <button
            id="cancel-record-btn"
            onClick={onBackToDashboard}
            className="p-1.5 text-[#565248] hover:text-[#23211D] hover:bg-[#E5DFCE] rounded-md transition-colors"
            title="Back to Overview"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs sm:text-sm text-[#565248] mt-1.5 leading-relaxed">
          Log what you spent immediately. Place it deliberately into one of the four Kakeibo categories.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Amount Input */}
        <div className="bg-[#E5DFCE]/60 border border-[#565248]/20 rounded-lg p-4 sm:p-5 shadow-2xs">
          <label htmlFor="expense-amount-input" className="block font-serif text-sm font-bold text-[#23211D] mb-1.5">
            {t.recordAmountLabel}
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-serif text-xl sm:text-2xl font-bold text-[#565248]">
              {currencySymbol}
            </span>
            <input
              id="expense-amount-input"
              type="number"
              step="any"
              min="0.01"
              required
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t.recordAmountPlaceholder}
              className="w-full bg-[#EDE8DA] border border-[#565248]/30 rounded-md pl-10 pr-4 py-3 text-xl sm:text-2xl font-bold font-tabular text-[#23211D] focus:outline-hidden focus:border-[#A8342A] focus:ring-1 focus:ring-[#A8342A]"
            />
          </div>
        </div>

        {/* The 4 Category Cards */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="font-serif text-sm font-bold text-[#23211D]">
              {t.recordCategoryLabel}
            </label>
            <span className="text-[11px] text-[#565248] italic">{t.recordCategoryHint}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.keys(categories) as Category[]).map((catKey) => {
              const cat = categories[catKey];
              const isSelected = category === catKey;

              return (
                <div
                  key={catKey}
                  id={`category-card-${catKey}`}
                  onClick={() => handleCategoryChange(catKey)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all relative ${
                    isSelected
                      ? 'bg-[#E5DFCE] border-2 shadow-xs'
                      : 'bg-[#EDE8DA] border-[#565248]/25 hover:bg-[#E5DFCE]/50'
                  }`}
                  style={{
                    borderColor: isSelected ? cat.color : undefined,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-6 h-6 rounded-xs flex items-center justify-center font-serif text-xs font-bold text-[#EDE8DA] shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        {cat.name[0]}
                      </div>
                      <div>
                        <div className="font-serif font-bold text-sm text-[#23211D] leading-tight">
                          {cat.name}
                        </div>
                        <div className="text-[10px] text-[#565248] uppercase tracking-wider font-semibold">
                          {cat.badge}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[#EDE8DA]"
                        style={{ backgroundColor: cat.color }}
                      >
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#565248] mt-2 leading-tight">
                    {cat.description}
                  </p>
                  <span className="text-[10px] text-[#565248]/80 mt-1 block truncate">
                    {t.recordEg} {cat.examples}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional Sub-Category / Budget Line Picker */}
        {activeCategoryLines.length > 0 && (
          <div className="bg-[#E5DFCE]/70 border border-[#565248]/25 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="budget-line-select" className="text-xs font-serif font-bold text-[#23211D] flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-[#A8342A]" />
                <span>Tag to Budget Line (Optional):</span>
              </label>
              <span className="text-[11px] text-[#565248]">
                {activeCategoryLines.length} lines configured
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedBudgetLineId('')}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                  !selectedBudgetLineId
                    ? 'bg-[#23211D] text-[#EDE8DA] border-[#23211D] font-semibold'
                    : 'bg-[#EDE8DA] text-[#565248] border-[#565248]/25 hover:bg-[#E5DFCE]'
                }`}
              >
                General / Untagged
              </button>
              {activeCategoryLines.map((line) => {
                const isLineActive = selectedBudgetLineId === line.id;
                return (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => setSelectedBudgetLineId(line.id)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                      isLineActive
                        ? 'bg-[#A8342A] text-[#EDE8DA] border-[#A8342A] font-semibold shadow-2xs'
                        : 'bg-[#EDE8DA] text-[#23211D] border-[#565248]/25 hover:border-[#A8342A]/50'
                    }`}
                  >
                    <span>{line.name}</span>
                    {line.budget > 0 && (
                      <span className="opacity-75 text-[10px] ml-1">
                        ({formatCurrency(line.budget, currency)})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Note and Date Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#E5DFCE]/60 border border-[#565248]/20 rounded-lg p-4 shadow-2xs">
          {/* Note Input */}
          <div>
            <label htmlFor="expense-note-input" className="block text-xs font-bold text-[#23211D] mb-1">
              {t.recordNoteLabel}
            </label>
            <input
              id="expense-note-input"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.recordNotePlaceholder}
              className="w-full bg-[#EDE8DA] border border-[#565248]/30 rounded-md px-3 py-2 text-xs sm:text-sm text-[#23211D] focus:outline-hidden focus:border-[#23211D]"
            />
          </div>

          {/* Date Input */}
          <div>
            <label htmlFor="expense-date-input" className="block text-xs font-bold text-[#23211D] mb-1">
              {t.recordDateLabel}
            </label>
            <div className="relative">
              <input
                id="expense-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#EDE8DA] border border-[#565248]/30 rounded-md px-3 py-2 text-xs sm:text-sm text-[#23211D] font-tabular focus:outline-hidden focus:border-[#23211D]"
              />
            </div>
          </div>
        </div>

        {/* Single Confirm Action */}
        <div className="pt-2">
          <button
            id="confirm-expense-btn"
            type="submit"
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full flex items-center justify-center space-x-2.5 bg-[#A8342A] hover:bg-[#8F2B22] disabled:opacity-50 text-[#EDE8DA] font-serif font-bold py-3.5 px-6 rounded-md shadow-xs transition-all active:scale-98 cursor-pointer text-base sm:text-lg"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{t.recordButton}</span>
          </button>
        </div>

      </form>
    </div>
  );
};
