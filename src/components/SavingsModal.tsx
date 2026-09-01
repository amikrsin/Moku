import React, { useState } from 'react';
import { SavingsDestination, SavingsEntry, SUPPORTED_CURRENCIES } from '../types';
import { formatCurrency, generateUUID, getTodayDateString } from '../lib/storage';
import { 
  PiggyBank, 
  X, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Building2, 
  Landmark, 
  TrendingUp, 
  Wallet, 
  HelpCircle,
  Calendar,
  Percent,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

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
    desc: 'Equity, index funds, ETFs, portfolio stocks',
    icon: <TrendingUp className="w-4 h-4 text-[#35415C]" />,
    suggestedReturn: '12.0% CAGR',
  },
  {
    id: 'fixed_deposit',
    label: 'Fixed Deposit (FD)',
    desc: 'Term deposit with bank or NBFC',
    icon: <Landmark className="w-4 h-4 text-[#5C6E4E]" />,
    suggestedReturn: '7.1% p.a.',
  },
  {
    id: 'recurring_deposit',
    label: 'Recurring Deposit (RD)',
    desc: 'Monthly systematic bank savings',
    icon: <Building2 className="w-4 h-4 text-[#565248]" />,
    suggestedReturn: '6.8% p.a.',
  },
  {
    id: 'savings_account',
    label: 'High-Yield Savings',
    desc: 'Liquid interest-bearing bank deposit',
    icon: <PiggyBank className="w-4 h-4 text-[#B5652E]" />,
    suggestedReturn: '4.0% p.a.',
  },
  {
    id: 'cash',
    label: 'Physical Cash Reserve',
    desc: 'Physical emergency cash or envelope',
    icon: <Wallet className="w-4 h-4 text-[#23211D]" />,
    suggestedReturn: '0% (Liquid)',
  },
  {
    id: 'other',
    label: 'PPF / Gold / Bonds / Other',
    desc: 'Government bonds, gold, PPF, NPS',
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
  const [isDestinationAccordionOpen, setIsDestinationAccordionOpen] = useState<boolean>(false);
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
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentDestObj = DESTINATIONS.find((d) => d.id === destination) || DESTINATIONS[0];

  const handleDestinationSelect = (destId: SavingsDestination) => {
    setDestination(destId);
    const item = DESTINATIONS.find((d) => d.id === destId);
    if (item) {
      setCommittedReturn(item.suggestedReturn);
    }
    setIsDestinationAccordionOpen(false);
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

    setIsSuccess(true);
    setTimeout(() => {
      onSaveSavings(newSavings);
      setIsSuccess(false);
      setAmount('');
      setNotes('');
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-[#EDE8DA] border-2 border-[#565248]/30 rounded-2xl p-5 sm:p-7 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#565248]/20 pb-3.5 mb-3.5 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#5C6E4E] text-[#EDE8DA] flex items-center justify-center shadow-xs">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#23211D] leading-snug">
                Log Savings Deposit
              </h3>
              <p className="text-xs text-[#565248] font-serif">
                Record actual money set aside to achieve your monthly target
              </p>
            </div>
          </div>
          <button
            id="close-savings-modal"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#565248] hover:text-[#23211D] hover:bg-[#E5DFCE] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Area */}
        <form onSubmit={handleSubmit} className="space-y-3.5 overflow-y-auto pr-1 flex-1">
          {/* Amount input */}
          <div className="bg-[#E5DFCE]/70 border border-[#565248]/25 rounded-xl p-3.5 space-y-1.5 shadow-2xs">
            <label htmlFor="savings-amount" className="block text-xs font-serif font-bold text-[#23211D]">
              Deposit Amount:
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-serif text-lg text-[#5C6E4E] font-bold">
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
                className="w-full bg-[#EDE8DA] border-2 border-[#565248]/30 rounded-lg pl-10 pr-3 py-2 text-[#23211D] font-tabular text-xl font-bold focus:outline-hidden focus:border-[#5C6E4E] focus:ring-1 focus:ring-[#5C6E4E]"
              />
            </div>
          </div>

          {/* Accordion Destination Selector */}
          <div className="bg-[#E5DFCE]/60 border border-[#565248]/25 rounded-xl p-3 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-serif font-bold text-[#23211D] flex items-center space-x-1.5">
                <span>Savings Vehicle / Destination:</span>
              </label>
              <button
                type="button"
                id="toggle-destination-accordion"
                onClick={() => setIsDestinationAccordionOpen(!isDestinationAccordionOpen)}
                className="flex items-center space-x-1 text-xs text-[#5C6E4E] hover:text-[#4B5B3E] font-serif font-semibold cursor-pointer bg-[#EDE8DA] border border-[#565248]/20 px-2 py-0.5 rounded-md transition-colors"
              >
                <span>{isDestinationAccordionOpen ? 'Collapse' : 'Change Vehicle'}</span>
                {isDestinationAccordionOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Collapsed Selected View */}
            {!isDestinationAccordionOpen && (
              <div
                onClick={() => setIsDestinationAccordionOpen(true)}
                className="flex items-center justify-between p-2.5 rounded-lg border-2 border-[#5C6E4E] bg-[#EDE8DA] shadow-xs cursor-pointer transition-all hover:bg-[#E5DFCE]"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="p-1.5 rounded-md bg-[#E5DFCE] border border-[#565248]/15 shrink-0 shadow-2xs">
                    {currentDestObj.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <p className="font-serif font-bold text-xs sm:text-sm text-[#23211D] truncate">
                        {currentDestObj.label}
                      </p>
                      <span className="text-[10px] bg-[#5C6E4E]/15 text-[#5C6E4E] border border-[#5C6E4E]/30 px-1.5 py-0.2 rounded-xs font-tabular font-semibold">
                        {currentDestObj.suggestedReturn}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#565248] truncate">{currentDestObj.desc}</p>
                  </div>
                </div>

                <span className="text-xs font-serif text-[#5C6E4E] font-bold flex items-center space-x-0.5 shrink-0 ml-2">
                  <span>Selected</span>
                  <Check className="w-3.5 h-3.5" />
                </span>
              </div>
            )}

            {/* Expanded Accordion Grid View */}
            {isDestinationAccordionOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in fade-in duration-200">
                {DESTINATIONS.map((dest) => {
                  const isSelected = destination === dest.id;
                  return (
                    <button
                      key={dest.id}
                      type="button"
                      onClick={() => handleDestinationSelect(dest.id)}
                      className={`flex items-center space-x-2.5 p-2 rounded-lg border text-left transition-all text-xs cursor-pointer ${
                        isSelected
                          ? 'bg-[#EDE8DA] border-[#5C6E4E] ring-2 ring-[#5C6E4E] text-[#23211D] font-semibold shadow-xs'
                          : 'bg-[#EDE8DA]/70 border-[#565248]/20 text-[#565248] hover:bg-[#EDE8DA]'
                      }`}
                    >
                      <div className="p-1.5 rounded-md bg-[#E5DFCE] border border-[#565248]/15 shrink-0 shadow-2xs">
                        {dest.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-serif font-bold text-xs text-[#23211D] truncate">{dest.label}</p>
                          {isSelected && <Check className="w-3 h-3 text-[#5C6E4E] shrink-0 ml-1" />}
                        </div>
                        <p className="text-[10px] text-[#565248] truncate">{dest.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Destination (if other) */}
          {destination === 'other' && (
            <div>
              <label htmlFor="custom-destination" className="block text-xs font-serif font-bold text-[#23211D] mb-1">
                Specific Destination Name:
              </label>
              <input
                id="custom-destination"
                type="text"
                value={destinationCustom}
                onChange={(e) => setDestinationCustom(e.target.value)}
                placeholder="e.g. PPF Account, Sovereign Gold Bond, NPS"
                className="w-full bg-[#E5DFCE] border border-[#565248]/30 rounded-lg px-3 py-2 text-xs text-[#23211D] focus:outline-hidden focus:border-[#5C6E4E]"
              />
            </div>
          )}

          {/* Committed Return & Date in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="committed-return" className="block text-xs font-serif font-bold text-[#23211D] mb-1">
                Expected Return (Optional):
              </label>
              <div className="relative">
                <Percent className="w-3.5 h-3.5 text-[#565248] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="committed-return"
                  type="text"
                  value={committedReturn}
                  onChange={(e) => setCommittedReturn(e.target.value)}
                  placeholder="e.g. 12% CAGR, 7.1% PPF"
                  className="w-full bg-[#E5DFCE] border border-[#565248]/30 rounded-lg pl-8 pr-3 py-2 text-xs text-[#23211D] focus:outline-hidden focus:border-[#5C6E4E]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="savings-date" className="block text-xs font-serif font-bold text-[#23211D] mb-1">
                Deposit Date:
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-[#565248] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="savings-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#E5DFCE] border border-[#565248]/30 rounded-lg pl-8 pr-3 py-2 text-xs text-[#23211D] focus:outline-hidden focus:border-[#5C6E4E]"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="savings-notes" className="block text-xs font-serif font-bold text-[#23211D] mb-1">
              Notes (Optional):
            </label>
            <div className="relative">
              <FileText className="w-3.5 h-3.5 text-[#565248] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="savings-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Monthly SIP auto-debit, Emergency buffer"
                className="w-full bg-[#E5DFCE] border border-[#565248]/30 rounded-lg pl-8 pr-3 py-2 text-xs text-[#23211D] focus:outline-hidden focus:border-[#5C6E4E]"
              />
            </div>
          </div>

          {/* Submit button */}
          <div className="pt-2 flex items-center justify-between border-t border-[#565248]/20 gap-2">
            <p className="text-[11px] text-[#565248] flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5C6E4E]" />
              <span>Directly increases your monthly savings progress.</span>
            </p>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-xs font-serif text-[#565248] hover:text-[#23211D] hover:bg-[#E5DFCE] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="submit-savings-btn"
                type="submit"
                disabled={!amount || parseFloat(amount) <= 0}
                className="flex items-center space-x-2 bg-[#5C6E4E] hover:bg-[#4B5B3E] disabled:opacity-50 text-[#EDE8DA] font-serif font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer text-xs sm:text-sm active:scale-98"
              >
                <span>Save Record</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Success Confirmation Overlay */}
        {isSuccess && (
          <div className="absolute inset-0 bg-[#EDE8DA]/95 flex items-center justify-center z-20 animate-in fade-in duration-150">
            <div className="border-2 border-[#5C6E4E] rounded-2xl p-6 text-[#5C6E4E] font-serif font-bold text-center tracking-wide bg-[#EDE8DA] shadow-xl space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#5C6E4E] text-[#EDE8DA] flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <div className="text-lg">SAVINGS RECORDED</div>
              <div className="text-xs font-sans text-[#23211D]">{formatCurrency(parseFloat(amount) || 0, currency)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
