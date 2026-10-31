import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Check, 
  ArrowRight, 
  Tag, 
  Sparkles, 
  ClipboardPaste, 
  MessageSquareText,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Mic,
  MicOff,
  RotateCcw,
  Plus,
  Heart,
  Scale,
  HelpCircle,
  History
} from 'lucide-react';
import { CATEGORIES, Category, Expense, QUICK_CHIP_SUGGESTIONS, Plan } from '../types';
import { generateUUID } from '../lib/storage';
import { parseSingleSms, parseQuickMemo } from '../lib/smsParser';
import { AppButton } from './ui/AppButton';

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: Expense) => void;
  currency: string;
  monthKey: string;
  currentPlan?: Plan | null;
  recentExpenses?: Expense[];
}

export function QuickAddSheet({
  isOpen,
  onClose,
  onSaveExpense,
  currency,
  monthKey,
  currentPlan,
  recentExpenses = [],
}: QuickAddSheetProps) {
  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('survival');
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'Cash' | 'NetBanking'>('UPI');
  const [joyRating, setJoyRating] = useState<'essential' | 'worth_it' | 'could_skip'>('essential');
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSmsBox, setShowSmsBox] = useState<boolean>(false);
  const [smsText, setSmsText] = useState<string>('');
  const [smsSuccessMsg, setSmsSuccessMsg] = useState<string | null>(null);
  const [quickMemoInput, setQuickMemoInput] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recentSavedToast, setRecentSavedToast] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Currency symbols & quick chips setup
  const currencySymbol = useMemo(() => {
    switch (currency) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      case 'CAD': return 'CA$';
      case 'AUD': return 'A$';
      case 'SGD': return 'S$';
      default: return currency;
    }
  }, [currency]);

  // Quick Amount incremental chips tailored to currency
  const quickAmountIncrements = useMemo(() => {
    if (currency === 'INR') {
      return [50, 100, 200, 500, 1000, 2000];
    } else if (currency === 'JPY') {
      return [100, 500, 1000, 2000, 5000];
    } else {
      return [5, 10, 20, 50, 100];
    }
  }, [currency]);

  // Extract recent unique expense templates from history
  const recentPresets = useMemo(() => {
    const list: Array<{ label: string; amount: number; category: Category; sector?: string; note: string }> = [];
    const seen = new Set<string>();

    const activeList = recentExpenses.filter((e) => !e.deleted && e.amount > 0);
    for (const exp of activeList) {
      const cleanNote = (exp.note || exp.sectorName || '').trim();
      const key = `${exp.category}-${cleanNote.toLowerCase()}`;
      if (cleanNote && !seen.has(key)) {
        seen.add(key);
        list.push({
          label: cleanNote,
          amount: exp.amount,
          category: exp.category,
          sector: exp.sectorName,
          note: cleanNote,
        });
        if (list.length >= 5) break;
      }
    }
    return list;
  }, [recentExpenses]);

  // Auto focus input and reset state when opened
  useEffect(() => {
    if (isOpen) {
      resetFormFields();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        setIsListening(false);
      }
    }
  }, [isOpen]);

  const resetFormFields = () => {
    setAmountStr('');
    setNote('');
    setSelectedCategory('survival');
    setSelectedSector('');
    setPaymentMethod('UPI');
    setJoyRating('essential');
    setDateStr(new Date().toISOString().slice(0, 10));
    setErrorMsg(null);
    setShowSmsBox(false);
    setSmsText('');
    setSmsSuccessMsg(null);
    setQuickMemoInput('');
    setIsListening(false);
  };

  if (!isOpen) return null;

  // Handle Quick Amount incremental chip press
  const handleAddIncrement = (val: number) => {
    const current = parseFloat(amountStr) || 0;
    const next = current + val;
    setAmountStr(String(next));
    if (errorMsg) setErrorMsg(null);
  };

  // Handle Quick Preset Tap
  const handleApplyPreset = (preset: typeof recentPresets[0]) => {
    setAmountStr(String(preset.amount));
    setSelectedCategory(preset.category);
    if (preset.sector) setSelectedSector(preset.sector);
    setNote(preset.note);
    if (errorMsg) setErrorMsg(null);
    setSmsSuccessMsg(`Filled preset: ${preset.note} (${currencySymbol}${preset.amount})`);
    setTimeout(() => setSmsSuccessMsg(null), 2500);
  };

  // Quick NLP memo input change
  const handleQuickMemoChange = (val: string) => {
    setQuickMemoInput(val);
    if (!val.trim()) return;

    const parsed = parseQuickMemo(val);
    if (parsed) {
      if (parsed.amount && parsed.amount > 0) {
        setAmountStr(String(parsed.amount));
      }
      if (parsed.category) {
        setSelectedCategory(parsed.category);
      }
      if (parsed.sector) {
        setSelectedSector(parsed.sector);
      }
      if (parsed.note) {
        setNote(parsed.note);
      }
      if (parsed.paymentMethod) {
        setPaymentMethod(parsed.paymentMethod);
      }
      if (errorMsg) setErrorMsg(null);
    }
  };

  // Web Speech API Voice Dictation
  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('Voice dictation is not supported on this browser. Try typing in Quick Memo.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = currency === 'INR' ? 'en-IN' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setQuickMemoInput(transcript);
          handleQuickMemoChange(transcript);
          setSmsSuccessMsg(`Heard: "${transcript}"`);
          setTimeout(() => setSmsSuccessMsg(null), 3000);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        setErrorMsg(`Voice input: ${event.error || 'could not capture speech'}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      setErrorMsg('Could not initialize microphone. Please check browser permissions.');
      setIsListening(false);
    }
  };

  // SMS auto fill
  const applySmsToForm = (raw: string) => {
    const parsed = parseSingleSms(raw);
    if (!parsed) {
      setErrorMsg('Could not detect an amount in that SMS. Try pasting the full bank/UPI message.');
      setShowSmsBox(true);
      return false;
    }
    setAmountStr(String(parsed.amount));
    setSelectedCategory(parsed.suggestedCategory);
    if (parsed.suggestedSector) {
      setSelectedSector(parsed.suggestedSector);
    }
    setNote(parsed.merchant);
    if (parsed.dateIso) {
      setDateStr(parsed.dateIso);
    }
    if (/upi/i.test(raw)) setPaymentMethod('UPI');
    else if (/card/i.test(raw)) setPaymentMethod('Card');
    else if (/cash/i.test(raw)) setPaymentMethod('Cash');

    setErrorMsg(null);
    setSmsSuccessMsg(`Auto-filled: ${parsed.merchant} (${currencySymbol}${parsed.amount})`);
    setShowSmsBox(false);
    setSmsText('');
    return true;
  };

  const handleClipboardPaste = async () => {
    setSmsSuccessMsg(null);
    setErrorMsg(null);
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          applySmsToForm(text);
          return;
        }
      }
      setShowSmsBox((prev) => !prev);
    } catch {
      setShowSmsBox(true);
    }
  };

  // Planned sector suggestions
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

  const prepareExpenseObject = (): Expense | null => {
    const amountNum = parseFloat(amountStr);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Please enter a valid amount');
      return null;
    }

    const matchedPlannedSector = plannedSectorsForCategory.find(
      s => s.name.toLowerCase() === selectedSector.toLowerCase()
    );

    const expenseMonthKey = dateStr && dateStr.length >= 7 ? dateStr.slice(0, 7) : monthKey;
    const now = new Date();
    let finalIsoDate: string;
    try {
      const parts = dateStr.split('-').map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        finalIsoDate = new Date(parts[0], parts[1] - 1, parts[2], now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
      } else {
        finalIsoDate = new Date(dateStr).toISOString();
      }
    } catch {
      finalIsoDate = now.toISOString();
    }

    const newExpense: Expense = {
      id: generateUUID(),
      monthKey: expenseMonthKey,
      amount: Math.round((amountNum + Number.EPSILON) * 100) / 100,
      category: selectedCategory,
      sectorId: matchedPlannedSector?.id,
      sectorName: selectedSector || undefined,
      note: note.trim() || selectedSector || `${CATEGORIES[selectedCategory].name} expense`,
      date: finalIsoDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deleted: false,
      paymentMethod,
      joyRating,
    };

    return newExpense;
  };

  const handleSaveAndClose = (e: React.FormEvent) => {
    e.preventDefault();
    const expense = prepareExpenseObject();
    if (expense) {
      onSaveExpense(expense);
      onClose();
    }
  };

  const handleSaveAndAddAnother = (e: React.MouseEvent) => {
    e.preventDefault();
    const expense = prepareExpenseObject();
    if (expense) {
      onSaveExpense(expense);
      setRecentSavedToast(`Saved ${currencySymbol}${expense.amount} for ${expense.note}!`);
      setTimeout(() => setRecentSavedToast(null), 2500);

      // Reset form but keep date and payment method for fast continuous entry
      setAmountStr('');
      setNote('');
      setSelectedSector('');
      setQuickMemoInput('');
      setErrorMsg(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      {/* Dimmed backdrop */}
      <div 
        className="fixed inset-0 bg-black/55 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 pointer-events-auto"
        onClick={onClose}
      />

      {/* Bottom Sheet Modal */}
      <div 
        className="relative w-full max-w-md bg-[var(--moku-surface)] rounded-t-[28px] px-4.5 pt-3 pb-7 sm:pb-8 shadow-[0_-12px_45px_rgba(0,0,0,0.25)] z-10 border-t border-x border-[var(--moku-outline)] animate-in slide-in-from-bottom duration-300 pointer-events-auto max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        {/* Pull handle */}
        <div className="w-10 h-1 bg-[var(--moku-outline)] rounded-full mx-auto mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--moku-text-primary)] leading-tight flex items-center space-x-1.5">
              <span>Quick Expense</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--moku-primary-container)] text-[var(--moku-primary)] border border-[var(--moku-primary)]/20">
                Kakeibo
              </span>
            </h2>
            <span className="text-[11px] text-[var(--moku-text-secondary)]">
              Instant amount, smart memo, or SMS auto-fill
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handleClipboardPaste}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-[var(--moku-primary-container)] text-[var(--moku-primary)] text-[11px] font-bold border border-[var(--moku-primary)]/25 hover:opacity-90 transition-opacity cursor-pointer"
              title="Paste copied Bank or UPI SMS to auto-fill"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste SMS</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)] hover:bg-[var(--moku-surface-secondary)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Instant Saved Toast for continuous entry */}
        {recentSavedToast && (
          <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-between shadow-xs animate-in slide-in-from-top duration-200">
            <span>✓ {recentSavedToast}</span>
            <span className="text-[10px] opacity-80">Ready for next</span>
          </div>
        )}

        {/* SMS Success Banner */}
        {smsSuccessMsg && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center justify-between">
            <span>✓ {smsSuccessMsg}</span>
            <button type="button" onClick={() => setSmsSuccessMsg(null)} className="ml-2 text-xs opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Inline SMS Paste Box */}
        {showSmsBox && (
          <div className="mb-2.5 p-3 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-primary)]/30 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--moku-primary)] flex items-center space-x-1">
                <MessageSquareText className="w-3.5 h-3.5" />
                <span>Paste Bank / UPI SMS Message</span>
              </span>
              <button
                type="button"
                onClick={() => setShowSmsBox(false)}
                className="text-[10px] text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)] cursor-pointer"
              >
                Hide
              </button>
            </div>
            <textarea
              rows={2}
              value={smsText}
              onChange={(e) => {
                const val = e.target.value;
                setSmsText(val);
                if (val.length > 12 && /(?:rs|inr|₹|\$|debited|spent|paid|upi)/i.test(val)) {
                  applySmsToForm(val);
                }
              }}
              placeholder="Paste SMS here (e.g. 'Rs. 450 debited via UPI to Swiggy')..."
              className="w-full p-2.5 rounded-xl bg-[var(--moku-surface)] border border-[var(--moku-outline)] text-xs text-[var(--moku-text-primary)] outline-none focus:border-[var(--moku-primary)] resize-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => applySmsToForm(smsText)}
                disabled={!smsText.trim()}
                className="px-3 py-1.5 rounded-xl bg-[var(--moku-primary)] text-[var(--moku-on-primary)] text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Auto-Fill Fields
              </button>
            </div>
          </div>
        )}

        {/* Natural Language Smart Memo / Voice Bar */}
        <div className="mb-2.5 p-2 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] flex items-center space-x-2">
          <input
            type="text"
            value={quickMemoInput}
            onChange={(e) => handleQuickMemoChange(e.target.value)}
            placeholder="Smart input: e.g. 'Lunch 350 at Subway' or 'Coffee 150'"
            className="flex-1 bg-transparent border-none outline-none text-xs text-[var(--moku-text-primary)] placeholder:text-[var(--moku-text-secondary)]/60 px-1"
          />
          {quickMemoInput && (
            <button
              type="button"
              onClick={() => setQuickMemoInput('')}
              className="p-1 text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)] cursor-pointer"
              title="Clear memo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-[var(--moku-surface)] border border-[var(--moku-outline)] text-[var(--moku-text-secondary)] hover:text-[var(--moku-primary)]'
            }`}
            title={isListening ? 'Listening... click to stop' : 'Tap to speak transaction'}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
        </div>

        <form onSubmit={handleSaveAndClose} className="space-y-2.5">
          {/* Main Amount Input & Increments */}
          <div className="p-3 bg-[var(--moku-surface-secondary)] rounded-2xl border border-[var(--moku-outline)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider">
                Amount ({currencySymbol})
              </span>
              {amountStr && (
                <button
                  type="button"
                  onClick={() => setAmountStr('')}
                  className="text-[10px] font-semibold text-[var(--moku-text-secondary)] hover:text-[var(--moku-danger)] flex items-center space-x-0.5 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Clear (C)</span>
                </button>
              )}
            </div>

            {/* Input Box */}
            <div className="flex items-center justify-center text-[var(--moku-text-primary)] w-full py-1">
              <span className="text-2xl sm:text-3xl font-bold mr-1 text-[var(--moku-primary)] select-none">
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
                className="w-44 sm:w-52 text-3xl sm:text-4xl font-extrabold text-center bg-transparent border-none outline-none font-tabular text-[var(--moku-text-primary)] placeholder:text-[var(--moku-text-secondary)]/30 focus:ring-0 appearance-none m-0"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-[var(--moku-danger)] font-medium text-center">{errorMsg}</p>
            )}

            {/* Quick Amount Increments (+10, +50, +100, etc.) */}
            <div className="flex items-center justify-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              {quickAmountIncrements.map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => handleAddIncrement(inc)}
                  className="px-2 py-1 rounded-lg bg-[var(--moku-surface)] border border-[var(--moku-outline)] hover:border-[var(--moku-primary)] text-[11px] font-bold text-[var(--moku-text-primary)] transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs"
                >
                  +{currencySymbol}{inc >= 1000 ? `${inc / 1000}k` : inc}
                </button>
              ))}
            </div>
          </div>

          {/* Recent / Frequent Presets */}
          {recentPresets.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider flex items-center space-x-1">
                <History className="w-2.5 h-2.5 text-[var(--moku-primary)]" />
                <span>Recent Frequent</span>
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {recentPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] hover:border-[var(--moku-primary)] text-[11px] text-[var(--moku-text-primary)] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 shrink-0"
                  >
                    <span>{CATEGORIES[preset.category].icon}</span>
                    <span>{preset.label}</span>
                    <span className="text-[var(--moku-text-secondary)] font-tabular text-[10px]">
                      {currencySymbol}{preset.amount}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4-Pillar Kakeibo Category Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider">
                Kakeibo Pillar
              </label>
              <span className="text-[10px] text-[var(--moku-primary)] font-bold">
                {CATEGORIES[selectedCategory].name} · {CATEGORIES[selectedCategory].subhead}
              </span>
            </div>
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
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center space-x-2 cursor-pointer ${
                      isSelected
                        ? 'border-[var(--moku-primary)] bg-[var(--moku-primary-container)] text-[var(--moku-primary)] shadow-2xs font-semibold ring-1 ring-[var(--moku-primary)]'
                        : 'border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] hover:border-[var(--moku-primary)]/40'
                    }`}
                  >
                    <span className="text-lg shrink-0 select-none">{cat.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span className="truncate">{cat.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--moku-primary)] shrink-0 ml-1" />}
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider flex items-center space-x-1">
                <Tag className="w-2.5 h-2.5 text-[var(--moku-primary)]" />
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

            <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto py-0.5">
              {combinedChips.map((chip) => {
                const isPlanned = plannedNames.includes(chip);
                const isSelected = selectedSector === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSelectChip(chip)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border cursor-pointer inline-flex items-center space-x-1 ${
                      isSelected
                        ? 'bg-[var(--moku-primary)] text-[var(--moku-on-primary)] border-[var(--moku-primary)] font-bold shadow-2xs'
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

          {/* Description & Payment Method Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1">
                Description / Merchant
              </label>
              <input
                id="quick-add-note"
                type="text"
                placeholder="e.g. Swiggy, Metro, Coffee, Clinic..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-xs text-[var(--moku-text-primary)] outline-none focus:border-[var(--moku-primary)] transition-colors placeholder:text-[var(--moku-text-secondary)]/50"
              />
            </div>

            {/* Payment Method Pills */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1">
                Payment Account
              </label>
              <div className="grid grid-cols-4 gap-1 h-10">
                {(['UPI', 'Card', 'Cash', 'NetBanking'] as const).map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`h-full rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--moku-primary)] bg-[var(--moku-primary-container)] text-[var(--moku-primary)]'
                          : 'border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)]'
                      }`}
                    >
                      {method === 'UPI' && <Smartphone className="w-3 h-3 mb-0.5" />}
                      {method === 'Card' && <CreditCard className="w-3 h-3 mb-0.5" />}
                      {method === 'Cash' && <Banknote className="w-3 h-3 mb-0.5" />}
                      {method === 'NetBanking' && <Building2 className="w-3 h-3 mb-0.5" />}
                      <span>{method}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Kakeibo Mindful Purchase Evaluation (Joy Rating) & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Mindful Joy Rating */}
            <div className="p-2 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider block">
                Kakeibo Joy / Mindful Value
              </span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setJoyRating('essential')}
                  className={`py-1 px-1 rounded-lg text-[10px] font-semibold border flex items-center justify-center space-x-1 cursor-pointer transition-colors ${
                    joyRating === 'essential'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'border-transparent text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface)]'
                  }`}
                  title="Essential expense for health and sustenance"
                >
                  <Scale className="w-2.5 h-2.5" />
                  <span>Essential</span>
                </button>

                <button
                  type="button"
                  onClick={() => setJoyRating('worth_it')}
                  className={`py-1 px-1 rounded-lg text-[10px] font-semibold border flex items-center justify-center space-x-1 cursor-pointer transition-colors ${
                    joyRating === 'worth_it'
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300 font-bold'
                      : 'border-transparent text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface)]'
                  }`}
                  title="Brought true joy, meaning, or happiness"
                >
                  <Heart className="w-2.5 h-2.5" />
                  <span>Joyful</span>
                </button>

                <button
                  type="button"
                  onClick={() => setJoyRating('could_skip')}
                  className={`py-1 px-1 rounded-lg text-[10px] font-semibold border flex items-center justify-center space-x-1 cursor-pointer transition-colors ${
                    joyRating === 'could_skip'
                      ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-300 font-bold'
                      : 'border-transparent text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface)]'
                  }`}
                  title="Impulsive or could have skipped"
                >
                  <HelpCircle className="w-2.5 h-2.5" />
                  <span>Could Skip</span>
                </button>
              </div>
            </div>

            {/* Date Picker */}
            <div className="flex items-center justify-between p-2 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)]">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wide">
                <Calendar className="w-3.5 h-3.5 text-[var(--moku-primary)]" />
                <span className="text-[10px]">Date</span>
              </div>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="text-xs font-semibold px-2 py-1 rounded-lg border border-[var(--moku-outline)] bg-[var(--moku-surface)] text-[var(--moku-text-primary)] outline-none focus:border-[var(--moku-primary)] cursor-pointer"
              />
            </div>
          </div>

          {/* Dual Action Buttons: Save & Close vs Save & Add Another */}
          <div className="pt-2 grid grid-cols-2 gap-2">
            <button
              id="quick-add-more-btn"
              type="button"
              onClick={handleSaveAndAddAnother}
              className="h-11 px-3 rounded-xl border border-[var(--moku-primary)]/40 bg-[var(--moku-surface-secondary)] text-[var(--moku-primary)] text-xs font-bold hover:bg-[var(--moku-primary-container)] transition-colors flex items-center justify-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save &amp; Add More</span>
            </button>

            <AppButton
              id="quick-add-submit-btn"
              type="submit"
              size="md"
              className="h-11 text-xs sm:text-sm font-bold shadow-sm"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Save Expense
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  );
}
