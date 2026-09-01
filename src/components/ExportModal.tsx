import React from 'react';
import { Expense, Plan } from '../types';
import { formatMonthName } from '../lib/storage';
import { getT } from '../lib/i18n';
import { X, Download, FileSpreadsheet, FileJson } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthKey: string;
  plans: Plan[];
  expenses: Expense[];
  currency?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  monthKey,
  plans,
  expenses,
  currency = 'INR',
}) => {
  if (!isOpen) return null;

  const t = getT(currency);

  const currentMonthExpenses = expenses.filter((e) => !e.deleted && e.monthKey === monthKey);
  const allActiveExpenses = expenses.filter((e) => !e.deleted);

  // Export current month as CSV
  const handleExportMonthCSV = () => {
    const headers = ['Date', 'Category', 'BudgetLine', 'Amount', 'Note', 'MonthKey', 'ID'];
    const rows = currentMonthExpenses.map((e) => [
      `"${new Date(e.date).toISOString().split('T')[0]}"`,
      `"${e.category}"`,
      `"${(e.budgetLineName || '').replace(/"/g, '""')}"`,
      e.amount,
      `"${(e.note || '').replace(/"/g, '""')}"`,
      `"${e.monthKey}"`,
      `"${e.id}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csvContent, `kakeibo_ledger_${monthKey}.csv`, 'text/csv;charset=utf-8;');
  };

  // Export all as JSON
  const handleExportAllJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      app: 'Kakeibo Ledger',
      plans,
      expenses: allActiveExpenses,
    };
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `kakeibo_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#23211D]/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#EDE8DA] rounded-lg border border-[#565248]/30 max-w-md w-full p-6 shadow-xl relative bg-ruled-paper">
        {/* Close Button */}
        <button
          id="close-export-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-[#565248] hover:text-[#23211D] hover:bg-[#E5DFCE] rounded-md transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-full border-2 border-[#35415C] mx-auto flex items-center justify-center bg-[#E5DFCE] text-[#35415C]">
            <Download className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-xl font-bold text-[#23211D]">
            {t.exportTitle}
          </h3>
          <p className="text-xs text-[#565248]">
            {t.exportSub}
          </p>
        </div>

        <div className="space-y-3">
          {/* Export Month CSV */}
          <button
            id="export-csv-btn"
            onClick={handleExportMonthCSV}
            className="w-full flex items-center justify-between bg-[#E5DFCE] hover:bg-[#DFD8C5] border border-[#565248]/30 p-3.5 rounded-md transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-5 h-5 text-[#5C6E4E]" />
              <div>
                <strong className="font-serif text-sm text-[#23211D] block">
                  Export {formatMonthName(monthKey)} (CSV)
                </strong>
                <span className="text-[11px] text-[#565248]">
                  {currentMonthExpenses.length} entries formatted for Excel & Numbers
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-[#565248] group-hover:text-[#23211D]" />
          </button>

          {/* Export All Backup JSON */}
          <button
            id="export-json-btn"
            onClick={handleExportAllJSON}
            className="w-full flex items-center justify-between bg-[#E5DFCE] hover:bg-[#DFD8C5] border border-[#565248]/30 p-3.5 rounded-md transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center space-x-3">
              <FileJson className="w-5 h-5 text-[#35415C]" />
              <div>
                <strong className="font-serif text-sm text-[#23211D] block">
                  {t.exportBackupJson}
                </strong>
                <span className="text-[11px] text-[#565248]">
                  All monthly plans ({plans.length}) and all recorded entries ({allActiveExpenses.length})
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-[#565248] group-hover:text-[#23211D]" />
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-[#565248]/15 text-[11px] text-[#565248] text-center">
          Downloads directly to your device storage.
        </div>
      </div>
    </div>
  );
};
