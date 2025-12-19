export enum CardType {
    ANIMAL = 'ANIMAL',
    ACTION = 'ACTION',
    THREAT = 'THREAT',
    SOLIDARITY = 'SOLIDARITY',
    WASTE = 'WASTE'
}

export interface GameCharacter {
    id: string;
    name: string;
    avatar: string;
    description: string;
    color: string;
}

export interface CollectedCard {
    id: string;
    title: string;
    type: CardType;
    color: string;
    imageUrl?: string;
}

export interface Player {
    id: number;
    name: string;
    character: GameCharacter;
    position: number;
    inventory: CollectedCard[];
    color: string;
    isFinished: boolean;
}

export interface GameState {
    players: Player[];
    currentPlayerIndex: number;
    totalAnimalsRescued: number;
    lastLog: string;
    diceValue: number | null;
    isRolling: boolean;
    activeCard: Card | null;
    gameStatus: 'LOBBY' | 'PLAYING' | 'FINISHED';
}

export interface Card {
    id: string;
    type: CardType;
    title: string;
    description: string;
    color: string;
    imageUrl?: string;
    effect: (state: GameState) => Partial<GameState>;
}

export interface Tile {
    id: number;
    type: CardType | 'START' | 'END' | 'EMPTY';
    label?: string;
}
