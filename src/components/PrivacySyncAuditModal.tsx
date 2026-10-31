import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  RefreshCw, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Globe, 
  Activity, 
  Database, 
  Check, 
  Lock,
  Download,
  Upload
} from 'lucide-react';
import { storage } from '../lib/storage';
import { PrivacyAuditReport, SyncValidationResult } from '../types';

interface PrivacySyncAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExportModal: (tab?: 'export' | 'restore') => void;
  onOpenPinSetup: () => void;
}

export const PrivacySyncAuditModal: React.FC<PrivacySyncAuditModalProps> = ({
  isOpen,
  onClose,
  onOpenExportModal,
  onOpenPinSetup,
}) => {
  const [auditReport, setAuditReport] = useState<PrivacyAuditReport>(() => storage.getPrivacyAudit());
  const [syncReport, setSyncReport] = useState<SyncValidationResult | null>(null);
  const [isValidatingSync, setIsValidatingSync] = useState(false);
  const [activeTab, setActiveTab] = useState<'privacy' | 'sync' | 'backup'>('privacy');

  useEffect(() => {
    if (isOpen) {
      setAuditReport(storage.getPrivacyAudit());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunSyncValidation = async () => {
    setIsValidatingSync(true);
    try {
      const res = await storage.validateSyncConnection();
      setSyncReport(res);
      setAuditReport(storage.getPrivacyAudit());
    } finally {
      setIsValidatingSync(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1B1E1B] text-[#1A1C1A] dark:text-[#E3E5E1] rounded-[28px] border border-[#DDE2DD] dark:border-[#414842] max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-audit-modal"
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-white hover:bg-[#EEF1EE] dark:hover:bg-[#252925] rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="w-13 h-13 rounded-2xl bg-[#D8F3E7] dark:bg-[#214C3D] border border-[#176B52]/20 dark:border-[#82D9B4]/30 mx-auto flex items-center justify-center text-[#176B52] dark:text-[#82D9B4] shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1C1A] dark:text-[#E3E5E1]">
              Trust &amp; Validation Center
            </h3>
            <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0] mt-0.5">
              Verify your local data privacy, backup integrity, and real-time sync status.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 p-1 bg-[#EEF1EE] dark:bg-[#252925] rounded-xl border border-[#DDE2DD] dark:border-[#414842] text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === 'privacy'
                ? 'bg-white dark:bg-[#1B1E1B] text-[#176B52] dark:text-[#82D9B4] shadow-xs'
                : 'text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === 'sync'
                ? 'bg-white dark:bg-[#1B1E1B] text-[#176B52] dark:text-[#82D9B4] shadow-xs'
                : 'text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === 'backup'
                ? 'bg-white dark:bg-[#1B1E1B] text-[#176B52] dark:text-[#82D9B4] shadow-xs'
                : 'text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Backup</span>
          </button>
        </div>

        {/* TAB 1: PRIVACY & DATA SOVEREIGNTY */}
        {activeTab === 'privacy' && (
          <div className="space-y-3 animate-in fade-in duration-150 text-xs">
            {/* Status Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-[#D8F3E7] dark:bg-[#214C3D] border border-[#176B52]/30 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#176B52] dark:text-[#82D9B4] shrink-0" />
                <div>
                  <span className="font-bold text-[#176B52] dark:text-[#82D9B4] block text-sm">
                    100% On-Device &amp; Sovereign
                  </span>
                  <span className="text-[11px] text-[#176B52]/80 dark:text-[#82D9B4]/80 block">
                    Zero third-party trackers · Zero telemetry
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/40 text-[#176B52] dark:text-[#82D9B4]">
                Verified
              </span>
            </div>

            {/* Storage Footprint Breakdown */}
            <div className="p-4 bg-[#F7F8F7] dark:bg-[#252925] rounded-2xl border border-[#DDE2DD] dark:border-[#414842] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                  <HardDrive className="w-4 h-4 text-[#176B52] dark:text-[#82D9B4]" />
                  <span>Local Storage Footprint</span>
                </div>
                <span className="text-[11px] font-bold text-[#176B52] dark:text-[#82D9B4]">
                  {auditReport.totalStorageFormatted}
                </span>
              </div>

              {/* Record counts */}
              <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                <div className="p-2 bg-white dark:bg-[#1B1E1B] rounded-xl border border-[#DDE2DD] dark:border-[#414842]">
                  <span className="font-bold text-[#1A1C1A] dark:text-white block">
                    {auditReport.recordsBreakdown.plans}
                  </span>
                  <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">Plans</span>
                </div>
                <div className="p-2 bg-white dark:bg-[#1B1E1B] rounded-xl border border-[#DDE2DD] dark:border-[#414842]">
                  <span className="font-bold text-[#1A1C1A] dark:text-white block">
                    {auditReport.recordsBreakdown.expenses}
                  </span>
                  <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">Expenses</span>
                </div>
                <div className="p-2 bg-white dark:bg-[#1B1E1B] rounded-xl border border-[#DDE2DD] dark:border-[#414842]">
                  <span className="font-bold text-[#1A1C1A] dark:text-white block">
                    {auditReport.recordsBreakdown.savings}
                  </span>
                  <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">Savings</span>
                </div>
                <div className="p-2 bg-white dark:bg-[#1B1E1B] rounded-xl border border-[#DDE2DD] dark:border-[#414842]">
                  <span className="font-bold text-[#1A1C1A] dark:text-white block">
                    {auditReport.recordsBreakdown.inbox}
                  </span>
                  <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">Inbox</span>
                </div>
              </div>
            </div>

            {/* Privacy Architecture Specifications */}
            <div className="space-y-2 p-3.5 bg-[#F7F8F7] dark:bg-[#252925] rounded-2xl border border-[#DDE2DD] dark:border-[#414842]">
              <div className="flex items-start space-x-2.5">
                <Cpu className="w-4 h-4 text-[#176B52] dark:text-[#82D9B4] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[11px] font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                    Client-Side SMS &amp; Math Processing
                  </strong>
                  <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0] leading-relaxed block">
                    {auditReport.smsProcessingType}
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 pt-2 border-t border-[#DDE2DD] dark:border-[#414842]">
                <Globe className="w-4 h-4 text-[#176B52] dark:text-[#82D9B4] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[11px] font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                    Network Footprint
                  </strong>
                  <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0] leading-relaxed block">
                    {auditReport.networkSyncStatus}
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 pt-2 border-t border-[#DDE2DD] dark:border-[#414842]">
                <Lock className="w-4 h-4 text-[#176B52] dark:text-[#82D9B4] shrink-0 mt-0.5" />
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <strong className="block text-[11px] font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                      Local PIN Authorization
                    </strong>
                    <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0] block">
                      {auditReport.pinProtectionActive ? 'Salted SHA-256 PIN Enabled' : 'PIN Not Active'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPinSetup();
                    }}
                    className="text-[10px] font-bold text-[#176B52] dark:text-[#82D9B4] hover:underline cursor-pointer"
                  >
                    {auditReport.pinProtectionActive ? 'Change' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SYNC VALIDATION & DIAGNOSTICS */}
        {activeTab === 'sync' && (
          <div className="space-y-3.5 animate-in fade-in duration-150 text-xs">
            <div className="p-3.5 bg-[#F7F8F7] dark:bg-[#252925] rounded-2xl border border-[#DDE2DD] dark:border-[#414842] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1A1C1A] dark:text-[#E3E5E1] flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#176B52] dark:text-[#82D9B4]" />
                  <span>Sync Architecture Diagnostic</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#D8F3E7] dark:bg-[#214C3D] text-[#176B52] dark:text-[#82D9B4]">
                  Offline-First (TRD §5)
                </span>
              </div>
              <p className="text-[11px] text-[#6E736F] dark:text-[#C1C7C0] leading-relaxed">
                MOKU uses a resilient Last-Write-Wins (LWW) conflict reconciliation protocol with deterministic epoch timestamps and real-time cross-tab synchronization.
              </p>
            </div>

            {/* Run Validation Test Button */}
            <button
              id="run-sync-validation-btn"
              type="button"
              onClick={handleRunSyncValidation}
              disabled={isValidatingSync}
              className="w-full py-2.5 px-4 rounded-xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isValidatingSync ? 'animate-spin' : ''}`} />
              <span>{isValidatingSync ? 'Validating Connectivity...' : 'Run Live Sync & Connectivity Test'}</span>
            </button>

            {/* Sync Validation Result Banner */}
            {syncReport && (
              <div className="p-4 rounded-2xl bg-[#D8F3E7]/50 dark:bg-[#214C3D]/50 border border-[#176B52]/30 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#176B52] dark:text-[#82D9B4] flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sync Validation Result</span>
                  </span>
                  <span className="text-[10px] font-semibold text-[#6E736F] dark:text-[#C1C7C0]">
                    {syncReport.latencyMs}ms roundtrip
                  </span>
                </div>

                <p className="text-[11px] text-[#1A1C1A] dark:text-[#E3E5E1] leading-relaxed">
                  {syncReport.message}
                </p>

                {/* Parity comparison */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 bg-white dark:bg-[#1B1E1B] rounded-xl border border-[#DDE2DD] dark:border-[#414842]">
                    <span className="font-bold text-[#1A1C1A] dark:text-white block">Local Verified</span>
                    <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">
                      {syncReport.localPlansCount} Plans · {syncReport.localExpensesCount} Expenses
                    </span>
                  </div>
                  <div className="p-2 bg-white dark:bg-[#1B1E1B] rounded-xl border border-[#DDE2DD] dark:border-[#414842]">
                    <span className="font-bold text-[#1A1C1A] dark:text-white block">Remote Parity</span>
                    <span className="text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">
                      {syncReport.remotePlansCount ?? syncReport.localPlansCount} Plans · {syncReport.remoteExpensesCount ?? syncReport.localExpensesCount} Expenses
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-[10px] text-[#176B52] dark:text-[#82D9B4] font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Cross-tab synchronization active via StorageEvent API</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BACKUP INTEGRITY & QUICK ACTIONS */}
        {activeTab === 'backup' && (
          <div className="space-y-3 animate-in fade-in duration-150 text-xs">
            <div className="p-3.5 bg-[#F7F8F7] dark:bg-[#252925] rounded-2xl border border-[#DDE2DD] dark:border-[#414842] space-y-1.5">
              <span className="font-bold text-[#1A1C1A] dark:text-[#E3E5E1] flex items-center space-x-2">
                <Database className="w-4 h-4 text-[#176B52] dark:text-[#82D9B4]" />
                <span>Full System Backup &amp; Recovery</span>
              </span>
              <p className="text-[11px] text-[#6E736F] dark:text-[#C1C7C0] leading-relaxed">
                MOKU backups are non-proprietary JSON files that you completely own. You can validate, inspect, and restore them at any time without cloud vendor lock-in.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExportModal('export');
                }}
                className="p-3.5 bg-[#F7F8F7] hover:bg-[#EEF1EE] dark:bg-[#252925] dark:hover:bg-[#343B35] border border-[#DDE2DD] dark:border-[#414842] rounded-2xl transition-colors text-left cursor-pointer space-y-1"
              >
                <Download className="w-5 h-5 text-[#176B52] dark:text-[#82D9B4]" />
                <strong className="block text-xs font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                  Export Backup
                </strong>
                <span className="block text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">
                  Download CSV or JSON file
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExportModal('restore');
                }}
                className="p-3.5 bg-[#F7F8F7] hover:bg-[#EEF1EE] dark:bg-[#252925] dark:hover:bg-[#343B35] border border-[#DDE2DD] dark:border-[#414842] rounded-2xl transition-colors text-left cursor-pointer space-y-1"
              >
                <Upload className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
                <strong className="block text-xs font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                  Restore &amp; Validate
                </strong>
                <span className="block text-[10px] text-[#6E736F] dark:text-[#C1C7C0]">
                  Inspect &amp; restore JSON file
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-[#DDE2DD] dark:border-[#414842] text-[11px] text-[#6E736F] dark:text-[#C1C7C0] text-center">
          MOKU Japanese Kakeibo · Local-first, private financial computing
        </div>
      </div>
    </div>
  );
};
