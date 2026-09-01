import React, { useState } from 'react';
import { UserProfile } from '../types';
import { signInWithGoogle, continueLocally, signOut } from '../lib/firebase';
import { getT } from '../lib/i18n';
import { X, ShieldCheck, HardDrive, LogOut } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserChanged: (user: UserProfile) => void;
  currency?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserChanged,
  currency = 'INR',
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const t = getT(currency);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#23211D]/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#EDE8DA] rounded-lg border border-[#565248]/30 max-w-md w-full p-6 shadow-xl relative bg-ruled-paper">
        {/* Close Button */}
        <button
          id="close-auth-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-[#565248] hover:text-[#23211D] hover:bg-[#E5DFCE] rounded-md transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-full border-2 border-[#A8342A] mx-auto flex items-center justify-center bg-[#E5DFCE] text-[#A8342A]">
            <span className="font-serif text-xl font-bold">M</span>
          </div>
          <h3 className="font-serif text-xl font-bold text-[#23211D]">
            {t.authTitle}
          </h3>
          <p className="text-xs text-[#565248] leading-relaxed">
            {t.authSub}
          </p>
        </div>

        {/* Current status */}
        <div className="bg-[#E5DFCE]/80 rounded-md border border-[#565248]/20 p-3 mb-6 text-xs flex items-center justify-between">
          <div>
            <span className="text-[#565248] block">Current Storage Mode:</span>
            <strong className="text-[#23211D] font-serif font-bold text-sm">
              {user.isAnonymous 
                ? 'Local Device (Offline-First)'
                : user.displayName || user.email}
            </strong>
          </div>
          <span className="px-2 py-0.5 rounded-xs bg-[#5C6E4E]/15 text-[#5C6E4E] font-medium border border-[#5C6E4E]/30">
            Active
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {user.isAnonymous ? (
            <>
              {/* Google Sign In button */}
              <button
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-3 bg-[#23211D] hover:bg-[#35415C] text-[#EDE8DA] font-serif font-bold py-3 px-4 rounded-md transition-colors shadow-xs cursor-pointer text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                onClick={handleContinueLocally}
                className="w-full flex items-center justify-center space-x-2 bg-[#EDE8DA] hover:bg-[#DFD8C5] border border-[#565248]/30 text-[#23211D] font-medium py-2.5 px-4 rounded-md transition-colors cursor-pointer text-xs"
              >
                <HardDrive className="w-4 h-4 text-[#565248]" />
                <span>Continue on this device only (Local)</span>
              </button>
            </>
          ) : (
            <button
              id="signout-btn"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-[#E5DFCE] hover:bg-[#DFD8C5] border border-[#565248]/30 text-[#A8342A] font-serif font-bold py-2.5 px-4 rounded-md transition-colors cursor-pointer text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out / Switch to Local Device</span>
            </button>
          )}
        </div>

        {/* Footer note */}
        <div className="mt-6 pt-4 border-t border-[#565248]/15 text-[11px] text-[#565248] text-center space-y-1">
          <p className="flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5C6E4E]" />
            <span>Private & Offline-ready by default</span>
          </p>
          <p>No tracking or bank credentials required.</p>
        </div>
      </div>
    </div>
  );
};
