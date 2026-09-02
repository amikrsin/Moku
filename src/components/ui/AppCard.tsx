import React from 'react';

interface AppCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'secondary' | 'primary' | 'warning' | 'danger' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  id?: string;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  className = '',
  onClick,
  variant = 'default',
  padding = 'md',
  id,
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3 sm:p-3.5',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  }[padding];

  let variantClasses = 'bg-[var(--moku-surface)] border border-[var(--moku-outline)] shadow-xs';
  if (variant === 'secondary') {
    variantClasses = 'bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)]';
  } else if (variant === 'primary') {
    variantClasses = 'bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/20 text-[var(--moku-primary)]';
  } else if (variant === 'warning') {
    variantClasses = 'bg-[var(--moku-warning-container)] border border-[var(--moku-warning)]/30 text-[var(--moku-warning-text)]';
  } else if (variant === 'danger') {
    variantClasses = 'bg-[var(--moku-danger-container)] border border-[var(--moku-danger)]/30 text-[var(--moku-danger-text)]';
  } else if (variant === 'ghost') {
    variantClasses = 'bg-transparent border border-transparent';
  }

  const interactiveClasses = onClick
    ? 'cursor-pointer hover:border-[var(--moku-primary)]/50 active:scale-[0.99] transition-all'
    : '';

  return (
    <div
      id={id}
      onClick={onClick}
      className={`rounded-[22px] ${paddingClasses} ${variantClasses} ${interactiveClasses} ${className}`}
    >
      {children}
    </div>
  );
};
