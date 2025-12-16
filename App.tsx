import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Minion, Player, GameState, GamePhase, Rarity } from './types';
import { MINION_POOL, BASE_SHOP_COST, REFRESH_COST, MAX_BOARD_SIZE, MAX_HAND_SIZE, TOKENS } from './constants';
import Card from './components/Card';
import GameInfo from './components/GameInfo';
import MinionGallery from './components/MinionGallery';
import { generateEnemyBoard } from './services/geminiService';
import { Play, RotateCcw, Skull, Trash2, Loader2, Trophy } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const INITIAL_PLAYER: Player = {
  hp: 30,
  maxHp: 30,
  gold: 3,
  maxGold: 3,
  tier: 1,
  board: [],
  hand: []
};

// Helper to get random minions strictly from a specific tier
// Used for Triple Rewards
const getDiscoveryMinions = (count: number, exactTier: number): Minion[] => {
    // Falls back to exactTier, or exactTier - 1 if empty, etc.
    let pool = MINION_POOL.filter(m => m.tier === exactTier);
    
    // If pool is empty (e.g. asking for Tier 7 or empty tier), fallback to highest available
    if (pool.length === 0) {
        pool = MINION_POOL.filter(m => m.tier === Math.min(6, exactTier));
    }
    // Deep fallback
    if (pool.length === 0) {
        pool = MINION_POOL; 
    }

    const result: Minion[] = [];
    for(let i=0; i<count; i++) {
        const randomBase = pool[Math.floor(Math.random() * pool.length)];
        result.push({ 
            ...randomBase, 
            id: generateId(), 
            maxHealth: randomBase.health,
            keywords: randomBase.keywords || {}
        });
    }
    return result;
}

// Helper to get random minions from the pool UP TO maxTier (Shop logic)
const getRandomMinions = (count: number, maxTier: number): Minion[] => {
  const available = MINION_POOL.filter(m => m.tier <= maxTier);
  const result: Minion[] = [];
  if (available.length === 0) return [];
  
  for(let i=0; i<count; i++) {
    const randomBase = available[Math.floor(Math.random() * available.length)];
    result.push({ 
        ...randomBase, 
        id: generateId(), 
        maxHealth: randomBase.health,
        keywords: randomBase.keywords || {}
    });
  }
  return result;
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    turn: 1,
    phase: 'SHOP',
    player: { ...INITIAL_PLAYER },
    enemyBoard: [],
    shop: getRandomMinions(3, 1),
    freezeShop: false,
    combatLogs: [],
    winner: null,
    isLoadingEnemy: false,
    discoveryOptions: [],
    showGallery: false
  });

  const [attackingMinionId, setAttackingMinionId] = useState<string | null>(null);
  const [hitMinionId, setHitMinionId] = useState<string | null>(null);
  
  // Drag and Drop State
  const dragItemRef = useRef<{ minion: Minion, from: 'board' | 'hand' } | null>(null);
  const isCombatRunningRef = useRef(false);

  // Combat Simulation Refs
  const combatStateRef = useRef<{
    initialPlayerBoard: Minion[]; 
    playerBoard: Minion[];
    enemyBoard: Minion[];
    nextAttacker: 'player' | 'enemy';
    playerIndex: number;
    enemyIndex: number;
  }>({ initialPlayerBoard: [], playerBoard: [], enemyBoard: [], nextAttacker: 'player', playerIndex: 0, enemyIndex: 0 });

  // --- Drag and Drop Logic ---

  const handleDragStart = (e: React.DragEvent, minion: Minion, from: 'board' | 'hand') => {
      dragItemRef.current = { minion, from };
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnBoard = (e: React.DragEvent, targetMinion: Minion) => {
      e.preventDefault();
      const dragged = dragItemRef.current;
      if (!dragged) return;

      if (dragged.from === 'board') {
          setGameState(prev => {
              const newBoard = [...prev.player.board];
              const fromIdx = newBoard.findIndex(m => m.id === dragged.minion.id);
              const toIdx = newBoard.findIndex(m => m.id === targetMinion.id);
              
              if (fromIdx !== -1 && toIdx !== -1) {
                  [newBoard[fromIdx], newBoard[toIdx]] = [newBoard[toIdx], newBoard[fromIdx]];
              }
              return { ...prev, player: { ...prev.player, board: newBoard }};
          });
      }
      dragItemRef.current = null;
  };

  const handleDropSell = (e: React.DragEvent) => {
      e.preventDefault();
      const dragged = dragItemRef.current;
      if (!dragged || dragged.from !== 'board' || gameState.phase !== 'SHOP') return;

      sellMinion(dragged.minion);
      dragItemRef.current = null;
  };

  // --- Shop Actions ---

  const buyMinion = (minion: Minion) => {
    if (gameState.phase !== 'SHOP') return;
    if (gameState.player.gold < minion.cost) return;
    if (gameState.player.hand.length >= MAX_HAND_SIZE) return;

    setGameState(prev => {
        const handMatches = prev.player.hand.filter(m => m.name === minion.name && !m.isGolden);
        const boardMatches = prev.player.board.filter(m => m.name === minion.name && !m.isGolden);
        
        let newHand = [...prev.player.hand];
        let newBoard = [...prev.player.board];
        let goldSpent = minion.cost;
        let tripleFound = false;

        // Triple Check: Total copies (Hand + Board) + 1 (Shop) >= 3
        const totalCopies = handMatches.length + boardMatches.length;
        
        if (totalCopies >= 2) {
             // Triple Logic: Remove 2 existing non-golden copies to make room
             let removedCount = 0;
             
             // Prioritize removing from hand first? Or Board? 
             // Logic: Remove from board/hand to form the Golden in HAND.
             
             newHand = newHand.filter(m => {
                 if (removedCount < 2 && m.name === minion.name && !m.isGolden) { removedCount++; return false; } return true;
             });
             
             if (removedCount < 2) {
                 newBoard = newBoard.filter(m => {
                    if (removedCount < 2 && m.name === minion.name && !m.isGolden) { removedCount++; return false; } return true;
                 });
             }
             
             const base = MINION_POOL.find(m => m.name === minion.name) || minion;
             // Add Golden Minion to Hand
             newHand.push({ 
                 ...base, 
                 id: generateId(), 
                 attack: base.attack * 2, 
                 health: base.health * 2, 
                 maxHealth: base.health * 2, 
                 isGolden: true, 
                 keywords: base.keywords || {} 
             });
             tripleFound = true;
        } else {
             newHand.push(minion);
        }

        return {
            ...prev,
            player: { ...prev.player, gold: prev.player.gold - goldSpent, hand: newHand, board: newBoard },
            shop: prev.shop.filter(m => m.id !== minion.id)
        };
    });
  };

  const playMinion = (minion: Minion) => {
    if (gameState.phase !== 'SHOP') return;
    if (gameState.player.board.length >= MAX_BOARD_SIZE) return;

    setGameState(prev => {
        let newBoard = [...prev.player.board, minion];
        
        // Battlecries
        minion.effects?.forEach(e => {
            if(e.type === 'BATTLECRY' && e.trigger === 'BUFF_FRIENDLY') {
                 const t = newBoard.filter(m => m.id !== minion.id);
                 if(t.length) { const x = t[Math.floor(Math.random()*t.length)]; x.attack+=(e.value||0); x.health+=(e.value||0); x.maxHealth+=(e.value||0); }
            }
        });

        // Triple Reward Logic
        let nextPhase = prev.phase;
        let discoveryOpts = prev.discoveryOptions;
        
        if (minion.isGolden) {
             // Rule: Discover from Current Tier + 1
             // Cap at 6
             const rewardTier = Math.min(6, prev.player.tier + 1);
             
             discoveryOpts = getDiscoveryMinions(3, rewardTier);
             
             if (discoveryOpts.length > 0) {
                 nextPhase = 'DISCOVERY';
             }
        }

        return {
            ...prev,
            phase: nextPhase,
            discoveryOptions: discoveryOpts,
            player: { ...prev.player, hand: prev.player.hand.filter(m => m.id !== minion.id), board: newBoard }
        };
    });
  };

  const selectDiscovery = (minion: Minion) => {
      setGameState(prev => ({
          ...prev,
          phase: 'SHOP',
          discoveryOptions: [],
          player: { ...prev.player, hand: [...prev.player.hand, minion] }
      }));
  };

  const sellMinion = (minion: Minion) => {
    if (gameState.phase !== 'SHOP') return;
    setGameState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        gold: prev.player.gold + 1,
        board: prev.player.board.filter(m => m.id !== minion.id)
      }
    }));
  };

  const refreshShop = () => {
    if (gameState.player.gold < REFRESH_COST) return;
    const count = 3 + Math.floor(gameState.player.tier / 2);
    setGameState(prev => ({
      ...prev,
      player: { ...prev.player, gold: prev.player.gold - REFRESH_COST },
      shop: getRandomMinions(count, prev.player.tier),
      freezeShop: false
    }));
  };

  const upgradeTavern = () => {
    if (gameState.player.gold < 5) return;
    if (gameState.player.tier >= 6) return;
    setGameState(prev => ({ ...prev, player: { ...prev.player, gold: prev.player.gold - 5, tier: prev.player.tier + 1 } }));
  };

  // --- Combat Logic ---
  
  const startCombatPhase = async () => {
    if (gameState.isLoadingEnemy) return;
    if (gameState.player.board.length === 0) { alert("你需要至少一个随从来进行战斗！"); return; }
    
    setGameState(prev => ({ ...prev, isLoadingEnemy: true }));
    const enemies = await generateEnemyBoard(gameState.turn, gameState.player.tier);
    
    setGameState(prev => ({
      ...prev,
      phase: 'COMBAT',
      isLoadingEnemy: false,
      enemyBoard: enemies,
      combatLogs: []
    }));

    combatStateRef.current = {
        initialPlayerBoard: JSON.parse(JSON.stringify(gameState.player.board)),
        playerBoard: JSON.parse(JSON.stringify(gameState.player.board)),
        enemyBoard: JSON.parse(JSON.stringify(enemies)),
        nextAttacker: Math.random() > 0.5 ? 'player' : 'enemy',
        playerIndex: 0,
        enemyIndex: 0
    };

    isCombatRunningRef.current = true;
    runCombatLoop();
  };

  const runCombatLoop = async () => {
      while (isCombatRunningRef.current) {
          const state = combatStateRef.current;
          
          if (state.playerBoard.length === 0 || state.enemyBoard.length === 0) {
              const result = state.playerBoard.length > 0 ? 'player' : state.enemyBoard.length > 0 ? 'enemy' : 'draw';
              endCombat(result);
              break;
          }

          const isPlayerTurn = state.nextAttacker === 'player';
          const attackerBoard = isPlayerTurn ? state.playerBoard : state.enemyBoard;
          const defenderBoard = isPlayerTurn ? state.enemyBoard : state.playerBoard;
          
          if (attackerBoard.length === 0) { 
              // Should catch above, but safety
               state.nextAttacker = isPlayerTurn ? 'enemy' : 'player';
               continue;
          }

          const actualAttackerIndex = isPlayerTurn ? state.playerIndex % attackerBoard.length : state.enemyIndex % attackerBoard.length;
          const attacker = attackerBoard[actualAttackerIndex];
          
          // Check if attacker is already dead (edge case in multi-death)
          if (!attacker || attacker.health <= 0) {
             if (isPlayerTurn) state.playerIndex++; else state.enemyIndex++;
             continue; 
          }

          const tauntTargets = defenderBoard.filter(m => (m.keywords?.taunt || m.isTaunt) && m.health > 0);
          const potentialTargets = defenderBoard.filter(m => m.health > 0);
          const targets = tauntTargets.length > 0 ? tauntTargets : potentialTargets;
          
          if (targets.length === 0) {
               // Opponent board effectively empty
               break; 
          }

          const target = targets[Math.floor(Math.random() * targets.length)];
          const targetIndex = defenderBoard.findIndex(m => m.id === target.id);

          // Animate
          setAttackingMinionId(attacker.id);
          await sleep(400); 
          
          // Impact
          setHitMinionId(target.id);
          
          let damageToTarget = attacker.attack;
          let damageToAttacker = target.attack;

          // Divine Shield Logic
          if (target.keywords?.divineShield) { damageToTarget = 0; target.keywords.divineShield = false; }
          if (attacker.keywords?.divineShield) { damageToAttacker = 0; attacker.keywords.divineShield = false; }

          target.health -= damageToTarget;
          attacker.health -= damageToAttacker;
          target.lastDamageTaken = damageToTarget;
          attacker.lastDamageTaken = damageToAttacker;

          // Cleave
          if (attacker.keywords?.cleave) {
               [targetIndex - 1, targetIndex + 1].forEach(idx => {
                   if(defenderBoard[idx] && defenderBoard[idx].health > 0) {
                       let cleaveDmg = attacker.attack;
                       if (defenderBoard[idx].keywords?.divineShield) { cleaveDmg = 0; defenderBoard[idx].keywords!.divineShield = false; }
                       defenderBoard[idx].health -= cleaveDmg;
                       defenderBoard[idx].lastDamageTaken = cleaveDmg;
                   }
               });
          }

          setGameState(prev => ({
              ...prev,
              player: { ...prev.player, board: [...state.playerBoard] },
              enemyBoard: [...state.enemyBoard]
          }));

          await sleep(600); 
          setAttackingMinionId(null);
          setHitMinionId(null);

          // Death Processing
          let deathsFound = false;
          [state.playerBoard, state.enemyBoard].forEach(board => {
              board.forEach(m => {
                  if (m.health <= 0) {
                      m.isDying = true;
                      deathsFound = true;
                  }
              });
          });

          if (deathsFound) {
              setGameState(prev => ({
                  ...prev,
                  player: { ...prev.player, board: [...state.playerBoard] },
                  enemyBoard: [...state.enemyBoard]
              }));
              await sleep(700); 
          }

          const processDeaths = (board: Minion[]) => {
               const nextBoard: Minion[] = [];
               board.forEach(m => {
                   if (m.health <= 0) {
                        if (m.effects) {
                            m.effects.forEach(e => {
                                if (e.type === 'DEATHRATTLE' && e.trigger === 'SUMMON' && e.summonId) {
                                    const t = TOKENS[e.summonId];
                                    if(t) nextBoard.push({ ...t, id: generateId(), maxHealth: t.health, keywords: t.keywords });
                                } else if (e.type === 'DEATHRATTLE' && e.trigger === 'DAMAGE_ENEMY') {
                                    const enemyB = board === state.playerBoard ? state.enemyBoard : state.playerBoard;
                                    const alive = enemyB.filter(e => e.health > 0);
                                    if(alive.length) alive[Math.floor(Math.random()*alive.length)].health -= (e.value||1);
                                }
                            });
                        }
                   } else {
                       nextBoard.push(m);
                   }
               });
               return nextBoard.slice(0, MAX_BOARD_SIZE);
           };

           state.playerBoard = processDeaths(state.playerBoard);
           state.enemyBoard = processDeaths(state.enemyBoard);

           if (attacker.health > 0) {
               if (isPlayerTurn) state.playerIndex++; else state.enemyIndex++;
           }
           state.nextAttacker = isPlayerTurn ? 'enemy' : 'player';

           setGameState(prev => ({
               ...prev,
               player: { ...prev.player, board: [...state.playerBoard] },
               enemyBoard: [...state.enemyBoard]
           }));

           await sleep(300);
      }
      isCombatRunningRef.current = false;
  };

  const endCombat = (result: 'player' | 'enemy' | 'draw') => {
    setGameState(prev => {
        let hpLoss = 0;
        if (result === 'enemy') {
            const enemyTier = Math.min(6, Math.floor(prev.turn / 3) + 1);
            const damage = prev.enemyBoard.reduce((acc, m) => acc + m.tier, 0) + enemyTier;
            hpLoss = damage;
        }
        const newHp = Math.max(0, prev.player.hp - hpLoss);
        let nextPhase: GamePhase = newHp === 0 ? 'GAME_OVER' : prev.turn >= 15 ? 'VICTORY' : 'SHOP';
        let winner: any = newHp === 0 ? 'enemy' : prev.turn >= 15 ? 'player' : null;

        return {
            ...prev,
            phase: nextPhase,
            winner: winner,
            turn: prev.turn + 1,
            player: {
                ...prev.player,
                hp: newHp,
                gold: Math.min(10, 3 + prev.turn),
                // Restore board fully
                board: combatStateRef.current.initialPlayerBoard.map(m => ({
                    ...m, 
                    health: m.maxHealth, 
                    isDying: false,
                    lastDamageTaken: 0,
                    // Restore divine shields if base minion had it
                    keywords: {
                        ...m.keywords, 
                        divineShield: MINION_POOL.find(p => p.name === m.name)?.keywords?.divineShield || m.keywords?.divineShield
                    }
                })), 
            },
            shop: prev.freezeShop ? prev.shop : getRandomMinions(3 + Math.floor(prev.player.tier/2), prev.player.tier),
            combatLogs: [],
            enemyBoard: []
        };
    });
  };

  const restartGame = () => {
      isCombatRunningRef.current = false;
      setGameState({
        turn: 1,
        phase: 'SHOP',
        player: { ...INITIAL_PLAYER },
        enemyBoard: [],
        shop: getRandomMinions(3, 1),
        freezeShop: false,
        combatLogs: [],
        winner: null,
        isLoadingEnemy: false,
        discoveryOptions: [],
        showGallery: false
      });
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-2 sm:p-4 font-sans select-none overflow-hidden bg-cover bg-center">
      
      <h1 className="text-3xl sm:text-4xl font-fantasy text-yellow-500 mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-widest border-b-2 border-yellow-700/50 pb-2 w-full text-center">
          GEMINI BATTLEGROUNDS
      </h1>
      
      <GameInfo 
        state={gameState} 
        onRefresh={refreshShop} 
        onUpgrade={upgradeTavern}
        onFreeze={() => setGameState(p => ({...p, freezeShop: !p.freezeShop}))}
        onOpenGallery={() => setGameState(prev => ({...prev, showGallery: true}))}
      />

      <MinionGallery isOpen={gameState.showGallery} onClose={() => setGameState(prev => ({...prev, showGallery: false}))} />

      {/* Main Game Area */}
      <div className="flex-grow w-full max-w-6xl flex flex-col gap-2 relative">

        {/* --- Shop / Enemy Board --- */}
        <div 
            className={`flex-1 rounded-2xl p-4 border-2 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center min-h-[220px] transition-colors duration-500
                ${gameState.phase === 'SHOP' ? 'bg-[#2a2018] border-[#4a3525]' : 'bg-[#1a0f0f] border-red-900'}
            `}
            onDragOver={handleDragOver}
            onDrop={handleDropSell}
        >
          <div className="flex w-full justify-between items-center mb-2 px-4 border-b border-white/10 pb-1">
              <h2 className="text-[#dcd0c0] font-bold uppercase tracking-widest text-sm font-fantasy flex items-center gap-2">
                {gameState.phase === 'SHOP' ? <><Trophy size={16} className="text-yellow-500"/> 鲍勃的酒馆</> : gameState.phase === 'DISCOVERY' ? "发现奖励 (选择一张)" : "敌方阵容"}
              </h2>
              {gameState.phase === 'SHOP' && <div className="text-gray-500 text-xs flex items-center gap-1"><Trash2 size={14}/> 拖拽出售</div>}
          </div>
          
          <div className="flex gap-2 sm:gap-6 flex-wrap justify-center items-center">
            {gameState.phase === 'SHOP' ? (
                gameState.shop.map(minion => (
                    <Card 
                        key={minion.id} 
                        minion={minion} 
                        location="shop" 
                        onClick={() => buyMinion(minion)}
                        canAfford={gameState.player.gold >= minion.cost}
                        disabled={gameState.player.hand.length >= MAX_HAND_SIZE}
                    />
                ))
            ) : gameState.phase === 'DISCOVERY' ? (
                gameState.discoveryOptions.map(minion => (
                     <Card key={minion.id} minion={minion} location="discovery" onClick={() => selectDiscovery(minion)} />
                ))
            ) : (
                gameState.isLoadingEnemy ? (
                    <div className="flex flex-col items-center text-yellow-500/80 mt-10">
                         <Loader2 className="w-12 h-12 animate-spin mb-4" />
                         <p className="font-fantasy text-xl">Waiting for opponent...</p>
                    </div>
                ) : (
                    gameState.enemyBoard.map(minion => (
                        <Card 
                            key={minion.id} 
                            minion={minion} 
                            location="enemy"
                            isAttacking={attackingMinionId === minion.id}
                            isHit={hitMinionId === minion.id}
                        />
                    ))
                )
            )}
          </div>
        </div>

        {/* --- Combat Control Bar --- */}
        <div className="h-10 flex items-center justify-center z-10">
            {gameState.phase === 'SHOP' && (
                <button 
                    onClick={startCombatPhase}
                    disabled={gameState.isLoadingEnemy}
                    className={`
                        relative overflow-hidden group flex items-center gap-2 font-bold py-2 px-12 rounded-full border-2 border-yellow-600 shadow-xl transition-all transform hover:scale-105 active:scale-95
                        ${gameState.isLoadingEnemy ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-red-900 via-red-700 to-red-900 text-yellow-100 hover:text-white'}
                    `}
                >
                    <div className="absolute inset-0 bg-red-600/20 group-hover:bg-red-500/40 transition-colors"></div>
                    {gameState.isLoadingEnemy ? (
                       <><Loader2 className="animate-spin w-5 h-5" /> 准备中...</>
                    ) : (
                       <><Play fill="currentColor" className="w-5 h-5" /> 进入战斗</>
                    )}
                </button>
            )}
        </div>

        {/* --- Player Board --- */}
        <div className="flex-1 bg-[#2e2620] rounded-2xl p-4 border-2 border-[#5c4735] shadow-[inset_0_0_30px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center min-h-[220px]">
           {/* Board Texture decoration */}
           <div className="w-full h-1 bg-[#1a120b] rounded-full mb-6 opacity-30"></div>

           <div className="flex gap-2 sm:gap-4 flex-wrap justify-center min-h-[140px]">
              {gameState.player.board.map(minion => (
                   <Card 
                      key={minion.id} 
                      minion={minion} 
                      location="board" 
                      onClick={() => {}} 
                      disabled={gameState.phase !== 'SHOP'}
                      draggable={gameState.phase === 'SHOP'}
                      onDragStart={(e) => handleDragStart(e, minion, 'board')}
                      onDrop={(e) => handleDropOnBoard(e, minion)}
                      onDragOver={handleDragOver}
                      isAttacking={attackingMinionId === minion.id}
                      isHit={hitMinionId === minion.id}
                   />
              ))}
              {gameState.player.board.length === 0 && (
                  <div className="text-[#5c4735] font-fantasy text-xl mt-10">Deploy your Minions</div>
              )}
           </div>
           
           <div className="w-full h-1 bg-[#1a120b] rounded-full mt-6 opacity-30"></div>
        </div>
        
        {/* --- Player Hand --- */}
        <div className="h-44 -mt-6 pt-8 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col items-center z-20">
             <div className="flex gap-[-20px] justify-center items-end pb-2">
                 {gameState.player.hand.map((minion, idx) => (
                     <div key={minion.id} className="transition-transform hover:-translate-y-6 hover:scale-110 hover:z-50" style={{marginLeft: idx > 0 ? '-10px' : '0'}}>
                        <Card 
                            minion={minion} 
                            location="hand" 
                            onClick={() => playMinion(minion)}
                            disabled={gameState.phase !== 'SHOP'}
                            draggable={gameState.phase === 'SHOP'}
                            onDragStart={(e) => handleDragStart(e, minion, 'hand')}
                        />
                     </div>
                 ))}
             </div>
        </div>

      </div>

      {/* Game Over Modal */}
      {(gameState.phase === 'GAME_OVER' || gameState.phase === 'VICTORY') && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center backdrop-blur-md animate-in fade-in duration-500">
              <div className="bg-[#2a2018] border-4 border-yellow-600 p-10 rounded-3xl max-w-lg text-center shadow-[0_0_50px_rgba(255,200,0,0.2)]">
                  {gameState.phase === 'VICTORY' ? (
                      <>
                        <h2 className="text-6xl font-fantasy text-yellow-400 mb-6 drop-shadow-lg">VICTORY!</h2>
                        <p className="text-yellow-100/80 mb-8 text-xl font-serif">You have conquered the tavern.</p>
                      </>
                  ) : (
                      <>
                         <Skull className="w-24 h-24 text-gray-500 mx-auto mb-6" />
                         <h2 className="text-5xl font-fantasy text-red-600 mb-6 drop-shadow-lg">DEFEAT</h2>
                         <p className="text-gray-400 mb-8 text-xl">Your run ended on Turn {gameState.turn}.</p>
                      </>
                  )}
                  
                  <button 
                    onClick={restartGame}
                    className="flex items-center justify-center gap-3 w-full bg-yellow-700 hover:bg-yellow-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg border border-yellow-500"
                  >
                      <RotateCcw /> Play Again
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}