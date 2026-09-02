import React from 'react';
import { Tag, Sparkles } from 'lucide-react';
import { Category, CATEGORIES, Plan, QUICK_CHIP_SUGGESTIONS } from '../../types';

interface CategorySuggestionSelectorProps {
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
  selectedSector: string;
  onSelectSector: (sectorName: string) => void;
  currentPlan?: Plan | null;
}

export const CategorySuggestionSelector: React.FC<CategorySuggestionSelectorProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedSector,
  onSelectSector,
  currentPlan,
}) => {
  const categoryKeys: Category[] = ['survival', 'optional', 'culture', 'extra'];

  // Planned sectors from current plan
  const plannedSectors = currentPlan?.plannedSectors?.[selectedCategory] || [];
  const plannedNames = plannedSectors.map((s) => s.name);
  const defaultChips = QUICK_CHIP_SUGGESTIONS[selectedCategory] || [];
  const allChips = Array.from(new Set([...plannedNames, ...defaultChips]));

  return (
    <div className="space-y-3">
      {/* 4 Category Pill/Cards */}
      <div className="grid grid-cols-2 gap-2">
        {categoryKeys.map((catKey) => {
          const info = CATEGORIES[catKey];
          const isSelected = selectedCategory === catKey;

          return (
            <button
              key={catKey}
              type="button"
              onClick={() => onSelectCategory(catKey)}
              className={`p-3 rounded-2xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[var(--moku-primary-container)] border-[var(--moku-primary)] text-[var(--moku-primary)] shadow-2xs font-bold'
                  : 'bg-[var(--moku-surface)] border-[var(--moku-outline)] text-[var(--moku-text-primary)] hover:border-[var(--moku-primary)]/40'
              }`}
            >
              <span className="text-xl shrink-0 select-none">{info.icon}</span>
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-bold block truncate">
                  {info.name}
                </span>
                <span className="text-[10px] text-[var(--moku-text-secondary)] block truncate">
                  {info.subhead}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Suggested & Planned Sector Chips */}
      <div>
        <div className="flex items-center space-x-1 text-[11px] font-semibold text-[var(--moku-text-secondary)] uppercase tracking-wider mb-2">
          <Tag className="w-3 h-3" />
          <span>Planned & Quick Sectors</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {allChips.map((chipName) => {
            const isPlanned = plannedNames.includes(chipName);
            const isSelected = selectedSector.toLowerCase() === chipName.toLowerCase();

            return (
              <button
                key={chipName}
                type="button"
                onClick={() => onSelectSector(chipName)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center space-x-1 ${
                  isSelected
                    ? 'bg-[var(--moku-primary)] text-white border-[var(--moku-primary)] shadow-2xs'
                    : isPlanned
                    ? 'bg-[var(--moku-surface)] border-[var(--moku-primary)]/30 text-[var(--moku-primary)] hover:bg-[var(--moku-primary-container)]/50'
                    : 'bg-[var(--moku-surface)] border-[var(--moku-outline)] text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)] hover:border-[var(--moku-primary)]/30'
                }`}
              >
                {isPlanned && <Sparkles className="w-2.5 h-2.5 opacity-80" />}
                <span>{chipName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
