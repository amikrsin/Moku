import React from 'react';
import { Trash2, Edit2, Tag } from 'lucide-react';
import { Expense, CATEGORIES } from '../../types';
import { MoneyAmount } from '../ui/MoneyAmount';

interface TransactionItemProps {
  expense: Expense;
  currency: string;
  onEdit?: (expense: Expense) => void;
  onDelete?: (id: string) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  expense,
  currency,
  onEdit,
  onDelete,
}) => {
  const catInfo = CATEGORIES[expense.category] || CATEGORIES.survival;
  const dateObj = new Date(expense.date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--moku-surface)] border border-[var(--moku-outline)] hover:border-[var(--moku-primary)]/40 transition-all group shadow-2xs">
      <div className="flex items-center space-x-3 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] flex items-center justify-center text-lg shrink-0 select-none">
          {catInfo.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm font-bold text-[var(--moku-text-primary)] truncate">
              {expense.note || expense.sectorName || catInfo.name}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-[var(--moku-text-secondary)] mt-0.5">
            <span>{formattedDate}</span>
            <span>·</span>
            <span className="font-medium text-[var(--moku-primary)] truncate">
              {catInfo.name}
            </span>
            {expense.sectorName && (
              <>
                <span>·</span>
                <span className="inline-flex items-center space-x-0.5 text-[var(--moku-text-secondary)] truncate">
                  <Tag className="w-2.5 h-2.5 shrink-0" />
                  <span>{expense.sectorName}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 shrink-0 ml-2">
        <MoneyAmount
          amount={expense.amount}
          currency={currency}
          size="md"
          weight="bold"
        />

        {(onEdit || onDelete) && (
          <div className="flex items-center space-x-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(expense)}
                className="p-1.5 rounded-lg text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface-secondary)] hover:text-[var(--moku-text-primary)] transition-colors cursor-pointer"
                aria-label="Edit expense"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(expense.id)}
                className="p-1.5 rounded-lg text-[var(--moku-text-secondary)] hover:bg-[var(--moku-danger-container)] hover:text-[var(--moku-danger)] transition-colors cursor-pointer"
                aria-label="Delete expense"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
