import React from 'react';
import { AppButton } from './AppButton';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-8 text-center flex flex-col items-center justify-center rounded-[24px] bg-[var(--moku-surface-secondary)]/50 border border-[var(--moku-outline)]/60 ${className}`}>
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] flex items-center justify-center text-[var(--moku-text-secondary)] mb-3 shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-[var(--moku-text-primary)]">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[var(--moku-text-secondary)] max-w-xs mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-4">
          <AppButton size="sm" onClick={onAction}>
            {actionLabel}
          </AppButton>
        </div>
      )}
    </div>
  );
};
