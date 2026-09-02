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
  UserProfile 
} from '../types';

const STORAGE_KEY_PLANS = 'kakeibo_plans_v1';
const STORAGE_KEY_EXPENSES = 'kakeibo_expenses_v1';
const STORAGE_KEY_SAVINGS = 'kakeibo_savings_v1';
const STORAGE_KEY_INBOX = 'kakeibo_inbox_v1';
const STORAGE_KEY_USER = 'kakeibo_user_v1';
const STORAGE_KEY_LAST_SYNC = 'kakeibo_last_sync_v1';
const STORAGE_KEY_GLOBAL_CURRENCY = 'kakeibo_global_currency_v1';

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
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    const symbol = currencyCode === 'INR' ? '₹' : currencyCode;
    return `${symbol} ${amount.toLocaleString()}`;
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
  const totalPlanned = plan?.categoryBudgets?.[category] || 0;

  // Retrieve planned sectors or fallback to defaults if planned
  let plannedSectors: PlannedSector[] = plan?.plannedSectors?.[category] || [];
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
        const seed = getSeedData();
        this.saveLocalState(seed.plans, seed.expenses, seed.savingsEntries);
        return seed;
      }

      let plans: Plan[] = rawPlans ? JSON.parse(rawPlans) : [];
      let expenses: Expense[] = rawExpenses ? JSON.parse(rawExpenses) : [];
      let savingsEntries: SavingsEntry[] = rawSavings ? JSON.parse(rawSavings) : [];

      // Clean up any corrupt legacy entries (e.g. abnormal 48000 test entry or entries with empty/deleted artifacts)
      const sanitizedExpenses = expenses.filter((e) => {
        if (!e || !e.id || typeof e.amount !== 'number' || isNaN(e.amount)) return false;
        // Filter out rogue 48000 test artifact if present
        if (e.id === '0428c8be-36dd-4c54-b658-584ed31daacc' || (e.amount === 48000 && !e.note)) return false;
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

  public confirmInboxTransaction(id: string, category: Category, note?: string, sectorName?: string, sectorId?: string) {
    const items = this.getInboxTransactions();
    const target = items.find(t => t.id === id);
    if (!target) return;

    // Convert to verified expense
    const newExpense: Expense = {
      id: generateUUID(),
      monthKey: getCurrentMonthKey(),
      amount: target.amount,
      category,
      sectorId,
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

  // Background Sync Engine (TRD §5)
  public async triggerSync(): Promise<void> {
    if (this.syncInProgress || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    this.syncInProgress = true;

    try {
      const user = this.getUser();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': user.uid,
      };

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
    const local = this.getLocalState();
    const planMap = new Map<string, Plan>();
    const expenseMap = new Map<string, Expense>();
    const savingsMap = new Map<string, SavingsEntry>();

    // Put local first
    local.plans.forEach((p) => planMap.set(p.monthKey, p));
    local.expenses.forEach((e) => expenseMap.set(e.id, e));
    (local.savingsEntries || []).forEach((s) => savingsMap.set(s.id, s));

    // Upsert remote if newer
    remotePlans.forEach((rp) => {
      const lp = planMap.get(rp.monthKey);
      if (!lp || (rp.updatedAt || 0) >= (lp.updatedAt || 0)) {
        planMap.set(rp.monthKey, rp);
      }
    });

    remoteExpenses.forEach((re) => {
      // Filter rogue 48000 entry if any in remote
      if (re.id === '0428c8be-36dd-4c54-b658-584ed31daacc' || (re.amount === 48000 && !re.note)) return;
      const le = expenseMap.get(re.id);
      if (!le || (re.updatedAt || 0) >= (le.updatedAt || 0)) {
        expenseMap.set(re.id, re);
      }
    });

    remoteSavings.forEach((rs) => {
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
