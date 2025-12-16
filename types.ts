export enum Rarity {
  COMMON = 'Common',
  RARE = 'Rare',
  EPIC = 'Epic',
  LEGENDARY = 'Legendary'
}

export type EffectType = 'BATTLECRY' | 'DEATHRATTLE' | 'PASSIVE';
export type EffectTrigger = 'SUMMON' | 'BUFF_FRIENDLY' | 'DAMAGE_ENEMY' | 'BUFF_SELF' | 'BUFF_TYPE';

export interface MinionEffect {
  type: EffectType;
  trigger: EffectTrigger;
  value?: number;
  targetCount?: number; // How many targets
  targetType?: string; // e.g., 'Murloc', 'Beast'
  summonId?: string; // ID of token to summon
  description: string;
}

export interface MinionKeywords {
  divineShield?: boolean;
  taunt?: boolean;
  cleave?: boolean;
  poisonous?: boolean;
  reborn?: boolean;
}

export interface Minion {
  id: string;
  name: string;
  attack: number;
  health: number;
  maxHealth: number;
  tier: number;
  cost: number;
  rarity: Rarity;
  description?: string;
  imageColor?: string; 
  isTaunt?: boolean; // Deprecated, use keywords.taunt
  keywords?: MinionKeywords;
  effects?: MinionEffect[];
  isGolden?: boolean;
  // Visual states
  isDying?: boolean;
  lastDamageTaken?: number;
}

export type GamePhase = 'SHOP' | 'COMBAT' | 'GAME_OVER' | 'VICTORY' | 'DISCOVERY';

export interface Player {
  hp: number;
  maxHp: number;
  gold: number;
  maxGold: number;
  tier: number;
  board: Minion[];
  hand: Minion[];
}

export interface CombatLog {
  message: string;
  id: string;
}

export interface GameState {
  turn: number;
  phase: GamePhase;
  player: Player;
  enemyBoard: Minion[];
  shop: Minion[];
  freezeShop: boolean;
  combatLogs: CombatLog[];
  winner: 'player' | 'enemy' | 'draw' | null;
  isLoadingEnemy: boolean;
  discoveryOptions: Minion[]; // Minions available to discover
  showGallery: boolean; // Toggle for gallery modal
}