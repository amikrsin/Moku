import React, { useState, useMemo } from 'react';
import { 
  Category, 
  Expense, 
  Plan, 
  SUPPORTED_CURRENCIES 
} from '../types';
import { formatCurrency, formatMonthName } from '../lib/storage';
import { getCategoriesForCurrency } from '../lib/i18n';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Activity, 
  Flame, 
  Award, 
  Plus, 
  Info,
  TrendingDown,
  Sparkles,
  Layers,
  Clock,
  X,
  Shield,
  BookOpen,
  AlertCircle
} from 'lucide-react';

interface ExpenseFlowChartProps {
  monthKey: string; // e.g. "2026-08"
  expenses: Expense[];
  plan: Plan | null;
  currency: string;
  onRecordExpenseForDate?: (dateStr: string) => void;
  onOpenLedger?: () => void;
}

export const ExpenseFlowChart: React.FC<ExpenseFlowChartProps> = ({
  monthKey,
  expenses,
  plan,
  currency,
  onRecordExpenseForDate,
  onOpenLedger,
}) => {
  const categories = getCategoriesForCurrency(currency);
  const currencySymbol = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol || '₹';

  // View Mode: 'week' or 'month'
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  // Pillar Filter: 'all' or specific Category
  const [selectedPillar, setSelectedPillar] = useState<Category | 'all'>('all');
  // Selected / Hovered day (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Week offset index (0 = current/latest week of the month, -1 = previous, etc.)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Parse month year & month index
  const [yearNum, monthNum] = useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number);
    return [y, m];
  }, [monthKey]);

  // Days in this month
  const daysInMonth = useMemo(() => {
    return new Date(yearNum, monthNum, 0).getDate();
  }, [yearNum, monthNum]);

  // All dates in the month as YYYY-MM-DD
  const allMonthDates = useMemo(() => {
    const dates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dates.push(dStr);
    }
    return dates;
  }, [yearNum, monthNum, daysInMonth]);

  // Group all active expenses for this month by date string (YYYY-MM-DD)
  const expensesByDate = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    const filtered = expenses.filter((e) => !e.deleted && e.monthKey === monthKey);

    filtered.forEach((e) => {
      // derive YYYY-MM-DD from ISO date
      const datePart = e.date.split('T')[0];
      if (!map[datePart]) {
        map[datePart] = [];
      }
      if (selectedPillar === 'all' || e.category === selectedPillar) {
        map[datePart].push(e);
      }
    });

    return map;
  }, [expenses, monthKey, selectedPillar]);

  // Calculate distinct weeks for this month (7-day chunks)
  const weeksList = useMemo(() => {
    const weeks: string[][] = [];
    let currentWeek: string[] = [];

    // Find the day of week for the 1st of the month (0 = Sun, 1 = Mon, etc.)
    // We construct 7-day windows starting from the 1st, or aligned to standard weeks
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      currentWeek.push(dStr);

      const dateObj = new Date(yearNum, monthNum - 1, d);
      // If Saturday or last day of month, close week
      if (dateObj.getDay() === 6 || d === daysInMonth) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    return weeks;
  }, [yearNum, monthNum, daysInMonth]);

  // Bound weekOffset to valid range
  const currentWeekIndex = useMemo(() => {
    const maxIdx = Math.max(0, weeksList.length - 1);
    const targetIdx = maxIdx + weekOffset;
    return Math.max(0, Math.min(maxIdx, targetIdx));
  }, [weeksList.length, weekOffset]);

  // Active dates depending on view mode
  const activeDateList = useMemo(() => {
    if (viewMode === 'month') {
      return allMonthDates;
    }
    return weeksList[currentWeekIndex] || allMonthDates.slice(0, 7);
  }, [viewMode, allMonthDates, weeksList, currentWeekIndex]);

  // Total daily spend for active dates
  const dailySpendData = useMemo(() => {
    return activeDateList.map((dStr) => {
      const items = expensesByDate[dStr] || [];
      const total = items.reduce((sum, item) => sum + item.amount, 0);
      const dateObj = new Date(dStr + 'T12:00:00');
      const dayOfWeekShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
      const dayNum = dateObj.getDate();

      return {
        dateStr: dStr,
        dayNum,
        dayOfWeekShort,
        total,
        count: items.length,
        items,
      };
    });
  }, [activeDateList, expensesByDate]);

  // Window statistics
  const totalWindowSpend = useMemo(() => {
    return dailySpendData.reduce((sum, d) => sum + d.total, 0);
  }, [dailySpendData]);

  const activeDaysCount = useMemo(() => {
    return dailySpendData.filter((d) => d.total > 0).length;
  }, [dailySpendData]);

  const noSpendDaysCount = useMemo(() => {
    return dailySpendData.filter((d) => d.total === 0).length;
  }, [dailySpendData]);

  const dailyAvg = useMemo(() => {
    return dailySpendData.length > 0 ? totalWindowSpend / dailySpendData.length : 0;
  }, [totalWindowSpend, dailySpendData.length]);

  const peakDay = useMemo(() => {
    let max = { dateStr: '', total: 0, dayNum: 0 };
    dailySpendData.forEach((d) => {
      if (d.total > max.total) {
        max = { dateStr: d.dateStr, total: d.total, dayNum: d.dayNum };
      }
    });
    return max;
  }, [dailySpendData]);

  // Max spend for Y-axis calculation (min default 100 to avoid div by zero)
  const maxDailyValue = useMemo(() => {
    const rawMax = Math.max(...dailySpendData.map((d) => d.total), 10);
    // Round up nicely to nearest 100, 500, or 1000
    if (rawMax < 100) return 100;
    if (rawMax < 1000) return Math.ceil(rawMax / 100) * 100;
    if (rawMax < 10000) return Math.ceil(rawMax / 1000) * 1000;
    return Math.ceil(rawMax / 5000) * 5000;
  }, [dailySpendData]);

  // SVG Chart Geometry calculations
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingLeft = 65;
  const paddingRight = 30;
  const paddingTop = 28;
  const paddingBottom = 38;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Convert daily spend points to SVG coordinates
  const points = useMemo(() => {
    const n = dailySpendData.length;
    if (n === 0) return [];

    return dailySpendData.map((d, i) => {
      const x = n === 1 ? paddingLeft + chartWidth / 2 : paddingLeft + (i / (n - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.total / maxDailyValue) * chartHeight;
      return { x, y, data: d };
    });
  }, [dailySpendData, chartWidth, chartHeight, paddingLeft, paddingTop, maxDailyValue]);

  // Build smooth cubic bezier curve SVG path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };
    if (points.length === 1) {
      const p = points[0];
      const lp = `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y}`;
      const ap = `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y} L ${p.x + 20} ${paddingTop + chartHeight} L ${p.x - 20} ${paddingTop + chartHeight} Z`;
      return { linePath: lp, areaPath: ap };
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      // Catmull-Rom to Cubic Bezier control points
      const tension = 0.35;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const baselineY = paddingTop + chartHeight;
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const a = `${d} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    return { linePath: d, areaPath: a };
  }, [points, chartHeight, paddingTop]);

  // Label for active window header (e.g. "Jan 03 - Jan 09, 2026")
  const windowRangeLabel = useMemo(() => {
    if (viewMode === 'month') {
      return `${formatMonthName(monthKey)} (Full Month Flow)`;
    }
    if (activeDateList.length === 0) return '';
    const first = new Date(activeDateList[0] + 'T12:00:00');
    const last = new Date(activeDateList[activeDateList.length - 1] + 'T12:00:00');
    
    const fMonth = first.toLocaleString('en-US', { month: 'short' });
    const lMonth = last.toLocaleString('en-US', { month: 'short' });
    const fDay = String(first.getDate()).padStart(2, '0');
    const lDay = String(last.getDate()).padStart(2, '0');

    if (fMonth === lMonth) {
      return `${fMonth} ${fDay} – ${lDay}, ${first.getFullYear()}`;
    }
    return `${fMonth} ${fDay} – ${lMonth} ${lDay}, ${first.getFullYear()}`;
  }, [viewMode, monthKey, activeDateList]);

  // Currently focused day details
  const activeFocusDate = hoveredDate || selectedDate;
  const activeFocusData = useMemo(() => {
    if (!activeFocusDate) return null;
    return dailySpendData.find((d) => d.dateStr === activeFocusDate) || null;
  }, [activeFocusDate, dailySpendData]);

  // Y-axis 4 step ticks
  const yTicks = useMemo(() => {
    return [0, 0.33, 0.66, 1].map((ratio) => {
      const val = Math.round(maxDailyValue * ratio);
      const y = paddingTop + chartHeight - ratio * chartHeight;
      return { val, y };
    });
  }, [maxDailyValue, paddingTop, chartHeight]);

  return (
    <div className="bg-[#E5DFCE]/80 border-2 border-[#565248]/30 rounded-xl p-4 sm:p-5 shadow-sm space-y-4 text-[#23211D]">
      {/* 1. Header Bar: Title, Range Switcher & View Modes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#565248]/20 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#A8342A] text-[#EDE8DA] flex items-center justify-center shadow-xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-serif text-base sm:text-lg font-bold text-[#23211D] tracking-tight">
                Expense Flow & Daily Wave
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[#565248]/10 text-[#565248] uppercase tracking-wider">
                Trend
              </span>
            </div>
            <p className="text-xs text-[#565248]">
              Observe day-to-day spending rhythm and zero-spend days
            </p>
          </div>
        </div>

        {/* Integrated Navigation & Mode Controls in a unified bar */}
        <div className="flex items-center self-start sm:self-auto bg-[#EDE8DA] border border-[#565248]/30 rounded-lg p-1 shadow-2xs space-x-1">
          {/* Week Mode Button with integrated stepper */}
          <div className={`flex items-center rounded-md transition-all ${viewMode === 'week' ? 'bg-[#A8342A] text-[#EDE8DA] shadow-2xs' : 'text-[#565248]'}`}>
            {viewMode === 'week' && (
              <button
                id="expense-flow-prev-week-btn"
                onClick={() => setWeekOffset((prev) => Math.max(prev - 1, -(weeksList.length - 1)))}
                disabled={currentWeekIndex <= 0}
                className="pl-1.5 pr-0.5 py-1 text-[#EDE8DA] hover:text-white disabled:opacity-30 cursor-pointer"
                title="Previous Week"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            
            <button
              id="expense-flow-week-view-btn"
              onClick={() => setViewMode('week')}
              className={`px-2 py-1 text-xs font-serif font-bold cursor-pointer ${
                viewMode === 'week' ? 'text-[#EDE8DA]' : 'text-[#565248] hover:text-[#23211D]'
              }`}
            >
              {viewMode === 'week' ? `Week ${currentWeekIndex + 1}` : '7-Day Strip'}
            </button>

            {viewMode === 'week' && (
              <button
                id="expense-flow-next-week-btn"
                onClick={() => setWeekOffset((prev) => Math.min(prev + 1, 0))}
                disabled={currentWeekIndex >= weeksList.length - 1}
                className="pr-1.5 pl-0.5 py-1 text-[#EDE8DA] hover:text-white disabled:opacity-30 cursor-pointer"
                title="Next Week"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-[1px] h-4 bg-[#565248]/20" />

          {/* Month View Button */}
          <button
            id="expense-flow-month-view-btn"
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 rounded-md text-xs font-serif font-bold transition-all cursor-pointer ${
              viewMode === 'month'
                ? 'bg-[#A8342A] text-[#EDE8DA] shadow-2xs'
                : 'text-[#565248] hover:text-[#23211D]'
            }`}
          >
            Full Month
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Badges (Expense, Avg, Peak, No-Spend Days) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Window Total Spend */}
        <div className="bg-[#EDE8DA] border border-[#565248]/20 rounded-lg p-2.5 sm:p-3 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-serif uppercase tracking-wider text-[#565248] font-bold flex items-center justify-between">
            <span>Period Total</span>
            <span className="text-xs font-normal opacity-70">
              {viewMode === 'week' ? '7 Days' : `${daysInMonth} Days`}
            </span>
          </div>
          <div className="font-serif text-base sm:text-xl font-bold text-[#A8342A] font-tabular mt-0.5">
            {formatCurrency(totalWindowSpend, currency)}
          </div>
          <span className="text-[10px] text-[#565248] font-tabular block truncate">
            {windowRangeLabel}
          </span>
        </div>

        {/* Daily Average */}
        <div className="bg-[#EDE8DA] border border-[#565248]/20 rounded-lg p-2.5 sm:p-3 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-serif uppercase tracking-wider text-[#565248] font-bold">
            Daily Average
          </div>
          <div className="font-serif text-base sm:text-xl font-bold text-[#23211D] font-tabular mt-0.5">
            {formatCurrency(dailyAvg, currency)}
          </div>
          <span className="text-[10px] text-[#565248] block">
            Across {dailySpendData.length} days
          </span>
        </div>

        {/* Peak Spend Day */}
        <div className="bg-[#EDE8DA] border border-[#565248]/20 rounded-lg p-2.5 sm:p-3 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-serif uppercase tracking-wider text-[#565248] font-bold flex items-center space-x-1">
            <Flame className="w-3 h-3 text-[#A8342A]" />
            <span>Peak Outlay</span>
          </div>
          <div className="font-serif text-base sm:text-xl font-bold text-[#23211D] font-tabular mt-0.5">
            {peakDay.total > 0 ? formatCurrency(peakDay.total, currency) : '₹0'}
          </div>
          <span className="text-[10px] text-[#A8342A] font-medium block truncate">
            {peakDay.total > 0 ? `Day ${peakDay.dayNum} (${new Date(peakDay.dateStr + 'T12:00:00').toLocaleString('en-US', { weekday: 'short' })})` : 'No spend recorded'}
          </span>
        </div>

        {/* No-Spend Days Badge (Kakeibo Mindful Metric) */}
        <div className="bg-[#EDE8DA] border border-[#5C6E4E]/30 rounded-lg p-2.5 sm:p-3 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-serif uppercase tracking-wider text-[#5C6E4E] font-bold flex items-center space-x-1">
            <Award className="w-3 h-3 text-[#5C6E4E]" />
            <span>No-Spend Days</span>
          </div>
          <div className="font-serif text-base sm:text-xl font-bold text-[#5C6E4E] font-tabular mt-0.5">
            {noSpendDaysCount} <span className="text-xs font-normal text-[#565248]">/ {dailySpendData.length}</span>
          </div>
          <span className="text-[10px] text-[#5C6E4E] font-medium block">
            {noSpendDaysCount > 0 ? 'Mindful balance achieved' : 'Every day had an outlay'}
          </span>
        </div>
      </div>

      {/* 3. Pillar Filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[#565248]/15">
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
          <span className="text-xs font-serif font-bold text-[#565248] mr-1 flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Pillars:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedPillar('all')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-serif transition-all cursor-pointer border ${
              selectedPillar === 'all'
                ? 'bg-[#23211D] text-[#EDE8DA] border-[#23211D] font-bold shadow-xs'
                : 'bg-[#EDE8DA] text-[#565248] border-[#565248]/20 hover:bg-[#E5DFCE]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>All Pillars</span>
          </button>
          {(Object.keys(categories) as Category[]).map((catKey) => {
            const cat = categories[catKey];
            const isSelected = selectedPillar === catKey;
            
            // Map category to corresponding icon
            const renderIcon = () => {
              switch (catKey) {
                case 'survival':
                  return <Shield className="w-3 h-3" />;
                case 'optional':
                  return <Sparkles className="w-3 h-3" />;
                case 'culture':
                  return <BookOpen className="w-3 h-3" />;
                case 'extra':
                default:
                  return <AlertCircle className="w-3 h-3" />;
              }
            };

            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedPillar(catKey)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-serif transition-all cursor-pointer border ${
                  isSelected
                    ? 'border-[#23211D] bg-[#EDE8DA] ring-2 ring-[#23211D] font-bold text-[#23211D] shadow-xs'
                    : 'border-[#565248]/20 bg-[#EDE8DA] text-[#565248] hover:bg-[#E5DFCE]'
                }`}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs" 
                  style={{ backgroundColor: cat.color }} 
                />
                <span className="flex items-center space-x-1">
                  <span>{cat.name}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-[#565248] font-serif font-medium hidden sm:block">
          Click any point to inspect
        </div>
      </div>

      {/* 4. Interactive SVG Wave Curve Chart */}
      <div className="relative bg-[#EDE8DA] border border-[#565248]/30 rounded-xl p-2 sm:p-3 overflow-hidden shadow-inner">
        {/* Floating Tooltip if hovering/clicking a point */}
        {activeFocusData && (
          <div className="absolute top-3 right-4 bg-[#23211D] text-[#EDE8DA] px-3 py-1.5 rounded-lg shadow-xl border border-[#565248]/40 text-xs font-serif flex items-center space-x-2 z-20 animate-in fade-in duration-150">
            <div>
              <span className="text-[#A8342A] font-bold mr-1.5">
                {activeFocusData.dayOfWeekShort} ({activeFocusData.dateStr}):
              </span>
              <span className="font-bold text-[#EDE8DA] font-tabular">
                {formatCurrency(activeFocusData.total, currency)}
              </span>
              <span className="text-[10px] text-[#D5CEBE] ml-1.5">
                ({activeFocusData.count} {activeFocusData.count === 1 ? 'item' : 'items'})
              </span>
            </div>
          </div>
        )}

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-48 sm:h-56 min-w-[500px] select-none"
          >
            <defs>
              {/* Fluid Gradient Fill under the Wave */}
              <linearGradient id="expenseWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#A8342A" stopOpacity="0.38" />
                <stop offset="60%" stopColor="#A8342A" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#A8342A" stopOpacity="0.00" />
              </linearGradient>

              {/* Grid pattern / subtle texture */}
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A8342A" />
                <stop offset="50%" stopColor="#8F2B22" />
                <stop offset="100%" stopColor="#565248" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid & Y-Axis Labels */}
            {yTicks.map((tick, idx) => (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={tick.y}
                  x2={svgWidth - paddingRight}
                  y2={tick.y}
                  stroke="#565248"
                  strokeOpacity="0.18"
                  strokeDasharray={idx === 0 ? 'none' : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={tick.y + 3.5}
                  textAnchor="end"
                  fill="#565248"
                  fontSize="10"
                  fontFamily="serif"
                  fontWeight="600"
                >
                  {tick.val === 0 ? '0' : `${currencySymbol}${tick.val >= 1000 ? `${(tick.val / 1000).toFixed(1)}k` : tick.val}`}
                </text>
              </g>
            ))}

            {/* Baseline (Y=0) */}
            <line
              x1={paddingLeft}
              y1={paddingTop + chartHeight}
              x2={svgWidth - paddingRight}
              y2={paddingTop + chartHeight}
              stroke="#565248"
              strokeOpacity="0.4"
              strokeWidth="1.5"
            />

            {/* Area Fill */}
            {areaPath && (
              <path
                d={areaPath}
                fill="url(#expenseWaveGrad)"
                className="transition-all duration-300"
              />
            )}

            {/* Main Smooth Wave Curve */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300 drop-shadow-xs"
              />
            )}

            {/* Scrubber vertical guide on hovered/selected point */}
            {activeFocusDate && points.find((p) => p.data.dateStr === activeFocusDate) && (
              (() => {
                const p = points.find((pt) => pt.data.dateStr === activeFocusDate)!;
                return (
                  <g>
                    <line
                      x1={p.x}
                      y1={paddingTop}
                      x2={p.x}
                      y2={paddingTop + chartHeight}
                      stroke="#A8342A"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                    />
                  </g>
                );
              })()
            )}

            {/* Datapoint Circles & Interaction Hit Targets */}
            {points.map((p, idx) => {
              const isFocused = p.data.dateStr === activeFocusDate;
              const hasSpend = p.data.total > 0;
              const isPeak = peakDay.total > 0 && p.data.dateStr === peakDay.dateStr;

              return (
                <g 
                  key={idx} 
                  className="cursor-pointer group"
                  onClick={() => setSelectedDate((prev) => (prev === p.data.dateStr ? null : p.data.dateStr))}
                  onMouseEnter={() => setHoveredDate(p.data.dateStr)}
                  onMouseLeave={() => setHoveredDate(null)}
                >
                  {/* Invisible wide hit area for easy touch/mouse targeting */}
                  <rect
                    x={p.x - (chartWidth / (points.length * 2 || 1))}
                    y={paddingTop}
                    width={chartWidth / (points.length || 1)}
                    height={chartHeight + paddingBottom}
                    fill="transparent"
                  />

                  {/* Outer halo when active or peak */}
                  {isFocused && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="9"
                      fill="#A8342A"
                      fillOpacity="0.25"
                      className="animate-pulse"
                    />
                  )}

                  {/* Point circle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isFocused ? 5.5 : isPeak ? 4.5 : hasSpend ? 3.5 : 2.5}
                    fill={isPeak ? '#A8342A' : hasSpend ? '#23211D' : '#EDE8DA'}
                    stroke={hasSpend ? '#A8342A' : '#565248'}
                    strokeWidth={isFocused ? '2.5' : '1.5'}
                    className="transition-transform group-hover:scale-125"
                  />

                  {/* X-Axis Day & Date Text */}
                  <text
                    x={p.x}
                    y={paddingTop + chartHeight + 14}
                    textAnchor="middle"
                    fill={isFocused ? '#A8342A' : '#565248'}
                    fontSize={viewMode === 'month' ? '8.5' : '10'}
                    fontFamily="serif"
                    fontWeight={isFocused ? '700' : '500'}
                  >
                    {p.data.dayOfWeekShort[0]}
                  </text>
                  <text
                    x={p.x}
                    y={paddingTop + chartHeight + 25}
                    textAnchor="middle"
                    fill={isFocused ? '#A8342A' : '#23211D'}
                    fontSize={viewMode === 'month' ? '9' : '10.5'}
                    fontFamily="serif"
                    fontWeight={isFocused ? '800' : '600'}
                  >
                    {p.data.dayNum}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 5. 7-Day Daily Strip Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#A8342A]" />
            <h4 className="font-serif text-xs sm:text-sm font-bold text-[#23211D]">
              7-Day Spending Strip
            </h4>
          </div>
          <span className="text-[11px] text-[#565248]">
            Click any day to inspect breakdown
          </span>
        </div>

        {/* 7-Day Grid Cards */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {dailySpendData.slice(0, 7).map((day) => {
            const isSelected = selectedDate === day.dateStr;
            const hasSpend = day.total > 0;
            const isToday = day.dateStr === new Date().toISOString().split('T')[0];

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDate((prev) => (prev === day.dateStr ? null : day.dateStr))}
                className={`p-1.5 sm:p-2 rounded-lg border text-center transition-all cursor-pointer relative flex flex-col justify-between min-h-[64px] sm:min-h-[76px] ${
                  isSelected
                    ? 'bg-[#EDE8DA] border-[#A8342A] ring-2 ring-[#A8342A]/60 shadow-md scale-102'
                    : isToday
                    ? 'bg-[#EDE8DA] border-[#565248]/50 shadow-xs'
                    : 'bg-[#EDE8DA]/70 border-[#565248]/20 hover:bg-[#EDE8DA] hover:border-[#565248]/40'
                }`}
              >
                {/* Day of week */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-serif font-bold text-[#565248] uppercase">
                    {day.dayOfWeekShort}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A8342A]" title="Today" />
                  )}
                </div>

                {/* Date number */}
                <div className={`font-serif text-sm sm:text-base font-bold my-0.5 ${isSelected ? 'text-[#A8342A]' : 'text-[#23211D]'}`}>
                  {day.dayNum}
                </div>

                {/* Spend value */}
                <div className="w-full">
                  {hasSpend ? (
                    <span className="text-[10px] sm:text-xs font-bold font-tabular text-[#A8342A] block leading-tight truncate">
                      -{formatCurrency(day.total, currency).replace(`${currencySymbol}`, `${currencySymbol}`)}
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] font-serif text-[#5C6E4E] bg-[#5C6E4E]/10 rounded-xs px-1 py-0.2 block truncate">
                      Zero ($0)
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Selected Day Detailed Inspector (Itemized Transaction Entries for Selected Date) */}
      {selectedDate && (
        <div className="bg-[#EDE8DA] border-2 border-[#565248]/30 rounded-xl p-4 sm:p-5 shadow-sm space-y-3.5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#565248]/20 pb-3">
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1.5">
              <div className="w-7 h-7 rounded-full bg-[#A8342A] text-[#EDE8DA] flex items-center justify-center shadow-2xs shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-serif text-sm sm:text-base font-bold text-[#23211D]">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h4>
              <span className="text-xs font-serif font-bold text-[#A8342A] font-tabular bg-[#E5DFCE] border border-[#565248]/20 px-2.5 py-0.5 rounded-full shadow-2xs">
                Total: {formatCurrency(expensesByDate[selectedDate]?.reduce((sum, e) => sum + e.amount, 0) || 0, currency)}
              </span>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              {onRecordExpenseForDate && (
                <button
                  type="button"
                  onClick={() => onRecordExpenseForDate(selectedDate)}
                  className="flex items-center space-x-1.5 text-xs bg-[#A8342A] hover:bg-[#8F2B22] text-[#EDE8DA] px-3 py-1.5 rounded-md font-serif font-bold transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Log on this Day</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-[#E5DFCE] hover:bg-[#565248]/20 text-[#565248] hover:text-[#23211D] transition-colors cursor-pointer border border-[#565248]/25 shadow-2xs"
                title="Close breakdown"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List of items on this day */}
          {(!expensesByDate[selectedDate] || expensesByDate[selectedDate].length === 0) ? (
            <div className="text-center py-5 text-xs font-serif text-[#5C6E4E] space-y-1 bg-[#E5DFCE]/40 rounded-lg border border-[#565248]/15 p-3">
              <p className="font-bold text-sm">✨ Zero Outlays Logged</p>
              <p className="text-[#565248]">A mindful zero-spend day for steady savings preservation.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {expensesByDate[selectedDate].map((item) => {
                const cat = categories[item.category];
                const dateObj = new Date(item.date);
                const formattedTime = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
                  : '';

                return (
                  <div
                    key={item.id}
                    className="bg-[#EDE8DA]/80 border border-[#565248]/20 rounded-lg p-3 hover:bg-[#EDE8DA] transition-all space-y-1.5 shadow-2xs"
                  >
                    {/* Top Row: Category Pillar Pill + Budget Line Tag (Left), Spent Amount in Button Box (Right) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        {/* Category Pillar Pill */}
                        <span 
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-serif font-bold text-[#EDE8DA] shadow-2xs"
                          style={{ backgroundColor: cat.color }}
                        >
                          <span>{cat.name}</span>
                        </span>

                        {/* Budget Line Tag if present */}
                        {item.budgetLineName && (
                          <span className="text-[10px] bg-[#E5DFCE] border border-[#565248]/25 px-1.5 py-0.5 rounded-md font-serif text-[#23211D]">
                            🏷️ {item.budgetLineName}
                          </span>
                        )}
                      </div>

                      {/* Spent Amount in Button Box on Top Right */}
                      <div className="bg-[#E5DFCE] border border-[#565248]/25 px-2.5 py-0.5 rounded-md shadow-2xs font-tabular">
                        <span className="font-serif font-bold text-sm sm:text-base text-[#A8342A]">
                          -{formatCurrency(item.amount, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Description in clean text, with time at bottom right */}
                    <div className="flex items-center justify-between text-xs text-[#565248] pt-0.5">
                      <span className="text-xs sm:text-sm font-medium text-[#23211D] truncate max-w-[75%]">
                        {item.note || <span className="italic text-[#565248]">{cat.name}</span>}
                      </span>

                      <span className="text-[11px] text-[#565248] font-tabular whitespace-nowrap">
                        {formattedTime}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
