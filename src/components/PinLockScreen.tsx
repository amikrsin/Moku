import React, { useState } from 'react';
import { 
  Lock, 
  Delete, 
  KeyRound, 
  HelpCircle, 
  CheckCircle2, 
  X
} from 'lucide-react';
import { PinSecurityConfig } from '../types';
import { hashString, generateSalt } from '../lib/security';
import { storage } from '../lib/storage';
import { AppButton } from './ui/AppButton';

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
      const enteredHashWithSalt = await hashString(enteredPin, config.pinSalt);
      const enteredHashWithoutSalt = config.pinSalt ? await hashString(enteredPin) : enteredHashWithSalt;
      if (enteredHashWithSalt === config.pinHash || enteredHashWithoutSalt === config.pinHash) {
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
      const pinSalt = generateSalt();
      const pinHash = await hashString(newPin, pinSalt);
      storage.savePinConfig({
        ...config,
        pinHash,
        pinSalt,
        lastUnlockedAt: Date.now(),
      });
      storage.setAppLocked(false);
      setRecoverySuccess(true);
      setTimeout(() => {
        setShowRecoveryModal(false);
        onUnlocked();
      }, 1200);
    } catch {
      setRecoveryError('Failed to update PIN.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-[var(--moku-background)] text-[var(--moku-text-primary)] select-none">
      {/* Top Header */}
      <div className="w-full max-w-xs flex flex-col items-center text-center pt-8">
        <div className="w-16 h-16 rounded-2xl bg-[var(--moku-primary-container)] border border-[var(--moku-primary)]/20 text-[var(--moku-primary)] flex items-center justify-center shadow-xs mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[var(--moku-text-primary)]">
          Enter MOKU PIN
        </h1>
        <p className="text-xs text-[var(--moku-text-secondary)] mt-1">
          Your financial ledger is locked for privacy
        </p>

        {/* PIN Indicators */}
        <div className={`flex items-center space-x-4 my-8 ${shake ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-[var(--moku-primary)] scale-110 shadow-xs'
                    : 'bg-[var(--moku-surface-secondary)] border-2 border-[var(--moku-outline)]'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <p className="text-xs font-semibold text-[var(--moku-danger)] animate-in fade-in">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Number Pad Grid */}
      <div className="w-full max-w-xs grid grid-cols-3 gap-3.5 my-auto pb-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyPress(num)}
            className="h-16 rounded-2xl bg-[var(--moku-surface)] border border-[var(--moku-outline)] text-2xl font-bold font-tabular text-[var(--moku-text-primary)] hover:bg-[var(--moku-surface-secondary)] active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            {num}
          </button>
        ))}

        {/* Forgot PIN / Recovery Button */}
        <button
          type="button"
          onClick={handleOpenRecovery}
          className="h-16 rounded-2xl text-[11px] font-bold text-[var(--moku-text-secondary)] hover:text-[var(--moku-primary)] flex flex-col items-center justify-center cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 mb-0.5" />
          <span>Forgot?</span>
        </button>

        {/* 0 */}
        <button
          type="button"
          onClick={() => handleKeyPress('0')}
          className="h-16 rounded-2xl bg-[var(--moku-surface)] border border-[var(--moku-outline)] text-2xl font-bold font-tabular text-[var(--moku-text-primary)] hover:bg-[var(--moku-surface-secondary)] active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          0
        </button>

        {/* Backspace / Delete */}
        <button
          type="button"
          onClick={handleDelete}
          className="h-16 rounded-2xl text-[var(--moku-text-secondary)] hover:text-[var(--moku-text-primary)] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          aria-label="Delete last digit"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      {/* Recovery Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[var(--moku-surface)] text-[var(--moku-text-primary)] border border-[var(--moku-outline)] rounded-[26px] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <KeyRound className="w-5 h-5 text-[var(--moku-primary)]" />
                <h3 className="text-base font-bold text-[var(--moku-text-primary)]">
                  PIN Recovery
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRecoveryModal(false)}
                className="p-1 rounded-full text-[var(--moku-text-secondary)] hover:bg-[var(--moku-surface-secondary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recoveryStep === 'verify' ? (
              <form onSubmit={handleVerifyRecovery} className="space-y-4">
                <div className="flex space-x-2 border-b border-[var(--moku-outline)] pb-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setRecoveryMode('question')}
                    className={`pb-1 ${recoveryMode === 'question' ? 'text-[var(--moku-primary)] border-b-2 border-[var(--moku-primary)]' : 'text-[var(--moku-text-secondary)]'}`}
                  >
                    Security Question
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecoveryMode('key')}
                    className={`pb-1 ${recoveryMode === 'key' ? 'text-[var(--moku-primary)] border-b-2 border-[var(--moku-primary)]' : 'text-[var(--moku-text-secondary)]'}`}
                  >
                    Master Recovery Key
                  </button>
                </div>

                {recoveryMode === 'question' ? (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--moku-text-secondary)] mb-1">
                      {config.securityQuestion || 'What was the name of your first elementary school?'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Your secret answer..."
                      value={recoveryInput}
                      onChange={(e) => setRecoveryInput(e.target.value)}
                      className="w-full bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] rounded-xl px-3 py-2 text-xs text-[var(--moku-text-primary)] outline-none focus:border-[var(--moku-primary)]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--moku-text-secondary)] mb-1">
                      Enter 12-character Master Recovery Key
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MOKU-XXXX-XXXX"
                      value={recoveryInput}
                      onChange={(e) => setRecoveryInput(e.target.value)}
                      className="w-full bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] rounded-xl px-3 py-2 text-xs text-[var(--moku-text-primary)] outline-none font-mono focus:border-[var(--moku-primary)]"
                    />
                  </div>
                )}

                {recoveryError && (
                  <p className="text-xs font-semibold text-[var(--moku-danger)]">{recoveryError}</p>
                )}

                <AppButton type="submit" fullWidth size="md">
                  Verify &amp; Set New PIN
                </AppButton>
              </form>
            ) : (
              <form onSubmit={handleSaveRecoveredPin} className="space-y-4">
                <p className="text-xs text-[var(--moku-text-secondary)]">
                  Verification successful. Please create a new 4-digit PIN for your ledger.
                </p>

                <div className="space-y-2">
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    required
                    placeholder="Enter new 4-digit PIN"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] rounded-xl px-3 py-2 text-center text-lg font-bold font-tabular tracking-widest outline-none"
                  />
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    required
                    placeholder="Confirm new PIN"
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value)}
                    className="w-full bg-[var(--moku-surface-secondary)] border border-[var(--moku-outline)] rounded-xl px-3 py-2 text-center text-lg font-bold font-tabular tracking-widest outline-none"
                  />
                </div>

                {recoveryError && (
                  <p className="text-xs font-semibold text-[var(--moku-danger)]">{recoveryError}</p>
                )}
                {recoverySuccess && (
                  <p className="text-xs font-semibold text-[var(--moku-primary)] flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PIN updated! Unlocking...</span>
                  </p>
                )}

                <AppButton type="submit" fullWidth size="md">
                  Save &amp; Unlock
                </AppButton>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
