import React, { useState } from 'react';
import { SavingsDestination, SavingsEntry, SUPPORTED_CURRENCIES } from '../types';
import { generateUUID, getTodayDateString } from '../lib/storage';
import { 
  PiggyBank, 
  X, 
  Check, 
  TrendingUp, 
  Building2, 
  Landmark, 
  Wallet, 
  HelpCircle,
  Calendar,
  Percent,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AppButton } from './ui/AppButton';

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
    icon: <TrendingUp className="w-4 h-4 text-[var(--moku-primary)]" />,
    suggestedReturn: '12.0% CAGR',
  },
  {
    id: 'fixed_deposit',
    label: 'Fixed Deposit (FD)',
    desc: 'Term deposit with bank or NBFC',
    icon: <Landmark className="w-4 h-4 text-[var(--moku-primary)]" />,
    suggestedReturn: '7.1% p.a.',
  },
  {
    id: 'recurring_deposit',
    label: 'Recurring Deposit (RD)',
    desc: 'Monthly systematic bank savings',
    icon: <Building2 className="w-4 h-4 text-[var(--moku-primary)]" />,
    suggestedReturn: '6.8% p.a.',
  },
  {
    id: 'savings_account',
    label: 'High-Yield Savings',
    desc: 'Liquid interest-bearing bank deposit',
    icon: <PiggyBank className="w-4 h-4 text-[var(--moku-primary)]" />,
    suggestedReturn: '4.0% p.a.',
  },
  {
    id: 'cash',
    label: 'Physical Cash Reserve',
    desc: 'Physical emergency cash or envelope',
    icon: <Wallet className="w-4 h-4 text-[var(--moku-primary)]" />,
    suggestedReturn: '0% (Liquid)',
  },
  {
    id: 'other',
    label: 'PPF / Gold / Bonds / Other',
    desc: 'Government bonds, gold, PPF, NPS',
    icon: <HelpCircle className="w-4 h-4 text-[var(--moku-primary)]" />,
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
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-[var(--moku-surface)] text-[var(--moku-text-primary)] border border-[var(--moku-outline)] rounded-[28px] p-6 sm:p-7 shadow-2xl overflow-hidden space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[var(--moku-outline)] pb-4 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/20 text-[var(--moku-primary)] flex items-center justify-center shadow-2xs">
              <PiggyBank className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-[var(--moku-text-primary)] leading-snug">
                Log Savings Deposit
              </h3>
              <p className="text-xs text-[var(--moku-text-secondary)]">
                Record actual money set aside to achieve your monthly target
              </p>
            </div>
          </div>
          <button
            id="close-savings-modal"
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)] rounded-xl hover:bg-[var(--moku-surface-secondary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Area */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Amount input */}
          <div className="bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] rounded-2xl p-4 space-y-1.5 shadow-2xs">
            <label htmlFor="savings-amount" className="block text-xs font-bold uppercase tracking-wider text-[var(--moku-text-secondary)]">
              Deposit Amount
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-[var(--moku-primary)] font-bold">
                {currencySymbol}
              </span>
              <input
                id="savings-amount"
                type="number"
                step="any"
                min="1"
                required
                autoFocus
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[var(--moku-surface)] border border-[var(--moku-outline)] rounded-xl pl-10 pr-3 py-2.5 text-[var(--moku-text-primary)] font-tabular text-2xl font-bold focus:outline-hidden focus:border-[var(--moku-primary)]"
              />
            </div>
          </div>

          {/* Accordion Destination Selector */}
          <div className="bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--moku-text-secondary)]">
                Savings Vehicle / Destination
              </label>
              <button
                type="button"
                id="toggle-destination-accordion"
                onClick={() => setIsDestinationAccordionOpen(!isDestinationAccordionOpen)}
                className="flex items-center space-x-1 text-xs text-[var(--moku-primary)] font-semibold cursor-pointer bg-[var(--moku-surface)] border border-[var(--moku-outline)] px-2.5 py-1 rounded-lg transition-colors"
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
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--moku-primary)] bg-[var(--moku-surface)] shadow-2xs cursor-pointer transition-all hover:bg-[var(--moku-surface-secondary)]"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 rounded-xl bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/20 shrink-0 text-[var(--moku-primary)]">
                    {currentDestObj.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-sm text-[var(--moku-text-primary)] truncate">
                        {destination === 'other' && destinationCustom.trim()
                          ? destinationCustom.trim()
                          : currentDestObj.label}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--moku-primary-container)] text-[var(--moku-primary)] shrink-0">
                        {committedReturn}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--moku-text-secondary)] truncate">
                      {currentDestObj.desc}
                    </p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[var(--moku-text-secondary)] shrink-0 ml-2" />
              </div>
            )}

            {/* Expanded List */}
            {isDestinationAccordionOpen && (
              <div className="grid grid-cols-1 gap-2 pt-1">
                {DESTINATIONS.map((d) => {
                  const isSelected = destination === d.id;
                  return (
                    <div
                      key={d.id}
                      onClick={() => handleDestinationSelect(d.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--moku-primary)] bg-[var(--moku-primary-container)] text-[var(--moku-primary)] font-medium shadow-xs'
                          : 'border-[var(--moku-outline)] bg-[var(--moku-surface)] text-[var(--moku-text-primary)] hover:border-[var(--moku-primary)]/40'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="p-2 rounded-xl bg-[var(--moku-surface-secondary)] shrink-0">
                          {d.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold truncate">
                              {d.label}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-[var(--moku-surface-secondary)] text-[var(--moku-text-secondary)]">
                              {d.suggestedReturn}
                            </span>
                          </div>
                          <span className="text-xs text-[var(--moku-text-secondary)] block truncate">
                            {d.desc}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[var(--moku-primary)] shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Custom vehicle input */}
            {destination === 'other' && (
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Specify custom vehicle (e.g., SGB Gold, Sovereign Bonds)"
                  value={destinationCustom}
                  onChange={(e) => setDestinationCustom(e.target.value)}
                  className="w-full bg-[var(--moku-surface)] border border-[var(--moku-outline)] rounded-xl px-3 py-2 text-xs text-[var(--moku-text-primary)] focus:outline-hidden focus:border-[var(--moku-primary)]"
                />
              </div>
            )}
          </div>

          {/* Date & Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] rounded-2xl p-3 space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--moku-text-secondary)] flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-[var(--moku-primary)]" />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[var(--moku-surface)] border border-[var(--moku-outline)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--moku-text-primary)] outline-none"
              />
            </div>

            <div className="bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] rounded-2xl p-3 space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--moku-text-secondary)] flex items-center space-x-1">
                <Percent className="w-3 h-3 text-[var(--moku-primary)]" />
                <span>Return Rate</span>
              </label>
              <input
                type="text"
                placeholder="12% CAGR"
                value={committedReturn}
                onChange={(e) => setCommittedReturn(e.target.value)}
                className="w-full bg-[var(--moku-surface)] border border-[var(--moku-outline)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--moku-text-primary)] outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] rounded-2xl p-3 space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--moku-text-secondary)] flex items-center space-x-1">
              <FileText className="w-3 h-3 text-[var(--moku-primary)]" />
              <span>Notes / Goal Allocation</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly Nifty Index SIP, Emergency fund top-up..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[var(--moku-surface)] border border-[var(--moku-outline)] rounded-xl px-3 py-2 text-xs text-[var(--moku-text-primary)] outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl border border-[var(--moku-outline)] text-xs font-bold text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface-secondary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <AppButton
              type="submit"
              fullWidth
              size="lg"
              disabled={isSuccess || !amount || parseFloat(amount) <= 0}
              icon={isSuccess ? <Check className="w-4 h-4" /> : <PiggyBank className="w-4 h-4" />}
            >
              {isSuccess ? 'Savings Recorded!' : 'Confirm Savings Deposit'}
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  );
};
