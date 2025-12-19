
import React from 'react';
import { Card, CardType } from '../types';
import { ICONS } from '../constants';

interface CardModalProps {
  card: Card;
  onClose: () => void;
  playerName: string;
}

const CardModal: React.FC<CardModalProps> = ({ card, onClose, playerName }) => {
  const getCardTheme = () => {
    switch(card.type) {
        case CardType.ANIMAL: return { bg: 'bg-[#9C27B0]', accent: 'border-purple-300', text: 'text-purple-900', label: 'ANIMAL RESCATADO', rarity: '⭐⭐⭐' };
        case CardType.ACTION: return { bg: 'bg-[#FFD600]', accent: 'border-yellow-200', text: 'text-yellow-900', label: 'ACCIÓN DE CAMPO', rarity: '⭐⭐' };
        case CardType.THREAT: return { bg: 'bg-[#F44336]', accent: 'border-red-400', text: 'text-red-900', label: 'ALERTA AMBIENTAL', rarity: '⭐⭐⭐' };
        case CardType.SOLIDARITY: return { bg: 'bg-[#2196F3]', accent: 'border-blue-300', text: 'text-blue-900', label: 'SOLIDARIDAD', rarity: '⭐⭐' };
        case CardType.WASTE: return { bg: 'bg-[#4CAF50]', accent: 'border-green-300', text: 'text-green-900', label: 'RECURSO ECO', rarity: '⭐' };
        default: return { bg: 'bg-gray-500', accent: 'border-gray-300', text: 'text-gray-900', label: 'EVENTO', rarity: '⭐' };
    }
  };

  const theme = getCardTheme();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Container with TCG perspective */}
      <div 
        className={`relative w-full max-w-[340px] sm:max-w-[380px] h-[520px] sm:h-[600px] rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] transform animate-in zoom-in-95 duration-500 flex flex-col border-[10px] border-white/90 ${theme.bg}`}
        style={{
          boxShadow: `0 0 40px ${card.color.replace('bg-', '')}, 0 20px 50px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Holographic Overlay Layer */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-white/20 pointer-events-none z-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.3),transparent_70%)] pointer-events-none z-20"></div>

        {/* Card Content Interior */}
        <div className="flex-1 m-3 rounded-[2rem] bg-white/95 flex flex-col overflow-hidden relative border-4 border-black/5">
            
            {/* Image Header Section */}
            <div className="h-[45%] relative shrink-0 overflow-hidden border-b-4 border-black/5 bg-gray-100">
                {card.imageUrl ? (
                    <img 
                        src={card.imageUrl} 
                        alt={card.title} 
                        className="w-full h-full object-cover transition-transform duration-1000 hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x300/e8f5e9/2e7d32?text=${card.type}`;
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-8xl">
                        {ICONS[card.type]}
                    </div>
                )}
                
                {/* Rarity & Icon Badge */}
                <div className="absolute top-4 left-4 flex gap-2 z-30">
                  <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-lg border border-black/5 flex items-center gap-1">
                    <span className="text-xl">{ICONS[card.type]}</span>
                    <span className="text-[10px] font-black tracking-widest">{theme.rarity}</span>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>

            {/* Card Body Information */}
            <div className="flex-1 p-6 flex flex-col text-center">
                <div className="mb-4">
                  <div className="text-[9px] font-black text-emerald-600/60 uppercase tracking-[0.3em] mb-1">{theme.label}</div>
                  <h3 className="text-emerald-950 text-2xl font-black italic uppercase tracking-tighter leading-none px-2">
                      {card.title}
                  </h3>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center bg-emerald-50/50 rounded-[1.5rem] border-2 border-dashed border-emerald-100 p-4">
                    <p className={`text-emerald-800 font-bold text-sm sm:text-base leading-relaxed italic`}>
                        {card.description}
                    </p>
                </div>
            </div>

            {/* Tiny Footer for authenticity */}
            <div className="px-6 py-3 flex justify-between items-center bg-gray-50 border-t border-black/5">
              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">© 2024 Patrulla Verde TCG</span>
              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic">{playerName}</span>
            </div>
        </div>

        {/* Big Action Button */}
        <div className="px-6 pt-1 pb-8 shrink-0 z-30">
            <button 
              onClick={onClose}
              className="w-full py-5 bg-white text-emerald-900 font-black text-2xl rounded-[2.5rem] shadow-[0_10px_0_rgba(0,0,0,0.1)] active:translate-y-2 active:shadow-none transition-all uppercase italic tracking-tighter border-2 border-emerald-50 hover:bg-emerald-50"
            >
              ¡COLECCIONAR!
            </button>
        </div>
      </div>
    </div>
  );
};

export default CardModal;
