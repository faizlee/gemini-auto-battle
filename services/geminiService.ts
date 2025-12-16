import { GoogleGenAI, Type } from "@google/genai";
import { Minion, Rarity } from "../types";

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateEnemyBoard = async (turn: number, playerTier: number): Promise<Minion[]> => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing");
    return generateFallbackEnemy(turn);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Simulate player progression curve
  const estimatedTier = Math.min(6, Math.floor(turn / 3) + 1);
  const estimatedMinionCount = Math.min(7, turn === 1 ? 1 : turn === 2 ? 2 : 2 + Math.floor(turn / 2));
  
  const prompt = `
    模拟一个《酒馆战棋》风格的对手玩家在第 ${turn} 回合的阵容。
    该“模拟玩家”应该像真实人类玩家一样开局：
    - 第1回合通常只有1个1星随从。
    - 第2-3回合随从数量逐渐增加到2-3个。
    - 当前酒馆等级约为 ${estimatedTier}。
    - 请生成 ${estimatedMinionCount} 个随从作为他的当前战场。
    - 随从的属性和效果应该符合当前回合的战力模型（不要太强也不要太弱）。
    - 必须包含随从的中文名称、攻击力、生命值、星级、简短描述。
    - 如果是防御型随从，设置 isTaunt 为 true。
    - 如果有圣盾，设置 divineShield 为 true。
    - 如果有亡语效果，请在描述中说明。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            minions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  attack: { type: Type.NUMBER },
                  health: { type: Type.NUMBER },
                  tier: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  isTaunt: { type: Type.BOOLEAN },
                  divineShield: { type: Type.BOOLEAN },
                },
                required: ["name", "attack", "health", "tier", "description"],
              },
            },
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response text");

    const data = JSON.parse(jsonText);
    
    // Map response to our Minion type
    const enemies: Minion[] = data.minions.map((m: any) => ({
      id: generateId(),
      name: m.name,
      attack: m.attack,
      health: m.health,
      maxHealth: m.health,
      tier: m.tier,
      cost: 0,
      rarity: m.tier >= 5 ? Rarity.LEGENDARY : m.tier >= 3 ? Rarity.RARE : Rarity.COMMON,
      description: m.description,
      isTaunt: !!m.isTaunt, // Keep legacy prop for compat
      keywords: {
          taunt: !!m.isTaunt,
          divineShield: !!m.divineShield
      },
      imageColor: "bg-red-900", // Enemy color
    }));

    return enemies;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return generateFallbackEnemy(turn);
  }
};

// Fallback logic in case API fails or key is missing
const generateFallbackEnemy = (turn: number): Minion[] => {
  const count = Math.min(7, turn === 1 ? 1 : 2 + Math.floor(turn / 3));
  const enemies: Minion[] = [];
  
  for (let i = 0; i < count; i++) {
    const scale = Math.max(1, turn * 0.8 + (Math.random() * 2 - 1));
    const isTaunt = Math.random() > 0.8;
    const isShield = Math.random() > 0.85;
    enemies.push({
      id: generateId(),
      name: `虚空构造体 ${i + 1}`,
      attack: Math.floor(scale),
      health: Math.floor(scale * 1.5),
      maxHealth: Math.floor(scale * 1.5),
      tier: Math.min(6, Math.ceil(turn / 3)),
      cost: 0,
      rarity: Rarity.COMMON,
      description: isShield ? "圣盾" : "无",
      isTaunt: isTaunt,
      keywords: { taunt: isTaunt, divineShield: isShield },
      imageColor: "bg-red-900",
    });
  }
  return enemies;
};