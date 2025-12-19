import { CardType, Card, Tile, GameCharacter, GameState } from './types.ts';

export const COLORS = {
  [CardType.ANIMAL]: 'bg-purple-500',
  [CardType.ACTION]: 'bg-yellow-400',
  [CardType.THREAT]: 'bg-red-500',
  [CardType.SOLIDARITY]: 'bg-blue-500',
  [CardType.WASTE]: 'bg-green-600',
  EMPTY: 'bg-white',
  START: 'bg-emerald-400',
  END: 'bg-emerald-600'
};

export const CHARACTERS: GameCharacter[] = [
  { id: 'c1', name: 'Lucas', avatar: '/LucasLego.png', description: 'Experto en reciclaje y gestión de residuos.', color: 'bg-emerald-500' },
  { id: 'c2', name: 'Cele', avatar: '/CeleLego.png', description: 'Protectora de la flora y fauna nativa.', color: 'bg-green-600' },
  { id: 'c3', name: 'Cata Zombie', avatar: '/CataZombieLego.png', description: 'Investigadora de energías renovables.', color: 'bg-teal-500' },
  { id: 'c4', name: 'Cata Encanto', avatar: '/CataEncantoLego.png', description: 'Defensora del agua y los humedales.', color: 'bg-cyan-500' }
];

export const ICONS = {
  [CardType.ANIMAL]: '🐾',
  [CardType.ACTION]: '⚡',
  [CardType.THREAT]: '⚠️',
  [CardType.SOLIDARITY]: '🤝',
  [CardType.WASTE]: '♻️',
  START: '🏁',
  END: '🏆',
  EMPTY: '🌱'
};

export const BOARD_LAYOUT: Tile[] = [
  { id: 0, type: 'START', label: 'ENTRADA' },
  { id: 1, type: CardType.ACTION },
  { id: 2, type: 'EMPTY' },
  { id: 3, type: CardType.ANIMAL },
  { id: 4, type: CardType.THREAT },
  { id: 5, type: CardType.WASTE },
  { id: 6, type: CardType.ACTION },
  { id: 7, type: CardType.SOLIDARITY },
  { id: 8, type: 'EMPTY' },
  { id: 9, type: CardType.ANIMAL },
  { id: 10, type: CardType.WASTE },
  { id: 11, type: CardType.ACTION },
  { id: 12, type: CardType.THREAT },
  { id: 13, type: CardType.SOLIDARITY },
  { id: 14, type: 'EMPTY' },
  { id: 15, type: CardType.ANIMAL },
  { id: 16, type: CardType.WASTE },
  { id: 17, type: CardType.THREAT },
  { id: 18, type: CardType.ACTION },
  { id: 19, type: CardType.SOLIDARITY },
  { id: 20, type: 'EMPTY' },
  { id: 21, type: CardType.ANIMAL },
  { id: 22, type: CardType.WASTE },
  { id: 23, type: CardType.ACTION },
  { id: 24, type: CardType.THREAT },
  { id: 25, type: CardType.SOLIDARITY },
  { id: 26, type: 'EMPTY' },
  { id: 27, type: CardType.WASTE },
  { id: 28, type: CardType.ANIMAL },
  { id: 29, type: 'END', label: 'SALIDA' }
];

export const ARGENTINE_ANIMALS = [
  { name: 'Yaguareté', img: 'https://images.unsplash.com/photo-1575550959106-5a7defe28b56?auto=format&fit=crop&q=80&w=800', desc: 'El felino más grande de América. ¡Necesita selvas sanas!' },
  { name: 'Carpincho', img: 'https://images.unsplash.com/photo-1614741118830-1c3672727653?auto=format&fit=crop&q=80&w=800', desc: 'Amigo de los humedales. ¡Cuida su hogar de agua!' },
  { name: 'Cóndor Andino', img: 'https://images.unsplash.com/photo-1606856110002-d09f23d5006b?auto=format&fit=crop&q=80&w=800', desc: 'El rey de los Andes. ¡Vuela alto y libre!' },
  { name: 'Oso Hormiguero', img: 'https://images.unsplash.com/photo-1594892997136-1e621eb83c48?auto=format&fit=crop&q=80&w=800', desc: 'Con su lengua larga cuida el equilibrio del monte.' },
  { name: 'Ballena Franca', img: 'https://images.unsplash.com/photo-1557997383-8a9d18b3356e?auto=format&fit=crop&q=80&w=800', desc: 'Gigante del Mar Argentino. ¡Cuidemos el océano!' },
  { name: 'Puma', img: 'https://images.unsplash.com/photo-1572360677861-1c390807b1a2?auto=format&fit=crop&q=80&w=800', desc: 'El gran cazador de las montañas. ¡Respetemos su territorio!' }
];

export const CARDS: Record<CardType, Card[]> = {
  [CardType.ANIMAL]: ARGENTINE_ANIMALS.map(animal => ({
    id: `animal-${animal.name}`,
    type: CardType.ANIMAL,
    title: `${animal.name}`,
    description: animal.desc,
    color: 'bg-purple-600',
    imageUrl: animal.img,
    effect: (state: GameState) => {
      const players = [...state.players];
      players[state.currentPlayerIndex].inventory.push({
        id: `animal-${animal.name}`,
        title: animal.name,
        type: CardType.ANIMAL,
        color: 'bg-purple-600',
        imageUrl: animal.img
      });
      return { players, totalAnimalsRescued: state.totalAnimalsRescued + 1, lastLog: `¡${players[state.currentPlayerIndex].name} rescató un ${animal.name}!` };
    }
  })),
  [CardType.ACTION]: [
    {
      id: 'act-1',
      type: CardType.ACTION,
      title: 'Patrulla Veloz',
      description: '¡Encontraste un atajo por el bosque! Avanza 4 casillas.',
      color: 'bg-yellow-500',
      imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80',
      effect: (state: GameState) => {
        const players = [...state.players];
        players[state.currentPlayerIndex].position = Math.min(BOARD_LAYOUT.length - 1, players[state.currentPlayerIndex].position + 4);
        return { players, lastLog: `¡Impulso de velocidad para ${players[state.currentPlayerIndex].name}!` };
      }
    },
    {
      id: 'act-2',
      type: CardType.ACTION,
      title: 'Exploración Aérea',
      description: '¡Desde arriba todo se ve mejor! Avanza 2 casillas.',
      color: 'bg-yellow-500',
      imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
      effect: (state: GameState) => {
        const players = [...state.players];
        players[state.currentPlayerIndex].position = Math.min(BOARD_LAYOUT.length - 1, players[state.currentPlayerIndex].position + 2);
        return { players };
      }
    }
  ],
  [CardType.THREAT]: [
    {
      id: 'thr-1',
      type: CardType.THREAT,
      title: 'Incendio Forestal',
      description: '¡Fuego en el bosque! Todos deben retroceder 3 casillas por seguridad.',
      color: 'bg-red-600',
      imageUrl: 'https://images.unsplash.com/photo-1542332213-31f87348057f?auto=format&fit=crop&w=600&q=80',
      effect: (state: GameState) => {
        const players = state.players.map(p => ({
          ...p,
          position: Math.max(0, p.position - 3)
        }));
        return { players, lastLog: '¡Alerta de incendio! Todos retroceden.' };
      }
    },
    {
      id: 'thr-2',
      type: CardType.THREAT,
      title: 'Basural a Cielo Abierto',
      description: '¡Demasiada basura acumulada! Pierdes tu próximo turno para limpiar.',
      color: 'bg-red-600',
      imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      effect: (state: GameState) => {
        return { lastLog: `¡${state.players[state.currentPlayerIndex].name} está limpiando basura!` };
      }
    }
  ],
  [CardType.SOLIDARITY]: [
    {
      id: 'sol-1',
      type: CardType.SOLIDARITY,
      title: 'Refugio Compartido',
      description: 'Elige a un compañero para que avance 3 casillas contigo.',
      color: 'bg-blue-600',
      imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80',
      effect: (state: GameState) => {
        const players = [...state.players];
        players[state.currentPlayerIndex].position = Math.min(BOARD_LAYOUT.length - 1, players[state.currentPlayerIndex].position + 3);
        const nextIdx = (state.currentPlayerIndex + 1) % players.length;
        players[nextIdx].position = Math.min(BOARD_LAYOUT.length - 1, players[nextIdx].position + 3);
        return { players, lastLog: '¡Gran gesto de solidaridad!' };
      }
    }
  ],
  [CardType.WASTE]: [
    {
      id: 'was-1',
      type: CardType.WASTE,
      title: 'REDUCIR (1ª R)',
      description: 'Evitar generar basura es la mejor opción. ¡Ganaste un rescate extra!',
      color: 'bg-emerald-600',
      imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80',
      effect: (state: GameState) => {
        const players = [...state.players];
        players[state.currentPlayerIndex].inventory.push({
          id: 'bonus-reduce',
          title: 'Bono Ecológico',
          type: CardType.WASTE,
          color: 'bg-emerald-600',
          imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80'
        });
        return { players, totalAnimalsRescued: state.totalAnimalsRescued + 1, lastLog: '¡Reducir es el primer paso!' };
      }
    },
    {
      id: 'was-2',
      type: CardType.WASTE,
      title: 'RECICLAR (4ª R)',
      description: 'Separar los residuos salva vidas. Avanza 3 casillas.',
      color: 'bg-emerald-600',
      imageUrl: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=600&q=80',
      effect: (state: GameState) => {
        const players = [...state.players];
        players[state.currentPlayerIndex].position = Math.min(BOARD_LAYOUT.length - 1, players[state.currentPlayerIndex].position + 3);
        return { players, lastLog: '¡Reciclando para un mundo mejor!' };
      }
    }
  ]
};

export const TILE_OFFSETS = [
  { x: 1.0, y: 1.5 }, { x: 2.5, y: 1.8 }, { x: 4.0, y: 2.2 }, { x: 5.2, y: 3.2 }, { x: 4.5, y: 4.8 },
  { x: 3.0, y: 5.5 }, { x: 1.5, y: 5.0 }, { x: 0.5, y: 6.5 }, { x: 1.2, y: 8.2 }, { x: 2.8, y: 9.0 },
  { x: 4.5, y: 8.5 }, { x: 5.8, y: 10.0 }, { x: 5.2, y: 11.8 }, { x: 3.8, y: 12.8 }, { x: 2.2, y: 12.2 },
  { x: 1.0, y: 13.8 }, { x: 1.8, y: 15.6 }, { x: 3.5, y: 16.2 }, { x: 5.0, y: 15.5 }, { x: 6.2, y: 17.0 },
  { x: 5.6, y: 18.8 }, { x: 4.2, y: 19.8 }, { x: 2.6, y: 19.2 }, { x: 1.2, y: 20.6 }, { x: 1.8, y: 22.4 },
  { x: 3.5, y: 23.0 }, { x: 5.2, y: 22.4 }, { x: 6.4, y: 24.0 }, { x: 5.8, y: 25.8 }, { x: 4.2, y: 26.8 }
];

export const getTileCoordinates = (index: number) => {
  const pos = TILE_OFFSETS[index] || { x: index % 6, y: index };
  return {
    x: pos.x * 160 + 100,
    y: pos.y * 130 + 350
  };
};
