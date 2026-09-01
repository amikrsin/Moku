import { Category } from '../types';

export interface LocalizedCategoryInfo {
  id: Category;
  name: string;
  badge: string;
  subhead: string;
  description: string;
  examples: string;
  color: string;
  bgLight: string;
  borderColor: string;
}

export const CATEGORIES_EN: Record<Category, LocalizedCategoryInfo> = {
  survival: {
    id: 'survival',
    name: 'Survival',
    badge: 'Needs',
    subhead: 'Essential Needs',
    description: 'Essential expenses to sustain daily life',
    examples: 'Rent, groceries, utilities, medicine, transit',
    color: '#23211D', // Ink
    bgLight: 'rgba(35, 33, 29, 0.06)',
    borderColor: 'rgba(35, 33, 29, 0.3)',
  },
  optional: {
    id: 'optional',
    name: 'Optional',
    badge: 'Wants',
    subhead: 'Comforts & Pleasures',
    description: 'Comforts and non-essential pleasures',
    examples: 'Dining out, shopping, hobbies, snacks, drinks',
    color: '#B5652E', // Clay
    bgLight: 'rgba(181, 101, 46, 0.08)',
    borderColor: 'rgba(181, 101, 46, 0.35)',
  },
  culture: {
    id: 'culture',
    name: 'Culture',
    badge: 'Growth',
    subhead: 'Enrichment & Learning',
    description: 'Intellectual, artistic & personal enrichment',
    examples: 'Books, courses, museums, exhibitions, lessons',
    color: '#35415C', // Indigo
    bgLight: 'rgba(53, 65, 92, 0.08)',
    borderColor: 'rgba(53, 65, 92, 0.35)',
  },
  extra: {
    id: 'extra',
    name: 'Extra',
    badge: 'Unexpected',
    subhead: 'Irregular Outlays',
    description: 'Unplanned expenses & unexpected occurrences',
    examples: 'Repairs, celebrations, gifts, urgent medical fees',
    color: '#A8342A', // Hanko red
    bgLight: 'rgba(168, 52, 42, 0.08)',
    borderColor: 'rgba(168, 52, 42, 0.35)',
  },
};

export function getCategoriesForCurrency(_currency?: string): Record<Category, LocalizedCategoryInfo> {
  return CATEGORIES_EN;
}

export function getCategoryInfo(category: Category, _currency?: string): LocalizedCategoryInfo {
  return CATEGORIES_EN[category];
}

export const translations = {
  en: {
    appTitle: 'MOKU',
    appSubhead: 'Mindful Spending & Budgeting',
    appBadge: 'Budget',
    stampRecorded: 'DONE',
    stampInscribed: 'RECORDED',
    navOverview: 'Overview',
    navRecord: 'Record',
    navLedger: 'Transactions',
    navReview: 'Review',
    navPlan: 'Plan',
    currencyLabel: 'Currency:',
    accountLocal: 'Local Device',
    accountTitle: 'Account & Sync Status',
    
    // Dashboard
    dashboardCurrentLedger: 'Monthly Log',
    dashboardEntries: 'entries',
    dashboardRecordExpense: 'Record Expense',
    dashboardMonthlyIntent: 'Monthly Intent:',
    dashboardSummary: 'Monthly Summary',
    dashboardIncome: 'Available Income',
    dashboardTotalSpent: 'Total Spent',
    dashboardRemaining: 'Remaining to Spend',
    dashboardProjectedBalance: 'Projected Balance',
    dashboardSavingsTarget: 'Savings Target Progress',
    dashboardTarget: 'Target',
    dashboardSaved: 'Saved',
    dashboardCategoryBudgets: 'Category Budgets',
    dashboardCategorySubtitle: 'Monitor spending across the 4 essential categories',
    dashboardRecentEntries: 'Recent Entries',
    dashboardViewAll: 'View All Transactions',
    dashboardMonthReview: 'Month-End Review',
    dashboardNoExpenses: 'No expenses recorded for this month yet.',
    dashboardInscribeFirst: 'Record your first expense to begin mindful tracking.',
    dashboardBeginSetup: 'Set Up Monthly Plan',
    dashboardNoPlanSub: 'Establish your income, savings target, and category budgets for this month.',
    dashboardOfPlanned: 'of planned',
    dashboardRemainingOf: 'remaining of',
    dashboardOverBudgetBy: 'over budget by',
    dashboardSavedSoFar: 'saved so far',

    // Record
    recordHeaderSubtitle: 'Mindful Tracking',
    recordHeaderTitle: 'Record an Expense',
    recordAmountLabel: 'Amount Spent',
    recordAmountPlaceholder: '0.00',
    recordCategoryLabel: 'Choose One Category',
    recordCategoryHint: 'Each expense belongs to exactly one category',
    recordEg: 'e.g.',
    recordNoteLabel: 'Description / Note',
    recordNotePlaceholder: 'e.g. Groceries, Coffee, Books, Metro ticket...',
    recordDateLabel: 'Date of Expense',
    recordButton: 'Save Expense',
    recordSuccessBadge: 'Expense Saved',
    recordSuccessQuote: '"By writing it down with intention, you acknowledge the value exchanged."',
    recordAnother: 'Record Another',
    recordReturnOverview: 'Return to Overview',

    // Transactions / Records
    ledgerHeaderSubtitle: 'Monthly Log',
    ledgerHeaderTitle: 'Transactions',
    ledgerTotalEntries: 'total entries',
    ledgerAllCategories: 'All Categories',
    ledgerSearchPlaceholder: 'Search notes and descriptions...',
    ledgerDateCol: 'Date',
    ledgerCategoryCol: 'Category',
    ledgerDescriptionCol: 'Description',
    ledgerAmountCol: 'Amount',
    ledgerActionsCol: 'Actions',
    ledgerNoEntriesMatch: 'No recorded expenses match your filter.',
    ledgerTryAdjusting: 'Try adjusting search or category filter, or record a new expense.',
    ledgerDeleteConfirm: 'Delete this expense entry?',
    ledgerUndo: 'Undo',

    // Monthly Setup
    setupHeaderSubtitle: 'Monthly Planning',
    setupHeaderTitle: 'Monthly Setup',
    setupQ1Title: 'How much can you spend this month?',
    setupQ1Sub: 'Total Available Income',
    setupQ2Title: 'How much would you like to save?',
    setupQ2Sub: 'Savings Target',
    setupQ3Title: 'How much will you actually spend?',
    setupQ3Sub: 'Planned Total Outlays',
    setupQ4Title: 'How could you improve?',
    setupQ4Sub: 'Monthly Commitment',
    setupQ4Placeholder: 'e.g. Cook dinner at home on weeknights, read library books before buying new ones...',
    setupCategorySplitTitle: 'Category Budget Split',
    setupCategorySplitSub: 'Divide your planned outlays among the 4 budget categories',
    setupBalanced: 'Balanced allocation',
    setupRemainingToAllocate: 'Remaining to allocate:',
    setupOverAllocated: 'Over-allocated by:',
    setupSaveBtn: 'Save Monthly Plan',
    setupSavedBtn: 'Plan Saved',
    setupZenTip: 'Awareness brings financial calm and confidence.',

    // Review
    reviewHeaderSubtitle: 'Month-End Reflection',
    reviewHeaderTitle: 'Monthly Review',
    reviewSavingsAchieved: 'Savings Target Realized',
    reviewSavingsShortfall: 'Savings Shortfall',
    reviewSavingsAchievedSub: 'You adhered to your financial commitments this month!',
    reviewSavingsShortfallSub: 'Outlays exceeded targets. Reflect on areas for improvement.',
    reviewPlannedVsActual: 'Planned vs Actual Summary',
    reviewWrittenReflectionTitle: 'Month-End Written Reflection',
    reviewSavedBadge: 'Saved',
    reviewPrompts: 'Reflection prompts: Did you spend money on what truly brought you joy? What unneeded expenses happened? What will you improve next month?',
    reviewReflectionPlaceholder: 'Write your candid thoughts on this month\'s spending, habits that served you, and what you would like to adjust for next month...',
    reviewSaveReflectionBtn: 'Save Reflection',
    reviewReflectionSavedBtn: 'Reflection Saved',

    // Export & Auth
    exportTitle: 'Export Transactions',
    exportSub: 'Take full ownership of your financial records in open formats.',
    exportMonthCsv: 'Export Month (CSV)',
    exportMonthCsvSub: 'formatted for Excel & Numbers',
    exportBackupJson: 'Complete Data Backup (JSON)',
    exportBackupJsonSub: 'All monthly plans and recorded entries',
    authTitle: 'Account & Data Sync',
    authSub: 'MOKU works completely offline. Sign in to seamlessly sync your records across devices.',
  },
};

export function getT(_currency?: string) {
  return translations.en;
}
