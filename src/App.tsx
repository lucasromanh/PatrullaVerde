import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CardType, type GameState, type Player, type GameCharacter } from './types.ts';
import { BOARD_LAYOUT, CARDS, CHARACTERS } from './constants';
import Board from './components/Board';
import Dice from './components/Dice';
import CardModal from './components/CardModal';
import InstructionsModal from './components/InstructionsModal';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    diceValue: null,
    isRolling: false,
    activeCard: null,
    gameStatus: 'LOBBY',
    totalAnimalsRescued: 0,
    lastLog: '¡Bienvenidos, Guardianes!'
  });

  const [lobbyStep, setLobbyStep] = useState<'NUM_PLAYERS' | 'CHARACTER_SELECT'>('NUM_PLAYERS');
  const [numPlayers, setNumPlayers] = useState(2);
  const [tempPlayers, setTempPlayers] = useState<{ name: string, characterId: string }[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string, content: string, color: string } | null>(null);

  // Estado para saber a quién mostrar en el HUD de tarjetas durante transiciones
  const [hudPlayerIndex, setHudPlayerIndex] = useState<number | null>(null);

  // Estado para prevenir procesamiento concurrente de turnos
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    if (lobbyStep === 'CHARACTER_SELECT' && (tempPlayers.length !== numPlayers)) {
      setTempPlayers(Array.from({ length: numPlayers }).map((_, i: number) => ({
        name: `Guardián ${i + 1}`,
        characterId: CHARACTERS[i % CHARACTERS.length].id
      })));
    }
  }, [lobbyStep, numPlayers]);

  // Sincronizar hudPlayerIndex con currentPlayerIndex, excepto cuando estemos en transición
  useEffect(() => {
    if (gameState.gameStatus === 'PLAYING' && hudPlayerIndex === null) {
      setHudPlayerIndex(gameState.currentPlayerIndex);
    }
  }, [gameState.currentPlayerIndex, gameState.gameStatus, hudPlayerIndex]);

  const triggerNextTurn = useCallback((state: GameState): GameState => {
    const allFinished = state.players.every((p: Player) => p.isFinished);
    if (allFinished) return { ...state, gameStatus: 'FINISHED' };

    let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    while (state.players[nextIndex].isFinished && !allFinished) {
      nextIndex = (nextIndex + 1) % state.players.length;
    }

    setHudPlayerIndex(nextIndex);

    return {
      ...state,
      currentPlayerIndex: nextIndex,
      diceValue: null,
      lastLog: `¡Turno de ${state.players[nextIndex].name}!`
    };
  }, []);

  const movePlayerStepByStep = (steps: number): Promise<void> => {
    console.log(`[GAME_LOG] Iniciando movimiento: ${steps} pasos`);
    return new Promise((resolve) => {
      if (steps === 0) {
        console.log(`[GAME_LOG] Pasos es 0, terminando movimiento inmediatamente.`);
        resolve();
        return;
      }

      setIsMoving(true);
      let stepsMoved = 0;
      const absSteps = Math.abs(steps);
      const direction = steps > 0 ? 1 : -1;

      const moveInterval = setInterval(() => {
        if (stepsMoved < absSteps) {
          // Mover primero
          setGameState((prevState: GameState) => {
            const newPlayers = [...prevState.players];
            // FIX: Crear una copia superficial del jugador para no mutar el estado anterior directamente
            // Esto evita problemas con React Strict Mode que ejecuta reducers dos veces
            const player = { ...newPlayers[prevState.currentPlayerIndex] };
            newPlayers[prevState.currentPlayerIndex] = player;

            const currentPos = player.position;
            const nextPos = player.position + direction;

            console.log(`[GAME_LOG] Moviendo jugador ${prevState.currentPlayerIndex} de ${currentPos} a ${nextPos} (Paso ${stepsMoved + 1}/${absSteps})`);

            if (nextPos >= 0 && nextPos < BOARD_LAYOUT.length) {
              player.position = nextPos;
            }

            if (player.position >= BOARD_LAYOUT.length - 1) {
              player.isFinished = true;
              console.log(`[GAME_LOG] Jugador llegó a la meta.`);
            }

            return { ...prevState, players: newPlayers };
          });

          // Luego incrementar contador
          stepsMoved++;

          // Si ya completamos todos los pasos
          if (stepsMoved >= absSteps) {
            console.log(`[GAME_LOG] Movimiento completado.`);
            clearInterval(moveInterval);
            setIsMoving(false);
            resolve();
          }
        } else {
          clearInterval(moveInterval);
          setIsMoving(false);
          resolve();
        }
      }, 350);
    });
  };

  const handleCardClose = async () => {
    console.log(`[GAME_LOG] Intento cerrar tarjeta. ActiveCard: ${!!gameState.activeCard}, Lock: ${processingRef.current}`);
    if (!gameState.activeCard || processingRef.current) return;

    console.log(`[GAME_LOG] Cerrando tarjeta... bloqueando acciones.`);
    processingRef.current = true;

    try {
      const card = gameState.activeCard;
      const activeIdx = gameState.currentPlayerIndex;

      // Obtener snapshot del estado actual antes de cerrar modal
      const currentState = { ...gameState };
      const initialPosition = currentState.players[activeIdx].position;
      console.log(`[GAME_LOG] Posición inicial antes de efecto: ${initialPosition}`);

      // Cerrar modal de tarjeta primero
      setGameState((prevState: GameState) => ({ ...prevState, activeCard: null }));
      await new Promise(resolve => setTimeout(resolve, 300));

      // Aplicar efecto de la tarjeta al estado actual (no al prevState)
      console.log(`[GAME_LOG] Aplicando efecto de tarjeta: ${card.title}`);
      const effectUpdate = card.effect(currentState);

      // Actualizar estado con el efecto
      setGameState((prevState: GameState) => ({
        ...prevState,
        ...effectUpdate
      }));

      // Esperar un momento para que el usuario vea el efecto
      await new Promise(resolve => setTimeout(resolve, 800));

      // Si la carta movió al jugador, animarlo
      const newPosition = effectUpdate.players ? effectUpdate.players[activeIdx].position : initialPosition;
      console.log(`[GAME_LOG] Nueva posición post-efecto: ${newPosition}`);

      if (newPosition !== initialPosition) {
        const moveDiff = newPosition - initialPosition;
        console.log(`[GAME_LOG] Animando movimiento extra de tarjeta: ${moveDiff} pasos`);

        // Resetear posición visualmente para animar desde el origen
        setGameState((prevState: GameState) => {
          const resetPlayers = [...prevState.players];
          // FIX: Copia segura para no mutar estado
          resetPlayers[activeIdx] = { ...resetPlayers[activeIdx], position: initialPosition };
          return { ...prevState, players: resetPlayers };
        });

        await new Promise(resolve => setTimeout(resolve, 300));
        await movePlayerStepByStep(moveDiff);
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Avanzar al siguiente turno
      console.log(`[GAME_LOG] Finalizando interacción de tarjeta, pasando turno.`);
      setGameState((prevState: GameState) => triggerNextTurn(prevState));
      setIsProcessingTurn(false);
    } finally {
      console.log(`[GAME_LOG] Liberando candado (processingRef = false).`);
      processingRef.current = false;
    }
  };

  const rollDice = async () => {
    console.log(`[GAME_LOG] Click en Dado. Estados => Rolling: ${gameState.isRolling}, ActiveCard: ${!!gameState.activeCard}, Moving: ${isMoving}, Processing: ${isProcessingTurn}, RefLock: ${processingRef.current}`);

    // Prevenir múltiples clics o turnos concurrentes con Ref para bloqueo inmediato
    if (gameState.isRolling || gameState.activeCard || isMoving || isProcessingTurn || processingRef.current) {
      console.log(`[GAME_LOG] Acción bloqueada por estado o candado.`);
      return;
    }

    console.log(`[GAME_LOG] Iniciando secuencia de dado... bloqueando.`);
    processingRef.current = true;
    setIsProcessingTurn(true);

    try {
      // Iniciar animación del dado
      setGameState((prevState: GameState) => ({ ...prevState, isRolling: true, diceValue: null }));

      // Esperar un momento antes de mostrar el resultado
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generar número aleatorio
      const roll = Math.floor(Math.random() * 6) + 1;
      console.log(`[GAME_LOG] Resultado del dado generado: ${roll}`);
      setGameState((prevState: GameState) => ({ ...prevState, diceValue: roll }));

      // Esperar a que termine la animación del dado (2.5s)
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Ocultar animación del dado
      setGameState((prevState: GameState) => ({ ...prevState, isRolling: false }));

      // Esperar un poco para que el usuario vea el número
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mover al jugador
      console.log(`[GAME_LOG] Llamando a movePlayerStepByStep con ${roll} pasos.`);
      // FIX: Limpiar el valor del dado antes de mover para que el modal no vuelva a aparecer después
      setGameState((prevState: GameState) => ({ ...prevState, diceValue: null }));
      await movePlayerStepByStep(roll);

      // FIX: Usar la posición calculada porque gameState.players dentro de esta función es stale (estado viejo)
      // después del await de arriba.
      const startPosition = gameState.players[gameState.currentPlayerIndex].position;
      const finalPosition = Math.min(BOARD_LAYOUT.length - 1, startPosition + roll);
      const landingTile = BOARD_LAYOUT[finalPosition];

      console.log(`[GAME_LOG] Movimiento terminado. StartPos (stale): ${startPosition}, Roll: ${roll}, CalcFinalPos: ${finalPosition}, TileType: ${landingTile.type}`);

      if (landingTile.type !== 'EMPTY' && landingTile.type !== 'START' && landingTile.type !== 'END') {
        // Mostrar tarjeta
        console.log(`[GAME_LOG] Jugador cayó en tarjeta: ${landingTile.type}. Abriendo modal.`);
        const deck = CARDS[landingTile.type as CardType];
        const randomCard = deck[Math.floor(Math.random() * deck.length)];
        setGameState((prevState: GameState) => ({ ...prevState, activeCard: randomCard }));
        // El turno continuará cuando el usuario cierre la tarjeta
      } else {
        // No hay tarjeta, pasar al siguiente turno
        console.log(`[GAME_LOG] Casilla sin tarjeta. Pasando turno.`);
        await new Promise(resolve => setTimeout(resolve, 500));
        setGameState((prevState: GameState) => triggerNextTurn(prevState));
        setIsProcessingTurn(false);
      }
    } finally {
      // Only unlock here if NO card was opened. If card opened, handleCardClose will unlock.
      // Wait, NO. My previous logic unlocked it here regardless. That was the bug?
      // Let's re-read the logic.
      // If I unlock here, handleCardClose works.
      // If I DON'T unlock here, handleCardClose works?
      // User said: "se quedo pegado" -> implies lock was NOT released?
      // Or implies lock WAS released but something else broke?

      // Actually, if I open a card, I am STILL in the same "logical action" (the turn isn't over).
      // BUT, handleCardClose is a SEPARATE event handler (triggered by user click).
      // So rollDice finishes when it shows the card.
      // SO I MUST RELEASE THE LOCK HERE usually.

      // BUT if I release the lock here, user can click Dice again while card is open?
      // No, because `gameState.activeCard` check in `rollDice` prevents that: `if (gameState.activeCard ...)`

      // SO: It is SAFE and REQUIRED to release `processingRef` here.
      console.log(`[GAME_LOG] Liberando candado de dado (processingRef = false).`);
      processingRef.current = false;
    }
  };

  const handleDeckClick = (type: CardType, source: 'DECK' | 'TILE') => {
    const prefix = source === 'DECK' ? 'Mazo de ' : 'Casilla de ';
    const infoMap = {
      [CardType.ANIMAL]: { title: `${prefix}Animales`, content: 'Contiene especies autóctonas de Argentina que necesitan tu ayuda. ¡Rescátalos para ganar!', color: 'bg-purple-600' },
      [CardType.ACTION]: { title: `${prefix}Acción`, content: 'Situaciones de campo inesperadas. Pueden darte velocidad o cambiar tu destino.', color: 'bg-yellow-500' },
      [CardType.THREAT]: { title: `${prefix}Amenaza`, content: 'Peligros ambientales como incendios o contaminación. ¡Ten cuidado!', color: 'bg-red-600' },
      [CardType.SOLIDARITY]: { title: `${prefix}Solidaridad`, content: 'El poder del trabajo en equipo. Ayuda a otros guardianes a avanzar.', color: 'bg-blue-600' },
      [CardType.WASTE]: { title: `${prefix}Residuos`, content: 'Educación sobre las 4R: Reducir, Reutilizar, Reciclar y Recuperar.', color: 'bg-emerald-600' },
    };
    setInfoModal(infoMap[type]);
  };

  const handleTileClick = (index: number) => {
    const tile = BOARD_LAYOUT[index];
    if (tile.type === 'START') setInfoModal({ title: 'Punto de Partida', content: 'Aquí comienza tu misión como Guardián de la Patrulla Verde.', color: 'bg-emerald-400' });
    else if (tile.type === 'END') setInfoModal({ title: 'Meta Final', content: '¡El santuario! Aquí los animales estarán a salvo para siempre.', color: 'bg-emerald-600' });
    else if (tile.type === 'EMPTY') setInfoModal({ title: 'Sendero Libre', content: 'Un camino tranquilo por la selva. No sucede nada especial aquí.', color: 'bg-gray-400' });
    else handleDeckClick(tile.type as CardType, 'TILE');
  };

  const startGame = () => {
    const players: Player[] = tempPlayers.map((tp: { name: string, characterId: string }, i: number) => {
      const character = CHARACTERS.find((c: GameCharacter) => c.id === tp.characterId) || CHARACTERS[i % CHARACTERS.length];
      return {
        id: i,
        name: tp.name,
        color: character.color,
        position: 0,
        inventory: [],
        isFinished: false,
        character: character
      };
    });

    setGameState({
      ...gameState,
      players: players,
      gameStatus: 'PLAYING',
      currentPlayerIndex: 0,
      totalAnimalsRescued: 0,
      activeCard: null,
      lastLog: `¡Patrulla iniciada por ${players[0].name}!`
    });
    setHudPlayerIndex(0);
  };

  const getDiceRotation = (val: number | null) => {
    switch (val) {
      case 1: return 'rotateY(0deg)';
      case 2: return 'rotateY(180deg)';
      case 3: return 'rotateY(-90deg)';
      case 4: return 'rotateY(90deg)';
      case 5: return 'rotateX(-90deg)';
      case 6: return 'rotateX(90deg)';
      default: return 'rotate(360deg)';
    }
  };

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const hudPlayer = hudPlayerIndex !== null ? gameState.players[hudPlayerIndex] : currentPlayer;

  if (gameState.gameStatus === 'LOBBY') {
    return (
      <div className="min-h-screen bg-[#1b4332] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="card-preview float-card-1 top-[10%] left-[8%] bg-purple-500/20">
            <div className="flex-1 flex items-center justify-center text-7xl">🐾</div>
          </div>
          <div className="card-preview float-card-2 bottom-[15%] right-[10%] bg-red-500/20">
            <div className="flex-1 flex items-center justify-center text-7xl">⚠️</div>
          </div>
          <div className="absolute top-[20%] right-[20%] text-9xl opacity-20 animate-pulse">🐆</div>
          <div className="absolute bottom-[20%] left-[15%] text-9xl opacity-20">🦅</div>
        </div>
        <div className="bg-white/95 p-8 sm:p-12 rounded-[60px] shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5)] max-w-lg w-full z-10 border-[10px] border-emerald-50 flex flex-col items-center">
          <div className="text-center mb-10">
            <div className="bg-[#FFD600] p-6 rounded-[40px] mb-4 shadow-[0_12px_0_#C5A500] border-4 border-white inline-block">
              <h1 className="text-4xl sm:text-5xl font-black text-emerald-900 leading-none tracking-tighter uppercase italic">PATRULLA<br />VERDE</h1>
            </div>
            <div className="text-emerald-700 font-black uppercase text-[10px] tracking-[0.4em] bg-emerald-50 py-1.5 px-6 rounded-full mt-2">Eco-Rescate Argentina</div>
          </div>
          {lobbyStep === 'NUM_PLAYERS' ? (
            <div className="w-full space-y-8">
              <div className="bg-emerald-50 p-6 rounded-[35px] border-2 border-emerald-100 text-center">
                <label className="block text-emerald-900 font-black text-sm uppercase mb-6 italic tracking-wider">¿Cuántos guardianes?</label>
                <div className="flex justify-center flex-wrap gap-3">
                  {[2, 3, 4, 5, 6].map((n: number) => (
                    <button key={n} onClick={() => setNumPlayers(n)} className={`w-14 h-14 rounded-2xl font-black transition-all text-2xl flex items-center justify-center ${numPlayers === n ? 'bg-emerald-600 text-white shadow-[0_8px_0_#064e3b] -translate-y-1 scale-110' : 'bg-white text-emerald-300 hover:bg-emerald-100 shadow-md'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setLobbyStep('CHARACTER_SELECT')} className="w-full py-5 bg-[#FFD600] hover:bg-[#FFEA00] text-emerald-900 font-black text-2xl rounded-[30px] shadow-[0_10px_0_#C5A500] transform active:translate-y-2 active:shadow-none transition-all uppercase italic">¡SIGUIENTE!</button>
              <button onClick={() => setShowInstructions(true)} className="w-full text-emerald-600 font-black text-xs uppercase underline tracking-widest">Instrucciones</button>
            </div>
          ) : (
            <div className="w-full space-y-4 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
              {tempPlayers.map((tp: { name: string, characterId: string }, i: number) => (
                <div key={i} className="bg-emerald-50 p-4 rounded-3xl border-2 border-emerald-100 flex items-center gap-4">
                  <div className="text-4xl p-3 bg-white rounded-2xl border-4 shadow-lg" style={{ borderColor: CHARACTERS.find((c: GameCharacter) => c.id === tp.characterId)?.color || '#ccc' }}>
                    {CHARACTERS.find((c: GameCharacter) => c.id === tp.characterId)?.avatar}
                  </div>
                  <div className="flex-1">
                    <input type="text" value={tp.name} onChange={(e) => {
                      const next = [...tempPlayers];
                      next[i].name = e.target.value;
                      setTempPlayers(next);
                    }} className="w-full bg-white px-4 py-1.5 rounded-xl outline-none text-emerald-900 font-black uppercase mb-2 border border-emerald-100 shadow-inner" />
                    <div className="flex gap-2">
                      {CHARACTERS.map((c: GameCharacter) => (
                        <button key={c.id} onClick={() => {
                          const next = [...tempPlayers];
                          next[i].characterId = c.id;
                          setTempPlayers(next);
                        }} className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg border-2 ${tp.characterId === c.id ? 'bg-emerald-600 scale-110 border-white shadow-md' : 'bg-white border-emerald-100 opacity-60'}`}>{c.avatar}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-4 pt-4 pb-2">
                <button onClick={() => setLobbyStep('NUM_PLAYERS')} className="flex-1 py-3 bg-gray-100 text-gray-400 font-black rounded-2xl uppercase">Atrás</button>
                <button onClick={startGame} className="flex-[2] py-4 bg-[#FFD600] text-emerald-900 font-black text-2xl rounded-[30px] shadow-[0_8px_0_#C5A500] uppercase italic">¡LISTO!</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1b4332] flex flex-col overflow-hidden select-none relative">

      {/* HUD HEADER */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-[60]">
        <div className="flex flex-col gap-3 pointer-events-auto">
          <button onClick={() => setGameState((prev: GameState) => ({ ...prev, gameStatus: 'LOBBY' }))} className="glass-panel w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xl border-2 border-white/40 active:scale-90 transition-all">🏠</button>
          <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl border-2 border-white/30">
            <span className="text-xl">🐾</span>
            <span className="font-black text-white text-[10px] tracking-widest">{gameState.totalAnimalsRescued} RESCATES</span>
          </div>
        </div>

        {/* NOTIFICACIÓN TURNO */}
        <div className="absolute left-1/2 -translate-x-1/2 top-4 glass-panel px-6 py-2 rounded-full shadow-2xl border-white/40 border-2 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 pointer-events-auto cursor-pointer" onClick={() => setShowInventory(true)}>
          <div className="w-12 h-12 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-3xl shrink-0" style={{ backgroundColor: currentPlayer?.color }}>
            {currentPlayer?.character?.avatar}
          </div>
          <div className="hidden sm:block">
            <div className="text-[8px] font-black text-white/50 uppercase tracking-[0.4em] mb-1">Guardián</div>
            <div className="font-black text-white text-xl leading-none italic uppercase tracking-tighter truncate max-w-[120px]">{currentPlayer?.name}</div>
          </div>
          <div className="sm:hidden font-black text-white text-sm italic uppercase truncate max-w-[80px]">{currentPlayer?.name}</div>
          <div className="ml-2 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs animate-pulse">🎒</div>
        </div>

        {/* HUD DERECHO - PANEL DE TARJETAS */}
        <div className="flex flex-col gap-3 pointer-events-auto items-end">
          <div onClick={() => setShowInstructions(true)} className="glass-panel w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xl border-2 border-white/30 cursor-pointer">❓</div>

          <div className="glass-panel p-3 rounded-3xl border-2 border-white/20 shadow-2xl flex flex-col gap-2 w-[120px] max-w-[120px]">
            <div className="text-[7px] font-black text-white/60 uppercase tracking-widest text-center border-b border-white/10 pb-1">
              Mazo de {hudPlayer?.name || '---'}
            </div>
            <div className="flex flex-wrap gap-1 justify-center max-h-[180px] overflow-y-auto custom-scrollbar pt-1">
              {hudPlayer?.inventory && hudPlayer.inventory.length > 0 ? (
                hudPlayer.inventory.map((card, i) => (
                  <div key={`${hudPlayer.id}-${i}`} className={`w-8 h-12 rounded-md ${card.color} flex flex-col items-center justify-between p-0.5 shadow-md border border-white/20 animate-in zoom-in-50 holo-card overflow-hidden relative`} title={card.title}>
                    {card.imageUrl && (
                      <div className="absolute inset-0 z-0 opacity-80">
                        <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span className="text-[10px] z-10 drop-shadow-md">🐾</span>
                    <span className="text-[4px] font-black uppercase tracking-tighter leading-none text-center px-0.5 truncate w-full z-10 text-white drop-shadow-md bg-black/30 rounded-full mb-0.5">{card.title}</span>
                  </div>
                ))
              ) : (
                <div className="text-[8px] text-white/30 font-bold py-8 text-center uppercase tracking-widest italic">Vacío</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-auto bg-[#2d6a4f] board-container custom-scrollbar touch-pan-x touch-pan-y">
        <Board
          players={gameState.players}
          activeCardType={gameState.activeCard?.type}
          onDeckClick={(type) => handleDeckClick(type, 'DECK')}
          onTileClick={handleTileClick}
        />
        <div className="absolute bottom-8 left-8 pointer-events-none z-20">
          <div className="glass-panel px-6 py-4 rounded-[30px] shadow-2xl border-white/20 max-w-[220px] sm:max-w-sm">
            <p className="text-[9px] font-black text-white/40 uppercase mb-1 tracking-widest">Diario de la Selva</p>
            <p className="text-xs sm:text-base text-white font-black italic leading-tight">{gameState.lastLog}</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 right-10 z-40">
        <Dice value={gameState.diceValue} isRolling={gameState.isRolling} onRoll={rollDice} disabled={!!gameState.activeCard || isMoving || isProcessingTurn} />
      </div>

      {(gameState.isRolling || (gameState.diceValue && !isMoving)) && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none bg-black/50 backdrop-blur-[3px] animate-in fade-in duration-500">
          <div className="perspective-dice animate-dice-box">
            <div className="dice-cube" style={{ transform: getDiceRotation(gameState.diceValue) }}>
              <div className="dice-face face-1"><div className="dice-dot" /></div>
              <div className="dice-face face-2"><div className="flex flex-col gap-12"><div className="dice-dot" /><div className="dice-dot" /></div></div>
              <div className="dice-face face-3"><div className="flex flex-col gap-4"><div className="dice-dot" /><div className="dice-dot" /><div className="dice-dot" /></div></div>
              <div className="dice-face face-4"><div className="grid grid-cols-2 grid-rows-2 gap-10"><div className="dice-dot" /><div className="dice-dot" /><div className="dice-dot" /><div className="dice-dot" /></div></div>
              <div className="dice-face face-5"><div className="grid grid-cols-2 grid-rows-2 gap-10 relative"><div className="dice-dot" /><div className="dice-dot" /><div className="dice-dot" /><div className="dice-dot" /><div className="dice-dot absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div></div>
              <div className="dice-face face-6"><div className="grid grid-cols-2 grid-rows-3 gap-3"><div className="dice-dot" /><div className="dice-dot" /><div className="dice-dot" /><div className="dice-dot" /><div className="dice-dot" /><div className="dice-dot" /></div></div>
            </div>
          </div>
          {gameState.diceValue && (
            <div className="mt-20 bg-white px-12 py-5 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.6)] border-[6px] border-[#FFD600] animate-in zoom-in-50 duration-500">
              <span className="text-4xl sm:text-6xl font-black text-emerald-900 italic tracking-tighter uppercase">¡SACASTE {gameState.diceValue}!</span>
            </div>
          )}
        </div>
      )}

      {/* Mochila View */}
      {showInventory && (
        <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[50px] w-full max-w-md overflow-hidden border-8 border-emerald-100 flex flex-col max-h-[80vh] holo-card">
            <div className="bg-emerald-600 p-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center text-3xl" style={{ backgroundColor: currentPlayer.color }}>{currentPlayer.character?.avatar}</div>
                <div>
                  <h2 className="text-white font-black text-2xl leading-none italic uppercase">MOCHILA DE {currentPlayer.name}</h2>
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest">Guardián Patrulla Verde</p>
                </div>
              </div>
              <button onClick={() => setShowInventory(false)} className="text-white text-4xl">×</button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-emerald-50">
              <div className="mb-6">
                <h3 className="text-emerald-900 font-black text-xs uppercase tracking-widest mb-4 border-b-2 border-emerald-100 pb-2">Colección de Tarjetas ({currentPlayer.inventory.length})</h3>
                {currentPlayer.inventory.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {currentPlayer.inventory.map((card, i) => (
                      <div key={`${currentPlayer.id}-backpack-${i}`} className={`bg-white p-2 rounded-2xl shadow-xl border-2 border-emerald-100 flex flex-col items-center gap-2 transform transition-transform hover:scale-105 active:scale-95 cursor-pointer holo-card overflow-hidden relative group`}>
                        <div className={`absolute top-0 left-0 right-0 h-1.5 ${card.color}`} />
                        <div className="w-full aspect-[4/3] rounded-lg overflow-hidden shadow-inner relative mt-1">
                          {card.imageUrl ? (
                            <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full ${card.color} flex items-center justify-center text-4xl opacity-50`}>🐾</div>
                          )}
                        </div>
                        <span className="font-black text-emerald-900 text-[10px] uppercase text-center leading-tight h-8 flex items-center justify-center w-full px-1">{card.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 opacity-30 italic font-black text-emerald-900 uppercase tracking-widest">Mochila vacía</div>
                )}
              </div>
            </div>
            <div className="p-6 bg-emerald-100 shrink-0">
              <button onClick={() => setShowInventory(false)} className="w-full py-4 bg-emerald-600 text-white font-black text-xl rounded-2xl shadow-[0_5px_0_#064e3b] uppercase italic">Volver al mapa</button>
            </div>
          </div>
        </div>
      )}

      {infoModal && (
        <div className="fixed inset-0 z-[160] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className={`rounded-[50px] w-full max-w-sm overflow-hidden border-8 border-white shadow-2xl flex flex-col ${infoModal.color}`}>
            <div className="p-8 text-center text-white">
              <div className="text-7xl mb-4 drop-shadow-lg">ℹ️</div>
              <h2 className="font-black text-3xl italic uppercase tracking-tighter mb-4 leading-none">{infoModal.title}</h2>
              <div className="bg-white/20 p-6 rounded-3xl border border-white/30 mb-8">
                <p className="font-bold italic leading-relaxed">{infoModal.content}</p>
              </div>
              <button onClick={() => setInfoModal(null)} className="w-full py-4 bg-white text-emerald-900 font-black text-xl rounded-2xl shadow-[0_5px_0_#ccc] transition-all active:translate-y-1 active:shadow-none uppercase">¡ENTENDIDO!</button>
            </div>
          </div>
        </div>
      )}

      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
      {gameState.activeCard && <CardModal card={gameState.activeCard} onClose={handleCardClose} playerName={currentPlayer?.name || ''} />}

      {gameState.gameStatus === 'FINISHED' && (
        <div className="fixed inset-0 z-[200] bg-emerald-950/98 flex flex-col items-center justify-center text-white p-6 backdrop-blur-3xl animate-in fade-in">
          <div className="text-[140px] mb-8 animate-bounce">🏆</div>
          <h1 className="text-5xl sm:text-7xl font-black mb-6 italic tracking-tighter text-center uppercase">¡MISIÓN FINALIZADA!</h1>
          <div className="bg-white/10 p-10 rounded-[50px] border-4 border-white/20 text-center mb-12 max-w-sm shadow-2xl">
            <div className="text-yellow-400 text-7xl font-black mb-2">{gameState.totalAnimalsRescued}</div>
            <div className="text-base font-bold uppercase opacity-60 tracking-widest">Especies Protegidas</div>
          </div>
          <button onClick={() => window.location.reload()} className="bg-[#FFD600] text-emerald-900 px-20 py-7 rounded-[40px] font-black text-4xl shadow-[0_12px_0_#C5A500] transform active:translate-y-2 active:shadow-none transition-all uppercase italic">VOLVER A JUGAR</button>
        </div>
      )}
    </div>
  );
};

export default App;

