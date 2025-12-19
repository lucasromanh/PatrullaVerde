
export enum CardType {
  ANIMAL = 'ANIMAL',
  ACTION = 'ACTION',
  THREAT = 'THREAT',
  SOLIDARITY = 'SOLIDARITY',
  WASTE = 'WASTE'
}

export interface Card {
  id: string;
  type: CardType;
  title: string;
  description: string;
  effect: (gameState: GameState) => Partial<GameState>;
  icon?: string;
  color: string;
  imageUrl?: string;
}

export interface GameCharacter {
  id: string;
  name: string;
  avatar: string;
  description: string;
  color: string;
}

export interface Player {
  id: number;
  name: string;
  color: string;
  position: number;
  animals: string[];
  isFinished: boolean;
  character?: GameCharacter;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number | null;
  isRolling: boolean;
  activeCard: Card | null;
  gameStatus: 'LOBBY' | 'PLAYING' | 'FINISHED';
  totalAnimalsRescued: number;
  lastLog: string;
}

export interface Tile {
  id: number;
  type: CardType | 'EMPTY' | 'START' | 'END';
  label?: string;
}
