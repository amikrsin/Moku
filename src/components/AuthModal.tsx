import React, { useState } from 'react';
import { UserProfile, PinSecurityConfig } from '../types';
import { signInWithGoogle, continueLocally, signOut } from '../lib/firebase';
import { 
  X, 
  ShieldCheck, 
  HardDrive, 
  LogOut, 
  RotateCcw, 
  Lock, 
  AlertTriangle,
  Check
} from 'lucide-react';
import { storage } from '../lib/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserChanged: (user: UserProfile) => void;
  onOpenPinSetup: () => void;
  currency?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserChanged,
  onOpenPinSetup,
  currency = 'INR',
}) => {
  const [loading, setLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  if (!isOpen) return null;

  const pinConfig = storage.getPinConfig();
  const isPinActive = pinConfig.isEnabled && !!pinConfig.pinHash;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const profile = await signInWithGoogle();
      if (profile) {
        onUserChanged(profile);
      }
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleContinueLocally = () => {
    const local = continueLocally();
    onUserChanged(local);
    onClose();
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      const guest: UserProfile = {
        uid: 'device-user',
        displayName: 'This Device Only',
        email: null,
        isAnonymous: true,
      };
      onUserChanged(guest);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleResetAllEntries = () => {
    storage.resetAllData(true);
    setResetSuccess(true);
    setTimeout(() => {
      setResetSuccess(false);
      setShowResetConfirm(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#1B1E1B] text-[#1A1C1A] dark:text-[#E3E5E1] rounded-[28px] border border-[#DDE2DD] dark:border-[#414842] max-w-md w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-auth-modal"
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#6E736F] dark:text-[#C1C7C0] hover:text-[#1A1C1A] dark:hover:text-white hover:bg-[#EEF1EE] dark:hover:bg-[#252925] rounded-xl transition-colors cursor-pointer"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-[#D8F3E7] dark:bg-[#214C3D] border border-[#176B52]/20 dark:border-[#82D9B4]/30 mx-auto flex items-center justify-center text-[#176B52] dark:text-[#82D9B4] shadow-xs">
            <span className="text-2xl font-black tracking-tight">M</span>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1C1A] dark:text-[#E3E5E1]">
              Account & Data Sync
            </h3>
            <p className="text-xs text-[#6E736F] dark:text-[#C1C7C0] mt-1 max-w-xs mx-auto leading-relaxed">
              MOKU works completely offline. Sign in to seamlessly sync your records across devices.
            </p>
          </div>
        </div>

        {/* Current Storage Mode */}
        <div className="bg-[#F7F8F7] dark:bg-[#252925] rounded-2xl border border-[#DDE2DD] dark:border-[#414842] p-4 text-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E736F] dark:text-[#C1C7C0] block">
              Current Storage Mode
            </span>
            <strong className="text-sm font-bold text-[#1A1C1A] dark:text-[#E3E5E1] block">
              {user.isAnonymous 
                ? 'Local Device (Offline-First)'
                : user.displayName || user.email}
            </strong>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#D8F3E7] dark:bg-[#214C3D] text-[#176B52] dark:text-[#82D9B4] font-bold text-xs border border-[#176B52]/20 dark:border-[#82D9B4]/30 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#176B52] dark:bg-[#82D9B4] animate-pulse" />
            <span>Active</span>
          </span>
        </div>

        {/* Actions Container */}
        <div className="space-y-3">
          {user.isAnonymous ? (
            <>
              {/* Google Sign In button */}
              <button
                id="google-signin-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-3 bg-[#1A1C1A] hover:bg-[#2C302D] dark:bg-white dark:hover:bg-[#E3E5E1] text-white dark:text-[#121412] font-bold py-3.5 px-4 rounded-xl transition-all shadow-xs cursor-pointer text-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>

              {/* Continue locally option */}
              <button
                id="continue-locally-btn"
                type="button"
                onClick={handleContinueLocally}
                className="w-full flex items-center justify-center space-x-2 bg-[#EEF1EE] hover:bg-[#E3E7E3] dark:bg-[#252925] dark:hover:bg-[#343B35] border border-[#DDE2DD] dark:border-[#414842] text-[#1A1C1A] dark:text-[#E3E5E1] font-semibold py-3 px-4 rounded-xl transition-colors cursor-pointer text-xs"
              >
                <HardDrive className="w-4 h-4 text-[#6E736F] dark:text-[#C1C7C0]" />
                <span>Continue on this device only (Local)</span>
              </button>
            </>
          ) : (
            <button
              id="signout-btn"
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-[#EEF1EE] dark:bg-[#252925] hover:bg-[#E3E7E3] border border-[#DDE2DD] dark:border-[#414842] text-[#BA1A1A] dark:text-[#FF897D] font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out / Switch to Local Device</span>
            </button>
          )}

          {/* PIN Lock Authorization Setting */}
          <div className="p-3.5 rounded-2xl bg-[#F7F8F7] dark:bg-[#252925] border border-[#DDE2DD] dark:border-[#414842] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#D8F3E7] dark:bg-[#214C3D] flex items-center justify-center text-[#176B52] dark:text-[#82D9B4]">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#1A1C1A] dark:text-[#E3E5E1]">
                  PIN Authorization
                </div>
                <div className="text-[11px] text-[#6E736F] dark:text-[#C1C7C0]">
                  {isPinActive ? 'Protected with 4-digit PIN' : 'Not configured (open access)'}
                </div>
              </div>
            </div>

            <button
              id="open-pin-setup-from-auth-btn"
              type="button"
              onClick={() => {
                onClose();
                onOpenPinSetup();
              }}
              className="px-3.5 py-2 rounded-xl bg-[#176B52] hover:bg-[#125843] dark:bg-[#82D9B4] dark:hover:bg-[#6ec29e] text-white dark:text-[#121412] text-xs font-bold cursor-pointer transition-colors shadow-2xs"
            >
              {isPinActive ? 'Manage' : 'Set PIN'}
            </button>
          </div>

          {/* Reset All Entries for New User */}
          <div>
            {!showResetConfirm ? (
              <button
                id="trigger-reset-all-btn"
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border border-[#BA1A1A]/30 text-[#BA1A1A] dark:text-[#FF897D] hover:bg-[#BA1A1A]/10 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Entries (Start Clean Slate)</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#FCE8E6] dark:bg-[#3D1E1E] border border-[#BA1A1A]/30 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-start space-x-2 text-xs text-[#BA1A1A] dark:text-[#FF897D]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="font-semibold leading-tight">
                    Reset all entries, clear demo transactions & start with fresh clean ledger?
                  </p>
                </div>
                {resetSuccess ? (
                  <div className="text-xs font-bold text-[#176B52] dark:text-[#82D9B4] flex items-center space-x-1.5 py-1">
                    <Check className="w-4 h-4" />
                    <span>All entries reset to clean slate!</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      id="confirm-reset-all-btn"
                      type="button"
                      onClick={handleResetAllEntries}
                      className="flex-1 py-2 rounded-xl bg-[#BA1A1A] hover:bg-[#9e1414] text-white text-xs font-bold cursor-pointer transition-colors"
                    >
                      Yes, Reset Everything
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#252925] border border-[#DDE2DD] dark:border-[#414842] text-xs font-semibold text-[#6E736F] dark:text-[#C1C7C0] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <div className="pt-2 border-t border-[#DDE2DD] dark:border-[#414842] text-xs text-[#6E736F] dark:text-[#C1C7C0] text-center space-y-0.5">
          <p className="flex items-center justify-center space-x-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-[#176B52] dark:text-[#82D9B4]" />
            <span>Private & Offline-ready by default</span>
          </p>
          <p className="text-[11px]">No tracking or bank credentials required.</p>
        </div>
      </div>
    </div>
  );
};

