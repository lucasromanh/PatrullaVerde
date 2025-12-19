import React from 'react';
import { Player, CardType } from '../types';
import { BOARD_LAYOUT, COLORS, ICONS, getTileCoordinates } from '../constants';
import PlayerPawn from './PlayerPawn';

interface BoardProps {
  players: Player[];
  onDeckClick: (type: CardType) => void;
  onTileClick: (index: number) => void;
  scale: number;
}

const Board: React.FC<BoardProps> = ({ players, onDeckClick, onTileClick, scale }) => {

  const getPathData = () => {
    let d = "M ";
    BOARD_LAYOUT.forEach((_, i) => {
      const coords = getTileCoordinates(i);
      const x = coords.x + 45;
      const y = coords.y + 45;
      if (i === 0) d += `${x} ${y}`;
      else {
        const prevCoords = getTileCoordinates(i - 1);
        const px = prevCoords.x + 45;
        const py = prevCoords.y + 45;
        const midX = (px + x) / 2;
        const midY = (py + y) / 2;
        d += ` Q ${px} ${py}, ${midX} ${midY} T ${x} ${y}`;
      }
    });
    return d;
  };

  const decks = [
    { type: CardType.ANIMAL, pos: { left: '150px', top: '700px' }, rotate: '-10deg' },
    { type: CardType.ACTION, pos: { left: '950px', top: '1050px' }, rotate: '15deg' },
    { type: CardType.THREAT, pos: { left: '100px', top: '1800px' }, rotate: '5deg' },
    { type: CardType.SOLIDARITY, pos: { left: '880px', top: '2200px' }, rotate: '-12deg' },
    { type: CardType.WASTE, pos: { left: '150px', top: '2900px' }, rotate: '8deg' },
  ];

  return (
    <div
      className="relative mx-auto transition-all duration-300 ease-out"
      style={{
        width: 1300 * scale,
        height: 4150 * scale,
      }}
    >
      <div
        className="relative origin-top-left w-[1300px] h-[4150px] overflow-visible pb-40 pt-80"
        style={{ transform: `scale(${scale})` }}
      >
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <path d={getPathData()} fill="none" stroke="#1b4332" strokeWidth="110" strokeLinecap="round" className="opacity-20" />
          <path d={getPathData()} fill="none" stroke="#555" strokeWidth="95" strokeLinecap="round" />
          <path d={getPathData()} fill="none" stroke="#333" strokeWidth="80" strokeLinecap="round" />
          <path d={getPathData()} fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeDasharray="30 40" className="road-animation opacity-70" />
        </svg>

        {decks.map((deck, i) => (
          <div
            key={i}
            onClick={() => onDeckClick(deck.type)}
            className="absolute z-20 cursor-pointer transition-transform hover:scale-110 active:scale-95 duration-300"
            style={{ ...deck.pos, transform: `rotate(${deck.rotate})` }}
          >
            <div className="relative group">
              <div className={`w-36 h-48 rounded-2xl absolute top-4 left-4 border-2 border-white/20 shadow-xl ${COLORS[deck.type]} translate-x-3 translate-y-3 opacity-40 group-hover:translate-x-4 group-hover:translate-y-4 transition-all`}></div>
              <div className={`w-36 h-48 rounded-2xl absolute top-2 left-2 border-2 border-white/20 shadow-xl ${COLORS[deck.type]} translate-x-1.5 translate-y-1.5 opacity-60 group-hover:translate-x-2 group-hover:translate-y-2 transition-all`}></div>
              <div className={`w-36 h-48 rounded-2xl border-4 border-white shadow-2xl flex flex-col items-center justify-center gap-3 ${COLORS[deck.type]} relative overflow-hidden holo-card`}>
                <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="text-7xl drop-shadow-lg">{ICONS[deck.type]}</div>
                <div className="text-[12px] font-black text-white uppercase tracking-widest bg-black/30 px-4 py-1.5 rounded-full">MAZO {deck.type}</div>
              </div>
            </div>
          </div>
        ))}

        <div className="absolute top-[500px] left-[50px] text-[180px] opacity-10 select-none">🌳</div>
        <div className="absolute top-[1200px] right-[100px] text-[200px] opacity-10 select-none">🏔️</div>
        <div className="absolute top-[2000px] left-[150px] text-[160px] opacity-10 select-none">🌵</div>
        <div className="absolute top-[2800px] right-[50px] text-[200px] opacity-10 select-none">🌊</div>
        <div className="absolute top-[3500px] left-[200px] text-[180px] opacity-10 select-none">🐆</div>

        {BOARD_LAYOUT.map((tile, idx) => {
          const coords = getTileCoordinates(idx);
          const styles = { left: `${coords.x}px`, top: `${coords.y}px` };
          const tilePlayers = players.filter(p => p.position === idx);

          return (
            <div
              key={idx}
              onClick={() => onTileClick(idx)}
              className={`absolute w-[100px] h-[100px] rounded-[32px] flex items-center justify-center border-4 border-black/20 shadow-[0_12px_0_rgba(0,0,0,0.4)] transform transition-all duration-300 cursor-help active:scale-95 ${COLORS[tile.type]} group`}
              style={{ ...styles, zIndex: 30 }}
            >
              <div className="absolute inset-1.5 border border-white/40 rounded-[24px]"></div>
              <div className="absolute top-1 left-2 w-1/2 h-1/3 bg-white/20 rounded-full blur-[2px] -rotate-12 opacity-50"></div>

              <div className="text-5xl z-20 drop-shadow-md transition-transform group-hover:scale-110">
                {tile.label ? (
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-[10px] font-black text-white uppercase mb-1 tracking-widest">{tile.label}</span>
                    <span>{ICONS[tile.type]}</span>
                  </div>
                ) : (
                  <span>{ICONS[tile.type] || '🌱'}</span>
                )}
              </div>

              <div className="absolute -top-24 left-0 right-0 flex justify-center items-end gap-1 pointer-events-none z-50">
                {tilePlayers.map((player, pIdx) => (
                  <PlayerPawn key={player.id} color={player.color} index={pIdx} character={player.character} />
                ))}
              </div>

              <div className="absolute -bottom-3 -right-3 bg-white text-emerald-900 rounded-full w-9 h-9 flex items-center justify-center text-[14px] font-black shadow-xl border-2 border-emerald-100 z-40 group-hover:bg-emerald-100 transition-colors">
                {idx + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Board;
