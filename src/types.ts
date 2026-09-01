/**
 * Kakeibo Ledger Types
 * Based on TRD §4 Data Model
 */

export type Category = 'survival' | 'optional' | 'culture' | 'extra';

export interface CategoryInfo {
  id: Category;
  name: string;
  kanji: string;
  subhead: string;
  description: string;
  examples: string;
  color: string; // Tailwind hex / text class
  bgLight: string;
  borderColor: string;
}

export const CATEGORIES: Record<Category, CategoryInfo> = {
  survival: {
    id: 'survival',
    name: 'Survival',
    kanji: 'अनिवार्य व्यय',
    subhead: 'Needs (आवश्यकता)',
    description: 'Essential expenses to sustain daily life',
    examples: 'किराना, किराया, बिजली/पानी, दवाइयां, परिवहन',
    color: '#23211D', // Ink
    bgLight: 'rgba(35, 33, 29, 0.06)',
    borderColor: 'rgba(35, 33, 29, 0.3)',
  },
  optional: {
    id: 'optional',
    name: 'Optional',
    kanji: 'वैकल्पिक व्यय',
    subhead: 'Wants (इच्छाएं)',
    description: 'Comforts and non-essential pleasures',
    examples: 'बाहर खाना, शॉपिंग, सिनेमा, शौक, स्नैक्स',
    color: '#B5652E', // Clay
    bgLight: 'rgba(181, 101, 46, 0.08)',
    borderColor: 'rgba(181, 101, 46, 0.35)',
  },
  culture: {
    id: 'culture',
    name: 'Culture',
    kanji: 'ज्ञान व विकास',
    subhead: 'Growth (संस्कृति)',
    description: 'Intellectual & spiritual enrichment',
    examples: 'किताबें, कोर्स, संग्रहालय, कला, कौशल विकास',
    color: '#35415C', // Indigo
    bgLight: 'rgba(53, 65, 92, 0.08)',
    borderColor: 'rgba(53, 65, 92, 0.35)',
  },
  extra: {
    id: 'extra',
    name: 'Extra',
    kanji: 'आकस्मिक व्यय',
    subhead: 'Unexpected (अतिरिक्त)',
    description: 'Unplanned expenses & irregular outlays',
    examples: 'मरम्मत, उपहार, त्योहार/उत्सव, आपातकालीन खर्च',
    color: '#A8342A', // Hanko red
    bgLight: 'rgba(168, 52, 42, 0.08)',
    borderColor: 'rgba(168, 52, 42, 0.35)',
  },
};

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
  savingsTarget: number; // Question 2: Savings target
  totalExpenses: number; // Question 3: Planned total expenses
  improvementNotes: string; // Question 4: One thing to try/improve
  categoryBudgets: CategoryBudgets;
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
  budgetLineId?: string; // Optional budget line reference
  budgetLineName?: string; // Cached budget line name
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
