import React, { useState } from 'react';
import { 
  Inbox, 
  Check, 
  Trash2, 
  Sparkles, 
  Zap,
  Tag
} from 'lucide-react';
import { Category, CATEGORIES, InboxTransaction, Plan, QUICK_CHIP_SUGGESTIONS } from '../types';
import { formatCurrency } from '../lib/storage';
import { AppCard } from './ui/AppCard';
import { AppButton } from './ui/AppButton';
import { MoneyAmount } from './ui/MoneyAmount';
import { ScreenHeader } from './ui/ScreenHeader';
import { EmptyState } from './ui/EmptyState';

interface InboxScreenProps {
  inboxItems: InboxTransaction[];
  onConfirmItem: (id: string, category: Category, note?: string, sectorId?: string, sectorName?: string) => void;
  onDismissItem: (id: string) => void;
  onAddIncomingItem: (item: Omit<InboxTransaction, 'id' | 'timestamp' | 'status'>) => void;
  currency: string;
  currentPlan?: Plan | null;
}

export function InboxScreen({
  inboxItems,
  onConfirmItem,
  onDismissItem,
  onAddIncomingItem,
  currency,
  currentPlan,
}: InboxScreenProps) {
  const [selectedCategories, setSelectedCategories] = useState<Record<string, Category>>({});
  const [selectedSectors, setSelectedSectors] = useState<Record<string, string>>({});
  const [simText, setSimText] = useState('');
  const [showSimulateModal, setShowSimulateModal] = useState(false);

  const pendingItems = inboxItems.filter((i) => i.status === 'pending');

  const handleSelectCategory = (itemId: string, cat: Category) => {
    setSelectedCategories((prev) => ({ ...prev, [itemId]: cat }));
    // reset selected sector if category changed
    setSelectedSectors((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleSelectSector = (itemId: string, sectorName: string) => {
    setSelectedSectors((prev) => ({
      ...prev,
      [itemId]: prev[itemId] === sectorName ? '' : sectorName,
    }));
  };

  const handleConfirm = (item: InboxTransaction) => {
    const assignedCat = selectedCategories[item.id] || item.suggestedCategory || 'survival';
    const chosenSector = selectedSectors[item.id] || '';
    
    // Check if matching planned sector exists in plan
    const plannedSectors = currentPlan?.plannedSectors?.[assignedCat] || [];
    const matched = plannedSectors.find(s => s.name.toLowerCase() === chosenSector.toLowerCase());

    onConfirmItem(
      item.id, 
      assignedCat, 
      item.merchant, 
      matched?.id, 
      chosenSector || undefined
    );
  };

  const handleSimulateQuickTransaction = (merchant: string, amount: number, source: string, suggestedCategory?: Category) => {
    onAddIncomingItem({
      merchant,
      amount,
      type: 'expense',
      source,
      suggestedCategory,
    });
  };

  const handleParseSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simText.trim()) return;

    // Simple regex parser for SMS amounts and merchants
    const amountMatch = simText.match(/(?:rs\.?|inr|₹|\$)\s*([\d,]+(?:\.\d+)?)/i) || simText.match(/([\d,]+(?:\.\d+)?)\s*(?:rs\.?|inr|spent|debited)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 500;

    let merchant = 'Incoming Transaction';
    if (/swiggy/i.test(simText)) merchant = 'Swiggy';
    else if (/zomato/i.test(simText)) merchant = 'Zomato';
    else if (/uber|ola/i.test(simText)) merchant = 'Uber Ride';
    else if (/amazon/i.test(simText)) merchant = 'Amazon Shopping';
    else if (/blinkit|zepto|instamart/i.test(simText)) merchant = 'Quick Groceries';
    else if (/salary|credited/i.test(simText)) merchant = 'Monthly Salary';
    else {
      const words = simText.split(' ').filter(w => w.length > 3);
      merchant = words.slice(0, 2).join(' ') || 'Merchant Payment';
    }

    const isIncome = /credited|received|salary/i.test(simText);

    onAddIncomingItem({
      merchant,
      amount: amount || 450,
      type: isIncome ? 'income' : 'expense',
      source: 'SMS / UPI Notification',
      suggestedCategory: /grocer|blinkit|zepto|rent/i.test(merchant) ? 'survival' : 'optional',
    });

    setSimText('');
    setShowSimulateModal(false);
  };

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <ScreenHeader
        subtitle="Transaction Review"
        title="Inbox"
        action={
          <button
            id="simulate-sms-btn"
            type="button"
            onClick={() => setShowSimulateModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[var(--moku-surface-secondary)] text-xs font-semibold text-[var(--moku-primary)] border border-[var(--moku-outline)] hover:bg-[var(--moku-surface-tertiary)] transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulate SMS / UPI</span>
          </button>
        }
      />

      {/* Attention Banner */}
      {pendingItems.length > 0 ? (
        <div className="p-4 bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/20 rounded-[20px] text-[var(--moku-primary)] text-xs sm:text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{pendingItems.length} transaction{pendingItems.length > 1 ? 's' : ''} need your conscious decision</span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] rounded-[20px] text-[var(--moku-text-secondary)] text-xs sm:text-sm font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-[var(--moku-primary)] shrink-0" />
            <span>All caught up! No transactions waiting for review.</span>
          </div>
        </div>
      )}

      {/* Pending Items List */}
      {pendingItems.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-6 h-6" />}
          title="Your transaction inbox is empty"
          description="Simulate an SMS alert or log an expense manually to practice mindful categorization."
          actionLabel="Simulate SMS Alert"
          onAction={() => setShowSimulateModal(true)}
        />
      ) : (
        <div className="space-y-3">
          {pendingItems.map((item) => {
            const chosenCategory = selectedCategories[item.id] || item.suggestedCategory || 'survival';
            const chosenSector = selectedSectors[item.id] || '';
            const plannedSectors = currentPlan?.plannedSectors?.[chosenCategory] || [];
            const plannedNames = plannedSectors.map(s => s.name);
            const defaultChips = QUICK_CHIP_SUGGESTIONS[chosenCategory] || [];
            const availableChips = Array.from(new Set([...plannedNames, ...defaultChips]));

            return (
              <AppCard key={item.id} padding="md" className="space-y-3">
                {/* Transaction Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs text-[var(--moku-text-secondary)] block">
                      {item.source}
                    </span>
                    <h3 className="text-base font-bold text-[var(--moku-text-primary)] mt-0.5">
                      {item.merchant}
                    </h3>
                  </div>
                  <MoneyAmount
                    amount={item.amount}
                    currency={currency}
                    size="xl"
                    weight="extrabold"
                  />
                </div>

                {/* 4 Category Selection Buttons */}
                <div>
                  <label className="text-[11px] font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider block mb-1.5">
                    Assign Kakeibo Category
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(CATEGORIES) as Category[]).map((catKey) => {
                      const cat = CATEGORIES[catKey];
                      const isSelected = chosenCategory === catKey;

                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => handleSelectCategory(item.id, catKey)}
                          className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--moku-primary-container)] border-[var(--moku-primary)] text-[var(--moku-primary)] font-bold'
                              : 'bg-[var(--moku-surface-secondary)] border-[var(--moku-outline)] text-[var(--moku-text-primary)] hover:border-[var(--moku-primary)]/40'
                          }`}
                        >
                          <span className="text-base shrink-0 select-none">{cat.icon}</span>
                          <span className="text-xs font-semibold truncate">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sector Chips */}
                <div>
                  <div className="flex items-center space-x-1 text-[10px] font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1">
                    <Tag className="w-2.5 h-2.5 text-[var(--moku-primary)]" />
                    <span>Sector Tag</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {availableChips.map((chip) => {
                      const isSelected = chosenSector.toLowerCase() === chip.toLowerCase();
                      const isPlanned = plannedNames.includes(chip);

                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleSelectSector(item.id, chip)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer inline-flex items-center space-x-1 ${
                            isSelected
                              ? 'bg-[var(--moku-primary)] text-white border-[var(--moku-primary)]'
                              : isPlanned
                              ? 'bg-[var(--moku-surface-secondary)] border-[var(--moku-primary)]/30 text-[var(--moku-primary)]'
                              : 'bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] border-[var(--moku-outline)]'
                          }`}
                        >
                          {isPlanned && <Sparkles className="w-2 h-2 opacity-80" />}
                          <span>{chip}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions: Confirm or Dismiss */}
                <div className="pt-2 border-t border-[var(--moku-outline-variant)] flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => onDismissItem(item.id)}
                    className="px-3 py-2.5 rounded-xl border border-[var(--moku-outline)] text-xs font-semibold text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface-secondary)] hover:text-[var(--moku-danger)] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <AppButton
                    fullWidth
                    size="md"
                    onClick={() => handleConfirm(item)}
                    icon={<Check className="w-4 h-4" />}
                  >
                    Confirm &amp; Record
                  </AppButton>
                </div>
              </AppCard>
            );
          })}
        </div>
      )}

      {/* Simulate SMS / UPI Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[var(--moku-surface)] rounded-[26px] p-6 shadow-2xl border border-[var(--moku-outline)] space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--moku-text-primary)] flex items-center space-x-2">
                <Zap className="w-5 h-5 text-[var(--moku-primary)]" />
                <span>Simulate Bank / UPI SMS</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="p-1.5 rounded-full text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface-secondary)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--moku-text-secondary)]">
              Paste or type a simulated bank transaction SMS to test automatic transaction parsing and conscious inbox classification.
            </p>

            {/* Quick preset buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleSimulateQuickTransaction('Swiggy Order', 450, 'UPI · Just now', 'optional')}
                className="p-2.5 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-left hover:border-[var(--moku-primary)] transition-colors cursor-pointer"
              >
                <div className="font-bold text-[var(--moku-text-primary)]">Swiggy Dinner</div>
                <div className="text-[10px] text-[var(--moku-text-secondary)]">₹450 · Wants</div>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateQuickTransaction('Blinkit Groceries', 1250, 'UPI · 10m ago', 'survival')}
                className="p-2.5 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-left hover:border-[var(--moku-primary)] transition-colors cursor-pointer"
              >
                <div className="font-bold text-[var(--moku-text-primary)]">Blinkit Groceries</div>
                <div className="text-[10px] text-[var(--moku-text-secondary)]">₹1,250 · Essentials</div>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateQuickTransaction('Technical Book', 850, 'Amazon · Today', 'culture')}
                className="p-2.5 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-left hover:border-[var(--moku-primary)] transition-colors cursor-pointer"
              >
                <div className="font-bold text-[var(--moku-text-primary)]">Technical Book</div>
                <div className="text-[10px] text-[var(--moku-text-secondary)]">₹850 · Growth</div>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateQuickTransaction('Plumber Repair', 850, 'UPI · 1h ago', 'extra')}
                className="p-2.5 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-left hover:border-[var(--moku-primary)] transition-colors cursor-pointer"
              >
                <div className="font-bold text-[var(--moku-text-primary)]">Plumber Repair</div>
                <div className="text-[10px] text-[var(--moku-text-secondary)]">₹850 · Unexpected</div>
              </button>
            </div>

            {/* Custom SMS Parser */}
            <form onSubmit={handleParseSms} className="space-y-3 pt-2 border-t border-[var(--moku-outline)]">
              <textarea
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder="e.g. Sent Rs. 1,250 to Blinkit via UPI on 02-Sep. Bal: Rs 43,750"
                rows={3}
                className="w-full p-3 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-xs text-[var(--moku-text-primary)] outline-none resize-none"
              />

              <AppButton
                fullWidth
                size="md"
                type="submit"
                disabled={!simText.trim()}
              >
                Parse &amp; Push to Inbox
              </AppButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
