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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1B1E1B] text-[#1A1C1A] dark:text-[#E3E5E1] rounded-[28px] border border-[#DDE2DD] dark:border-[#414842] max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-export-modal"
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-white hover:bg-[#EEF1EE] dark:hover:bg-[#252925] rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-[#D8F3E7] dark:bg-[#214C3D] border border-[#176B52]/20 dark:border-[#82D9B4]/30 mx-auto flex items-center justify-center text-[#176B52] dark:text-[#82D9B4] shadow-xs">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1C1A] dark:text-[#E3E5E1]">
              {t.exportTitle || 'Export & Backup'}
            </h3>
            <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0] mt-1">
              {t.exportSub || 'Download spreadsheet or backup data directly to your device.'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Export Month CSV */}
          <button
            id="export-csv-btn"
            type="button"
            onClick={handleExportMonthCSV}
            className="w-full flex items-center justify-between bg-[#F7F8F7] hover:bg-[#EEF1EE] dark:bg-[#252925] dark:hover:bg-[#343B35] border border-[#DDE2DD] dark:border-[#414842] p-4 rounded-2xl transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#D8F3E7] dark:bg-[#214C3D] flex items-center justify-center text-[#176B52] dark:text-[#82D9B4]">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1] block">
                  Export {formatMonthName(monthKey)} (CSV)
                </strong>
                <span className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">
                  {currentMonthExpenses.length} entries formatted for Excel & Numbers
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-[#6E736F] group-hover:text-[#176B52] dark:group-hover:text-[#82D9B4]" />
          </button>

          {/* Export All Backup JSON */}
          <button
            id="export-json-btn"
            type="button"
            onClick={handleExportAllJSON}
            className="w-full flex items-center justify-between bg-[#F7F8F7] hover:bg-[#EEF1EE] dark:bg-[#252925] dark:hover:bg-[#343B35] border border-[#DDE2DD] dark:border-[#414842] p-4 rounded-2xl transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#EEF1EE] dark:bg-[#1B1E1B] flex items-center justify-center text-[#6E736F] dark:text-[#C1C7C0]">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1] block">
                  {t.exportBackupJson || 'Full System Backup (JSON)'}
                </strong>
                <span className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">
                  All monthly plans ({plans.length}) and recorded entries ({allActiveExpenses.length})
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-[#6E736F] group-hover:text-[#176B52] dark:group-hover:text-[#82D9B4]" />
          </button>
        </div>

        <div className="pt-2 border-t border-[#DDE2DD] dark:border-[#414842] text-xs text-[#6E736F] dark:text-[#C1C7C0] text-center">
          Downloads directly to your local device storage.
        </div>
      </div>
    </div>
  );
};
