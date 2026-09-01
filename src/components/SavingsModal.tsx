import React, { useState } from 'react';
import { SavingsDestination, SavingsEntry, SUPPORTED_CURRENCIES } from '../types';
import { formatCurrency, generateUUID, getTodayDateString } from '../lib/storage';
import { PiggyBank, X, Check, ArrowRight, ShieldCheck, Building2, Landmark, TrendingUp, Wallet, HelpCircle } from 'lucide-react';

interface SavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSavings: (entry: SavingsEntry) => void;
  currency: string;
  selectedMonth: string;
}

const DESTINATIONS: {
  id: SavingsDestination;
  label: string;
  desc: string;
  icon: React.ReactNode;
  suggestedReturn: string;
}[] = [
  {
    id: 'mutual_fund',
    label: 'Mutual Fund / SIP / Stocks',
    desc: 'Equity, debt, index funds, stocks',
    icon: <TrendingUp className="w-4 h-4 text-[#35415C]" />,
    suggestedReturn: '12.0% CAGR',
  },
  {
    id: 'fixed_deposit',
    label: 'Fixed Deposit (FD)',
    desc: 'Locked term bank or corporate deposit',
    icon: <Landmark className="w-4 h-4 text-[#5C6E4E]" />,
    suggestedReturn: '7.1% p.a.',
  },
  {
    id: 'recurring_deposit',
    label: 'Recurring Deposit (RD)',
    desc: 'Monthly systematic bank savings deposit',
    icon: <Building2 className="w-4 h-4 text-[#565248]" />,
    suggestedReturn: '6.8% p.a.',
  },
  {
    id: 'savings_account',
    label: 'High-Yield Savings Account',
    desc: 'Liquid interest-bearing bank account',
    icon: <PiggyBank className="w-4 h-4 text-[#B5652E]" />,
    suggestedReturn: '4.0% p.a.',
  },
  {
    id: 'cash',
    label: 'Physical Cash / Envelope',
    desc: 'Physical money reserved in an envelope or vault',
    icon: <Wallet className="w-4 h-4 text-[#23211D]" />,
    suggestedReturn: '0% (Liquid)',
  },
  {
    id: 'other',
    label: 'PPF / Gold / Bonds / Other',
    desc: 'Sovereign gold bonds, PPF, NPS, real estate',
    icon: <HelpCircle className="w-4 h-4 text-[#A8342A]" />,
    suggestedReturn: '7.1% PPF',
  },
];

export const SavingsModal: React.FC<SavingsModalProps> = ({
  isOpen,
  onClose,
  onSaveSavings,
  currency,
  selectedMonth,
}) => {
  const currencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || '₹';

  const [amount, setAmount] = useState<string>('');
  const [destination, setDestination] = useState<SavingsDestination>('mutual_fund');
  const [destinationCustom, setDestinationCustom] = useState<string>('');
  const [committedReturn, setCommittedReturn] = useState<string>('12.0% CAGR');
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    const [y, m] = selectedMonth.split('-');
    if (today.getFullYear() === parseInt(y, 10) && today.getMonth() + 1 === parseInt(m, 10)) {
      return today.toISOString().split('T')[0];
    }
    return `${selectedMonth}-01`;
  });
  const [notes, setNotes] = useState<string>('');
  const [showHanko, setShowHanko] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDestinationSelect = (destId: SavingsDestination) => {
    setDestination(destId);
    const item = DESTINATIONS.find((d) => d.id === destId);
    if (item && !committedReturn) {
      setCommittedReturn(item.suggestedReturn);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;

    let finalDateIso = getTodayDateString();
    let entryMonthKey = selectedMonth;
    if (date) {
      const parsedDate = new Date(`${date}T12:00:00Z`);
      if (!isNaN(parsedDate.getTime())) {
        finalDateIso = parsedDate.toISOString();
        const y = parsedDate.getFullYear();
        const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
        entryMonthKey = `${y}-${m}`;
      }
    }

    const newSavings: SavingsEntry = {
      id: generateUUID(),
      monthKey: entryMonthKey,
      amount: num,
      destination,
      destinationCustom: destination === 'other' ? destinationCustom.trim() : undefined,
      committedReturn: committedReturn.trim() || undefined,
      date: finalDateIso,
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deleted: false,
    };

    setShowHanko(true);
    setTimeout(() => {
      onSaveSavings(newSavings);
      setShowHanko(false);
      setAmount('');
      setNotes('');
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-[#EDE8DA] border-2 border-[#565248]/30 rounded-xl p-5 sm:p-7 shadow-2xl bg-ruled-paper overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corner binding */}
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
          <div className="absolute transform rotate-45 bg-[#5C6E4E] text-[#EDE8DA] text-[9px] font-serif font-bold py-0.5 right-[-35px] top-[18px] w-[120px] text-center shadow-xs">
            SAVINGS
          </div>
        </div>

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#565248]/20 pb-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#5C6E4E] text-[#EDE8DA] flex items-center justify-center shadow-xs">
              <PiggyBank className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-serif uppercase tracking-widest text-[#5C6E4E] font-bold block">
                Kakeibo Savings Log
              </span>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#23211D]">
                Log Actual Savings Set Aside
              </h3>
            </div>
          </div>
          <button
            id="close-savings-modal"
            onClick={onClose}
            className="text-[#565248] hover:text-[#23211D] p-1.5 rounded-md hover:bg-[#E5DFCE] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div>
            <label htmlFor="savings-amount" className="block text-xs font-serif font-bold text-[#23211D] mb-1">
              Amount Actually Set Aside:
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-serif text-base text-[#565248] font-bold">
                {currencySymbol}
              </span>
              <input
                id="savings-amount"
                type="number"
                step="any"
                min="1"
                required
                autoFocus
                placeholder="e.g. 10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#E5DFCE] border border-[#565248]/30 rounded-md pl-9 pr-3 py-2 text-[#23211D] font-tabular text-lg font-bold focus:outline-hidden focus:border-[#5C6E4E] focus:ring-1 focus:ring-[#5C6E4E]"
              />
            </div>
          </div>

          {/* Destination Selector */}
          <div>
            <label className="block text-xs font-serif font-bold text-[#23211D] mb-1.5">
              Savings Destination:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DESTINATIONS.map((dest) => {
                const isSelected = destination === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => handleDestinationSelect(dest.id)}
                    className={`flex items-center space-x-2 p-2 rounded-md border text-left transition-all text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-[#E5DFCE] border-[#5C6E4E] ring-1 ring-[#5C6E4E] text-[#23211D] font-semibold shadow-2xs'
                        : 'bg-[#EDE8DA]/70 border-[#565248]/20 text-[#565248] hover:bg-[#E5DFCE]/60'
                    }`}
                  >
                    <div className="shrink-0">{dest.icon}</div>
                    <div className="min-w-0">
                      <p className="truncate">{dest.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Destination (if other) */}
          {destination === 'other' && (
            <div>
              <label htmlFor="custom-destination" className="block text-xs font-serif text-[#565248] mb-1">
                Specific Destination Name:
              </label>
              <input
                id="custom-destination"
                type="text"
                value={destinationCustom}
                onChange={(e) => setDestinationCustom(e.target.value)}
                placeholder="e.g. PPF Account, Sovereign Gold Bond, NPS"
                className="w-full bg-[#E5DFCE] border border-[#565248]/30 rounded-md px-3 py-1.5 text-xs text-[#23211D] focus:outline-hidden focus:border-[#5C6E4E]"
              />
            </div>
          )}

          {/* Committed Return & Date in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="committed-return" className="block text-xs font-serif font-bold text-[#23211D] mb-1">
                Committed Return (Optional):
              </label>
              <input
                id="committed-return"
                type="text"
                value={committedReturn}
                onChange={(e) => setCommittedReturn(e.target.value)}
                placeholder="e.g. 6.5% p.a., 12% CAGR, 7.1% PPF"
                className="w-full bg-[#E5DFCE] border border-[#565248]/30 rounded-md px-3 py-1.5 text-xs text-[#23211D] focus:outline-hidden focus:border-[#5C6E4E]"
              />
            </div>

            <div>
              <label htmlFor="savings-date" className="block text-xs font-serif font-bold text-[#23211D] mb-1">
                Deposit Date:
              </label>
              <input
                id="savings-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#E5DFCE] border border-[#565248]/30 rounded-md px-3 py-1.5 text-xs text-[#23211D] focus:outline-hidden focus:border-[#5C6E4E]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="savings-notes" className="block text-xs font-serif font-bold text-[#23211D] mb-1">
              Notes / Remarks (Optional):
            </label>
            <input
              id="savings-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Auto-debit on 5th, Emergency reserve, Nifty 50 Index"
              className="w-full bg-[#E5DFCE] border border-[#565248]/30 rounded-md px-3 py-1.5 text-xs text-[#23211D] focus:outline-hidden focus:border-[#5C6E4E]"
            />
          </div>

          {/* Submit button & Hanko */}
          <div className="pt-2 flex items-center justify-between border-t border-[#565248]/20">
            <p className="text-[11px] text-[#565248] italic flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5C6E4E]" />
              <span>Directly drives your savings target progress.</span>
            </p>

            <button
              id="submit-savings-btn"
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0}
              className="flex items-center space-x-2 bg-[#5C6E4E] hover:bg-[#4B5B3E] disabled:opacity-50 text-[#EDE8DA] font-serif font-bold px-5 py-2 rounded-md shadow-xs transition-all cursor-pointer text-xs sm:text-sm active:scale-98"
            >
              <span>Inscribe Savings</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Hanko Stamp Confirmation Overlay */}
        {showHanko && (
          <div className="absolute inset-0 bg-[#EDE8DA]/90 flex items-center justify-center z-20 animate-hanko">
            <div className="border-4 border-[#5C6E4E] rounded-md p-4 text-[#5C6E4E] font-serif font-bold text-center tracking-widest uppercase bg-[#EDE8DA] shadow-lg">
              <div className="text-xl">SAVINGS LOGGED</div>
              <div className="text-xs mt-1 font-sans">{formatCurrency(parseFloat(amount) || 0, currency)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
