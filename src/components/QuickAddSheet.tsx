import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Check, ArrowRight, Tag } from 'lucide-react';
import { CATEGORIES, Category, Expense, QUICK_CHIP_SUGGESTIONS, Plan } from '../types';
import { generateUUID } from '../lib/storage';

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: Expense) => void;
  currency: string;
  monthKey: string;
  currentPlan?: Plan | null;
}

export function QuickAddSheet({
  isOpen,
  onClose,
  onSaveExpense,
  currency,
  monthKey,
  currentPlan,
}: QuickAddSheetProps) {
  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('survival');
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setNote('');
      setSelectedCategory('survival');
      setSelectedSector('');
      setDateStr(new Date().toISOString().slice(0, 10));
      setErrorMsg(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Compute sector suggestions: planned sectors first, plus standard quick chips
  const plannedSectorsForCategory = currentPlan?.plannedSectors?.[selectedCategory] || [];
  const plannedNames = plannedSectorsForCategory.map(s => s.name);
  const defaultChips = QUICK_CHIP_SUGGESTIONS[selectedCategory] || [];
  const combinedChips = Array.from(new Set([...plannedNames, ...defaultChips]));

  const handleSelectChip = (chipName: string) => {
    if (selectedSector === chipName) {
      setSelectedSector('');
    } else {
      setSelectedSector(chipName);
      if (!note) {
        setNote(chipName);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amountStr);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }

    const matchedPlannedSector = plannedSectorsForCategory.find(
      s => s.name.toLowerCase() === selectedSector.toLowerCase()
    );

    const newExpense: Expense = {
      id: generateUUID(),
      monthKey,
      amount: amountNum,
      category: selectedCategory,
      sectorId: matchedPlannedSector?.id,
      sectorName: selectedSector || undefined,
      note: note.trim() || selectedSector || `${CATEGORIES[selectedCategory].name} expense`,
      date: new Date(dateStr).toISOString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deleted: false,
    };

    onSaveExpense(newExpense);
    onClose();
  };

  const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : currency;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Dimmed backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Bottom Sheet Modal */}
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-[#1B1E1B] rounded-t-[28px] p-6 shadow-2xl z-10 border-t border-[#DDE2DD] dark:border-[#414842] animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto"
      >
        {/* Pull handle */}
        <div className="w-12 h-1.5 bg-[#DDE2DD] dark:bg-[#414842] rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
            Add Expense
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[#6E736F] dark:text-[#C1C7C0] hover:bg-[#EEF1EE] dark:hover:bg-[#252925] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Large Amount Input */}
          <div className="flex flex-col items-center justify-center py-3 bg-[#F7F8F7] dark:bg-[#252925] rounded-2xl border border-[#DDE2DD] dark:border-[#414842]">
            <span className="text-[11px] font-medium text-[#6E736F] dark:text-[#C1C7C0] uppercase tracking-wider mb-0.5">
              Amount ({currency})
            </span>
            <div className="flex items-center justify-center text-[#1A1C1A] dark:text-[#E3E5E1]">
              <span className="text-3xl font-bold mr-1 text-[#176B52] dark:text-[#82D9B4]">
                {currencySymbol}
              </span>
              <input
                ref={inputRef}
                id="quick-add-amount"
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="0"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-48 text-4xl font-extrabold text-center bg-transparent border-none outline-none font-tabular text-[#1A1C1A] dark:text-[#E3E5E1] placeholder:text-[#6E736F]/40"
              />
            </div>
            {errorMsg && (
              <p className="text-xs text-[#BA1A1A] font-medium mt-1">{errorMsg}</p>
            )}
          </div>

          {/* Category Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] uppercase tracking-wider mb-2">
              Select Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CATEGORIES) as Category[]).map((catKey) => {
                const cat = CATEGORIES[catKey];
                const isSelected = selectedCategory === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(catKey);
                      setSelectedSector('');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-start space-x-2.5 cursor-pointer ${
                      isSelected
                        ? 'border-[#176B52] bg-[#D8F3E7] dark:border-[#82D9B4] dark:bg-[#214C3D] shadow-xs'
                        : 'border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] hover:border-[#176B52]/50'
                    }`}
                  >
                    <span className="text-xl shrink-0">{cat.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#1A1C1A] dark:text-[#E3E5E1] flex items-center justify-between">
                        <span>{cat.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#176B52] dark:text-[#82D9B4]" />}
                      </div>
                      <div className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0] truncate">
                        {cat.subhead}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Context-aware Sector Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] uppercase tracking-wider flex items-center space-x-1">
                <Tag className="w-3 h-3 text-[#176B52] dark:text-[#82D9B4]" />
                <span>Planned Sector / Tag</span>
              </label>
              {selectedSector && (
                <button
                  type="button"
                  onClick={() => setSelectedSector('')}
                  className="text-[10px] text-[#6E736F] hover:text-[#BA1A1A]"
                >
                  Clear tag
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-1">
              {combinedChips.map((chip) => {
                const isSelected = selectedSector === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSelectChip(chip)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                      isSelected
                        ? 'bg-[#176B52] text-white border-[#176B52] dark:bg-[#82D9B4] dark:text-[#121412]'
                        : 'bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] border-[#DDE2DD] dark:border-[#414842] hover:border-[#176B52]/40'
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] uppercase tracking-wider mb-1">
              Description / Notes
            </label>
            <input
              id="quick-add-note"
              type="text"
              placeholder="e.g. Weekly pantry restock, coffee with team..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-xs text-[#1A1C1A] dark:text-[#E3E5E1] outline-none focus:border-[#176B52] dark:focus:border-[#82D9B4] transition-colors"
            />
          </div>

          {/* Date Selector */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-1.5 text-xs text-[#6E736F] dark:text-[#C1C7C0]">
              <Calendar className="w-3.5 h-3.5" />
              <span>Date:</span>
            </div>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="text-xs font-medium px-3 py-1 rounded-lg border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none"
            />
          </div>

          {/* Save Button */}
          <button
            id="quick-add-submit-btn"
            type="submit"
            className="w-full h-13 rounded-2xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] font-bold text-sm shadow-md active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>Save Expense</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
