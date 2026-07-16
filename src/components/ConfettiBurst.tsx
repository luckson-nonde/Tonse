import React, { useEffect, useState } from 'react';

/**
 * Gold confetti rain — extracted from InquirySuccess so celebratory moments
 * (inquiry sent, promoter milestone unlocked) share one implementation.
 * Pure CSS animation, no dependencies; pieces regenerate whenever `active`
 * flips back on.
 */
export default function ConfettiBurst({
  active = true,
  count = 30,
}: {
  active?: boolean;
  count?: number;
}) {
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number }>>([]);

  useEffect(() => {
    if (!active) {
      setConfetti([]);
      return;
    }
    setConfetti(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
      })),
    );
  }, [active, count]);

  if (!active) return null;

  return (
    <>
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
    </>
  );
}
