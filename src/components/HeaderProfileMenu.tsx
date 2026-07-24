import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User, Settings, ArrowLeftRight, Store } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useLandingPageEnabled } from '../hooks/useLandingPageEnabled';

interface HeaderProfileMenuProps {
  onSettingsClick: () => void;
  onRoleManagerClick: () => void;
  /** Only company accounts (see Role Manager) get this item — hidden
   * entirely rather than shown-disabled for everyone else. */
  showRoleManager: boolean;
}

/**
 * Header "Profile" button + dropdown — sibling to the notification Bell.
 * Follows this codebase's hand-rolled dropdown idiom (mousedown +
 * ref.contains() click-outside, no portal/no new dependency — see
 * CustomDropdown.tsx).
 */
export default function HeaderProfileMenu({
  onSettingsClick,
  onRoleManagerClick,
  showRoleManager,
}: HeaderProfileMenuProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enabled: discoverEnabled } = useLandingPageEnabled();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-10 h-10 bg-transparent flex items-center justify-center text-brand-dark hover:bg-slate-50 transition-colors rounded-full border border-[#f1f5f9]"
        aria-label="Profile menu"
      >
        <User className="w-4.5 h-4.5 stroke-[1.8]" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-[#f1f5f9] overflow-hidden z-200"
          >
            <div className="px-4 py-3 border-b border-[#f1f5f9]">
              <p className="text-sm font-bold text-brand-dark truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                onSettingsClick();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>

            {discoverEnabled && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/discover');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Store className="w-4 h-4" />
                Browse Shops
              </button>
            )}

            {showRoleManager && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onRoleManagerClick();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Role Manager
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
