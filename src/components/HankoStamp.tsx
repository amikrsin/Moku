import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface HankoStampProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  onAnimationComplete?: () => void;
  className?: string;
}

/**
 * Traditional Red Seal Stamp Component
 * The signature deliberate flourish of Kakeibo Ledger
 */
export const HankoStamp: React.FC<HankoStampProps> = ({
  text = 'PAID',
  size = 'md',
  animate = true,
  onAnimationComplete,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  const sizeMap = {
    sm: { box: 'w-7 h-7', text: 'text-[10px]', border: 'border-[1.5px]' },
    md: { box: 'w-11 h-11', text: 'text-sm font-semibold', border: 'border-2' },
    lg: { box: 'w-16 h-16', text: 'text-xl font-bold', border: 'border-[2.5px]' },
    xl: { box: 'w-24 h-24', text: 'text-2xl font-bold', border: 'border-[3px]' },
  };

  const currentSize = sizeMap[size];

  const stampVariants = {
    initial: shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, scale: 2.2, rotate: -15, y: -20 },
    animate: {
      opacity: 0.92,
      scale: 1,
      rotate: -3,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 450,
        damping: 22,
        mass: 0.8,
      },
    },
  };

  return (
    <motion.div
      initial={animate ? 'initial' : false}
      animate="animate"
      variants={stampVariants}
      onAnimationComplete={onAnimationComplete}
      className={`inline-flex items-center justify-center rounded-full border-[#A8342A] text-[#A8342A] select-none font-serif relative overflow-hidden pointer-events-none ${currentSize.box} ${currentSize.border} ${className}`}
      style={{
        boxShadow: '0 0 1px rgba(168, 52, 42, 0.4)',
      }}
    >
      {/* Inner dashed ring characteristic of traditional seals */}
      <div className="absolute inset-[2px] rounded-full border border-dashed border-[#A8342A]/40" />
      
      {/* Texture grain overlay */}
      <div 
        className="absolute inset-0 opacity-15 mix-blend-multiply pointer-events-none rounded-full" 
        style={{
          backgroundImage: 'radial-gradient(#A8342A 1px, transparent 1px)',
          backgroundSize: '3px 3px'
        }} 
      />

      <span className={`font-bold tracking-wider uppercase z-10 ${currentSize.text} leading-none drop-shadow-[0_0.5px_0_rgba(168,52,42,0.5)]`}>
        {text}
      </span>
    </motion.div>
  );
};
