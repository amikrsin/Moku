import React, { useState, useEffect } from 'react';
import { X, Lock, KeyRound, ShieldCheck, Check, Copy, AlertCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import { PinSecurityConfig } from '../types';
import { 
  DEFAULT_SECURITY_QUESTIONS, 
  generateRecoveryKey, 
  generateSalt,
  hashString 
} from '../lib/security';
import { storage } from '../lib/storage';

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPinConfigured?: (config: PinSecurityConfig) => void;
}

export function PinSetupModal({ isOpen, onClose, onPinConfigured }: PinSetupModalProps) {
  const [step, setStep] = useState<'pin' | 'question' | 'recovery_key'>('pin');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(DEFAULT_SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCurrentlyEnabled, setIsCurrentlyEnabled] = useState(false);
  const [showCurrentConfig, setShowCurrentConfig] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = storage.getPinConfig();
      setIsCurrentlyEnabled(config.isEnabled && !!config.pinHash);
      setStep('pin');
      setPin('');
      setConfirmPin('');
      setSelectedQuestion(config.securityQuestion || DEFAULT_SECURITY_QUESTIONS[0]);
      setSecurityAnswer('');
      setRecoveryKey(generateRecoveryKey());
      setCopiedKey(false);
      setErrorMsg('');
      setShowCurrentConfig(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNextFromPin = () => {
    setErrorMsg('');
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setErrorMsg('Please enter a 4-digit numeric PIN');
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg('PINs do not match. Please re-enter.');
      return;
    }
    setStep('question');
  };

  const handleNextFromQuestion = () => {
    setErrorMsg('');
    if (!securityAnswer.trim() || securityAnswer.trim().length < 2) {
      setErrorMsg('Please provide an answer to your security recovery question');
      return;
    }
    setStep('recovery_key');
  };

  const handleSavePinProtection = async () => {
    setErrorMsg('');
    try {
      const pinSalt = generateSalt();
      const pinHash = await hashString(pin, pinSalt);
      const answerHash = await hashString(securityAnswer);

      const newConfig: PinSecurityConfig = {
        isEnabled: true,
        pinHash,
        pinSalt,
        securityQuestion: selectedQuestion,
        securityAnswerHash: answerHash,
        recoveryKey,
        lockTimeoutMinutes: 0,
        lastUnlockedAt: Date.now(),
      };

      storage.savePinConfig(newConfig);
      storage.setAppLocked(false);
      if (onPinConfigured) onPinConfigured(newConfig);
      onClose();
    } catch {
      setErrorMsg('Failed to save security settings. Please try again.');
    }
  };

  const handleDisablePin = () => {
    if (window.confirm('Are you sure you want to disable PIN protection? Anyone opening this device will have direct access.')) {
      const disabledConfig: PinSecurityConfig = {
        isEnabled: false,
        pinHash: '',
        securityQuestion: '',
        securityAnswerHash: '',
        recoveryKey: '',
        lockTimeoutMinutes: 0,
        lastUnlockedAt: 0,
      };
      storage.savePinConfig(disabledConfig);
      storage.setAppLocked(false);
      if (onPinConfigured) onPinConfigured(disabledConfig);
      onClose();
    }
  };

  const handleCopyRecoveryKey = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(recoveryKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1B1E1B] text-[#1A1C1A] dark:text-[#E3E5E1] rounded-[28px] border border-[#DDE2DD] dark:border-[#414842] max-w-md w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          id="close-pin-setup-btn"
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-white rounded-xl hover:bg-[#EEF1EE] dark:hover:bg-[#252925] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Monogram */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-[#D8F3E7] dark:bg-[#214C3D] border border-[#176B52]/20 dark:border-[#82D9B4]/30 mx-auto flex items-center justify-center text-[#176B52] dark:text-[#82D9B4] shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1C1A] dark:text-[#E3E5E1]">
              {isCurrentlyEnabled ? 'Manage PIN Security' : 'Set Up App PIN Lock'}
            </h3>
            <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0] mt-1 max-w-xs mx-auto leading-relaxed">
              Protect your financial records with a 4-digit PIN and secure recovery pipeline.
            </p>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-[#FCE8E6] dark:bg-[#3D1E1E] border border-[#BA1A1A]/30 text-xs text-[#BA1A1A] dark:text-[#FF897D] flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Enter PIN & Confirm PIN */}
        {step === 'pin' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#6E736F] dark:text-[#C1C7C0] mb-1.5 uppercase tracking-wider">
                1. Enter New 4-Digit PIN
              </label>
              <input
                id="pin-input"
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none focus:border-[#176B52] dark:focus:border-[#82D9B4]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6E736F] dark:text-[#C1C7C0] mb-1.5 uppercase tracking-wider">
                2. Confirm 4-Digit PIN
              </label>
              <input
                id="confirm-pin-input"
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none focus:border-[#176B52] dark:focus:border-[#82D9B4]"
              />
            </div>

            <div className="pt-2 flex items-center space-x-2">
              <button
                id="pin-continue-btn"
                type="button"
                onClick={handleNextFromPin}
                disabled={pin.length !== 4 || confirmPin.length !== 4}
                className="w-full py-3.5 px-4 rounded-xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] font-bold text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                Continue to Recovery Setup →
              </button>
            </div>

            {isCurrentlyEnabled && (
              <div className="pt-2 border-t border-[#DDE2DD] dark:border-[#414842]">
                <button
                  id="disable-pin-btn"
                  type="button"
                  onClick={handleDisablePin}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#FCE8E6] dark:bg-[#3D1E1E] text-[#BA1A1A] dark:text-[#FF897D] text-xs font-bold flex items-center justify-center space-x-1.5 hover:bg-[#fad4d0] transition-colors cursor-pointer border border-[#BA1A1A]/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disable PIN Protection</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Security Recovery Question */}
        {step === 'question' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#6E736F] dark:text-[#C1C7C0] mb-1.5 uppercase tracking-wider">
                Select Security Recovery Question
              </label>
              <select
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none"
              >
                {DEFAULT_SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6E736F] dark:text-[#C1C7C0] mb-1.5 uppercase tracking-wider">
                Your Secret Answer
              </label>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="e.g. St. Xavier's High School"
                className="w-full p-3 text-xs rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none focus:border-[#176B52]"
              />
              <p className="text-[11px] text-[#6E736F] dark:text-[#C1C7C0] mt-1.5">
                Used to recover access if you ever forget your PIN. Not case sensitive.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('pin')}
                className="px-4 py-3 rounded-xl border border-[#DDE2DD] dark:border-[#414842] text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] hover:bg-[#EEF1EE] dark:hover:bg-[#252925] cursor-pointer"
              >
                Back
              </button>
              <button
                id="question-continue-btn"
                type="button"
                onClick={handleNextFromQuestion}
                disabled={!securityAnswer.trim()}
                className="flex-1 py-3 rounded-xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] font-bold text-xs cursor-pointer disabled:opacity-40 transition-colors shadow-xs"
              >
                Next: Master Recovery Key →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Master Recovery Key Confirmation */}
        {step === 'recovery_key' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#D8F3E7] dark:bg-[#214C3D] border border-[#176B52]/20 dark:border-[#82D9B4]/30 rounded-2xl space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#176B52] dark:text-[#82D9B4]">
                <KeyRound className="w-4 h-4" />
                <span>Your Master Emergency Recovery Key</span>
              </div>
              <div className="flex items-center justify-between bg-white dark:bg-[#121412] p-3 rounded-xl border border-[#176B52]/30">
                <span className="font-mono text-sm font-extrabold tracking-wider text-[#176B52] dark:text-[#82D9B4]">
                  {recoveryKey}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRecoveryKey}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[#176B52] dark:bg-[#82D9B4] text-white dark:text-[#121412] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-[#176B52] dark:text-[#82D9B4] leading-relaxed">
                Save this key in a secure place. You can use this key or your security question to instantly reset your PIN.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('question')}
                className="px-4 py-3 rounded-xl border border-[#DDE2DD] dark:border-[#414842] text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] hover:bg-[#EEF1EE] dark:hover:bg-[#252925] cursor-pointer"
              >
                Back
              </button>
              <button
                id="save-pin-finish-btn"
                type="button"
                onClick={handleSavePinProtection}
                className="flex-1 py-3.5 rounded-xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center space-x-2 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Activate PIN Lock</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
