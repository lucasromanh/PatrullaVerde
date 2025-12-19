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

export interface Player {
    id: string;
    name: string;
    character: GameCharacter;
    position: number;
    animals: string[];
}

export interface GameState {
    players: Player[];
    currentPlayerIndex: number;
    totalAnimalsRescued: number;
    lastLog: string;
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
