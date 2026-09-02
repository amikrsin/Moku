import React from 'react';

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const AppButton: React.FC<AppButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  let variantClasses = 'bg-[var(--moku-primary)] hover:bg-[var(--moku-primary-hover)] text-white shadow-xs';
  if (variant === 'secondary') {
    variantClasses = 'bg-[var(--moku-surface-secondary)] hover:bg-[var(--moku-surface-tertiary)] text-[var(--moku-text-primary)] border border-[var(--moku-outline)]';
  } else if (variant === 'outline') {
    variantClasses = 'bg-transparent border border-[var(--moku-outline)] hover:border-[var(--moku-primary)] text-[var(--moku-text-primary)] hover:bg-[var(--moku-surface-secondary)]';
  } else if (variant === 'danger') {
    variantClasses = 'bg-[var(--moku-danger)] hover:bg-[var(--moku-danger)]/90 text-white shadow-xs';
  } else if (variant === 'ghost') {
    variantClasses = 'bg-transparent hover:bg-[var(--moku-surface-secondary)] text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)]';
  }

  const sizeClasses = {
    sm: 'h-9 px-3.5 text-xs font-semibold rounded-xl',
    md: 'min-h-[44px] h-11 px-4 text-xs sm:text-sm font-bold rounded-xl',
    lg: 'min-h-[48px] h-13 px-6 text-sm sm:text-base font-bold rounded-2xl',
  }[size];

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled || loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer active:scale-[0.98]';

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center space-x-2 transition-all select-none ${sizeClasses} ${variantClasses} ${widthClass} ${disabledClass} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
