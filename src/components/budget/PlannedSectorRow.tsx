import React from 'react';
import { SectorCalculationItem } from '../../lib/storage';
import { MoneyAmount } from '../ui/MoneyAmount';
import { StatusBadge } from '../ui/StatusBadge';
import { BudgetProgress } from '../ui/BudgetProgress';

interface PlannedSectorRowProps {
  sector: SectorCalculationItem;
  currency: string;
  onClick?: () => void;
}

export const PlannedSectorRow: React.FC<PlannedSectorRowProps> = ({
  sector,
  currency,
  onClick,
}) => {
  const isOverPlan = sector.status === 'OVER_PLAN';
  const isUnplanned = sector.status === 'UNPLANNED';

  return (
    <div
      onClick={onClick}
      className={`p-3.5 rounded-2xl bg-[var(--moku-surface)] border border-[var(--moku-outline-variant)] transition-all ${
        onClick ? 'cursor-pointer hover:border-[var(--moku-primary)]/40 active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center space-x-2">
          {sector.icon && (
            <span className="text-base select-none" aria-hidden="true">
              {sector.icon}
            </span>
          )}
          <span className="text-xs sm:text-sm font-bold text-[var(--moku-text-primary)]">
            {sector.name}
          </span>
          {isUnplanned && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--moku-unplanned-container)] text-[var(--moku-unplanned-text)] uppercase tracking-wider">
              Unplanned
            </span>
          )}
        </div>
        <StatusBadge status={sector.status} size="xs" />
      </div>

      {/* Figures Row */}
      <div className="grid grid-cols-3 gap-2 py-1 text-xs">
        <div>
          <span className="text-[10px] text-[var(--moku-text-secondary)] block">
            Planned
          </span>
          <MoneyAmount
            amount={sector.plannedAmount}
            currency={currency}
            size="sm"
            weight="semibold"
          />
        </div>

        <div>
          <span className="text-[10px] text-[var(--moku-text-secondary)] block">
            Actual
          </span>
          <MoneyAmount
            amount={sector.actualAmount}
            currency={currency}
            size="sm"
            weight="bold"
            color={isOverPlan ? 'danger' : sector.actualAmount > 0 ? 'default' : 'muted'}
          />
        </div>

        <div className="text-right">
          <span className="text-[10px] text-[var(--moku-text-secondary)] block">
            {isOverPlan ? 'Over by' : isUnplanned ? 'Outlay' : 'Remaining'}
          </span>
          {isOverPlan ? (
            <MoneyAmount
              amount={sector.variance}
              currency={currency}
              size="sm"
              weight="bold"
              showSign={true}
              color="danger"
            />
          ) : isUnplanned ? (
            <MoneyAmount
              amount={sector.actualAmount}
              currency={currency}
              size="sm"
              weight="semibold"
              color="muted"
            />
          ) : (
            <MoneyAmount
              amount={sector.remainingAmount}
              currency={currency}
              size="sm"
              weight="semibold"
              color={sector.remainingAmount > 0 ? 'success' : 'muted'}
            />
          )}
        </div>
      </div>

      {/* Progress Line */}
      {!isUnplanned && sector.plannedAmount > 0 && (
        <div className="mt-1.5 pt-1">
          <BudgetProgress
            spent={sector.actualAmount}
            total={sector.plannedAmount}
            status={sector.status}
            height="sm"
          />
        </div>
      )}
    </div>
  );
};
