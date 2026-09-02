import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Delete, 
  KeyRound, 
  ShieldAlert, 
  HelpCircle, 
  CheckCircle2, 
  X, 
  RotateCcw,
  Sparkles 
} from 'lucide-react';
import { PinSecurityConfig } from '../types';
import { hashString } from '../lib/security';
import { storage } from '../lib/storage';

interface PinLockScreenProps {
  onUnlocked: () => void;
}

export function PinLockScreen({ onUnlocked }: PinLockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [shake, setShake] = useState<boolean>(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);
  const [recoveryMode, setRecoveryMode] = useState<'question' | 'key'>('question');
  const [recoveryInput, setRecoveryInput] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmNewPin, setConfirmNewPin] = useState<string>('');
  const [recoveryStep, setRecoveryStep] = useState<'verify' | 'new_pin'>('verify');
  const [recoveryError, setRecoveryError] = useState<string>('');
  const [recoverySuccess, setRecoverySuccess] = useState<boolean>(false);

  const config: PinSecurityConfig = storage.getPinConfig();

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMsg('');
      if (nextPin.length === 4) {
        verifyEnteredPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const verifyEnteredPin = async (enteredPin: string) => {
    try {
      const enteredHash = await hashString(enteredPin);
      if (enteredHash === config.pinHash) {
        storage.setAppLocked(false);
        onUnlocked();
      } else {
        setShake(true);
        setErrorMsg('Incorrect PIN. Please try again.');
        setTimeout(() => {
          setPin('');
          setShake(false);
        }, 500);
      }
    } catch {
      setErrorMsg('Error verifying PIN');
      setPin('');
    }
  };

  const handleOpenRecovery = () => {
    setShowRecoveryModal(true);
    setRecoveryStep('verify');
    setRecoveryInput('');
    setNewPin('');
    setConfirmNewPin('');
    setRecoveryError('');
    setRecoverySuccess(false);
  };

  const handleVerifyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (!recoveryInput.trim()) {
      setRecoveryError('Please enter your answer or recovery key');
      return;
    }

    try {
      if (recoveryMode === 'question') {
        const inputHash = await hashString(recoveryInput);
        if (inputHash === config.securityAnswerHash) {
          setRecoveryStep('new_pin');
        } else {
          setRecoveryError('Incorrect answer to security question.');
        }
      } else {
        // Recovery Key
        const cleanInput = recoveryInput.trim().toUpperCase();
        const cleanKey = (config.recoveryKey || '').trim().toUpperCase();
        if (cleanInput === cleanKey) {
          setRecoveryStep('new_pin');
        } else {
          setRecoveryError('Invalid Master Recovery Key.');
        }
      }
    } catch {
      setRecoveryError('Verification failed. Try again.');
    }
  };

  const handleSaveRecoveredPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setRecoveryError('Please enter a valid 4-digit PIN');
      return;
    }
    if (newPin !== confirmNewPin) {
      setRecoveryError('PINs do not match');
      return;
    }

    try {
      const pinHash = await hashString(newPin);
      storage.savePinConfig({
        ...config,
        pinHash,
        lastUnlockedAt: Date.now(),
      });
      storage.setAppLocked(false);
      setRecoverySuccess(true);
      setTimeout(() => {
        setShowRecoveryModal(false);
        onUnlocked();
      }, 1200);
    } catch {
      setRecoveryError('Failed to save new PIN.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F7F8F7] dark:bg-[#121412] text-[#1A1C1A] dark:text-[#E3E5E1] flex flex-col justify-between items-center py-10 px-6 select-none animate-in fade-in duration-200">
      {/* Top Header & Logo */}
      <div className="text-center space-y-3 pt-6">
        <div className="w-16 h-16 rounded-2xl bg-[#D8F3E7] dark:bg-[#214C3D] border border-[#176B52]/20 dark:border-[#82D9B4]/30 mx-auto flex items-center justify-center text-[#176B52] dark:text-[#82D9B4] shadow-xs">
          <span className="text-3xl font-black tracking-tight">M</span>
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1C1A] dark:text-[#E3E5E1]">
            MOKU Ledger Lock
          </h2>
          <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0] mt-1">
            Enter 4-digit PIN to access your accounts
          </p>
        </div>
      </div>

      {/* Passcode Indicator Dots */}
      <div className="space-y-4 text-center">
        <div className={`flex items-center justify-center space-x-4 ${shake ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-[#176B52] dark:bg-[#82D9B4] scale-115 shadow-2xs'
                    : 'border-2 border-[#DDE2DD] dark:border-[#414842] bg-white dark:bg-[#1B1E1B]'
                }`}
              />
            );
          })}
        </div>

        {errorMsg ? (
          <p className="text-xs font-semibold text-[#BA1A1A] dark:text-[#FF897D] h-4">
            {errorMsg}
          </p>
        ) : (
          <div className="h-4" />
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="w-full max-w-xs space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] text-xl font-bold text-[#1A1C1A] dark:text-[#E3E5E1] hover:bg-[#EEF1EE] dark:hover:bg-[#252925] active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              {digit}
            </button>
          ))}

          {/* Bottom Row */}
          <div className="flex items-center justify-center">
            {/* Auxiliary space */}
          </div>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-white dark:bg-[#1B1E1B] border border-[#DDE2DD] dark:border-[#414842] text-xl font-bold text-[#1A1C1A] dark:text-[#E3E5E1] hover:bg-[#EEF1EE] dark:hover:bg-[#252925] active:scale-95 transition-all cursor-pointer shadow-xs"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-[#EEF1EE] dark:bg-[#252925] border border-[#DDE2DD] dark:border-[#414842] flex items-center justify-center text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-white active:scale-95 transition-all cursor-pointer shadow-xs"
            title="Delete digit"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Forgot PIN Recovery Trigger */}
        <div className="text-center pt-3">
          <button
            type="button"
            onClick={handleOpenRecovery}
            className="text-xs font-semibold text-[#176B52] dark:text-[#82D9B4] hover:underline cursor-pointer inline-flex items-center space-x-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Forgot PIN? Recover Access</span>
          </button>
        </div>
      </div>

      {/* Forgot PIN Recovery Pipeline Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B1E1B] text-[#1A1C1A] dark:text-[#E3E5E1] rounded-[28px] border border-[#DDE2DD] dark:border-[#414842] max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setShowRecoveryModal(false)}
              className="absolute top-5 right-5 p-2 text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-white rounded-xl hover:bg-[#EEF1EE] dark:hover:bg-[#252925] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1.5 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-[#D8F3E7] dark:bg-[#214C3D] border border-[#176B52]/20 dark:border-[#82D9B4]/30 mx-auto flex items-center justify-center text-[#176B52] dark:text-[#82D9B4]">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                PIN Recovery Pipeline
              </h3>
              <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0]">
                Verify your identity to reset your PIN without losing any financial entries.
              </p>
            </div>

            {recoveryError && (
              <div className="p-3.5 rounded-2xl bg-[#FCE8E6] dark:bg-[#3D1E1E] border border-[#BA1A1A]/30 text-xs text-[#BA1A1A] dark:text-[#FF897D]">
                {recoveryError}
              </div>
            )}

            {recoverySuccess && (
              <div className="p-3.5 rounded-2xl bg-[#D8F3E7] dark:bg-[#214C3D] border border-[#176B52]/30 text-xs text-[#176B52] dark:text-[#82D9B4] flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>PIN reset successfully! Unlocking ledger...</span>
              </div>
            )}

            {recoveryStep === 'verify' && !recoverySuccess && (
              <form onSubmit={handleVerifyRecovery} className="space-y-4">
                {/* Method Switcher */}
                <div className="grid grid-cols-2 gap-1.5 bg-[#EEF1EE] dark:bg-[#252925] p-1.5 rounded-xl border border-[#DDE2DD] dark:border-[#414842]">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMode('question');
                      setRecoveryError('');
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      recoveryMode === 'question'
                        ? 'bg-white dark:bg-[#1B1E1B] text-[#1A1C1A] dark:text-[#E3E5E1] shadow-2xs'
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
                    className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      recoveryMode === 'key'
                        ? 'bg-white dark:bg-[#1B1E1B] text-[#1A1C1A] dark:text-[#E3E5E1] shadow-2xs'
                        : 'text-[#6E736F] dark:text-[#C1C7C0]'
                    }`}
                  >
                    Recovery Key
                  </button>
                </div>

                {recoveryMode === 'question' ? (
                  <div>
                    <label className="block text-xs font-bold text-[#6E736F] dark:text-[#C1C7C0] mb-1.5 uppercase tracking-wider">
                      {config.securityQuestion || 'What was the name of your first school?'}
                    </label>
                    <input
                      type="text"
                      value={recoveryInput}
                      onChange={(e) => setRecoveryInput(e.target.value)}
                      placeholder="Enter your security answer"
                      className="w-full p-3 text-xs rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none focus:border-[#176B52]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-[#6E736F] dark:text-[#C1C7C0] mb-1.5 uppercase tracking-wider">
                      Enter Master Recovery Key
                    </label>
                    <input
                      type="text"
                      value={recoveryInput}
                      onChange={(e) => setRecoveryInput(e.target.value)}
                      placeholder="e.g. MOKU-XXXX-XXXX"
                      className="w-full p-3 text-xs font-mono uppercase tracking-wider rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none focus:border-[#176B52]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] font-bold text-xs shadow-xs cursor-pointer transition-colors"
                >
                  Verify & Proceed →
                </button>
              </form>
            )}

            {recoveryStep === 'new_pin' && !recoverySuccess && (
              <form onSubmit={handleSaveRecoveredPin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6E736F] dark:text-[#C1C7C0] mb-1.5 uppercase tracking-wider">
                    Enter New 4-Digit PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full text-center text-xl font-mono py-3 rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none focus:border-[#176B52]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6E736F] dark:text-[#C1C7C0] mb-1.5 uppercase tracking-wider">
                    Confirm New 4-Digit PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full text-center text-xl font-mono py-3 rounded-xl border border-[#DDE2DD] dark:border-[#414842] bg-[#F7F8F7] dark:bg-[#252925] text-[#1A1C1A] dark:text-[#E3E5E1] outline-none focus:border-[#176B52]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={newPin.length !== 4 || confirmNewPin.length !== 4}
                  className="w-full py-3.5 rounded-xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] font-bold text-xs shadow-xs cursor-pointer disabled:opacity-40 transition-colors"
                >
                  Set New PIN & Unlock Ledger
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
