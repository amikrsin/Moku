import React, { useState } from 'react';
import { 
  Inbox, 
  Check, 
  Trash2, 
  Plus, 
  Sparkles, 
  ArrowDownLeft, 
  ArrowRightLeft,
  XCircle,
  HelpCircle,
  Zap,
  Tag
} from 'lucide-react';
import { Category, CATEGORIES, InboxTransaction, Plan, QUICK_CHIP_SUGGESTIONS } from '../types';
import { formatCurrency } from '../lib/storage';

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
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E736F] dark:text-[#C1C7C0]">
            Transaction Review
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1C1A] dark:text-[#E3E5E1]">
            Inbox
          </h1>
        </div>

        <button
          id="simulate-sms-btn"
          type="button"
          onClick={() => setShowSimulateModal(true)}
          className="flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-[#EEF1EE] dark:bg-[#252925] text-xs font-semibold text-[#176B52] dark:text-[#82D9B4] border border-[#DDE2DD] dark:border-[#414842] hover:bg-[#DDE2DD] dark:hover:bg-[#343B35] transition-colors cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Simulate SMS / UPI</span>
        </button>
      </div>

      {/* Attention Banner */}
      {pendingItems.length > 0 ? (
        <div className="p-4 bg-[#D8F3E7] dark:bg-[#214C3D] border border-[#176B52]/20 dark:border-[#82D9B4]/30 rounded-[20px] text-[#176B52] dark:text-[#82D9B4] text-xs sm:text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{pendingItems.length} transaction{pendingItems.length > 1 ? 's' : ''} need your conscious decision</span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[#EEF1EE] dark:bg-[#252925] border border-[#DDE2DD] dark:border-[#414842] rounded-[20px] text-[#6E736F] dark:text-[#C1C7C0] text-xs sm:text-sm font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-[#176B52] dark:text-[#82D9B4] shrink-0" />
            <span>All caught up! No transactions waiting for review.</span>
          </div>
        </div>
      )}

      {/* Transaction Cards List */}
      <div className="space-y-4">
        {pendingItems.map((item) => {
          const currentCat = selectedCategories[item.id] || item.suggestedCategory || 'survival';
          const currentSector = selectedSectors[item.id] || '';
          const isIncome = item.type === 'income';

          // Sector suggestions for this category
          const plannedSectors = currentPlan?.plannedSectors?.[currentCat] || [];
          const plannedNames = plannedSectors.map(s => s.name);
          const defaultChips = QUICK_CHIP_SUGGESTIONS[currentCat] || [];
          const combinedChips = Array.from(new Set([...plannedNames, ...defaultChips]));

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] rounded-[24px] p-5 shadow-xs transition-all space-y-4"
            >
              {/* Card Top: Merchant and Amount */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                    {item.merchant}
                  </h3>
                  <div className="text-xs text-[#6E736F] dark:text-[#C1C7C0] mt-0.5">
                    {item.source}
                  </div>
                </div>

                <div className={`text-xl font-extrabold font-tabular ${isIncome ? 'text-[#176B52] dark:text-[#82D9B4]' : 'text-[#1A1C1A] dark:text-[#E3E5E1]'}`}>
                  {isIncome ? '+' : '−'}{formatCurrency(item.amount, currency)}
                </div>
              </div>

              {/* Interaction Question */}
              <div>
                <p className="text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] uppercase tracking-wider mb-2.5">
                  {isIncome ? 'How would you classify this incoming deposit?' : 'What kind of spending was this?'}
                </p>

                {isIncome ? (
                  /* Income Options */
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirm(item)}
                      className="p-3 rounded-xl border border-[#176B52] bg-[#D8F3E7] dark:bg-[#214C3D] text-left cursor-pointer transition-all"
                    >
                      <strong className="block text-xs font-bold text-[#176B52] dark:text-[#82D9B4]">
                        ↓ Monthly Income
                      </strong>
                      <small className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">Add to income stream</small>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDismissItem(item.id)}
                      className="p-3 rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-left cursor-pointer hover:border-[#BA1A1A]/40 transition-all"
                    >
                      <strong className="block text-xs font-bold text-[#6E736F] dark:text-[#C1C7C0]">
                        ↔ Account Transfer / Ignore
                      </strong>
                      <small className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">Do not count as expense</small>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 4 Kakeibo Categories */}
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(CATEGORIES) as Category[]).map((catKey) => {
                        const cat = CATEGORIES[catKey];
                        const isSelected = currentCat === catKey;

                        return (
                          <button
                            key={catKey}
                            type="button"
                            onClick={() => handleSelectCategory(item.id, catKey)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#176B52] bg-[#D8F3E7] dark:border-[#82D9B4] dark:bg-[#214C3D] shadow-2xs'
                                : 'border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] hover:border-[#176B52]/40'
                            }`}
                          >
                            <div className="flex items-center space-x-1.5">
                              <span>{cat.icon}</span>
                              <strong className="text-xs font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                                {cat.name}
                              </strong>
                            </div>
                            <small className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0] block mt-0.5">
                              {cat.subhead}
                            </small>
                          </button>
                        );
                      })}
                    </div>

                    {/* Planned Sector Chips for Selected Category */}
                    <div>
                      <div className="flex items-center space-x-1 text-[11px] font-semibold text-[#6E736F] dark:text-[#C1C7C0] mb-1.5">
                        <Tag className="w-3 h-3 text-[#176B52] dark:text-[#82D9B4]" />
                        <span>Link to Planned Sector (Optional)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {combinedChips.map(chip => {
                          const isChipSelected = currentSector === chip;
                          return (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => handleSelectSector(item.id, chip)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                isChipSelected
                                  ? 'bg-[#176B52] text-white border-[#176B52] dark:bg-[#82D9B4] dark:text-[#121412]'
                                  : 'bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] border-[#DDE2DD] dark:border-[#414842]'
                              }`}
                            >
                              {chip}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm / Dismiss Buttons */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleConfirm(item)}
                  className="flex-1 h-12 rounded-xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] font-bold text-sm shadow-xs cursor-pointer flex items-center justify-center space-x-1.5 active:scale-[0.99] transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Transaction</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDismissItem(item.id)}
                  className="p-3 rounded-xl text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#BA1A1A] hover:bg-[#EEF1EE] dark:hover:bg-[#252925] border border-[#DDE2DD] dark:border-[#414842] transition-colors cursor-pointer"
                  title="Dismiss transaction"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {pendingItems.length === 0 && (
          <div className="bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] rounded-[24px] p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D8F3E7] dark:bg-[#214C3D] text-[#176B52] dark:text-[#82D9B4] flex items-center justify-center mx-auto text-xl">
              ✨
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                Zero Pending Items
              </h3>
              <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0] mt-1 max-w-xs mx-auto">
                MOKU automatically holds incoming bank transactions or UPI alerts here so you can assign meaning in seconds.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => handleSimulateQuickTransaction('Starbucks Coffee', 380, 'UPI · Just now', 'optional')}
                className="px-3 py-1.5 rounded-lg bg-[#EEF1EE] dark:bg-[#252925] text-xs font-semibold text-[#1A1C1A] dark:text-[#E3E5E1] border border-[#DDE2DD] dark:border-[#414842] hover:border-[#176B52] transition-colors cursor-pointer"
              >
                + Test ₹380 Coffee
              </button>
              <button
                type="button"
                onClick={() => handleSimulateQuickTransaction('Fresh Supermarket', 1450, 'Card · Just now', 'survival')}
                className="px-3 py-1.5 rounded-lg bg-[#EEF1EE] dark:bg-[#252925] text-xs font-semibold text-[#1A1C1A] dark:text-[#E3E5E1] border border-[#DDE2DD] dark:border-[#414842] hover:border-[#176B52] transition-colors cursor-pointer"
              >
                + Test ₹1,450 Groceries
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Simulate SMS Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowSimulateModal(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-[#1B1E1B] rounded-[24px] p-6 shadow-2xl z-10 border border-[#DDE2DD] dark:border-[#414842] space-y-4">
            <h3 className="text-lg font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
              Simulate Bank / UPI SMS
            </h3>
            <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">
              Paste any sample SMS alert (e.g. &quot;INR 850 spent on Zomato via UPI&quot;) to test MOKU&apos;s auto-detection:
            </p>

            <form onSubmit={handleParseSms} className="space-y-4">
              <textarea
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder="e.g. Paid Rs 650 to Blinkit via UPI on 01 Sep"
                className="w-full h-24 p-3 text-sm rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none"
              />

              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] text-white dark:text-[#121412] font-bold text-xs shadow-xs"
                >
                  Parse into Inbox
                </button>
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 h-11 rounded-xl bg-[#EEF1EE] dark:bg-[#252925] text-xs font-semibold text-[#6E736F]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
