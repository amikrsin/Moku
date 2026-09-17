import React, { useState } from 'react';
import { 
  Inbox, 
  Check, 
  Trash2, 
  Sparkles, 
  Zap,
  Tag,
  Plus,
  RotateCcw,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Edit2,
  RefreshCw
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
  onConfirmItem: (
    id: string, 
    category: Category, 
    note?: string, 
    sectorId?: string, 
    sectorName?: string,
    amountOverride?: number
  ) => void;
  onConfirmIncome?: (id: string, creditType?: 'income' | 'otherIncome', note?: string) => void;
  onDismissItem: (id: string) => void;
  onRestoreItem?: (id: string) => void;
  onDeleteItem?: (id: string) => void;
  onClearReviewed?: () => void;
  onResetSampleItems?: () => void;
  onAddIncomingItem: (item: Omit<InboxTransaction, 'id' | 'timestamp' | 'status'>) => void;
  currency: string;
  monthKey: string;
  currentPlan?: Plan | null;
}

export function InboxScreen({
  inboxItems = [],
  onConfirmItem,
  onConfirmIncome,
  onDismissItem,
  onRestoreItem,
  onDeleteItem,
  onClearReviewed,
  onResetSampleItems,
  onAddIncomingItem,
  currency,
  monthKey,
  currentPlan,
}: InboxScreenProps) {
  // Tabs: 'pending' | 'history'
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  // Interactive state per item
  const [selectedCategories, setSelectedCategories] = useState<Record<string, Category>>({});
  const [selectedSectors, setSelectedSectors] = useState<Record<string, string>>({});
  const [customSectors, setCustomSectors] = useState<Record<string, string>>({});
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [editingAmounts, setEditingAmounts] = useState<Record<string, string>>({});
  const [incomeCreditTypes, setIncomeCreditTypes] = useState<Record<string, 'income' | 'otherIncome'>>({});
  const [isEditingMap, setIsEditingMap] = useState<Record<string, boolean>>({});

  // Modals
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  // Manual Add form state
  const [manualMerchant, setManualMerchant] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualType, setManualType] = useState<'expense' | 'income'>('expense');
  const [manualSource, setManualSource] = useState('Manual Entry');

  // SMS Parser form state
  const [simText, setSimText] = useState('');

  const safeItems = inboxItems || [];
  const pendingItems = safeItems.filter((i) => i.status === 'pending');
  const reviewedItems = safeItems.filter((i) => i.status === 'confirmed' || i.status === 'dismissed');

  const showTemporaryBanner = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => {
      setBannerMsg(null);
    }, 3500);
  };

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

  const handleConfirmExpense = (item: InboxTransaction) => {
    const assignedCat = selectedCategories[item.id] || item.suggestedCategory || 'survival';
    const chosenSector = selectedSectors[item.id] || customSectors[item.id] || '';
    const note = editingNotes[item.id] !== undefined ? editingNotes[item.id] : item.merchant;
    const amountVal = parseFloat(editingAmounts[item.id] || String(item.amount)) || item.amount;
    
    // Check if matching planned sector exists in plan
    const plannedSectors = currentPlan?.plannedSectors?.[assignedCat] || [];
    const matched = plannedSectors.find(s => s.name.toLowerCase() === chosenSector.toLowerCase());

    onConfirmItem(
      item.id, 
      assignedCat, 
      note || item.merchant, 
      matched?.id, 
      chosenSector || undefined,
      amountVal
    );

    showTemporaryBanner(`Recorded "${note || item.merchant}" as ${CATEGORIES[assignedCat].name}`);
  };

  const handleConfirmIncomeClick = (item: InboxTransaction) => {
    const creditType = incomeCreditTypes[item.id] || 'income';
    const note = editingNotes[item.id] !== undefined ? editingNotes[item.id] : item.merchant;
    
    if (onConfirmIncome) {
      onConfirmIncome(item.id, creditType, note || item.merchant);
    } else {
      // Fallback
      onConfirmItem(item.id, 'survival', note || item.merchant);
    }

    showTemporaryBanner(`Added ${formatCurrency(item.amount, currency)} to ${creditType === 'income' ? 'Monthly Income' : 'Additional Inflow'}`);
  };

  const handleSimulateQuick = (
    merchant: string, 
    amount: number, 
    source: string, 
    suggestedCategory?: Category,
    type: 'expense' | 'income' = 'expense'
  ) => {
    onAddIncomingItem({
      merchant,
      amount,
      type,
      source,
      suggestedCategory,
    });
    setShowSimulateModal(false);
    showTemporaryBanner(`Pushed "${merchant}" (${formatCurrency(amount, currency)}) to Inbox`);
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(manualAmount);
    if (!manualMerchant.trim() || isNaN(amt) || amt <= 0) return;

    onAddIncomingItem({
      merchant: manualMerchant.trim(),
      amount: amt,
      type: manualType,
      source: manualSource.trim() || 'Manual Entry',
      suggestedCategory: manualType === 'expense' ? 'survival' : undefined,
    });

    setManualMerchant('');
    setManualAmount('');
    setShowManualAddModal(false);
    showTemporaryBanner(`Added "${manualMerchant.trim()}" to Inbox for review`);
  };

  const handleParseSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simText.trim()) return;

    // Parser for SMS amounts and merchants
    const amountMatch = simText.match(/(?:rs\.?|inr|₹|\$)\s*([\d,]+(?:\.\d+)?)/i) || simText.match(/([\d,]+(?:\.\d+)?)\s*(?:rs\.?|inr|spent|debited|credited)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 500;

    let merchant = 'Incoming Transaction';
    if (/swiggy/i.test(simText)) merchant = 'Swiggy Dinner';
    else if (/zomato/i.test(simText)) merchant = 'Zomato Food';
    else if (/uber|ola/i.test(simText)) merchant = 'Uber Ride';
    else if (/amazon/i.test(simText)) merchant = 'Amazon Purchase';
    else if (/blinkit|zepto|instamart/i.test(simText)) merchant = 'Quick Groceries';
    else if (/salary|credited/i.test(simText)) merchant = 'Monthly Salary';
    else {
      const words = simText.split(' ').filter(w => w.length > 3);
      merchant = words.slice(0, 3).join(' ') || 'Merchant Payment';
    }

    const isIncome = /credited|received|salary/i.test(simText);

    onAddIncomingItem({
      merchant,
      amount: amount || 450,
      type: isIncome ? 'income' : 'expense',
      source: 'SMS / UPI Notification',
      suggestedCategory: /grocer|blinkit|zepto|rent|bill/i.test(merchant) ? 'survival' : 'optional',
    });

    setSimText('');
    setShowSimulateModal(false);
    showTemporaryBanner(`Parsed SMS: "${merchant}" (${formatCurrency(amount || 450, currency)})`);
  };

  return (
    <div className="space-y-4 pb-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <ScreenHeader
        subtitle="Zero-Friction Capture"
        title="Transaction Inbox"
        action={
          <div className="flex items-center space-x-1.5">
            <button
              id="quick-add-inbox-btn"
              type="button"
              onClick={() => setShowManualAddModal(true)}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-[var(--moku-surface-secondary)] text-xs font-bold text-[var(--moku-text-primary)] border border-[var(--moku-outline)] hover:bg-[var(--moku-surface-tertiary)] transition-colors cursor-pointer"
              title="Add transaction to inbox for later categorization"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--moku-primary)]" />
              <span>Add</span>
            </button>
            <button
              id="simulate-sms-btn"
              type="button"
              onClick={() => setShowSimulateModal(true)}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-[var(--moku-primary-container)] text-xs font-bold text-[var(--moku-primary)] border border-[var(--moku-primary)]/20 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate</span>
            </button>
          </div>
        }
      />

      {/* Temporary Feedback Banner */}
      {bannerMsg && (
        <div className="p-3 bg-[var(--moku-primary)] text-white text-xs font-semibold rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center space-x-2 truncate">
            <Check className="w-4 h-4 shrink-0" />
            <span className="truncate">{bannerMsg}</span>
          </div>
          <button 
            type="button"
            onClick={() => setBannerMsg(null)}
            className="p-1 hover:opacity-75 cursor-pointer ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs: Pending vs Reviewed History */}
      <div className="flex items-center p-1 bg-[var(--moku-surface-secondary)] rounded-2xl border border-[var(--moku-outline)]">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-[var(--moku-surface)] text-[var(--moku-primary)] shadow-xs'
              : 'text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending</span>
          {pendingItems.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--moku-primary)] text-white font-bold font-tabular">
              {pendingItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[var(--moku-surface)] text-[var(--moku-primary)] shadow-xs'
              : 'text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)]'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>Reviewed History</span>
          {reviewedItems.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--moku-surface-secondary)] text-[var(--moku-text-secondary)] border border-[var(--moku-outline)] font-bold font-tabular">
              {reviewedItems.length}
            </span>
          )}
        </button>
      </div>

      {/* ======================================================================= */}
      {/* PENDING ITEMS TAB */}
      {/* ======================================================================= */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingItems.length === 0 ? (
            <EmptyState
              icon={<Inbox className="w-7 h-7 text-[var(--moku-primary)]" />}
              title="Your Inbox is Completely Caught Up!"
              description="No unreviewed transactions waiting. Simulate an incoming UPI alert or quickly park a transaction to reflect upon later."
              actionLabel="+ Park a Transaction"
              onAction={() => setShowManualAddModal(true)}
            />
          ) : (
            pendingItems.map((item) => {
              const isIncome = item.type === 'income';
              const chosenCategory = selectedCategories[item.id] || item.suggestedCategory || 'survival';
              const chosenSector = selectedSectors[item.id] || '';
              const isEditing = isEditingMap[item.id] || false;
              const displayMerchant = editingNotes[item.id] !== undefined ? editingNotes[item.id] : item.merchant;
              const displayAmount = editingAmounts[item.id] !== undefined ? editingAmounts[item.id] : String(item.amount);

              const plannedSectors = currentPlan?.plannedSectors?.[chosenCategory] || [];
              const plannedNames = plannedSectors.map(s => s.name);
              const defaultChips = QUICK_CHIP_SUGGESTIONS[chosenCategory] || [];
              const availableChips = Array.from(new Set([...plannedNames, ...defaultChips]));

              return (
                <AppCard key={item.id} padding="md" className="space-y-3 border border-[var(--moku-outline)]">
                  {/* Item Header & Amount */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5 flex-1 pr-2">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isIncome 
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'bg-[var(--moku-surface-secondary)] text-[var(--moku-text-secondary)] border border-[var(--moku-outline)]'
                        }`}>
                          {isIncome ? <ArrowDownLeft className="w-2.5 h-2.5" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                          <span>{isIncome ? 'Deposit / Inflow' : 'Expense Outflow'}</span>
                        </span>
                        <span className="text-[10px] text-[var(--moku-text-secondary)]">
                          {item.source}
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="pt-1.5 space-y-1">
                          <input
                            type="text"
                            value={displayMerchant}
                            onChange={(e) => setEditingNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-full text-sm font-bold bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] rounded-lg px-2 py-1 text-[var(--moku-text-primary)] outline-none"
                            placeholder="Description"
                          />
                          <div className="flex items-center space-x-1">
                            <span className="text-xs font-bold text-[var(--moku-text-secondary)]">{currency}</span>
                            <input
                              type="number"
                              value={displayAmount}
                              onChange={(e) => setEditingAmounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                              className="w-24 text-xs font-bold bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] rounded-lg px-2 py-1 text-[var(--moku-text-primary)] outline-none font-tabular"
                            />
                            <button
                              type="button"
                              onClick={() => setIsEditingMap(prev => ({ ...prev, [item.id]: false }))}
                              className="text-[10px] font-bold text-[var(--moku-primary)] px-2 py-1 bg-[var(--moku-primary-container)] rounded-md"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 pt-0.5">
                          <h3 className="text-sm sm:text-base font-bold text-[var(--moku-text-primary)]">
                            {displayMerchant}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsEditingMap(prev => ({ ...prev, [item.id]: true }))}
                            className="text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)] p-0.5 cursor-pointer"
                            title="Edit description or amount"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      {isIncome ? (
                        <span className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-tabular">
                          +{formatCurrency(parseFloat(displayAmount) || item.amount, currency)}
                        </span>
                      ) : (
                        <MoneyAmount
                          amount={parseFloat(displayAmount) || item.amount}
                          currency={currency}
                          size="xl"
                          weight="extrabold"
                        />
                      )}
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* INCOME CLASSIFICATION */}
                  {/* ------------------------------------------------------------- */}
                  {isIncome ? (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                      <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Credit this inflow into your {monthKey} Monthly Plan:</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setIncomeCreditTypes(prev => ({ ...prev, [item.id]: 'income' }))}
                          className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                            (incomeCreditTypes[item.id] || 'income') === 'income'
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                              : 'bg-[var(--moku-surface)] text-[var(--moku-text-primary)] border-[var(--moku-outline)]'
                          }`}
                        >
                          <div className="text-[11px]">Primary Income</div>
                          <div className="text-[9px] opacity-80">Salary / Main pool</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIncomeCreditTypes(prev => ({ ...prev, [item.id]: 'otherIncome' }))}
                          className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                            incomeCreditTypes[item.id] === 'otherIncome'
                              ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                              : 'bg-[var(--moku-surface)] text-[var(--moku-text-primary)] border-[var(--moku-outline)]'
                          }`}
                        >
                          <div className="text-[11px]">Additional Inflow</div>
                          <div className="text-[9px] opacity-80">Bonus / Freelance</div>
                        </button>
                      </div>

                      <div className="pt-2 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => onDismissItem(item.id)}
                          className="px-3 py-2 rounded-xl border border-[var(--moku-outline)] text-xs font-semibold text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface-secondary)] hover:text-[var(--moku-danger)] transition-colors cursor-pointer"
                          title="Dismiss"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <AppButton
                          fullWidth
                          size="md"
                          onClick={() => handleConfirmIncomeClick(item)}
                          icon={<Check className="w-4 h-4" />}
                        >
                          Confirm &amp; Credit Inflow
                        </AppButton>
                      </div>
                    </div>
                  ) : (
                    /* ----------------------------------------------------------- */
                    /* EXPENSE CLASSIFICATION (4 KAKEIBO PILLARS) */
                    /* ----------------------------------------------------------- */
                    <div className="space-y-3 pt-1">
                      {/* 4 Category Selection Buttons */}
                      <div>
                        <label className="text-[11px] font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider block mb-1.5">
                          Kakeibo Category
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
                                    ? 'bg-[var(--moku-primary-container)] border-[var(--moku-primary)] text-[var(--moku-primary)] font-bold shadow-2xs'
                                    : 'bg-[var(--moku-surface-secondary)] border-[var(--moku-outline)] text-[var(--moku-text-primary)] hover:border-[var(--moku-primary)]/40'
                                }`}
                              >
                                <span className="text-base shrink-0 select-none">{cat.icon}</span>
                                <div className="truncate">
                                  <div className="text-xs font-semibold truncate leading-tight">{cat.name}</div>
                                  <div className="text-[9px] text-[var(--moku-text-secondary)] opacity-90 truncate">{cat.description}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sector / Sub-Section Tags */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-1">
                          <div className="flex items-center space-x-1">
                            <Tag className="w-2.5 h-2.5 text-[var(--moku-primary)]" />
                            <span>Sub-Section Tag</span>
                          </div>
                          {chosenSector && (
                            <span className="text-[var(--moku-primary)] font-bold font-sans">
                              Active: {chosenSector}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
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
                                    ? 'bg-[var(--moku-primary)] text-white border-[var(--moku-primary)] shadow-2xs'
                                    : isPlanned
                                    ? 'bg-[var(--moku-surface-secondary)] border-[var(--moku-primary)]/40 text-[var(--moku-primary)] font-semibold'
                                    : 'bg-[var(--moku-surface-secondary)] text-[var(--moku-text-primary)] border-[var(--moku-outline)] hover:border-[var(--moku-primary)]/40'
                                }`}
                              >
                                {isPlanned && <Sparkles className="w-2.5 h-2.5 opacity-90" />}
                                <span>{chip}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions: Confirm or Dismiss */}
                      <div className="pt-2 border-t border-[var(--moku-outline)]/60 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => onDismissItem(item.id)}
                          className="px-3 py-2.5 rounded-xl border border-[var(--moku-outline)] text-xs font-semibold text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface-secondary)] hover:text-[var(--moku-danger)] transition-colors cursor-pointer"
                          title="Dismiss item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <AppButton
                          fullWidth
                          size="md"
                          onClick={() => handleConfirmExpense(item)}
                          icon={<Check className="w-4 h-4" />}
                        >
                          Confirm &amp; Record
                        </AppButton>
                      </div>
                    </div>
                  )}
                </AppCard>
              );
            })
          )}

          {/* Bottom Quick Tools */}
          {pendingItems.length === 0 && onResetSampleItems && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onResetSampleItems}
                className="inline-flex items-center space-x-1.5 text-xs text-[var(--moku-primary)] font-semibold hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Load Sample Banking Transactions</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* REVIEWED / HISTORY TAB */}
      {/* ======================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--moku-text-secondary)] px-1">
            <span>{reviewedItems.length} processed transaction{reviewedItems.length === 1 ? '' : 's'}</span>
            {reviewedItems.length > 0 && onClearReviewed && (
              <button
                type="button"
                onClick={onClearReviewed}
                className="text-[var(--moku-danger)] hover:underline font-semibold cursor-pointer text-[11px]"
              >
                Clear History
              </button>
            )}
          </div>

          {reviewedItems.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-6 h-6 text-[var(--moku-text-secondary)]" />}
              title="No Reviewed History Yet"
              description="Confirmed and dismissed transactions will appear here so you can review or undo anytime."
            />
          ) : (
            reviewedItems.map((item) => {
              const isConfirmed = item.status === 'confirmed';
              const isIncome = item.type === 'income';

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] flex items-center justify-between space-x-3"
                >
                  <div className="space-y-0.5 flex-1 truncate">
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isConfirmed 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-[var(--moku-text-secondary)]'
                      }`}>
                        {isConfirmed ? '✓ Confirmed' : '✕ Dismissed'}
                      </span>
                      <span className="text-[10px] text-[var(--moku-text-secondary)] truncate">
                        {item.source}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-[var(--moku-text-primary)] truncate">
                      {item.merchant}
                    </h4>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`text-xs sm:text-sm font-bold font-tabular ${
                      isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--moku-text-primary)]'
                    }`}>
                      {isIncome ? '+' : ''}{formatCurrency(item.amount, currency)}
                    </span>

                    {onRestoreItem && (
                      <button
                        type="button"
                        onClick={() => onRestoreItem(item.id)}
                        className="p-1.5 rounded-lg border border-[var(--moku-outline)] text-[var(--moku-text-secondary)] hover:text-[var(--moku-primary)] hover:bg-[var(--moku-surface)] transition-colors cursor-pointer"
                        title="Move back to Pending Inbox"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onDeleteItem && (
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1.5 rounded-lg border border-[var(--moku-outline)] text-[var(--moku-text-secondary)] hover:text-[var(--moku-danger)] hover:bg-[var(--moku-surface)] transition-colors cursor-pointer"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* DIRECT "+ ADD TO INBOX" MODAL */}
      {/* ======================================================================= */}
      {showManualAddModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setShowManualAddModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-[var(--moku-surface)] rounded-[26px] p-5 shadow-2xl border border-[var(--moku-outline)] space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--moku-text-primary)] flex items-center space-x-1.5">
                <Plus className="w-4 h-4 text-[var(--moku-primary)]" />
                <span>Add Transaction to Inbox</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowManualAddModal(false)}
                className="p-1.5 rounded-full text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--moku-text-secondary)]">
              Park an unclassified transaction here. You can mindfully reflect and allocate it to your Kakeibo pillars whenever you're ready.
            </p>

            <form onSubmit={handleManualAddSubmit} className="space-y-3">
              {/* Type Switcher */}
              <div className="flex items-center p-1 bg-[var(--moku-surface-secondary)] rounded-xl border border-[var(--moku-outline)]">
                <button
                  type="button"
                  onClick={() => setManualType('expense')}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                    manualType === 'expense'
                      ? 'bg-[var(--moku-surface)] text-[var(--moku-primary)] shadow-2xs'
                      : 'text-[var(--moku-text-secondary)]'
                  }`}
                >
                  Expense Outflow
                </button>
                <button
                  type="button"
                  onClick={() => setManualType('income')}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                    manualType === 'income'
                      ? 'bg-[var(--moku-surface)] text-emerald-600 dark:text-emerald-400 shadow-2xs'
                      : 'text-[var(--moku-text-secondary)]'
                  }`}
                >
                  Income Deposit
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider block mb-1">
                  Description / Merchant
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coffee at Blue Tokai, Taxi, Client payment..."
                  value={manualMerchant}
                  onChange={(e) => setManualMerchant(e.target.value)}
                  className="w-full px-3 h-10 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-xs text-[var(--moku-text-primary)] outline-none focus:ring-1 focus:ring-[var(--moku-primary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider block mb-1">
                  Amount ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full px-3 h-10 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-sm font-bold font-tabular text-[var(--moku-text-primary)] outline-none focus:ring-1 focus:ring-[var(--moku-primary)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider block mb-1">
                  Payment Source (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cash, GPay, Credit Card"
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value)}
                  className="w-full px-3 h-9 rounded-xl border border-[var(--moku-outline)] bg-[var(--moku-surface-secondary)] text-xs text-[var(--moku-text-primary)] outline-none"
                />
              </div>

              <div className="pt-2">
                <AppButton
                  fullWidth
                  size="md"
                  type="submit"
                  disabled={!manualMerchant.trim() || !manualAmount}
                >
                  Drop into Inbox
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SIMULATE BANK / UPI SMS MODAL */}
      {/* ======================================================================= */}
      {showSimulateModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setShowSimulateModal(false)}
        >
          <div 
            className="w-full max-w-md bg-[var(--moku-surface)] rounded-[26px] p-6 shadow-2xl border border-[var(--moku-outline)] space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-[var(--moku-text-primary)] flex items-center space-x-2">
                <Zap className="w-5 h-5 text-[var(--moku-primary)]" />
                <span>Simulate Bank / UPI SMS</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="p-1.5 rounded-full text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--moku-text-secondary)]">
              Select a realistic incoming transaction to test zero-friction capture, or paste any SMS text.
            </p>

            {/* Quick 1-Tap Preset Buttons */}
            <div>
              <span className="text-[10px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider block mb-2">
                Instant Presets (1-Tap)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSimulateQuick('Swiggy Dinner', 450, 'UPI · Just now', 'optional', 'expense')}
                  className="p-2.5 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-left hover:border-[var(--moku-primary)] transition-colors cursor-pointer"
                >
                  <div className="font-bold text-[var(--moku-text-primary)]">Swiggy Dinner</div>
                  <div className="text-[10px] text-[var(--moku-text-secondary)] font-tabular">{currency} 450 · Wants</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateQuick('Blinkit Groceries', 1250, 'UPI · 10m ago', 'survival', 'expense')}
                  className="p-2.5 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-left hover:border-[var(--moku-primary)] transition-colors cursor-pointer"
                >
                  <div className="font-bold text-[var(--moku-text-primary)]">Blinkit Groceries</div>
                  <div className="text-[10px] text-[var(--moku-text-secondary)] font-tabular">{currency} 1,250 · Needs</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateQuick('Technical Book', 850, 'Amazon · Today', 'culture', 'expense')}
                  className="p-2.5 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-left hover:border-[var(--moku-primary)] transition-colors cursor-pointer"
                >
                  <div className="font-bold text-[var(--moku-text-primary)]">Technical Book</div>
                  <div className="text-[10px] text-[var(--moku-text-secondary)] font-tabular">{currency} 850 · Growth</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateQuick('Plumber Repair', 850, 'UPI · 1h ago', 'extra', 'expense')}
                  className="p-2.5 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-left hover:border-[var(--moku-primary)] transition-colors cursor-pointer"
                >
                  <div className="font-bold text-[var(--moku-text-primary)]">Plumber Repair</div>
                  <div className="text-[10px] text-[var(--moku-text-secondary)] font-tabular">{currency} 850 · Unexpected</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateQuick('Uber Ride to Office', 340, 'Paytm · 25m ago', 'optional', 'expense')}
                  className="p-2.5 rounded-xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] text-left hover:border-[var(--moku-primary)] transition-colors cursor-pointer"
                >
                  <div className="font-bold text-[var(--moku-text-primary)]">Uber Ride</div>
                  <div className="text-[10px] text-[var(--moku-text-secondary)] font-tabular">{currency} 340 · Wants</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateQuick('Monthly Salary Credited', 50000, 'HDFC Bank · Today', undefined, 'income')}
                  className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-left hover:border-emerald-500 transition-colors cursor-pointer"
                >
                  <div className="font-bold text-emerald-800 dark:text-emerald-200">Salary Deposit</div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-tabular">+{currency} 50,000 · Income</div>
                </button>
              </div>
            </div>

            {/* Custom SMS Parser */}
            <form onSubmit={handleParseSms} className="space-y-3 pt-2 border-t border-[var(--moku-outline)]">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[var(--moku-text-secondary)] uppercase tracking-wider">
                  Custom SMS / Text Parser
                </label>
                <button
                  type="button"
                  onClick={() => setSimText('Sent Rs. 1,420 to Cafe Coffee Day via UPI ref 492049. Bal: Rs 38,200')}
                  className="text-[10px] text-[var(--moku-primary)] hover:underline font-semibold cursor-pointer"
                >
                  Paste Sample SMS
                </button>
              </div>

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
