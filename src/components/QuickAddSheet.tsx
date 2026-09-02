import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Check, ArrowRight, Tag, Sparkles } from 'lucide-react';
import { CATEGORIES, Category, Expense, QUICK_CHIP_SUGGESTIONS, Plan } from '../types';
import { generateUUID } from '../lib/storage';
import { AppButton } from './ui/AppButton';

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
        className="relative w-full max-w-lg bg-[var(--moku-surface)] rounded-t-[28px] p-6 shadow-2xl z-10 border-t border-[var(--moku-outline)] animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto"
      >
        {/* Pull handle */}
        <div className="w-12 h-1.5 bg-[var(--moku-outline)] rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-[var(--moku-text-primary)]">
            Add Expense
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface-secondary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Large Amount Input */}
          <div className="flex flex-col items-center justify-center py-3 bg-[var(--moku-surface-secondary)] rounded-2xl border border-[var(--moku-outline)]">
            <span className="text-[11px] font-medium text-[var(--moku-text-secondary)] uppercase tracking-wider mb-0.5">
              Amount ({currency})
            </span>
            <div className="flex items-center justify-center text-[var(--moku-text-primary)]">
              <span className="text-3xl font-bold mr-1 text-[var(--moku-primary)]">
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
                className="w-48 text-4xl font-extrabold text-center bg-transparent border-none outline-none font-tabular text-[var(--moku-text-primary)] placeholder:text-[var(--moku-text-secondary)]/40"
              />
            </div>
            {errorMsg && (
              <p className="text-xs text-[var(--moku-danger)] font-medium mt-1">{errorMsg}</p>
            )}
          </div>

          {/* Category Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-2">
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
                        ? 'border-[var(--moku-primary)] bg-[var(--moku-primary-container)] text-[var(--moku-primary)] shadow-2xs'
                        : 'border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] hover:border-[var(--moku-primary)]/50'
                    }`}
                  >
                    <span className="text-xl shrink-0 select-none">{cat.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{cat.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--moku-primary)]" />}
                      </div>
                      <div className="text-[10px] text-[var(--moku-text-secondary)] truncate">
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
              <label className="text-xs font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider flex items-center space-x-1">
                <Tag className="w-3 h-3 text-[var(--moku-primary)]" />
                <span>Planned Sector / Tag</span>
              </label>
              {selectedSector && (
                <button
                  type="button"
                  onClick={() => setSelectedSector('')}
                  className="text-[10px] text-[var(--moku-text-secondary)] hover:text-[var(--moku-danger)] cursor-pointer"
                >
                  Clear tag
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-1">
              {combinedChips.map((chip) => {
                const isPlanned = plannedNames.includes(chip);
                const isSelected = selectedSector === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSelectChip(chip)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border cursor-pointer inline-flex items-center space-x-1 ${
                      isSelected
                        ? 'bg-[var(--moku-primary)] text-white border-[var(--moku-primary)]'
                        : isPlanned
                        ? 'bg-[var(--moku-surface-secondary)] border-[var(--moku-primary)]/30 text-[var(--moku-primary)] hover:bg-[var(--moku-primary-container)]'
                        : 'bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] border-[var(--moku-outline)] hover:border-[var(--moku-primary)]/40'
                    }`}
                  >
                    {isPlanned && <Sparkles className="w-2.5 h-2.5 opacity-80" />}
                    <span>{chip}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-xs font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1">
              Description / Notes
            </label>
            <input
              id="quick-add-note"
              type="text"
              placeholder="e.g. Weekly pantry restock, coffee with team..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-xs text-[var(--moku-text-primary)] outline-none focus:border-[var(--moku-primary)] transition-colors"
            />
          </div>

          {/* Date Selector */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-1.5 text-xs text-[var(--moku-text-secondary)]">
              <Calendar className="w-3.5 h-3.5" />
              <span>Date:</span>
            </div>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="text-xs font-medium px-3 py-1 rounded-lg border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] outline-none"
            />
          </div>

          {/* Save Button */}
          <AppButton
            id="quick-add-submit-btn"
            type="submit"
            fullWidth
            size="lg"
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            Save Expense
          </AppButton>
        </form>
      </div>
    </div>
  );
}
