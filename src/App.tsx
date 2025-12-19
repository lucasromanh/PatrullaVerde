import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CardType, type GameState, type Player, type GameCharacter } from './types.ts';
import { BOARD_LAYOUT, CARDS, CHARACTERS, getTileCoordinates } from './constants';
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

  // Estados Generales
  const [numPlayers, setNumPlayers] = useState(2);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string, content: string, color: string } | null>(null);
  const [selectedInventoryCard, setSelectedInventoryCard] = useState<any | null>(null);
  const [scale, setScale] = useState(0.65);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [showTurnNotification, setShowTurnNotification] = useState(false);

  // Singleton ref for movement interval
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Estado para saber a quién mostrar en el HUD de tarjetas
  const [hudPlayerIndex, setHudPlayerIndex] = useState<number | null>(null);

  // Estado para prevenir procesamiento concurrente
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const processingRef = useRef(false);

  // Estados de Configuración de Partida (Lobby Secuencial)
  const [lobbyStep, setLobbyStep] = useState<'COUNT' | 'CONFIG'>('COUNT');
  const [currentSetupIndex, setCurrentSetupIndex] = useState(0);
  const [tempPlayers, setTempPlayers] = useState<{ name: string, characterId: string }[]>([]);

  // Estado temporal para el paso actual de configuración
  const [currentStepName, setCurrentStepName] = useState('');
  const [currentStepCharId, setCurrentStepCharId] = useState('');



  // Resetear configuración al cambiar número de jugadores o al volver al paso COUNT
  useEffect(() => {
    if (lobbyStep === 'COUNT') {
      setCurrentSetupIndex(0);
      // Initialize tempPlayers with default names and characters based on numPlayers
      const initialTempPlayers = Array.from({ length: numPlayers }).map((_, i) => ({
        name: `Guardián ${i + 1}`,
        characterId: CHARACTERS[i % CHARACTERS.length].id
      }));
      setTempPlayers(initialTempPlayers);
      setCurrentStepName(initialTempPlayers[0]?.name || '');
      setCurrentStepCharId(initialTempPlayers[0]?.characterId || '');
    } else if (lobbyStep === 'CONFIG') {
      // When entering CONFIG, ensure currentStepName/CharId reflect the current player in tempPlayers
      if (tempPlayers[currentSetupIndex]) {
        setCurrentStepName(tempPlayers[currentSetupIndex].name);
        setCurrentStepCharId(tempPlayers[currentSetupIndex].characterId);
      }
    }
  }, [lobbyStep, numPlayers, currentSetupIndex]); // Added currentSetupIndex to dependencies for CONFIG step initialization

  const handleNextSetupStep = () => {
    // Guardar configuración del jugador actual
    const updatedTempPlayers = [...tempPlayers];
    updatedTempPlayers[currentSetupIndex] = { name: currentStepName, characterId: currentStepCharId };
    setTempPlayers(updatedTempPlayers);

    if (currentSetupIndex < numPlayers - 1) {
      // Avanzar al siguiente jugador
      setCurrentSetupIndex(prev => prev + 1);
      // The useEffect above will handle setting currentStepName/CharId for the new index
    } else {
      // Todos configurados, iniciar juego
      startGame(updatedTempPlayers);
    }
  };

  const startGame = (configuredPlayers: { name: string, characterId: string }[]) => {
    const players: Player[] = configuredPlayers.map((tp, i) => {
      const character = CHARACTERS.find((c: GameCharacter) => c.id === tp.characterId) || CHARACTERS[i % CHARACTERS.length];
      return {
        id: i,
        name: tp.name || `Jugador ${i + 1}`,
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

  // Manejo de Escala del Tablero usando ResizeObserver para ajustar al contenedor real
  useEffect(() => {
    if (!boardContainerRef.current) return;

    const updateScale = () => {
      if (boardContainerRef.current) {
        const parentWidth = boardContainerRef.current.clientWidth;
        const targetWidth = 1300;
        const newScale = Math.min(parentWidth / targetWidth, 1.0);
        // Usar un factor un poco menor para asegurar márgenes
        setScale(newScale * 0.90);
      }
    };

    // Inicial y Listener
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(boardContainerRef.current);

    return () => observer.disconnect();
  }, []);

  // Auto-scroll al jugador activo
  useEffect(() => {
    if (gameState.players.length === 0 || !boardContainerRef.current) return;

    // Pequeño delay para asegurar que el DOM y escalas se han actualizado
    const timer = setTimeout(() => {
      if (!boardContainerRef.current) return;

      const activePlayer = gameState.players[gameState.currentPlayerIndex];
      if (!activePlayer) return;

      const coords = getTileCoordinates(activePlayer.position);

      // Coordenada Y escalada
      const targetY = coords.y * scale;
      const containerHeight = boardContainerRef.current.clientHeight;
      const containerWidth = boardContainerRef.current.clientWidth;
      const targetX = coords.x * scale;

      // Centrar vertical y horizontalmente
      const scrollToY = targetY - (containerHeight / 2) + 100; // +100 offset
      const scrollToX = targetX - (containerWidth / 2);

      boardContainerRef.current.scrollTo({
        top: Math.max(0, scrollToY),
        left: Math.max(0, scrollToX),
        behavior: 'smooth'
      });
    }, 100);

    return () => clearTimeout(timer);

  }, [gameState.currentPlayerIndex, gameState.players, scale, isMoving]);

  // Auto-activar notificación de turno cuando cambia el jugador
  useEffect(() => {
    if (gameState.gameStatus !== 'PLAYING') return;

    // Pequeño delay para no solapar con animaciones previas
    const timer = setTimeout(() => {
      setShowTurnNotification(true);
      // Ocultar a los 2.5s
      setTimeout(() => setShowTurnNotification(false), 2500);
    }, 500);

    return () => clearTimeout(timer);
  }, [gameState.currentPlayerIndex, gameState.gameStatus]);

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

  const movePlayerStepByStep = (rawSteps: number): Promise<void> => {
    const steps = Math.floor(rawSteps);
    // Unique ID for this movement sequence
    const moveId = Date.now();
    console.log(`[GAME_LOG][${moveId}] movePlayerStepByStep START. Steps: ${steps}, PlayerIdx: ${gameState.currentPlayerIndex}`);

    // SAFETY: Clear any existing interval to prevent double-movement
    if (moveIntervalRef.current) {
      console.warn(`[GAME_LOG][${moveId}] Found existing interval! Clearing it.`);
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }

    return new Promise((resolve) => {
      if (steps === 0) {
        console.log(`[GAME_LOG] Pasos es 0, terminando.`);
        resolve();
        return;
      }

      setIsMoving(true);
      let stepsMoved = 0;
      const absSteps = Math.abs(steps);
      const direction = steps > 0 ? 1 : -1;

      let isResolved = false;

      const finishMovement = () => {
        if (isResolved) return;
        isResolved = true;
        if (moveIntervalRef.current) {
          clearInterval(moveIntervalRef.current);
          moveIntervalRef.current = null;
        }
        setIsMoving(false);
        console.log(`[GAME_LOG][${moveId}] Movimiento terminado.`);
        resolve();
      };

      // Start new interval
      moveIntervalRef.current = setInterval(() => {
        if (stepsMoved < absSteps) {
          setGameState((prevState: GameState) => {
            const currentIdx = prevState.currentPlayerIndex;
            const newPlayers = [...prevState.players];
            const player = { ...newPlayers[currentIdx] };
            newPlayers[currentIdx] = player;

            const currentPos = player.position;
            const nextPos = player.position + direction;

            console.log(`[GAME_LOG][${moveId}] TICK. Player ${currentIdx}: ${currentPos} -> ${nextPos}. Check: ${stepsMoved + 1}/${absSteps}`);

            if (nextPos >= 0 && nextPos < BOARD_LAYOUT.length) {
              player.position = nextPos;
            }

            if (player.position >= BOARD_LAYOUT.length - 1) {
              player.isFinished = true;
            }

            return {
              ...prevState,
              players: newPlayers,
              gameStatus: player.isFinished ? 'FINISHED' : prevState.gameStatus,
              totalAnimalsRescued: player.isFinished ? player.inventory.filter(c => c.type === CardType.ANIMAL).length : prevState.totalAnimalsRescued,
              lastLog: player.isFinished ? `¡${player.name} completó la misión con ${player.inventory.filter((c: any) => c.type === CardType.ANIMAL).length} animales!` : prevState.lastLog
            };
          });

          stepsMoved++;

          if (stepsMoved >= absSteps) {
            finishMovement();
          }
        } else {
          finishMovement();
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

      console.log(`[GAME_LOG] Modal cerrado. Esperando 2 segundos antes de aplicar efectos/movimiento...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

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
      // FIX: Clean dice value
      setGameState((prevState: GameState) => ({ ...prevState, diceValue: null }));
      await movePlayerStepByStep(roll);

      // PAUSA: Esperar 2 segundos después de llegar a la casilla
      console.log(`[GAME_LOG] Movimiento inicial terminado. Esperando 2 segundos...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const startPosition = gameState.players[gameState.currentPlayerIndex].position;
      const finalPosition = Math.min(BOARD_LAYOUT.length - 1, startPosition + roll);
      const landingTile = BOARD_LAYOUT[finalPosition];

      console.log(`[GAME_LOG] Chequeando casilla tras pausa. StartPos (stale): ${startPosition}, Roll: ${roll}, CalcFinalPos: ${finalPosition}, TileType: ${landingTile.type}`);

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
        {/* Background Elements */}
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

        {/* Main Container */}
        <div className="bg-white/95 backdrop-blur-sm p-6 sm:p-12 rounded-[40px] shadow-2xl max-w-4xl w-full border-4 sm:border-8 border-white animate-in zoom-in duration-500 z-10 flex flex-col items-center max-h-[90vh] overflow-y-auto custom-scrollbar">

          <div className="text-center mb-6 sm:mb-10 shrink-0">
            <div className="bg-[#FFD600] p-4 sm:p-6 rounded-[30px] sm:rounded-[40px] mb-2 sm:mb-4 shadow-[0_8px_0_#C5A500] border-4 border-white inline-block transform hover:scale-105 transition-transform">
              <h1 className="text-3xl sm:text-6xl font-black text-emerald-900 leading-none tracking-tighter uppercase italic">PATRULLA<br />VERDE</h1>
            </div>
            <div className="text-emerald-700 font-black uppercase text-[10px] sm:text-xs tracking-[0.4em] bg-emerald-50 py-1.5 px-6 rounded-full mt-2">Eco-Rescate Argentina</div>
          </div>

          <div className="w-full">
            {lobbyStep === 'COUNT' ? (
              <div className="space-y-8 sm:space-y-12 text-center">
                <h2 className="text-2xl sm:text-4xl font-bold text-emerald-700">¿Cuántos guardianes jugarán?</h2>

                <div className="flex justify-center gap-4 sm:gap-8">
                  {[2, 3, 4].map(num => (
                    <button
                      key={num}
                      onClick={() => setNumPlayers(num)}
                      className={`w-20 h-20 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl text-3xl sm:text-5xl font-black transition-all transform hover:scale-110 shadow-[0_6px_0_rgb(0,0,0,0.2)] active:shadow-none active:translate-y-[6px] flex items-center justify-center border-4 ${numPlayers === num
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-700/50 scale-110'
                        : 'bg-white text-emerald-600 border-emerald-100 hover:border-emerald-300'
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setLobbyStep('CONFIG')}
                  className="w-full sm:w-auto px-8 sm:px-16 py-4 sm:py-6 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-[20px] sm:rounded-[30px] text-xl sm:text-3xl font-black shadow-[0_8px_0_rgb(20,83,45)] hover:shadow-[0_12px_0_rgb(20,83,45)] hover:-translate-y-1 active:translate-y-[8px] active:shadow-none transition-all uppercase tracking-widest mt-4 sm:mt-8"
                >
                  Continuar
                </button>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-right duration-500">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 sm:mb-8">
                  <h2 className="text-2xl sm:text-4xl font-bold text-emerald-800 flex items-center gap-3">
                    <span className="bg-emerald-100 text-emerald-800 w-10 h-10 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-3xl border-4 border-emerald-200 shadow-inner">{currentSetupIndex + 1}</span>
                    <span className="text-center sm:text-left">Guardián {currentSetupIndex + 1}</span>
                  </h2>
                  <div className="flex gap-2">
                    {Array(numPlayers).fill(0).map((_, idx) => (
                      <div key={idx} className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all ${idx === currentSetupIndex ? 'bg-emerald-500 scale-125' : idx < currentSetupIndex ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-emerald-600 font-bold text-lg sm:text-xl mb-2 pl-2 uppercase tracking-wide">Nombre</label>
                    <input
                      type="text"
                      value={currentStepName}
                      onChange={(e) => setCurrentStepName(e.target.value)}
                      placeholder={`Nombre del Jugador ${currentSetupIndex + 1}`}
                      className="w-full text-xl sm:text-3xl font-bold p-4 sm:p-6 rounded-[20px] sm:rounded-[25px] border-4 border-emerald-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 outline-none transition-all bg-emerald-50/50 text-emerald-900 placeholder:text-emerald-200/70"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-emerald-600 font-bold text-lg sm:text-xl mb-3 pl-2 uppercase tracking-wide">Elige Personaje</label>
                    <div className="grid grid-cols-2 gap-3 sm:gap-6">
                      {CHARACTERS.map(char => {
                        const isSelected = currentStepCharId === char.id;
                        const isTaken = tempPlayers.some((p, i) => i !== currentSetupIndex && p.characterId === char.id);

                        return (
                          <div
                            key={char.id}
                            onClick={() => !isTaken && setCurrentStepCharId(char.id)}
                            className={`relative group cursor-pointer transition-all duration-300 ${isTaken ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${isSelected ? 'scale-[1.02] sm:scale-105 z-10' : 'hover:scale-[1.01]'}`}
                          >
                            <div className={`h-full rounded-[20px] sm:rounded-[35px] border-4 p-3 sm:p-4 flex flex-row sm:flex-col items-center gap-3 sm:gap-4 transition-all ${isSelected ? 'bg-emerald-50 border-emerald-500 shadow-xl shadow-emerald-100 ring-2 sm:ring-4 ring-emerald-200' : 'bg-white border-transparent hover:border-emerald-200 hover:bg-emerald-50/30 shadow-sm'}`}>
                              <div className={`w-16 h-16 sm:w-32 sm:h-32 rounded-full shadow-lg flex items-center justify-center overflow-hidden bg-gray-100 border-2 sm:border-4 border-white shrink-0 ${char.color}`}>
                                {char.avatar.endsWith('.png') ? (
                                  <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="text-3xl sm:text-6xl">{char.avatar}</div>
                                )}
                              </div>
                              <div className="text-left sm:text-center flex-1">
                                <div className="font-black text-lg sm:text-xl text-emerald-900 leading-tight mb-1">{char.name}</div>
                                <div className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wide leading-tight hidden sm:block">{char.description}</div>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-emerald-500 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg border-2 sm:border-4 border-white shadow-lg animate-bounce">✓</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-4 sm:pt-8 flex justify-end">
                  <button
                    disabled={!currentStepName || !currentStepCharId}
                    onClick={handleNextSetupStep}
                    className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 bg-emerald-600 text-white rounded-[20px] sm:rounded-[25px] text-xl sm:text-2xl font-black shadow-[0_6px_0_rgb(6,95,70)] hover:shadow-[0_10px_0_rgb(6,95,70)] hover:-translate-y-1 active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-4 group"
                  >
                    {currentSetupIndex < numPlayers - 1 ? 'Siguiente' : '¡Jugar!'}
                    <span className="group-hover:translate-x-2 transition-transform">➜</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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
          <div className="w-12 h-12 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-3xl shrink-0 overflow-hidden relative" style={{ backgroundColor: currentPlayer?.color }}>
            {currentPlayer?.character?.avatar && (currentPlayer.character.avatar.toLowerCase().endsWith('.png') || currentPlayer.character.avatar.startsWith('/')) ? (
              <img src={currentPlayer.character.avatar} alt={currentPlayer.name} className="w-full h-full object-cover p-1" />
            ) : (
              currentPlayer?.character?.avatar || '👤'
            )}
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

      <div ref={boardContainerRef} className="flex-1 relative overflow-auto bg-[#2d6a4f] board-container custom-scrollbar touch-pan-x touch-pan-y">
        <Board
          players={gameState.players}
          onDeckClick={(type) => handleDeckClick(type, 'DECK')}
          onTileClick={handleTileClick}
          scale={scale}
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
                <div className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center text-3xl overflow-hidden relative" style={{ backgroundColor: currentPlayer.color }}>
                  {currentPlayer.character?.avatar && (currentPlayer.character.avatar.toLowerCase().endsWith('.png') || currentPlayer.character.avatar.startsWith('/')) ? (
                    <img src={currentPlayer.character.avatar} alt={currentPlayer.name} className="w-full h-full object-cover p-1" />
                  ) : (
                    currentPlayer.character?.avatar || '👤'
                  )}
                </div>
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
                      <div key={`${currentPlayer.id}-backpack-${i}`} onClick={() => setSelectedInventoryCard(card)} className={`bg-white p-2 rounded-2xl shadow-xl border-2 border-emerald-100 flex flex-col items-center gap-2 transform transition-transform hover:scale-105 active:scale-95 cursor-pointer holo-card overflow-hidden relative group`}>
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

      {selectedInventoryCard && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-[340px] h-[550px] bg-white rounded-[3rem] p-2 shadow-2xl animate-in zoom-in-95">
            <div className={`w-full h-full rounded-[2.5rem] border-4 border-emerald-500 overflow-hidden flex flex-col relative`}>
              {/* Close Button X */}
              <button onClick={() => setSelectedInventoryCard(null)} className="absolute top-4 right-4 z-50 bg-black/30 hover:bg-black/50 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl font-black backdrop-blur-sm">✕</button>

              <div className="h-[50%] relative">
                {selectedInventoryCard.imageUrl && <img src={selectedInventoryCard.imageUrl} className="w-full h-full object-cover" alt={selectedInventoryCard.title} />}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-emerald-900/80 to-transparent flex items-end p-6">
                  <span className="text-white font-black text-2xl uppercase italic tracking-tighter drop-shadow-md">{selectedInventoryCard.title}</span>
                </div>
              </div>

              <div className="flex-1 bg-white p-6 flex flex-col items-center text-center">
                <div className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-2">{selectedInventoryCard.type}</div>
                <p className="text-emerald-800 font-medium italic leading-relaxed">{selectedInventoryCard.description || "Sin descripción."}</p>
                <div className="mt-auto w-full pt-4">
                  <button onClick={() => setSelectedInventoryCard(null)} className="w-full py-4 bg-emerald-100 text-emerald-800 font-black text-lg rounded-2xl uppercase tracking-widest hover:bg-emerald-200 transition-colors">Volver</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTurnNotification && gameState.players.length > 0 && (
        <div className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10 fade-in duration-500 pointer-events-none">
          <div className={`px-12 py-6 rounded-[40px] shadow-[0_10px_40px_rgba(0,0,0,0.4)] border-4 border-white transform transition-all flex items-center gap-6 ${gameState.players[gameState.currentPlayerIndex].character.id === 'c1' || gameState.players[gameState.currentPlayerIndex].character.id === 'c4' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden relative animate-bounce bg-white/20 flex items-center justify-center text-6xl">
              {gameState.players[gameState.currentPlayerIndex].character.avatar && (gameState.players[gameState.currentPlayerIndex].character.avatar.toLowerCase().endsWith('.png') || gameState.players[gameState.currentPlayerIndex].character.avatar.startsWith('/')) ? (
                <img src={gameState.players[gameState.currentPlayerIndex].character.avatar} alt={gameState.players[gameState.currentPlayerIndex].name} className="w-full h-full object-cover p-1" />
              ) : (
                gameState.players[gameState.currentPlayerIndex].character.avatar || '👤'
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-white/80 font-bold uppercase tracking-widest text-sm">ES EL TURNO DE</span>
              <span className="text-white font-black text-4xl uppercase italic tracking-tighter drop-shadow-md">{gameState.players[gameState.currentPlayerIndex].name}</span>
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
          <div className="text-2xl font-black text-emerald-400 uppercase tracking-widest mb-2">{gameState.lastLog.split(' completó')[0]}</div>
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

