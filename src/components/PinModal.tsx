import React, { useState, useEffect } from 'react';
import { X, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import Button from './Button';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PinModal({ isOpen, onClose, onSuccess }: PinModalProps) {
  const { user, updateUser } = useAuth();
  const [pin, setPin] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  // Two-step PIN creation. While 'enter', the dots collect the first
  // entry. After 4 digits + Confirm, we move to 'confirm' (the user
  // re-enters to verify) and only then write the PIN to the backend.
  // Verifying mode (existing PIN) skips both — a single entry compared
  // against user.pin is enough since they already chose it.
  const [creationStep, setCreationStep] = useState<'enter' | 'confirm'>('enter');
  const [firstEntry, setFirstEntry] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setFirstEntry('');
      setCreationStep('enter');
      setError('');
      setIsCreating(!user?.pin);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleNumberClick = (num: number) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleConfirm = async () => {
    if (pin.length !== 4) return;

    setIsSubmitting(true);
    try {
      if (isCreating) {
        if (creationStep === 'enter') {
          // Stash the first entry and ask the user to re-enter, so a
          // typo doesn't silently lock them out of their account.
          setFirstEntry(pin);
          setCreationStep('confirm');
          setPin('');
          setError('');
        } else {
          if (pin === firstEntry) {
            await updateUser({ pin });
            // Reset confirm state so re-opening the modal starts clean.
            setFirstEntry('');
            setCreationStep('enter');
            onSuccess();
          } else {
            setError("PINs don't match. Try again.");
            setPin('');
            setFirstEntry('');
            setCreationStep('enter');
          }
        }
      } else {
        if (pin === user?.pin) {
          onSuccess();
        } else {
          setError('Incorrect PIN. Please try again.');
          setPin('');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="p-8 overflow-y-auto flex-1 scrollbar-hide">
          <h3 className="text-2xl font-black text-slate-900 mb-2">
            {isCreating
              ? creationStep === 'enter'
                ? 'Create PIN'
                : 'Confirm PIN'
              : 'Enter PIN'}
          </h3>
          <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed px-4">
            {isCreating
              ? creationStep === 'enter'
                ? 'Set a 4-digit PIN to secure your financial account.'
                : 'Re-enter your PIN to confirm — this prevents a typo locking you out.'
              : 'Please enter your 4-digit PIN to access your financial account.'}
          </p>

          <div className="flex justify-center gap-3 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={`pin-dot-${i}`}
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
                  pin.length > i
                    ? 'border-[#d49b35] bg-[#fdf6e9] text-[#d49b35]'
                    : 'border-slate-100 bg-slate-50 text-slate-300'
                }`}
              >
                {pin[i] ? '•' : ''}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-rose-500 text-xs font-bold mb-4 uppercase tracking-wider">{error}</p>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'delete'].map((val, i) => (
              <button
                key={val === '' ? `empty-${i}` : val}
                onClick={() => {
                  if (typeof val === 'number') handleNumberClick(val);
                  if (val === 'delete') handleDelete();
                }}
                className={`h-14 rounded-2xl flex items-center justify-center text-xl font-bold transition-all ${
                  val === ''
                    ? 'invisible'
                    : 'bg-slate-50 text-slate-900 hover:bg-slate-100 active:scale-95'
                }`}
              >
                {val === 'delete' ? '⌫' : val}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 pt-0 space-y-3 shrink-0">
          <Button
            onClick={handleConfirm}
            disabled={pin.length !== 4 || isSubmitting}
            className="w-full py-4 rounded-2xl font-bold text-lg shadow-lg shadow-[#d49b35]/20"
          >
            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Confirm'}
          </Button>

          <button
            onClick={onClose}
            className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
