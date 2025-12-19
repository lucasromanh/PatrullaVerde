
import React, { useState } from 'react';
import { GameCharacter } from '../types';

interface PlayerPawnProps {
  color: string;
  index: number;
  character?: GameCharacter;
}

const PlayerPawn: React.FC<PlayerPawnProps> = ({ color, index, character }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative w-24 h-28 flex flex-col items-center transition-all duration-300 ${isHovered ? 'z-[100]' : 'z-[50]'}`}
      style={{
        zIndex: (isHovered ? 100 : 50) + index,
        filter: isHovered
          ? 'drop-shadow(0 20px 20px rgba(0,0,0,0.6))'
          : 'drop-shadow(0 12px 12px rgba(0,0,0,0.4))'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Character Miniature Body */}
      <div
        className={`w-24 h-24 rounded-[2.5rem] border-[6px] border-white shadow-2xl flex items-center justify-center text-6xl bg-gradient-to-br from-white to-gray-200 mb-1 overflow-hidden relative group transition-transform duration-300
                ${isHovered ? '-translate-y-4 scale-110' : 'pawn-float'}
            `}
        style={{ borderColor: color }}
      >
        <span className={`transform transition-transform duration-500 w-full h-full flex items-center justify-center ${isHovered ? 'scale-125 rotate-6' : ''}`}>
          {character?.avatar && (character.avatar.toLowerCase().endsWith('.png') || character.avatar.startsWith('/')) ? (
            <img src={character.avatar} alt={character.name} className="w-full h-full object-contain p-1" />
          ) : (
            character?.avatar || '👤'
          )}
        </span>
        {!character?.avatar?.endsWith('.png') && <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 -skew-y-12 pointer-events-none"></div>
      </div>

      {/* Miniature Base */}
      <div
        className={`w-20 h-5 rounded-full shadow-inner border-t border-white/40 transition-transform duration-300 ${isHovered ? 'scale-90 opacity-60' : 'scale-100'}`}
        style={{ backgroundColor: color, boxShadow: 'inset 0 -3px 5px rgba(0,0,0,0.4)' }}
      />

      {/* Ground Shadow */}
      <div className={`absolute -bottom-4 w-22 h-6 bg-black/25 rounded-full blur-[4px] -z-10 transition-all duration-300 ${isHovered ? 'scale-125 blur-[8px] opacity-20' : 'scale-100'}`} />
    </div>
  );
};

export default PlayerPawn;
