import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Category, CATEGORIES, BudgetSignal } from '../../types';
import { SectorCalculationItem } from '../../lib/storage';
import { MoneyAmount } from '../ui/MoneyAmount';
import { StatusBadge } from '../ui/StatusBadge';
import { BudgetProgress } from '../ui/BudgetProgress';
import { PlannedSectorRow } from './PlannedSectorRow';

interface CategoryBudgetCardProps {
  category: Category;
  totalPlanned: number;
  totalActual: number;
  remaining: number;
  variance: number;
  overallStatus: BudgetSignal;
  sectors: SectorCalculationItem[];
  currency: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelectSector?: (sector: SectorCalculationItem) => void;
}

export const CategoryBudgetCard: React.FC<CategoryBudgetCardProps> = ({
  category,
  totalPlanned,
  totalActual,
  remaining,
  variance,
  overallStatus,
  sectors,
  currency,
  isExpanded,
  onToggleExpand,
  onSelectSector,
}) => {
  const info = CATEGORIES[category];
  const isOverPlan = overallStatus === 'OVER_PLAN' || totalActual > totalPlanned;

  return (
    <div className="rounded-[24px] bg-[var(--moku-surface)] border border-[var(--moku-outline)] shadow-xs overflow-hidden transition-all">
      {/* Clickable Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full p-4 sm:p-5 text-left flex items-start justify-between cursor-pointer hover:bg-[var(--moku-surface-secondary)]/40 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] flex items-center justify-center text-xl shrink-0 shadow-2xs">
            {info.icon}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-[var(--moku-text-primary)]">
                {info.name}
              </h3>
              <span className="text-[11px] text-[var(--moku-text-secondary)] font-medium">
                · {info.subhead}
              </span>
            </div>
            <p className="text-xs text-[var(--moku-text-secondary)] mt-0.5 max-w-xs line-clamp-1">
              {info.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-1 shrink-0 ml-2">
          <StatusBadge status={overallStatus} size="xs" />
          <div className="flex items-center space-x-1 text-xs text-[var(--moku-text-secondary)] pt-0.5">
            <span className="text-[11px]">
              {sectors.length} sector{sectors.length === 1 ? '' : 's'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </button>

      {/* Figures & Progress Summary */}
      <div className="px-4 sm:px-5 pb-4">
        <div className="grid grid-cols-3 gap-2 py-2 border-t border-[var(--moku-outline-variant)] text-xs">
          <div>
            <span className="text-[10px] text-[var(--moku-text-secondary)] block">
              Planned
            </span>
            <MoneyAmount
              amount={totalPlanned}
              currency={currency}
              size="md"
              weight="bold"
            />
          </div>

          <div>
            <span className="text-[10px] text-[var(--moku-text-secondary)] block">
              Spent
            </span>
            <MoneyAmount
              amount={totalActual}
              currency={currency}
              size="md"
              weight="bold"
              color={isOverPlan ? 'danger' : 'default'}
            />
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[var(--moku-text-secondary)] block">
              {isOverPlan ? 'Over by' : 'Remaining'}
            </span>
            {isOverPlan ? (
              <MoneyAmount
                amount={variance}
                currency={currency}
                size="md"
                weight="bold"
                showSign={true}
                color="danger"
              />
            ) : (
              <MoneyAmount
                amount={remaining}
                currency={currency}
                size="md"
                weight="bold"
                color={remaining > 0 ? 'success' : 'muted'}
              />
            )}
          </div>
        </div>

        <div className="mt-1">
          <BudgetProgress
            spent={totalActual}
            total={totalPlanned}
            status={overallStatus}
            height="md"
          />
        </div>
      </div>

      {/* Expanded Sectors List */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5 pt-1 space-y-2.5 bg-[var(--moku-surface-secondary)]/30 border-t border-[var(--moku-outline-variant)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--moku-text-secondary)] pt-1">
            Planned Sectors & Actual Outlays
          </div>
          {sectors.map((s) => (
            <PlannedSectorRow
              key={s.id}
              sector={s}
              currency={currency}
              onClick={onSelectSector ? () => onSelectSector(s) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};
