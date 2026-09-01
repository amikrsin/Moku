import React, { useState, useEffect } from 'react';
import { 
  Category, 
  Expense, 
  Plan, 
  SUPPORTED_CURRENCIES 
} from '../types';
import { generateUUID } from '../lib/storage';
import { HankoStamp } from './HankoStamp';
import { getT, getCategoriesForCurrency } from '../lib/i18n';
import { 
  X, 
  Zap, 
  Check, 
  Tag, 
  Calendar as CalendarIcon,
  Plus
} from 'lucide-react';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthKey: string;
  plan: Plan | null;
  currency: string;
  onSaveExpense: (expense: Expense) => void;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  isOpen,
  onClose,
  monthKey,
  plan,
  currency,
  onSaveExpense,
}) => {
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
  const [showSuccessStamp, setShowSuccessStamp] = useState(false);
  const [lastSavedSummary, setLastSavedSummary] = useState<string>('');

  // Reset or focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowSuccessStamp(false);
      const d = new Date();
      setDate(d.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categoryLines = plan?.categoryBudgetLines?.[category] || [];

  const handleCategoryChange = (newCat: Category) => {
    setCategory(newCat);
    setSelectedBudgetLineId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;

    const now = new Date();
    const [y, m, d] = date.split('-').map((v) => parseInt(v, 10));
    const finalDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
    const expenseMonthKey = `${y}-${String(m).padStart(2, '0')}`;

    const chosenLine = categoryLines.find((l) => l.id === selectedBudgetLineId);

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

    onSaveExpense(newExpense);
    setLastSavedSummary(`${currencySymbol}${num.toLocaleString()} for ${note.trim() || categories[category].name}`);
    setShowSuccessStamp(true);

    // Brief delay then reset or close
    setTimeout(() => {
      setAmount('');
      setNote('');
      setSelectedBudgetLineId('');
      setShowSuccessStamp(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#23211D]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-[#EDE8DA] border-2 border-[#565248]/30 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden relative text-[#23211D]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-[#E5DFCE] border-b border-[#565248]/20 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-[#A8342A] text-[#EDE8DA] flex items-center justify-center shadow-xs">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#23211D]">
                Quick Log Expense
              </h3>
              <p className="text-[11px] text-[#565248]">
                Fast entry without leaving your page
              </p>
            </div>
          </div>

          <button
            id="close-quick-log-modal-btn"
            onClick={onClose}
            className="p-1.5 text-[#565248] hover:text-[#23211D] hover:bg-[#D5CEBE]/60 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Amount & Date in one row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Amount Field */}
            <div>
              <label className="block font-serif text-xs font-bold text-[#23211D] mb-1">
                Amount ({currency}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-serif text-[#A8342A] font-bold text-base">
                  {currencySymbol}
                </span>
                <input
                  id="quick-log-amount"
                  type="number"
                  step="any"
                  min="0.01"
                  autoFocus
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#E5DFCE]/70 border border-[#565248]/30 rounded-md pl-8 pr-3 py-2 text-lg font-bold font-tabular text-[#23211D] focus:outline-hidden focus:border-[#A8342A] focus:ring-1 focus:ring-[#A8342A]"
                />
              </div>
            </div>

            {/* Date Field */}
            <div>
              <label className="block font-serif text-xs font-bold text-[#23211D] mb-1 flex items-center space-x-1">
                <CalendarIcon className="w-3 h-3 text-[#565248]" />
                <span>Date</span>
              </label>
              <input
                id="quick-log-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#E5DFCE]/70 border border-[#565248]/30 rounded-md px-3 py-2 text-sm font-tabular text-[#23211D] focus:outline-hidden focus:border-[#A8342A]"
              />
            </div>
          </div>

          {/* Category Selector Pills */}
          <div>
            <label className="block font-serif text-xs font-bold text-[#23211D] mb-1.5">
              Category Pillar *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(categories) as Category[]).map((catKey) => {
                const cat = categories[catKey];
                const isSelected = category === catKey;

                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => handleCategoryChange(catKey)}
                    className={`flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#23211D] bg-[#E5DFCE] ring-1 ring-[#23211D] shadow-2xs font-bold'
                        : 'border-[#565248]/20 bg-[#EDE8DA] hover:bg-[#E5DFCE]/60 text-[#565248]'
                    }`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full mb-1"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-serif text-xs leading-tight text-[#23211D]">
                      {cat.name}
                    </span>
                    <span className="text-[10px] opacity-75 font-sans">
                      {cat.subhead.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-category Budget Line Selector (if available) */}
          {categoryLines.length > 0 && (
            <div>
              <label className="block font-serif text-xs font-bold text-[#23211D] mb-1 flex items-center space-x-1.5">
                <Tag className="w-3 h-3 text-[#A8342A]" />
                <span>Tagged Budget Line (Optional)</span>
              </label>
              <select
                id="quick-log-budget-line"
                value={selectedBudgetLineId}
                onChange={(e) => setSelectedBudgetLineId(e.target.value)}
                className="w-full bg-[#E5DFCE]/70 border border-[#565248]/30 rounded-md px-3 py-2 text-xs font-serif text-[#23211D] focus:outline-hidden focus:border-[#A8342A] cursor-pointer"
              >
                <option value="">-- General / Untagged ({categories[category].name}) --</option>
                {categoryLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name} {line.budget ? `(${currencySymbol}${line.budget})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Short Note Field */}
          <div>
            <label className="block font-serif text-xs font-bold text-[#23211D] mb-1">
              Description / Note (Optional)
            </label>
            <input
              id="quick-log-note"
              type="text"
              placeholder="e.g. Morning coffee, Metro smartcard, Groceries"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#E5DFCE]/70 border border-[#565248]/30 rounded-md px-3 py-2 text-xs text-[#23211D] focus:outline-hidden focus:border-[#A8342A]"
            />
          </div>

          {/* Success Notification Animation */}
          {showSuccessStamp && (
            <div className="bg-[#5C6E4E]/15 border border-[#5C6E4E]/40 rounded-md p-2.5 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2 text-xs text-[#5C6E4E] font-serif font-bold">
                <Check className="w-4 h-4" />
                <span>Recorded: {lastSavedSummary}</span>
              </div>
              <HankoStamp size="sm" animate={true} text={t.stampRecorded} />
            </div>
          )}

          {/* Submit & Cancel Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#565248]/30 rounded-md text-xs font-serif text-[#565248] hover:bg-[#E5DFCE] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-quick-log-btn"
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0}
              className="flex items-center space-x-1.5 bg-[#A8342A] hover:bg-[#8F2B22] disabled:opacity-50 text-[#EDE8DA] font-serif font-bold text-xs px-5 py-2 rounded-md shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Expense</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
