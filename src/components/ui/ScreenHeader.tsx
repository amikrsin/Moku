import React from 'react';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <header className={`flex items-center justify-between pt-1 pb-1 ${className}`}>
      <div className="space-y-0.5">
        {subtitle && (
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--moku-text-secondary)]">
            {subtitle}
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--moku-text-primary)]">
          {title}
        </h1>
      </div>
      {action && <div className="shrink-0 ml-3">{action}</div>}
    </header>
  );
};
