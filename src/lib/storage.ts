/**
 * Offline-first Storage and Background Sync Manager
 * Implements TRD §2, §4, §5
 */

import { 
  AppState, 
  BudgetSignal, 
  Category, 
  DEFAULT_CATEGORY_SECTORS, 
  Expense, 
  InboxTransaction, 
  Plan, 
  PlannedSector, 
  SavingsEntry, 
  UserProfile,
  PinSecurityConfig,
  SUPPORTED_CURRENCIES
} from '../types';
import { getDefaultPinConfig } from './security';
import { getIdToken } from './firebase';

const STORAGE_KEY_PLANS = 'kakeibo_plans_v1';
const STORAGE_KEY_EXPENSES = 'kakeibo_expenses_v1';
const STORAGE_KEY_SAVINGS = 'kakeibo_savings_v1';
const STORAGE_KEY_INBOX = 'kakeibo_inbox_v1';
const STORAGE_KEY_USER = 'kakeibo_user_v1';
const STORAGE_KEY_LAST_SYNC = 'kakeibo_last_sync_v1';
const STORAGE_KEY_GLOBAL_CURRENCY = 'kakeibo_global_currency_v1';
const STORAGE_KEY_PIN_CONFIG = 'kakeibo_pin_config_v1';
const STORAGE_KEY_PIN_LOCKED = 'kakeibo_pin_locked_v1';
const STORAGE_KEY_INITIALIZED = 'kakeibo_initialized_v1';
const STORAGE_KEY_LAST_RESET = 'kakeibo_last_reset_v1';

export function getGlobalCurrency(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_GLOBAL_CURRENCY);
    if (saved) return saved;
  } catch {
    // ignore
  }
  return 'INR';
}

export function setGlobalCurrency(currencyCode: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_GLOBAL_CURRENCY, currencyCode);
  } catch {
    // ignore
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString();
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthName(monthKey: string): string {
  if (!monthKey || !monthKey.includes('-')) return monthKey;
  const [yearStr, monthStr] = monthKey.split('-');
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatShortMonth(monthKey: string): string {
  if (!monthKey || !monthKey.includes('-')) return monthKey;
  const [yearStr, monthStr] = monthKey.split('-');
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function getCurrencySymbol(currencyCode = 'INR'): string {
  if (!currencyCode || currencyCode === 'INR') return '₹';
  const match = SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === currencyCode.toUpperCase());
  return match?.symbol || currencyCode;
}

export function formatCurrency(amount: number, currencyCode = 'INR'): string {
  const localeMap: Record<string, string> = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    CAD: 'en-CA',
    AUD: 'en-AU',
    SGD: 'en-SG',
  };
  const locale = localeMap[currencyCode] || (currencyCode === 'INR' ? 'en-IN' : 'en-US');
  try {
    let formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);

    if (currencyCode === 'INR') {
      formatted = formatted.replace(/^INR\s?/, '₹').replace(/\s?INR$/, '₹');
      if (!formatted.includes('₹')) {
        formatted = `₹${formatted}`;
      }
    }
    return formatted;
  } catch {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toLocaleString()}`;
  }
}

export function computeBudgetSignal(plannedAmount: number, actualAmount: number): BudgetSignal {
  if (plannedAmount === 0 && actualAmount > 0) return 'UNPLANNED';
  if (actualAmount === 0) return 'NOT_STARTED';
  if (actualAmount === plannedAmount) return 'PAID';
  if (actualAmount > plannedAmount) return 'OVER_PLAN';
  if (plannedAmount > 0 && actualAmount / plannedAmount >= 0.8) return 'WATCH';
  return 'ON_TRACK';
}

export function getDefaultPlannedSectors(category: Category, totalCategoryBudget: number): PlannedSector[] {
  const defaults = DEFAULT_CATEGORY_SECTORS[category] || [];
  return defaults.map((d, index) => {
    // Distribute rounded amounts
    const planned = Math.round((totalCategoryBudget * d.defaultShare) / 100) * 100;
    return {
      id: `sector-${category}-${index + 1}`,
      name: d.name,
      plannedAmount: planned,
      icon: d.icon,
    };
  });
}

export interface SectorCalculationItem {
  id: string;
  name: string;
  icon?: string;
  plannedAmount: number;
  actualAmount: number;
  remainingAmount: number;
  variance: number; // actual - planned
  status: BudgetSignal;
  percentage: number;
  isUnplanned?: boolean;
}

export function computeCategorySectorBreakdown(
  plan: Plan | null,
  expenses: Expense[],
  category: Category,
  monthKey: string
): {
  sectors: SectorCalculationItem[];
  totalPlanned: number;
  totalActual: number;
  remaining: number;
  variance: number;
  overallStatus: BudgetSignal;
} {
  const activeExpenses = expenses.filter(
    (e) => e.monthKey === monthKey && e.category === category && !e.deleted
  );

  const totalActual = activeExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Retrieve planned sectors or fallback to defaults if planned
  let plannedSectors: PlannedSector[] = plan?.plannedSectors?.[category] || [];
  const plannedSectorsSum = plannedSectors.reduce((sum, s) => sum + (s.plannedAmount || 0), 0);
  const totalPlanned = plannedSectorsSum > 0 ? plannedSectorsSum : (plan?.categoryBudgets?.[category] || 0);

  if (plannedSectors.length === 0 && totalPlanned > 0) {
    plannedSectors = getDefaultPlannedSectors(category, totalPlanned);
  }

  const sectorMap = new Map<string, SectorCalculationItem>();

  // Initialize planned sectors
  plannedSectors.forEach((s) => {
    sectorMap.set(s.name.toLowerCase().trim(), {
      id: s.id,
      name: s.name,
      icon: s.icon,
      plannedAmount: s.plannedAmount,
      actualAmount: 0,
      remainingAmount: s.plannedAmount,
      variance: -s.plannedAmount,
      status: 'NOT_STARTED',
      percentage: 0,
    });
  });

  // Track matched vs unmatched expense amounts
  activeExpenses.forEach((exp) => {
    const rawName = (exp.sectorName || exp.note || '').toLowerCase().trim();
    
    // Find best match in planned sectors
    let matchedKey: string | null = null;
    for (const [key] of sectorMap) {
      if (rawName.includes(key) || key.includes(rawName)) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey && sectorMap.has(matchedKey)) {
      const item = sectorMap.get(matchedKey)!;
      item.actualAmount += exp.amount;
    } else {
      // Unplanned sector entry
      const cleanName = exp.sectorName || exp.note || 'General spending';
      const unKey = `unplanned-${cleanName.toLowerCase()}`;
      if (sectorMap.has(unKey)) {
        sectorMap.get(unKey)!.actualAmount += exp.amount;
      } else {
        sectorMap.set(unKey, {
          id: exp.sectorId || generateUUID(),
          name: cleanName,
          icon: '⚡',
          plannedAmount: 0,
          actualAmount: exp.amount,
          remainingAmount: -exp.amount,
          variance: exp.amount,
          status: 'UNPLANNED',
          percentage: 100,
          isUnplanned: true,
        });
      }
    }
  });

  // Finalize stats per sector
  const sectorsList: SectorCalculationItem[] = Array.from(sectorMap.values()).map((item) => {
    const remaining = Math.max(0, item.plannedAmount - item.actualAmount);
    const variance = item.actualAmount - item.plannedAmount;
    const status = computeBudgetSignal(item.plannedAmount, item.actualAmount);
    const percentage = item.plannedAmount > 0 
      ? Math.round((item.actualAmount / item.plannedAmount) * 100) 
      : 100;

    return {
      ...item,
      remainingAmount: remaining,
      variance,
      status,
      percentage,
    };
  });

  // Sort: Over plan first, then in progress, then unplanned, then not started
  sectorsList.sort((a, b) => {
    if (a.status === 'OVER_PLAN' && b.status !== 'OVER_PLAN') return -1;
    if (b.status === 'OVER_PLAN' && a.status !== 'OVER_PLAN') return 1;
    return b.actualAmount - a.actualAmount;
  });

  const remaining = Math.max(0, totalPlanned - totalActual);
  const variance = totalActual - totalPlanned;
  const overallStatus = computeBudgetSignal(totalPlanned, totalActual);

  return {
    sectors: sectorsList,
    totalPlanned,
    totalActual,
    remaining,
    variance,
    overallStatus,
  };
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Initial sample seed for the first time
function getSeedData(): { plans: Plan[]; expenses: Expense[]; savingsEntries: SavingsEntry[] } {
  const curMonth = getCurrentMonthKey();
  const samplePlan: Plan = {
    monthKey: curMonth,
    income: 50000,
    savingsTarget: 15000,
    totalExpenses: 35000,
    improvementNotes: 'Cook wholesome meals at home and avoid impulse online shopping.',
    categoryBudgets: {
      survival: 18000,
      optional: 7000,
      culture: 5000,
      extra: 5000,
    },
    categoryBudgetLines: {
      survival: [
        { id: 'line-rent', name: 'Rent', budget: 10000 },
        { id: 'line-groc', name: 'Groceries & Milk', budget: 6000 },
        { id: 'line-util', name: 'Electricity & Bills', budget: 2000 },
      ],
      optional: [
        { id: 'line-dine', name: 'Dining Out & Cafes', budget: 4000 },
        { id: 'line-shop', name: 'Shopping', budget: 3000 },
      ],
      culture: [
        { id: 'line-books', name: 'Books & Learning', budget: 2500 },
        { id: 'line-courses', name: 'Courses & Skills', budget: 2500 },
      ],
      extra: [
        { id: 'line-repairs', name: 'Repairs & Maintenance', budget: 3000 },
        { id: 'line-gifts', name: 'Gifts & Festivals', budget: 2000 },
      ],
    },
    currency: 'INR',
    reflection: '',
    updatedAt: Date.now() - 10000,
  };

  const sampleExpenses: Expense[] = [
    {
      id: 'sample-1',
      monthKey: curMonth,
      amount: 2450,
      category: 'survival',
      budgetLineId: 'line-groc',
      budgetLineName: 'Groceries & Milk',
      note: 'Weekly fresh groceries and pantry supplies',
      date: new Date(Date.now() - 86400000 * 1).toISOString(),
      createdAt: Date.now() - 86400000 * 1,
      updatedAt: Date.now() - 86400000 * 1,
      deleted: false,
    },
    {
      id: 'sample-2',
      monthKey: curMonth,
      amount: 650,
      category: 'culture',
      budgetLineId: 'line-books',
      budgetLineName: 'Books & Learning',
      note: 'Financial mindfulness guide & philosophy book',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
      deleted: false,
    },
    {
      id: 'sample-3',
      monthKey: curMonth,
      amount: 450,
      category: 'optional',
      budgetLineId: 'line-dine',
      budgetLineName: 'Dining Out & Cafes',
      note: 'Coffee and snacks with colleagues',
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
      createdAt: Date.now() - 86400000 * 3,
      updatedAt: Date.now() - 86400000 * 3,
      deleted: false,
    },
  ];

  const sampleSavings: SavingsEntry[] = [
    {
      id: 'sample-sav-1',
      monthKey: curMonth,
      amount: 10000,
      destination: 'mutual_fund',
      committedReturn: '12.5% CAGR',
      date: new Date(Date.now() - 86400000 * 5).toISOString(),
      notes: 'Index Fund SIP monthly deposit',
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now() - 86400000 * 5,
      deleted: false,
    },
    {
      id: 'sample-sav-2',
      monthKey: curMonth,
      amount: 2500,
      destination: 'fixed_deposit',
      committedReturn: '7.1% p.a.',
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
      notes: 'Emergency reserve fixed deposit',
      createdAt: Date.now() - 86400000 * 3,
      updatedAt: Date.now() - 86400000 * 3,
      deleted: false,
    },
  ];

  return { plans: [samplePlan], expenses: sampleExpenses, savingsEntries: sampleSavings };
}

class StorageManager {
  private listeners: Array<() => void> = [];
  private syncInProgress = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.triggerSync();
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notify();
      });
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public getUser(): UserProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    const defaultUser: UserProfile = {
      uid: 'device-user',
      displayName: 'Mindful Ledger',
      email: null,
      isAnonymous: true,
    };
    return defaultUser;
  }

  public setUser(user: UserProfile) {
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      this.notify();
      this.triggerSync();
    } catch (e) {
      console.error('Failed to save user:', e);
    }
  }

  public getLocalState(): AppState {
    try {
      const rawPlans = localStorage.getItem(STORAGE_KEY_PLANS);
      const rawExpenses = localStorage.getItem(STORAGE_KEY_EXPENSES);
      const rawSavings = localStorage.getItem(STORAGE_KEY_SAVINGS);

      if (!rawPlans && !rawExpenses) {
        const initialized = localStorage.getItem(STORAGE_KEY_INITIALIZED);
        if (!initialized) {
          const seed = getSeedData();
          localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
          this.saveLocalState(seed.plans, seed.expenses, seed.savingsEntries);
          return seed;
        }
      }

      let plans: Plan[] = rawPlans ? JSON.parse(rawPlans) : [];
      let expenses: Expense[] = rawExpenses ? JSON.parse(rawExpenses) : [];
      let savingsEntries: SavingsEntry[] = rawSavings ? JSON.parse(rawSavings) : [];

      // Sanitize expenses ensuring valid IDs and amounts
      const sanitizedExpenses = expenses.filter((e) => {
        if (!e || !e.id || typeof e.amount !== 'number' || isNaN(e.amount)) return false;
        return true;
      });

      if (sanitizedExpenses.length !== expenses.length) {
        expenses = sanitizedExpenses;
        this.saveLocalState(plans, expenses, savingsEntries);
      }

      // If user had existing plans initialized with old USD defaults, migrate to INR
      let migrated = false;
      const globalCurr = getGlobalCurrency();
      plans = plans.map((p) => {
        if (!p.currency || p.currency === 'USD') {
          migrated = true;
          return { ...p, currency: globalCurr };
        }
        return p;
      });

      if (migrated) {
        this.saveLocalState(plans, expenses, savingsEntries);
      }

      return { plans, expenses, savingsEntries };
    } catch (e) {
      console.error('Failed reading local storage:', e);
      return { plans: [], expenses: [], savingsEntries: [] };
    }
  }

  private saveLocalState(plans: Plan[], expenses: Expense[], savingsEntries: SavingsEntry[]) {
    try {
      localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(plans));
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
      localStorage.setItem(STORAGE_KEY_SAVINGS, JSON.stringify(savingsEntries));
      this.notify();
    } catch (e) {
      console.error('Failed to write local state:', e);
    }
  }

  public savePlan(plan: Plan) {
    const { plans, expenses, savingsEntries } = this.getLocalState();
    const now = Date.now();
    const updatedPlan: Plan = {
      ...plan,
      updatedAt: now,
    };

    const existingIndex = plans.findIndex((p) => p.monthKey === plan.monthKey);
    let newPlans: Plan[];
    if (existingIndex >= 0) {
      newPlans = [...plans];
      newPlans[existingIndex] = updatedPlan;
    } else {
      newPlans = [...plans, updatedPlan];
    }

    this.saveLocalState(newPlans, expenses, savingsEntries);
    this.triggerSync();
  }

  public saveExpense(expense: Expense) {
    const { plans, expenses, savingsEntries } = this.getLocalState();
    const now = Date.now();
    const updatedExpense: Expense = {
      ...expense,
      id: expense.id || generateUUID(),
      createdAt: expense.createdAt || now,
      updatedAt: now,
    };

    const existingIndex = expenses.findIndex((e) => e.id === updatedExpense.id);
    let newExpenses: Expense[];
    if (existingIndex >= 0) {
      newExpenses = [...expenses];
      newExpenses[existingIndex] = updatedExpense;
    } else {
      newExpenses = [updatedExpense, ...expenses];
    }

    this.saveLocalState(plans, newExpenses, savingsEntries);
    this.triggerSync();
  }

  public softDeleteExpense(id: string) {
    const { plans, expenses, savingsEntries } = this.getLocalState();
    const now = Date.now();
    const newExpenses = expenses.map((e) => {
      if (e.id === id) {
        return { ...e, deleted: true, updatedAt: now };
      }
      return e;
    });

    this.saveLocalState(plans, newExpenses, savingsEntries);
    this.triggerSync();
  }

  public restoreExpense(id: string) {
    const { plans, expenses, savingsEntries } = this.getLocalState();
    const now = Date.now();
    const newExpenses = expenses.map((e) => {
      if (e.id === id) {
        return { ...e, deleted: false, updatedAt: now };
      }
      return e;
    });

    this.saveLocalState(plans, newExpenses, savingsEntries);
    this.triggerSync();
  }

  public saveSavingsEntry(entry: SavingsEntry) {
    const { plans, expenses, savingsEntries } = this.getLocalState();
    const now = Date.now();
    const updatedEntry: SavingsEntry = {
      ...entry,
      id: entry.id || generateUUID(),
      createdAt: entry.createdAt || now,
      updatedAt: now,
    };

    const existingIndex = savingsEntries.findIndex((s) => s.id === updatedEntry.id);
    let newSavings: SavingsEntry[];
    if (existingIndex >= 0) {
      newSavings = [...savingsEntries];
      newSavings[existingIndex] = updatedEntry;
    } else {
      newSavings = [updatedEntry, ...savingsEntries];
    }

    this.saveLocalState(plans, expenses, newSavings);
    this.triggerSync();
  }

  public softDeleteSavingsEntry(id: string) {
    const { plans, expenses, savingsEntries } = this.getLocalState();
    const now = Date.now();
    const newSavings = savingsEntries.map((s) => {
      if (s.id === id) {
        return { ...s, deleted: true, updatedAt: now };
      }
      return s;
    });

    this.saveLocalState(plans, expenses, newSavings);
    this.triggerSync();
  }

  public restoreSavingsEntry(id: string) {
    const { plans, expenses, savingsEntries } = this.getLocalState();
    const now = Date.now();
    const newSavings = savingsEntries.map((s) => {
      if (s.id === id) {
        return { ...s, deleted: false, updatedAt: now };
      }
      return s;
    });

    this.saveLocalState(plans, expenses, newSavings);
    this.triggerSync();
  }

  // Transaction Inbox (MOKU 2.0 Core Feature)
  public getInboxTransactions(): InboxTransaction[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_INBOX);
      if (raw) {
        return JSON.parse(raw);
      }
      // Initial seed inbox items
      const seedInbox: InboxTransaction[] = [
        {
          id: 'inbox-1',
          merchant: 'Zomato',
          amount: 850,
          type: 'expense',
          source: 'UPI · Today · 8:35 PM',
          suggestedCategory: 'optional',
          timestamp: Date.now() - 3600000 * 2,
          status: 'pending',
        },
        {
          id: 'inbox-2',
          merchant: 'Groceries & Provisions',
          amount: 1200,
          type: 'expense',
          source: 'UPI · Today · 12:10 PM',
          suggestedCategory: 'survival',
          timestamp: Date.now() - 3600000 * 7,
          status: 'pending',
        },
        {
          id: 'inbox-3',
          merchant: 'Salary Credited',
          amount: 50000,
          type: 'income',
          source: 'HDFC Bank · 1 Sep',
          timestamp: Date.now() - 86400000,
          status: 'pending',
        },
      ];
      this.saveInboxTransactions(seedInbox);
      return seedInbox;
    } catch {
      return [];
    }
  }

  public saveInboxTransactions(items: InboxTransaction[]) {
    try {
      localStorage.setItem(STORAGE_KEY_INBOX, JSON.stringify(items));
      this.notify();
    } catch (e) {
      console.error('Failed saving inbox:', e);
    }
  }

  public addInboxTransaction(item: Omit<InboxTransaction, 'id' | 'timestamp' | 'status'>) {
    const items = this.getInboxTransactions();
    const newItem: InboxTransaction = {
      ...item,
      id: generateUUID(),
      timestamp: Date.now(),
      status: 'pending',
    };
    this.saveInboxTransactions([newItem, ...items]);
  }

  public dismissInboxTransaction(id: string) {
    const items = this.getInboxTransactions();
    const updated = items.map(t => t.id === id ? { ...t, status: 'dismissed' as const } : t);
    this.saveInboxTransactions(updated);
  }

  public restoreInboxTransaction(id: string) {
    const items = this.getInboxTransactions();
    const updated = items.map(t => t.id === id ? { ...t, status: 'pending' as const } : t);
    this.saveInboxTransactions(updated);
  }

  public deleteInboxTransaction(id: string) {
    const items = this.getInboxTransactions();
    const updated = items.filter(t => t.id !== id);
    this.saveInboxTransactions(updated);
  }

  public clearReviewedInboxTransactions() {
    const items = this.getInboxTransactions();
    const updated = items.filter(t => t.status === 'pending');
    this.saveInboxTransactions(updated);
  }

  public resetSampleInboxTransactions() {
    const seedInbox: InboxTransaction[] = [
      {
        id: generateUUID(),
        merchant: 'Zomato Food Delivery',
        amount: 850,
        type: 'expense',
        source: 'UPI · Today · 8:35 PM',
        suggestedCategory: 'optional',
        timestamp: Date.now() - 3600000 * 2,
        status: 'pending',
      },
      {
        id: generateUUID(),
        merchant: 'Groceries & Provisions',
        amount: 1200,
        type: 'expense',
        source: 'UPI · Today · 12:10 PM',
        suggestedCategory: 'survival',
        timestamp: Date.now() - 3600000 * 7,
        status: 'pending',
      },
      {
        id: generateUUID(),
        merchant: 'Monthly Salary Credited',
        amount: 50000,
        type: 'income',
        source: 'HDFC Bank · 1 Sep',
        timestamp: Date.now() - 86400000,
        status: 'pending',
      },
    ];
    this.saveInboxTransactions(seedInbox);
    return seedInbox;
  }

  public confirmInboxIncome(id: string, monthKey: string, creditType: 'income' | 'otherIncome' = 'income', note?: string) {
    const items = this.getInboxTransactions();
    const target = items.find(t => t.id === id);
    if (!target) return;

    const { plans } = this.getLocalState();
    const targetMonth = monthKey || getCurrentMonthKey();
    let targetPlan = plans.find(p => p.monthKey === targetMonth);

    if (targetPlan) {
      const updatedPlan: Plan = {
        ...targetPlan,
        income: creditType === 'income' ? (targetPlan.income || 0) + target.amount : targetPlan.income,
        otherIncome: creditType === 'otherIncome' ? (targetPlan.otherIncome || 0) + target.amount : targetPlan.otherIncome,
        updatedAt: Date.now(),
      };
      this.savePlan(updatedPlan);
    } else {
      const newPlan: Plan = {
        monthKey: targetMonth,
        income: target.amount,
        savingsTarget: Math.round(target.amount * 0.2),
        totalExpenses: Math.round(target.amount * 0.8),
        improvementNotes: note || 'Conscious allocation.',
        categoryBudgets: {
          survival: Math.round(target.amount * 0.44),
          optional: Math.round(target.amount * 0.18),
          culture: Math.round(target.amount * 0.09),
          extra: Math.round(target.amount * 0.09),
        },
        currency: getGlobalCurrency(),
        reflection: '',
        updatedAt: Date.now(),
      };
      this.savePlan(newPlan);
    }

    const updated = items.map(t => t.id === id ? { ...t, status: 'confirmed' as const } : t);
    this.saveInboxTransactions(updated);
  }

  public confirmInboxTransaction(
    id: string, 
    category: Category, 
    note?: string, 
    sectorId?: string, 
    sectorName?: string,
    monthKey?: string,
    amountOverride?: number
  ) {
    const items = this.getInboxTransactions();
    const target = items.find(t => t.id === id);
    if (!target) return;

    const finalMonthKey = monthKey || getCurrentMonthKey();
    const finalAmount = amountOverride !== undefined && amountOverride > 0 ? amountOverride : target.amount;

    if (target.type === 'income') {
      this.confirmInboxIncome(id, finalMonthKey, 'income', note || target.merchant);
      return;
    }

    // Convert to verified expense
    const newExpense: Expense = {
      id: generateUUID(),
      monthKey: finalMonthKey,
      amount: finalAmount,
      category,
      sectorId: sectorId || undefined,
      sectorName: sectorName || target.suggestedSectorName,
      note: note || target.merchant,
      date: new Date().toISOString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deleted: false,
    };

    this.saveExpense(newExpense);
    const updated = items.map(t => t.id === id ? { ...t, status: 'confirmed' as const } : t);
    this.saveInboxTransactions(updated);
  }

  // Reset all user data / Clean Slate
  public async resetAllData(createFreshCurrentMonth = false): Promise<void> {
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_LAST_RESET, String(now));
      localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
    } catch {
      // ignore
    }

    const curMonth = getCurrentMonthKey();
    const globalCurr = getGlobalCurrency();

    let freshPlans: Plan[] = [];
    if (createFreshCurrentMonth) {
      freshPlans = [
        {
          monthKey: curMonth,
          income: 0,
          savingsTarget: 0,
          totalExpenses: 0,
          improvementNotes: '',
          categoryBudgets: {
            survival: 0,
            optional: 0,
            culture: 0,
            extra: 0,
          },
          currency: globalCurr,
          reflection: '',
          updatedAt: now,
        },
      ];
    }

    this.saveLocalState(freshPlans, [], []);
    this.saveInboxTransactions([]);

    // Clear remote state as well if online
    try {
      const user = this.getUser();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const token = await getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (user.uid) {
        headers['x-user-id'] = user.uid;
      }

      await fetch('/api/reset', {
        method: 'POST',
        headers,
      }).catch(() => {
        // ignore offline network failure
      });
    } catch {
      // ignore
    }

    this.notify();
  }

  // PIN Security Configuration
  public getPinConfig(): PinSecurityConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PIN_CONFIG);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return getDefaultPinConfig();
  }

  public savePinConfig(config: PinSecurityConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY_PIN_CONFIG, JSON.stringify(config));
      this.notify();
    } catch (e) {
      console.error('Failed to save PIN config:', e);
    }
  }

  public isAppLocked(): boolean {
    const config = this.getPinConfig();
    if (!config.isEnabled || !config.pinHash) return false;
    try {
      const lockedVal = sessionStorage.getItem(STORAGE_KEY_PIN_LOCKED);
      if (lockedVal === 'unlocked') return false;
    } catch {
      // ignore
    }
    return true;
  }

  public setAppLocked(locked: boolean): void {
    try {
      if (locked) {
        sessionStorage.removeItem(STORAGE_KEY_PIN_LOCKED);
      } else {
        sessionStorage.setItem(STORAGE_KEY_PIN_LOCKED, 'unlocked');
      }
      this.notify();
    } catch {
      // ignore
    }
  }

  // Background Sync Engine (TRD §5)
  public async triggerSync(): Promise<void> {
    if (this.syncInProgress || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    this.syncInProgress = true;

    try {
      const user = this.getUser();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const token = await getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (user.uid) {
        headers['x-user-id'] = user.uid;
      }

      const local = this.getLocalState();

      // 1. Post local changes to /api/sync
      const syncRes = await fetch('/api/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plans: local.plans,
          expenses: local.expenses,
          savingsEntries: local.savingsEntries,
        }),
      });

      if (syncRes.ok) {
        // 2. Fetch full remote state to reconcile any newer items from other devices
        const stateRes = await fetch('/api/state', { headers });
        if (stateRes.ok) {
          const remoteData = await stateRes.json();
          this.reconcileState(
            remoteData.plans || [], 
            remoteData.expenses || [],
            remoteData.savingsEntries || []
          );
          localStorage.setItem(STORAGE_KEY_LAST_SYNC, Date.now().toString());
        }
      }
    } catch (err) {
      console.warn('Background sync deferred (offline or unreachable):', err);
    } finally {
      this.syncInProgress = false;
      this.notify();
    }
  }

  // Last-write-wins reconciliation
  private reconcileState(
    remotePlans: Plan[], 
    remoteExpenses: Expense[], 
    remoteSavings: SavingsEntry[] = []
  ) {
    const lastResetStr = localStorage.getItem(STORAGE_KEY_LAST_RESET);
    const lastResetTime = lastResetStr ? parseInt(lastResetStr, 10) : 0;

    const local = this.getLocalState();
    const planMap = new Map<string, Plan>();
    const expenseMap = new Map<string, Expense>();
    const savingsMap = new Map<string, SavingsEntry>();

    // Put local first
    local.plans.forEach((p) => planMap.set(p.monthKey, p));
    local.expenses.forEach((e) => expenseMap.set(e.id, e));
    (local.savingsEntries || []).forEach((s) => savingsMap.set(s.id, s));

    // Upsert remote if newer and after last reset
    remotePlans.forEach((rp) => {
      if ((rp.updatedAt || 0) <= lastResetTime) return;
      const lp = planMap.get(rp.monthKey);
      if (!lp || (rp.updatedAt || 0) >= (lp.updatedAt || 0)) {
        planMap.set(rp.monthKey, rp);
      }
    });

    remoteExpenses.forEach((re) => {
      if ((re.updatedAt || 0) <= lastResetTime || (re.createdAt || 0) <= lastResetTime) return;
      const le = expenseMap.get(re.id);
      if (!le || (re.updatedAt || 0) >= (le.updatedAt || 0)) {
        expenseMap.set(re.id, re);
      }
    });

    remoteSavings.forEach((rs) => {
      if ((rs.updatedAt || 0) <= lastResetTime || (rs.createdAt || 0) <= lastResetTime) return;
      const ls = savingsMap.get(rs.id);
      if (!ls || (rs.updatedAt || 0) >= (ls.updatedAt || 0)) {
        savingsMap.set(rs.id, rs);
      }
    });

    const mergedPlans = Array.from(planMap.values());
    const mergedExpenses = Array.from(expenseMap.values());
    const mergedSavings = Array.from(savingsMap.values());

    this.saveLocalState(mergedPlans, mergedExpenses, mergedSavings);
  }
}

export const storage = new StorageManager();
