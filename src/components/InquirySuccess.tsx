import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import successOwl from '../assets/images/empty-states/owl_triumphant.png';

interface InquirySuccessProps {
  onGoToDashboard: () => void;
}

export default function InquirySuccess({ onGoToDashboard }: InquirySuccessProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number }>>([]);

  useEffect(() => {
    // Generate confetti pieces
    const pieces = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
    }));
    setConfetti(pieces);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 relative overflow-hidden bg-gradient-to-b from-[#f8f7f3] to-[#faf9f6]">
      {/* Confetti Animation */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="fixed pointer-events-none animate-fall"
          style={{
            left: `${piece.left}%`,
            top: '-10px',
            animation: `fall ${2 + Math.random()}s linear ${piece.delay}s infinite`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: ['#C9973A', '#d49b35', '#E5B85C', '#F5C744'][
                Math.floor(Math.random() * 4)
              ],
            }}
          />
        </div>
      ))}

      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Celebratory Owl Image - With ample top space */}
      <div className="relative pt-12 pb-8 animate-bounce h-64 flex items-center justify-center">
        <div className="absolute inset-0 bg-[#C9973A]/20 rounded-full blur-3xl animate-pulse" />
        <img
          src={successOwl}
          alt="Celebration"
          className="relative w-40 h-40 sm:w-56 sm:h-56 object-contain drop-shadow-2xl"
        />
      </div>

      {/* Main Content Container */}
      <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-12">
        {/* Title and Description */}
        <div className="space-y-4">
          <h2 className="font-serif text-3xl sm:text-4xl font-black text-[#1a1a2e] leading-tight">
            Inquiry Sent Successfully!
          </h2>
          <p className="font-sans text-[#94a3b8] text-sm sm:text-base max-w-md mx-auto leading-relaxed font-medium">
            Your request has been delivered to the selected shops. You will be notified as soon as
            you receive quotations.{' '}
            <span className="block mt-2 text-[#1a1a2e] font-bold">
              Your Inquiry Reference{' '}
              <span className="text-[#C9973A] font-black text-lg">#INQ-8829</span>
            </span>
          </p>
        </div>

        {/* Dashboard Button */}
        <div className="pb-8 w-full flex justify-center">
          <button
            onClick={onGoToDashboard}
            className="w-full sm:w-auto px-10 sm:px-16 py-3.5 bg-[#C9973A] hover:bg-[#b8852f] rounded-full flex items-center justify-center gap-3 font-sans text-[15px] font-semibold text-white tracking-[0.02em] shadow-[0_4px_16px_rgba(201,151,58,0.35)] transition-all duration-300 active:scale-95 hover:shadow-[0_8px_24px_rgba(201,151,58,0.45)]"
          >
            Go to Dashboard <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
