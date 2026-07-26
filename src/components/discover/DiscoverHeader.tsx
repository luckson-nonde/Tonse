import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, X } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { getHomePathForRole } from '../../utils/roleHome';
import Logo from '../Logo';

/**
 * Shared sticky header for the public /discover browse + shop-profile pages.
 * Auth-aware: a guest sees Log in / Get started; a logged-in user sees a
 * "Dashboard" button back to their own dashboard instead — browsing here
 * never asks an already-authenticated visitor to log in again.
 *
 * Mobile search: below md the inline bar has no room next to logo + auth
 * buttons, so a toggle button expands a full-width input row under the bar
 * instead — without it, phones had NO search at all.
 */
export default function DiscoverHeader({
  search,
  onSearchChange,
  onBack,
}: {
  /** Present only on the browse page — omit to hide the search field. */
  search?: string;
  onSearchChange?: (value: string) => void;
  /** Present only on the shop-profile page (back to /discover). */
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#fffaf5]/90 backdrop-blur-md border-b border-[#e7e0d5]">
      <div className="px-5 sm:px-8 lg:px-12 py-3.5 flex items-center gap-3 sm:gap-6">
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white border border-[#e7e0d5] flex items-center justify-center text-[#1B3068] hover:border-[#c9973a] transition-colors shrink-0"
            aria-label="Back to Discover"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
        )}
        <Logo className="text-2xl shrink-0" />
        {onSearchChange && (
          <div className="hidden md:flex items-center gap-2 bg-white border border-[#e7e0d5] rounded-full px-3.5 py-2 flex-1 max-w-sm text-[#6b7280]">
            <Search className="w-4 h-4 shrink-0" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search shops, services…"
              className="bg-transparent outline-none text-sm w-full placeholder:text-[#9ca3af]"
            />
          </div>
        )}
        <div className="flex-1" />
        {onSearchChange && (
          <button
            onClick={() => setIsMobileSearchOpen((v) => !v)}
            className="md:hidden w-9 h-9 rounded-full bg-white border border-[#e7e0d5] flex items-center justify-center text-[#1B3068] hover:border-[#c9973a] transition-colors shrink-0"
            aria-label={isMobileSearchOpen ? 'Close search' : 'Search'}
          >
            {isMobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
        )}
        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm font-medium text-[#1B3068]">
              Welcome, {(user.name || '').split(' ')[0]}
            </span>
            <button
              onClick={() => navigate(getHomePathForRole(user))}
              className="rounded-full bg-[#1B3068] text-white font-semibold text-sm px-4 sm:px-5 py-2.5 hover:bg-[#142550] transition-colors shrink-0"
            >
              Dashboard
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="rounded-full border border-[#e7e0d5] text-[#1B3068] font-semibold text-sm px-4 sm:px-5 py-2.5 hover:border-[#1B3068] transition-colors shrink-0"
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/register')}
              className="rounded-full bg-[#c9973a] text-white font-semibold text-sm px-4 sm:px-5 py-2.5 hover:bg-[#a97c27] transition-colors shrink-0"
            >
              Get started
            </button>
          </div>
        )}
      </div>
      {onSearchChange && isMobileSearchOpen && (
        <div className="md:hidden px-5 pb-3">
          <div className="flex items-center gap-2 bg-white border border-[#e7e0d5] rounded-full px-3.5 py-2.5 text-[#6b7280]">
            <Search className="w-4 h-4 shrink-0" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search shops, services…"
              autoFocus
              className="bg-transparent outline-none text-sm w-full placeholder:text-[#9ca3af]"
            />
          </div>
        </div>
      )}
    </header>
  );
}
