/**
 * Kakeibo Ledger Types
 * Based on TRD §4 Data Model
 */

export type Category = 'survival' | 'optional' | 'culture' | 'extra';

export interface CategoryInfo {
  id: Category;
  name: string;
  subhead: string;
  description: string;
  examples: string;
  icon: string;
  color: string;
  bgLight: string;
}

export const CATEGORIES: Record<Category, CategoryInfo> = {
  survival: {
    id: 'survival',
    name: 'Essentials',
    subhead: 'Needs',
    description: 'Essential expenses to sustain daily life',
    examples: 'Groceries, rent, bills, transit, health',
    icon: '🏠',
    color: '#176B52',
    bgLight: 'rgba(23, 107, 82, 0.08)',
  },
  optional: {
    id: 'optional',
    name: 'Wants',
    subhead: 'Enjoyment',
    description: 'Comforts, dining out & leisure pleasures',
    examples: 'Restaurants, shopping, movies, hobbies, cafe',
    icon: '✨',
    color: '#B5652E',
    bgLight: 'rgba(181, 101, 46, 0.08)',
  },
  culture: {
    id: 'culture',
    name: 'Growth',
    subhead: 'Learning',
    description: 'Intellectual, personal & skills enrichment',
    examples: 'Books, courses, workshops, fitness, music',
    icon: '📚',
    color: '#35415C',
    bgLight: 'rgba(53, 65, 92, 0.08)',
  },
  extra: {
    id: 'extra',
    name: 'Unexpected',
    subhead: 'Unplanned',
    description: 'Unplanned outlays, sudden repairs & gifts',
    examples: 'Car repairs, emergency care, urgent gifts',
    icon: '⚡',
    color: '#A8342A',
    bgLight: 'rgba(168, 52, 42, 0.08)',
  },
};

export interface PlannedSector {
  id: string;
  name: string;
  plannedAmount: number;
  icon?: string;
}

export type BudgetSignal = 
  | 'NOT_STARTED' 
  | 'IN_PROGRESS'
  | 'ON_TRACK' 
  | 'WATCH' 
  | 'PAID' 
  | 'UNDER_PLAN' 
  | 'OVER_PLAN' 
  | 'UNPLANNED';

export const QUICK_CHIP_SUGGESTIONS: Record<Category, string[]> = {
  survival: ['Rent', 'Groceries', 'Dairy', 'Medicine', 'Utilities', 'Transit'],
  optional: ['Eating Out', 'Shopping', 'Entertainment', 'Subscriptions', 'Travel', 'Personal Care'],
  culture: ['Books', 'Courses', 'Education', 'Skill Development', 'Music', 'Hobbies'],
  extra: ['Emergency', 'Repair', 'Medical', 'Gift', 'Special Event', 'One-time Expense'],
};

export const DEFAULT_CATEGORY_SECTORS: Record<Category, { name: string; icon: string; defaultShare: number }[]> = {
  survival: [
    { name: 'Rent', icon: '🏠', defaultShare: 0.35 },
    { name: 'Groceries', icon: '🛒', defaultShare: 0.25 },
    { name: 'Dairy', icon: '🥛', defaultShare: 0.12 },
    { name: 'Utilities', icon: '⚡', defaultShare: 0.10 },
    { name: 'Medicine', icon: '💊', defaultShare: 0.08 },
    { name: 'Transit', icon: '🚇', defaultShare: 0.10 },
  ],
  optional: [
    { name: 'Eating Out', icon: '🍽️', defaultShare: 0.35 },
    { name: 'Shopping', icon: '🛍️', defaultShare: 0.30 },
    { name: 'Entertainment', icon: '🎬', defaultShare: 0.20 },
    { name: 'Subscriptions', icon: '📱', defaultShare: 0.15 },
  ],
  culture: [
    { name: 'Courses', icon: '💻', defaultShare: 0.50 },
    { name: 'Books', icon: '📖', defaultShare: 0.20 },
    { name: 'Hobbies & Sports', icon: '🎨', defaultShare: 0.30 },
  ],
  extra: [
    { name: 'Emergency', icon: '🚨', defaultShare: 0.40 },
    { name: 'Gifts & Celebrations', icon: '🎁', defaultShare: 0.25 },
    { name: 'Repairs & Maintenance', icon: '🔧', defaultShare: 0.35 },
  ],
};

export interface InboxTransaction {
  id: string;
  merchant: string;
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  source: string; // e.g. "UPI · Today · 8:35 PM", "HDFC Bank · 1 Sep"
  suggestedCategory?: Category;
  suggestedSectorName?: string;
  rawText?: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'dismissed';
}

export interface BudgetLine {
  id: string;
  name: string;
  budget: number;
}

export interface CategoryBudgets {
  survival: number;
  optional: number;
  culture: number;
  extra: number;
}

export interface Plan {
  monthKey: string; // "YYYY-MM"
  income: number; // Question 1: Total available income
  openingBalance?: number; // Opening balance / carryover
  otherIncome?: number; // Other income
  savingsTarget: number; // Question 2: Savings target
  totalExpenses: number; // Question 3: Planned total spending budget
  improvementNotes: string; // Question 4: One thing to try/improve
  categoryBudgets: CategoryBudgets;
  plannedSectors?: Record<Category, PlannedSector[]>;
  categoryBudgetLines?: {
    survival?: BudgetLine[];
    optional?: BudgetLine[];
    culture?: BudgetLine[];
    extra?: BudgetLine[];
  };
  currency: string; // e.g. "INR", "USD", "EUR", "GBP"
  reflection: string; // Free-text review reflection note
  updatedAt: number; // epoch ms
}

export interface Expense {
  id: string; // UUID
  monthKey: string; // "YYYY-MM"
  amount: number;
  category: Category;
  sectorId?: string; // Planned sector reference ID
  sectorName?: string; // Planned sector name (e.g. "Groceries", "Rent")
  budgetLineId?: string; // Legacy budget line reference
  budgetLineName?: string; // Legacy budget line name
  note: string;
  date: string; // ISO datetime string
  createdAt: number;
  updatedAt: number;
  deleted: boolean; // Soft delete flag
}

export type SavingsDestination = 
  | 'savings_account' 
  | 'fixed_deposit' 
  | 'recurring_deposit' 
  | 'mutual_fund' 
  | 'cash' 
  | 'other';

export interface SavingsEntry {
  id: string; // UUID
  monthKey: string; // "YYYY-MM"
  amount: number;
  destination: SavingsDestination;
  destinationCustom?: string;
  committedReturn?: string; // e.g. "6.5% p.a.", "12% CAGR", "7.1% PPF"
  date: string; // ISO string / YYYY-MM-DD
  notes?: string;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

export interface PinSecurityConfig {
  isEnabled: boolean;
  pinHash?: string;
  securityQuestion?: string;
  securityAnswerHash?: string;
  recoveryEmail?: string;
  recoveryKey?: string;
  lockTimeoutMinutes?: number;
  lastUnlockedAt?: number;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL?: string | null;
  isAnonymous: boolean;
}

export interface AppState {
  plans: Plan[];
  expenses: Expense[];
  savingsEntries: SavingsEntry[];
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'INR', symbol: '₹', name: 'INR (₹) - रुपया' },
  { code: 'USD', symbol: '$', name: 'USD ($)' },
  { code: 'EUR', symbol: '€', name: 'EUR (€)' },
  { code: 'GBP', symbol: '£', name: 'GBP (£)' },
  { code: 'JPY', symbol: '¥', name: 'JPY (¥)' },
  { code: 'CAD', symbol: 'CA$', name: 'CAD (CA$)' },
  { code: 'AUD', symbol: 'A$', name: 'AUD (A$)' },
  { code: 'SGD', symbol: 'S$', name: 'SGD (S$)' },
];
