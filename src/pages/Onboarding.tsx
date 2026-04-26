import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import Logo from '../components/Logo';

const SLIDES = [
  {
    id: 1,
    title: 'The Gold Standard of Trade.',
    description:
      'Access a curated network of verified suppliers and premium buyers across the region.',
    image:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800&h=1200',
  },
  {
    id: 2,
    title: 'Efficient Procurement.',
    description: 'Streamline your sourcing process with direct messaging and real-time quotations.',
    image:
      'https://images.unsplash.com/photo-1556740734-7f95834d0ff9?auto=format&fit=crop&q=80&w=800&h=1200',
  },
  {
    id: 3,
    title: 'Verified & Secure.',
    description:
      'Trade with confidence knowing every business on TONSE undergoes rigorous verification.',
    image:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800&h=1200',
  },
];

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

const transition = {
  duration: 0.4,
  ease: [0.32, 0.72, 0, 1] as const, // Use as const for tuple type
};

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[Onboarding] Mounted');
  }, []);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('tonse_onboarded', 'true');
        navigate('/login', { replace: true });
      }
    } catch (e) {
      console.error('Failed to set onboarding flag', e);
      navigate('/login', { replace: true });
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 20;
    const velocityThreshold = 200;

    if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold) {
      if (info.offset.x > 0) {
        handleBack();
      } else {
        handleNext();
      }
    }
  };

  return (
    <div className="min-h-dvh bg-brand-white flex flex-col lg:hidden overflow-hidden relative">
      {/* Drag Container (z-50) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="absolute inset-0 z-50 cursor-grab active:cursor-grabbing"
      />

      {/* Top Half: Image Slider (z-10) */}
      <div className="relative h-[60vh] w-full overflow-hidden bg-brand-dark z-10">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="absolute inset-0 will-change-transform"
          >
            {/* Gradient Overlay (z-20) */}
            <div className="absolute inset-0 bg-linear-to-b from-brand-dark/80 via-transparent to-brand-white z-20"></div>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-60"
              style={{ backgroundImage: `url('${SLIDES[currentSlide].image}')` }}
            ></div>
          </motion.div>
        </AnimatePresence>

        {/* Top Header (z-60) */}
        <div className="absolute top-0 left-0 right-0 z-60 p-6 flex items-center justify-center">
          <Logo variant="light" className="text-2xl" />
          <button
            onClick={handleFinish}
            className="absolute right-6 text-white/80 text-sm font-bold uppercase tracking-widest hover:text-white transition-colors"
          >
            Skip
          </button>
        </div>
      </div>

      {/* Bottom Half: Content & Controls (z-30) */}
      <div className="flex-1 bg-[#fdfaf6] rounded-t-[40px] -mt-12 relative z-30 flex flex-col p-10 shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.15)] min-h-[40vh]">
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={currentSlide}
              custom={direction}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={transition}
              className="space-y-6"
            >
              <h1 className="text-[36px] font-serif font-black text-brand-dark leading-[1.1] tracking-tight">
                {SLIDES[currentSlide].title}
              </h1>
              <p className="text-[#1a1612]/50 text-base leading-relaxed max-w-70 mx-auto">
                {SLIDES[currentSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls (z-40) */}
        <div className="mt-auto pt-8 pb-12 flex flex-col items-center gap-8">
          {/* Progress Dots */}
          <div className="flex gap-2.5 justify-center items-center">
            {SLIDES.map((_, idx) => (
              <motion.div
                key={idx}
                initial={false}
                animate={{
                  width: idx === currentSlide ? 32 : 8,
                  backgroundColor: idx === currentSlide ? '#1e293b' : '#e2e8f0',
                  opacity: idx === currentSlide ? 1 : 0.5,
                }}
                className="h-2 rounded-full"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            ))}
          </div>

          {/* Swipe Hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]"
          >
            {currentSlide === SLIDES.length - 1 ? 'Swipe to finish' : 'Swipe to continue'}
          </motion.p>
        </div>
      </div>
    </div>
  );
}
