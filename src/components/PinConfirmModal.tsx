import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  HelpCircle, 
  RotateCcw,
  Delete
} from 'lucide-react';
import { hashString } from '../lib/security';
import { storage } from '../lib/storage';
import { PinSecurityConfig } from '../types';

interface PinConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: string;
  actionLabel?: string;
}

export function PinConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'PIN Confirmation Required',
  description = 'Enter your 4-digit PIN to authorize resetting all ledger data and starting a clean slate.',
  actionLabel = 'Authorize Reset',
}: PinConfirmModalProps) {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [shake, setShake] = useState<boolean>(false);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [authSuccess, setAuthSuccess] = useState<boolean>(false);

  // Recovery fallback in case user forgot PIN
  const [showRecovery, setShowRecovery] = useState<boolean>(false);
  const [recoveryMode, setRecoveryMode] = useState<'question' | 'key'>('question');
  const [recoveryInput, setRecoveryInput] = useState<string>('');
  const [recoveryError, setRecoveryError] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const config: PinSecurityConfig = storage.getPinConfig();

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setShake(false);
      setIsAuthorizing(false);
      setAuthSuccess(false);
      setShowRecovery(false);
      setRecoveryInput('');
      setRecoveryError('');
      // Focus input on open
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerifyPin = async (candidatePin: string) => {
    if (candidatePin.length !== 4) return;
    setErrorMsg('');
    setIsAuthorizing(true);

    try {
      const enteredHashWithSalt = await hashString(candidatePin, config.pinSalt);
      const enteredHashWithoutSalt = config.pinSalt ? await hashString(candidatePin) : enteredHashWithSalt;
      if (enteredHashWithSalt === config.pinHash || enteredHashWithoutSalt === config.pinHash) {
        setAuthSuccess(true);
        setIsAuthorizing(false);
        setTimeout(async () => {
          await onConfirm();
          onClose();
        }, 500);
      } else {
        setIsAuthorizing(false);
        setShake(true);
        setErrorMsg('Incorrect PIN. Authorization failed.');
        setTimeout(() => {
          setPin('');
          setShake(false);
          inputRef.current?.focus();
        }, 600);
      }
    } catch {
      setIsAuthorizing(false);
      setErrorMsg('Error verifying PIN. Please try again.');
      setPin('');
    }
  };

  const handlePinChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setPin(clean);
    setErrorMsg('');
    if (clean.length === 4) {
      handleVerifyPin(clean);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      setErrorMsg('');
      if (next.length === 4) {
        handleVerifyPin(next);
      }
    }
  };

  const handleKeypadDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleVerifyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (!recoveryInput.trim()) {
      setRecoveryError('Please enter your recovery answer or key.');
      return;
    }

    try {
      if (recoveryMode === 'question') {
        const inputHash = await hashString(recoveryInput);
        if (inputHash === config.securityAnswerHash) {
          setAuthSuccess(true);
          setTimeout(async () => {
            await onConfirm();
            onClose();
          }, 500);
        } else {
          setRecoveryError('Incorrect answer to security question.');
        }
      } else {
        const cleanInput = recoveryInput.trim().toUpperCase();
        const cleanKey = (config.recoveryKey || '').trim().toUpperCase();
        if (cleanInput === cleanKey) {
          setAuthSuccess(true);
          setTimeout(async () => {
            await onConfirm();
            onClose();
          }, 500);
        } else {
          setRecoveryError('Invalid Master Recovery Key.');
        }
      }
    } catch {
      setRecoveryError('Recovery verification failed. Try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1B1E1B] text-[#1A1C1A] dark:text-[#E3E5E1] rounded-[28px] border border-[#DDE2DD] dark:border-[#414842] max-w-sm w-full p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-pin-confirm-modal"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-white rounded-xl hover:bg-[#EEF1EE] dark:hover:bg-[#252925] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!showRecovery ? (
          <>
            {/* Header Icon */}
            <div className="text-center space-y-2 pt-1">
              <div className="w-13 h-13 rounded-2xl bg-[#FCE8E6] dark:bg-[#3D1E1E] border border-[#BA1A1A]/30 text-[#BA1A1A] dark:text-[#FF897D] mx-auto flex items-center justify-center shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-[#1A1C1A] dark:text-[#E3E5E1]">
                  {title}
                </h3>
                <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0] mt-1 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>

            {/* Hidden Input for Physical Keyboard / Autofocus */}
            <input
              ref={inputRef}
              id="hidden-pin-confirm-input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              className="sr-only"
              autoFocus
            />

            {/* PIN Dots Indicator */}
            <div 
              className={`flex items-center justify-center space-x-3.5 py-2 cursor-pointer ${shake ? 'animate-shake' : ''}`}
              onClick={() => inputRef.current?.focus()}
            >
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      authSuccess
                        ? 'bg-[#176B52] dark:bg-[#82D9B4] scale-110'
                        : isFilled
                        ? 'bg-[#BA1A1A] dark:bg-[#FF897D] scale-110 shadow-xs'
                        : 'bg-[#EEF1EE] dark:bg-[#252925] border border-[#DDE2DD] dark:border-[#414842]'
                    }`}
                  />
                );
              })}
            </div>

            {/* Status Message */}
            {authSuccess ? (
              <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-[#176B52] dark:text-[#82D9B4]">
                <CheckCircle2 className="w-4 h-4" />
                <span>PIN verified! Resetting ledger...</span>
              </div>
            ) : errorMsg ? (
              <div className="flex items-center justify-center space-x-1.5 text-xs font-semibold text-[#BA1A1A] dark:text-[#FF897D] text-center">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            ) : isAuthorizing ? (
              <p className="text-xs text-center text-[#6E736F] dark:text-[#C1C7C0] animate-pulse">
                Verifying PIN...
              </p>
            ) : (
              <p className="text-[11px] text-center text-[#6E736F] dark:text-[#C1C7C0]">
                Enter your 4 digits using keypad or keyboard
              </p>
            )}

            {/* Touch Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  id={`pin-confirm-digit-${digit}`}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="h-12 rounded-xl bg-[#F7F8F7] hover:bg-[#EEF1EE] dark:bg-[#252925] dark:hover:bg-[#343B35] border border-[#DDE2DD] dark:border-[#414842] text-xl font-bold font-mono text-[#1A1C1A] dark:text-[#E3E5E1] active:scale-95 transition-all cursor-pointer shadow-2xs"
                >
                  {digit}
                </button>
              ))}

              {/* Forgot PIN Recovery Button */}
              <button
                id="pin-confirm-forgot-btn"
                type="button"
                onClick={() => {
                  setShowRecovery(true);
                  setErrorMsg('');
                }}
                className="h-12 rounded-xl text-[10px] font-bold text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#176B52] dark:hover:text-[#82D9B4] flex flex-col items-center justify-center cursor-pointer transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 mb-0.5" />
                <span>Forgot?</span>
              </button>

              {/* 0 */}
              <button
                id="pin-confirm-digit-0"
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-12 rounded-xl bg-[#F7F8F7] hover:bg-[#EEF1EE] dark:bg-[#252925] dark:hover:bg-[#343B35] border border-[#DDE2DD] dark:border-[#414842] text-xl font-bold font-mono text-[#1A1C1A] dark:text-[#E3E5E1] active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                0
              </button>

              {/* Backspace */}
              <button
                id="pin-confirm-delete-btn"
                type="button"
                onClick={handleKeypadDelete}
                className="h-12 rounded-xl text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                aria-label="Delete digit"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Cancel Button */}
            <div className="pt-2 border-t border-[#DDE2DD] dark:border-[#414842]">
              <button
                id="cancel-pin-confirm-btn"
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-[#DDE2DD] dark:border-[#414842] text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] hover:bg-[#EEF1EE] dark:hover:bg-[#252925] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          /* Recovery Mode */
          <div className="space-y-3.5">
            <div className="flex items-center space-x-2 text-[#176B52] dark:text-[#82D9B4]">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-base font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                Authorize with Recovery
              </h3>
            </div>
            <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0] leading-relaxed">
              Verify your identity using your security question or Master Recovery Key to authorize the reset.
            </p>

            <form onSubmit={handleVerifyRecovery} className="space-y-3">
              <div className="flex space-x-2 border-b border-[#DDE2DD] dark:border-[#414842] pb-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryMode('question');
                    setRecoveryError('');
                  }}
                  className={`pb-1 cursor-pointer transition-colors ${
                    recoveryMode === 'question'
                      ? 'text-[#176B52] dark:text-[#82D9B4] border-b-2 border-[#176B52] dark:border-[#82D9B4]'
                      : 'text-[#6E736F] dark:text-[#C1C7C0]'
                  }`}
                >
                  Security Question
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryMode('key');
                    setRecoveryError('');
                  }}
                  className={`pb-1 cursor-pointer transition-colors ${
                    recoveryMode === 'key'
                      ? 'text-[#176B52] dark:text-[#82D9B4] border-b-2 border-[#176B52] dark:border-[#82D9B4]'
                      : 'text-[#6E736F] dark:text-[#C1C7C0]'
                  }`}
                >
                  Master Recovery Key
                </button>
              </div>

              {recoveryMode === 'question' ? (
                <div>
                  <label className="block text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] mb-1">
                    {config.securityQuestion || 'What was the name of your first elementary school?'}
                  </label>
                  <input
                    id="recovery-answer-input"
                    type="text"
                    required
                    placeholder="Your secret answer..."
                    value={recoveryInput}
                    onChange={(e) => setRecoveryInput(e.target.value)}
                    className="w-full bg-[#F7F8F7] dark:bg-[#252925] border border-[#DDE2DD] dark:border-[#414842] rounded-xl px-3 py-2 text-xs text-[#1A1C1A] dark:text-[#E3E5E1] outline-none focus:border-[#176B52]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] mb-1">
                    Enter Master Recovery Key (MOKU-XXXX-XXXX)
                  </label>
                  <input
                    id="recovery-key-input"
                    type="text"
                    required
                    placeholder="e.g. MOKU-7X9K-42"
                    value={recoveryInput}
                    onChange={(e) => setRecoveryInput(e.target.value)}
                    className="w-full bg-[#F7F8F7] dark:bg-[#252925] border border-[#DDE2DD] dark:border-[#414842] rounded-xl px-3 py-2 text-xs text-[#1A1C1A] dark:text-[#E3E5E1] outline-none font-mono focus:border-[#176B52]"
                  />
                </div>
              )}

              {recoveryError && (
                <p className="text-xs font-semibold text-[#BA1A1A] dark:text-[#FF897D]">
                  {recoveryError}
                </p>
              )}

              {authSuccess && (
                <div className="flex items-center space-x-1 text-xs font-bold text-[#176B52] dark:text-[#82D9B4]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authorized! Resetting ledger...</span>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecovery(false);
                    setRecoveryError('');
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-[#DDE2DD] dark:border-[#414842] text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] hover:bg-[#EEF1EE] dark:hover:bg-[#252925] cursor-pointer"
                >
                  Back to PIN
                </button>
                <button
                  id="submit-recovery-btn"
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#BA1A1A] hover:bg-[#9e1414] text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Verify &amp; Reset
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
