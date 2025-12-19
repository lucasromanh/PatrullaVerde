
import React from 'react';

interface DiceProps {
  value: number | null;
  isRolling: boolean;
  onRoll: () => void;
  disabled: boolean;
}

const Dice: React.FC<DiceProps> = ({ value, isRolling, onRoll, disabled }) => {
  return (
    <div className="flex flex-col items-center gap-3">
        <button 
          onClick={onRoll}
          disabled={disabled || isRolling}
          className={`
            relative w-20 h-20 sm:w-24 sm:h-24 glass-panel rounded-[35px] shadow-[0_15px_35px_rgba(0,0,0,0.3)] flex items-center justify-center
            transform transition-all active:scale-90
            ${disabled ? 'opacity-20 cursor-not-allowed grayscale' : 'hover:scale-110 active:scale-90 cursor-pointer'}
            ${isRolling ? 'animate-pulse bg-white/40' : 'bg-white/10'}
            border-2 border-white/60
          `}
        >
          <div className={`text-5xl sm:text-6xl transition-all duration-500 ${isRolling ? 'animate-spin opacity-40' : 'opacity-100'}`}>
            {isRolling ? '🌀' : '🎲'}
          </div>
          
          {!isRolling && !value && !disabled && (
            <div className="absolute inset-0 rounded-[35px] border-4 border-yellow-400 animate-ping opacity-30 pointer-events-none" />
          )}
        </button>
        <div className="text-[11px] font-black text-white uppercase opacity-80 tracking-[0.3em] bg-black/30 px-5 py-1.5 rounded-full backdrop-blur-md border border-white/10">
            {isRolling ? 'Lanzando...' : 'Lanzar'}
        </div>
    </div>
  );
};

export default Dice;
