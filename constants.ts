import { Minion, Rarity } from './types';

export const MAX_BOARD_SIZE = 7;
export const MAX_HAND_SIZE = 5;
export const BASE_SHOP_COST = 3;
export const REFRESH_COST = 1;
export const UPGRADE_COST_BASE = 5;

// Helper for tokens
const TABBY_CAT: Omit<Minion, 'id'> = {
    name: "斑纹虎", attack: 1, health: 1, maxHealth: 1, tier: 1, cost: 0, rarity: Rarity.COMMON, imageColor: "bg-orange-300", description: "喵！", keywords: {}
};

const DAMAGED_GOLEM: Omit<Minion, 'id'> = {
    name: "损坏的傀儡", attack: 2, health: 1, maxHealth: 1, tier: 1, cost: 0, rarity: Rarity.COMMON, imageColor: "bg-yellow-700", description: "...", keywords: {}
};

const VOIDWALKER: Omit<Minion, 'id'> = {
    name: "虚空行者", attack: 1, health: 3, maxHealth: 3, tier: 1, cost: 0, rarity: Rarity.COMMON, imageColor: "bg-purple-800", description: "嘲讽", keywords: { taunt: true }
};

const IMP: Omit<Minion, 'id'> = {
    name: "小鬼", attack: 1, health: 1, maxHealth: 1, tier: 1, cost: 0, rarity: Rarity.COMMON, imageColor: "bg-indigo-400", description: "", keywords: {}
};

// Main Pool
export const MINION_POOL: Omit<Minion, 'id'>[] = [
  // Tier 1
  { 
    name: "小小新兵", attack: 1, health: 2, maxHealth: 2, tier: 1, cost: 3, rarity: Rarity.COMMON, imageColor: "bg-gray-500",
    description: "战吼：使一个随机友方随从获得+1/+1。",
    keywords: {},
    effects: [{ type: 'BATTLECRY', trigger: 'BUFF_FRIENDLY', value: 1, targetCount: 1, description: "Buff +1/+1" }]
  },
  { 
    name: "雄斑虎", attack: 1, health: 1, maxHealth: 1, tier: 1, cost: 3, rarity: Rarity.COMMON, imageColor: "bg-orange-400",
    description: "战吼：召唤一个1/1的斑纹虎。",
    keywords: {},
    effects: [{ type: 'BATTLECRY', trigger: 'SUMMON', summonId: 'TOKEN_TABBY', description: "Summon Tabby Cat" }]
  },
  { 
    name: "正义保护者", attack: 1, health: 1, maxHealth: 1, tier: 1, cost: 3, rarity: Rarity.COMMON, imageColor: "bg-yellow-200",
    description: "嘲讽，圣盾",
    keywords: { taunt: true, divineShield: true }
  },
  { 
    name: "微型木乃伊", attack: 1, health: 2, maxHealth: 2, tier: 1, cost: 3, rarity: Rarity.COMMON, imageColor: "bg-purple-300",
    description: "复生",
    keywords: { reborn: true }
  },
  
  // Tier 2
  { 
    name: "麦田傀儡", attack: 2, health: 3, maxHealth: 3, tier: 2, cost: 3, rarity: Rarity.COMMON, imageColor: "bg-yellow-600",
    description: "亡语：召唤一个2/1的损坏的傀儡。",
    keywords: {},
    effects: [{ type: 'DEATHRATTLE', trigger: 'SUMMON', summonId: 'TOKEN_GOLEM', description: "Summon Golem" }]
  },
  { 
    name: "炸弹机器人", attack: 2, health: 2, maxHealth: 2, tier: 2, cost: 3, rarity: Rarity.RARE, imageColor: "bg-red-500",
    description: "亡语：对一个随机敌人造成4点伤害。",
    keywords: {},
    effects: [{ type: 'DEATHRATTLE', trigger: 'DAMAGE_ENEMY', value: 4, targetCount: 1, description: "Deal 4 damage" }]
  },
  { 
    name: "护盾机器人", attack: 2, health: 2, maxHealth: 2, tier: 2, cost: 3, rarity: Rarity.RARE, imageColor: "bg-yellow-400",
    description: "圣盾",
    keywords: { divineShield: true }
  },
  
  // Tier 3
  { 
    name: "青铜守卫", attack: 2, health: 1, maxHealth: 1, tier: 3, cost: 3, rarity: Rarity.EPIC, imageColor: "bg-amber-600",
    description: "圣盾，复生",
    keywords: { divineShield: true, reborn: true }
  },
  { 
    name: "小鬼首领", attack: 2, health: 4, maxHealth: 4, tier: 3, cost: 3, rarity: Rarity.RARE, imageColor: "bg-indigo-600",
    description: "亡语：召唤一个1/1的小鬼。", // Simplified from "When damaged" for MVP
    keywords: {},
    effects: [{ type: 'DEATHRATTLE', trigger: 'SUMMON', summonId: 'TOKEN_IMP', description: "Summon Imp" }]
  },
  
  // Tier 4
  { 
    name: "洞穴多头蛇", attack: 2, health: 4, maxHealth: 4, tier: 4, cost: 3, rarity: Rarity.EPIC, imageColor: "bg-green-700",
    description: "同时攻击目标相邻的随从。",
    keywords: { cleave: true }
  },
  { 
    name: "吵吵模组", attack: 2, health: 4, maxHealth: 4, tier: 4, cost: 3, rarity: Rarity.RARE, imageColor: "bg-orange-300",
    description: "圣盾，嘲讽",
    keywords: { divineShield: true, taunt: true }
  },

  // Tier 5
  { 
    name: "虚空领主", attack: 3, health: 9, maxHealth: 9, tier: 5, cost: 3, rarity: Rarity.EPIC, imageColor: "bg-purple-900",
    description: "嘲讽，亡语：召唤三个1/3的虚空行者。",
    keywords: { taunt: true },
    effects: [{ type: 'DEATHRATTLE', trigger: 'SUMMON', summonId: 'TOKEN_VOIDWALKER', targetCount: 3, description: "Summon 3 Voidwalkers" }]
  },
  { 
    name: "拜戈尔格国王", attack: 6, health: 3, maxHealth: 3, tier: 5, cost: 3, rarity: Rarity.LEGENDARY, imageColor: "bg-green-400",
    description: "战吼：使你的其他鱼人获得+2/+2。",
    keywords: {},
    effects: [{ type: 'BATTLECRY', trigger: 'BUFF_TYPE', targetType: '鱼人', value: 2, description: "Buff Murlocs" }]
  },

  // Tier 6
  { 
    name: "敌人收割者4000", attack: 6, health: 9, maxHealth: 9, tier: 6, cost: 3, rarity: Rarity.LEGENDARY, imageColor: "bg-red-800",
    description: "同时攻击目标相邻的随从。",
    keywords: { cleave: true }
  },
  { 
    name: "熊妈妈", attack: 4, health: 4, maxHealth: 4, tier: 6, cost: 3, rarity: Rarity.LEGENDARY, imageColor: "bg-yellow-800",
    description: "亡语：使你的野兽获得+4/+4。", // Simplified for MVP from "Whenever summoned"
    keywords: {},
    effects: [{ type: 'DEATHRATTLE', trigger: 'BUFF_TYPE', targetType: '野兽', value: 4, description: "Buff Beasts" }]
  },
];

// Token Lookup
export const TOKENS: Record<string, Omit<Minion, 'id'>> = {
    'TOKEN_TABBY': TABBY_CAT,
    'TOKEN_GOLEM': DAMAGED_GOLEM,
    'TOKEN_VOIDWALKER': VOIDWALKER,
    'TOKEN_IMP': IMP
};