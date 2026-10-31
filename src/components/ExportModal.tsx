import React, { useState, useEffect, useRef } from 'react';
import { Expense, Plan, BackupValidationReport } from '../types';
import { formatCurrency, formatMonthName, storage } from '../lib/storage';
import { getT } from '../lib/i18n';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  Lock, 
  PiggyBank, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  EyeOff, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { getLicenseState, subscribeLicense } from '../lib/license';
import { LicenseUnlockModal } from './LicenseUnlockModal';
import { PinConfirmModal } from './PinConfirmModal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthKey: string;
  plans: Plan[];
  expenses: Expense[];
  currency?: string;
  initialTab?: 'export' | 'restore';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  monthKey,
  plans,
  expenses,
  currency = 'INR',
  initialTab = 'export',
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'restore'>(initialTab);
  const [isLicensed, setIsLicensed] = useState<boolean>(() => getLicenseState().isLicensed);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [stripNotes, setStripNotes] = useState(false);

  // Restore states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<BackupValidationReport | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [showPinConfirm, setShowPinConfirm] = useState(false);

  const pinConfig = storage.getPinConfig();
  const isPinActive = pinConfig.isEnabled && !!pinConfig.pinHash;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    const unsub = subscribeLicense(() => {
      setIsLicensed(getLicenseState().isLicensed);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const t = getT(currency);

  const currentMonthExpenses = expenses.filter((e) => !e.deleted && e.monthKey === monthKey);
  const allActiveExpenses = expenses.filter((e) => !e.deleted);
  const localState = storage.getLocalState();
  const currentMonthSavings = (localState.savingsEntries || []).filter((s) => !s.deleted && s.monthKey === monthKey);

  // Export current month as CSV
  const handleExportMonthCSV = () => {
    if (!isLicensed) {
      setShowLicenseModal(true);
      return;
    }
    const headers = ['Date', 'Category', 'Sector', 'Amount', 'Note', 'MonthKey', 'ID'];
    const rows = currentMonthExpenses.map((e) => [
      `"${new Date(e.date).toISOString().split('T')[0]}"`,
      `"${e.category}"`,
      `"${(e.sectorName || e.budgetLineName || '').replace(/"/g, '""')}"`,
      Number(e.amount || 0).toFixed(2),
      `"${(stripNotes ? 'Private Note' : e.note || '').replace(/"/g, '""')}"`,
      `"${e.monthKey}"`,
      `"${e.id}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csvContent, `kakeibo_expenses_${monthKey}.csv`, 'text/csv;charset=utf-8;');
  };

  // Export current month savings as CSV
  const handleExportSavingsCSV = () => {
    if (!isLicensed) {
      setShowLicenseModal(true);
      return;
    }
    const headers = ['Date', 'Destination', 'CommittedReturn', 'Amount', 'Notes', 'MonthKey', 'ID'];
    const rows = currentMonthSavings.map((s) => [
      `"${new Date(s.date).toISOString().split('T')[0]}"`,
      `"${(s.destination === 'other' && s.destinationCustom ? s.destinationCustom : s.destination).replace(/"/g, '""')}"`,
      `"${(s.committedReturn || '').replace(/"/g, '""')}"`,
      Number(s.amount || 0).toFixed(2),
      `"${(stripNotes ? '' : s.notes || '').replace(/"/g, '""')}"`,
      `"${s.monthKey}"`,
      `"${s.id}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csvContent, `kakeibo_savings_${monthKey}.csv`, 'text/csv;charset=utf-8;');
  };

  // Export all as JSON (Complete System Backup)
  const handleExportAllJSON = () => {
    if (!isLicensed) {
      setShowLicenseModal(true);
      return;
    }
    const sanitizedExpenses = stripNotes
      ? allActiveExpenses.map((e) => ({ ...e, note: 'Confidential Note' }))
      : allActiveExpenses;

    const data = {
      exportedAt: new Date().toISOString(),
      app: 'MOKU Mindful Kakeibo Ledger',
      currency,
      plans,
      expenses: sanitizedExpenses,
      savingsEntries: (localState.savingsEntries || []).filter((s) => !s.deleted),
      inboxTransactions: storage.getInboxTransactions(),
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

  // Handle file select for restore & validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setRestoreSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const report = storage.validateBackup(content);
      setValidationReport(report);
    };
    reader.onerror = () => {
      setValidationReport({
        isValid: false,
        error: 'Unable to read the chosen file. Please ensure it is a valid UTF-8 text file.',
      });
    };
    reader.readAsText(file);
  };

  const triggerRestoreExecution = () => {
    if (!validationReport?.isValid || !validationReport.data) return;

    const result = storage.restoreFromBackup(validationReport.data, restoreMode);
    if (result.success) {
      setRestoreSuccessMsg(
        `${result.message} (${result.plansRestored} plans, ${result.expensesRestored} expenses, ${result.savingsRestored} savings entries)`
      );
      setValidationReport(null);
      setSelectedFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setValidationReport({
        isValid: false,
        error: result.message,
      });
    }
  };

  const handleStartRestore = () => {
    if (isPinActive) {
      setShowPinConfirm(true);
    } else {
      triggerRestoreExecution();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div 
          className="bg-white dark:bg-[#1B1E1B] text-[#1A1C1A] dark:text-[#E3E5E1] rounded-[28px] border border-[#DDE2DD] dark:border-[#414842] max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto"
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

          {/* Modal Header */}
          <div className="text-center space-y-2 pt-1">
            <div className="w-13 h-13 rounded-2xl bg-[#D8F3E7] dark:bg-[#214C3D] border border-[#176B52]/20 dark:border-[#82D9B4]/30 mx-auto flex items-center justify-center text-[#176B52] dark:text-[#82D9B4] shadow-xs">
              {activeTab === 'export' ? (
                isLicensed ? <Download className="w-6 h-6" /> : <Lock className="w-6 h-6 text-amber-600" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1C1A] dark:text-[#E3E5E1]">
                {t.exportTitle || 'Backup & Restore Hub'}
              </h3>
              <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0] mt-1 max-w-xs mx-auto">
                {activeTab === 'export'
                  ? (isLicensed
                      ? 'Export spreadsheets or download complete system backup directly to your device.'
                      : 'File downloads locked in Demo Mode. Activate your Etsy License Key to unlock.')
                  : 'Restore and validate past backup JSON files with integrity checks.'}
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-[#EEF1EE] dark:bg-[#252925] rounded-xl border border-[#DDE2DD] dark:border-[#414842]">
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeTab === 'export'
                  ? 'bg-white dark:bg-[#1B1E1B] text-[#176B52] dark:text-[#82D9B4] shadow-xs'
                  : 'text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export &amp; Backup</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('restore')}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeTab === 'restore'
                  ? 'bg-white dark:bg-[#1B1E1B] text-[#176B52] dark:text-[#82D9B4] shadow-xs'
                  : 'text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restore &amp; Validate</span>
            </button>
          </div>

          {/* TAB 1: EXPORT & BACKUP */}
          {activeTab === 'export' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Privacy Strip Notes Option */}
              <div className="p-3 bg-[#F7F8F7] dark:bg-[#252925] rounded-xl border border-[#DDE2DD] dark:border-[#414842] flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <EyeOff className="w-4 h-4 text-[#6E736F] dark:text-[#C1C7C0]" />
                  <div>
                    <span className="text-xs font-bold text-[#1A1C1A] dark:text-[#E3E5E1] block">
                      Privacy Strip: Hide Personal Notes
                    </span>
                    <span className="text-[11px] text-[#6E736F] dark:text-[#C1C7C0] block">
                      Sanitizes expense notes for sharing with an accountant
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={stripNotes}
                  onChange={(e) => setStripNotes(e.target.checked)}
                  className="w-4 h-4 rounded text-[#176B52] cursor-pointer"
                />
              </div>

              {/* Export Month Expenses CSV */}
              <button
                id="export-csv-btn"
                type="button"
                onClick={handleExportMonthCSV}
                className="w-full flex items-center justify-between bg-[#F7F8F7] hover:bg-[#EEF1EE] dark:bg-[#252925] dark:hover:bg-[#343B35] border border-[#DDE2DD] dark:border-[#414842] p-3.5 rounded-2xl transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-[#D8F3E7] dark:bg-[#214C3D] flex items-center justify-center text-[#176B52] dark:text-[#82D9B4]">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs sm:text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1] block">
                      Export {formatMonthName(monthKey)} Expenses (CSV)
                    </strong>
                    <span className="text-[11px] text-[#6E736F] dark:text-[#C1C7C0]">
                      {currentMonthExpenses.length} entries with category &amp; sector breakdowns
                    </span>
                  </div>
                </div>
                {isLicensed ? (
                  <Download className="w-4 h-4 text-[#6E736F] group-hover:text-[#176B52] dark:group-hover:text-[#82D9B4]" />
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Unlock
                  </span>
                )}
              </button>

              {/* Export Month Savings CSV */}
              <button
                id="export-savings-csv-btn"
                type="button"
                onClick={handleExportSavingsCSV}
                className="w-full flex items-center justify-between bg-[#F7F8F7] hover:bg-[#EEF1EE] dark:bg-[#252925] dark:hover:bg-[#343B35] border border-[#DDE2DD] dark:border-[#414842] p-3.5 rounded-2xl transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F0FE] dark:bg-[#1E293B] flex items-center justify-center text-[#2563EB] dark:text-[#60A5FA]">
                    <PiggyBank className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs sm:text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1] block">
                      Export {formatMonthName(monthKey)} Savings (CSV)
                    </strong>
                    <span className="text-[11px] text-[#6E736F] dark:text-[#C1C7C0]">
                      {currentMonthSavings.length} deposits (FD, SIP, Mutual Funds, Cash)
                    </span>
                  </div>
                </div>
                {isLicensed ? (
                  <Download className="w-4 h-4 text-[#6E736F] group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA]" />
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Unlock
                  </span>
                )}
              </button>

              {/* Export All Backup JSON */}
              <button
                id="export-json-btn"
                type="button"
                onClick={handleExportAllJSON}
                className="w-full flex items-center justify-between bg-[#F7F8F7] hover:bg-[#EEF1EE] dark:bg-[#252925] dark:hover:bg-[#343B35] border border-[#DDE2DD] dark:border-[#414842] p-3.5 rounded-2xl transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EEF1EE] dark:bg-[#1B1E1B] flex items-center justify-center text-[#6E736F] dark:text-[#C1C7C0]">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-xs sm:text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1] block">
                      {t.exportBackupJson || 'Full System Backup (JSON)'}
                    </strong>
                    <span className="text-[11px] text-[#6E736F] dark:text-[#C1C7C0]">
                      All monthly plans ({plans.length}) and recorded entries ({allActiveExpenses.length})
                    </span>
                  </div>
                </div>
                {isLicensed ? (
                  <Download className="w-4 h-4 text-[#6E736F] group-hover:text-[#176B52] dark:group-hover:text-[#82D9B4]" />
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Unlock
                  </span>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: RESTORE & VALIDATE BACKUP */}
          {activeTab === 'restore' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {/* File upload picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                id="backup-file-input"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 border-2 border-dashed border-[#DDE2DD] dark:border-[#414842] hover:border-[#176B52] dark:hover:border-[#82D9B4] rounded-2xl text-center cursor-pointer bg-[#F7F8F7] dark:bg-[#252925] transition-colors space-y-2"
              >
                <FolderOpen className="w-8 h-8 text-[#176B52] dark:text-[#82D9B4] mx-auto" />
                <div>
                  <p className="text-xs font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                    {selectedFileName ? selectedFileName : 'Select or drop MOKU Backup JSON file'}
                  </p>
                  <p className="text-[11px] text-[#6E736F] dark:text-[#C1C7C0] mt-0.5">
                    Supports kakeibo_backup_*.json files
                  </p>
                </div>
              </div>

              {/* Success Notification */}
              {restoreSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-[#D8F3E7] dark:bg-[#214C3D] border border-[#176B52]/30 text-xs text-[#176B52] dark:text-[#82D9B4] flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Restore Succeeded</span>
                    <span className="text-[11px] leading-tight block">{restoreSuccessMsg}</span>
                  </div>
                </div>
              )}

              {/* Validation Report Area */}
              {validationReport && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {validationReport.isValid && validationReport.summary ? (
                    <div className="p-4 rounded-2xl bg-[#D8F3E7]/40 dark:bg-[#214C3D]/40 border border-[#176B52]/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-[#176B52] dark:text-[#82D9B4]">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Backup Validated &amp; Verified</span>
                        </div>
                        {validationReport.summary.exportedDateFormatted && (
                          <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">
                            {validationReport.summary.exportedDateFormatted}
                          </span>
                        )}
                      </div>

                      {/* Stat summary pills */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 bg-white dark:bg-[#1B1E1B] rounded-xl border border-[#DDE2DD] dark:border-[#414842]">
                          <span className="font-bold text-[#1A1C1A] dark:text-white block">
                            {validationReport.summary.plansCount}
                          </span>
                          <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">Plans</span>
                        </div>
                        <div className="p-2 bg-white dark:bg-[#1B1E1B] rounded-xl border border-[#DDE2DD] dark:border-[#414842]">
                          <span className="font-bold text-[#1A1C1A] dark:text-white block">
                            {validationReport.summary.expensesCount}
                          </span>
                          <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">
                            {formatCurrency(validationReport.summary.totalExpenseAmount, validationReport.summary.currency)}
                          </span>
                        </div>
                        <div className="p-2 bg-white dark:bg-[#1B1E1B] rounded-xl border border-[#DDE2DD] dark:border-[#414842]">
                          <span className="font-bold text-[#1A1C1A] dark:text-white block">
                            {validationReport.summary.savingsCount}
                          </span>
                          <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">Savings</span>
                        </div>
                      </div>

                      {/* Warnings if any */}
                      {validationReport.warnings && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-400 space-y-0.5">
                          {validationReport.warnings.map((w, i) => (
                            <p key={i}>• {w}</p>
                          ))}
                        </div>
                      )}

                      {/* Restore Mode Selection */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-[#1A1C1A] dark:text-[#E3E5E1] block">
                          Restoration Strategy:
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setRestoreMode('merge')}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                              restoreMode === 'merge'
                                ? 'bg-white dark:bg-[#1B1E1B] border-[#176B52] dark:border-[#82D9B4] text-[#176B52] dark:text-[#82D9B4] font-bold shadow-2xs'
                                : 'bg-[#F7F8F7] dark:bg-[#252925] border-[#DDE2DD] dark:border-[#414842] text-[#6E736F] dark:text-[#C1C7C0]'
                            }`}
                          >
                            <span className="block text-[11px] font-bold">Safe Merge</span>
                            <span className="block text-[9px] opacity-80">Preserve existing records</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRestoreMode('replace')}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                              restoreMode === 'replace'
                                ? 'bg-white dark:bg-[#1B1E1B] border-[#BA1A1A] text-[#BA1A1A] font-bold shadow-2xs'
                                : 'bg-[#F7F8F7] dark:bg-[#252925] border-[#DDE2DD] dark:border-[#414842] text-[#6E736F] dark:text-[#C1C7C0]'
                            }`}
                          >
                            <span className="block text-[11px] font-bold">Clean Replace</span>
                            <span className="block text-[9px] opacity-80">Overwrite ledger</span>
                          </button>
                        </div>
                      </div>

                      {/* Execute Restore Button */}
                      <button
                        type="button"
                        id="execute-restore-backup-btn"
                        onClick={handleStartRestore}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-2 shadow-xs"
                      >
                        {isPinActive && <Lock className="w-3.5 h-3.5" />}
                        <span>Restore Validated Records</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-[#FCE8E6] dark:bg-[#3D1E1E] border border-[#BA1A1A]/30 text-xs text-[#BA1A1A] dark:text-[#FF897D] flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Validation Failed</span>
                        <span className="text-[11px] block mt-0.5">{validationReport.error}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-[#DDE2DD] dark:border-[#414842] text-xs text-[#6E736F] dark:text-[#C1C7C0] text-center">
            {activeTab === 'export'
              ? (isLicensed
                  ? 'All data stays on your local device. No telemetry.'
                  : 'Enter your paid Etsy License Key to enable file downloads.')
              : 'Backup files are validated client-side in browser memory.'}
          </div>
        </div>
      </div>

      <LicenseUnlockModal
        isOpen={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
      />

      <PinConfirmModal
        isOpen={showPinConfirm}
        onClose={() => setShowPinConfirm(false)}
        onConfirm={triggerRestoreExecution}
        title="Authorize Backup Restore"
        description="Enter your 4-digit PIN to authorize restoring financial records into your ledger."
      />
    </>
  );
};
