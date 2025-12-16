import React, { useEffect, useState } from 'react';
import { Minion, Rarity } from '../types';
import { Shield, Sword, Heart, Zap, Cross, Skull } from 'lucide-react';

interface CardProps {
  minion: Minion;
  location: 'shop' | 'hand' | 'board' | 'enemy' | 'discovery';
  onClick?: () => void;
  // Drag and Drop
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, minion: Minion) => void;
  onDrop?: (e: React.DragEvent, targetMinion: Minion) => void;
  onDragOver?: (e: React.DragEvent) => void;
  
  disabled?: boolean;
  canAfford?: boolean;
  isAttacking?: boolean;
  isHit?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  minion, 
  location, 
  onClick, 
  draggable,
  onDragStart,
  onDrop,
  onDragOver,
  disabled = false, 
  canAfford = true,
  isAttacking = false,
  isHit = false,
}) => {
  
  const isShop = location === 'shop';
  const isEnemy = location === 'enemy';
  const isDiscovery = location === 'discovery';
  const isHand = location === 'hand';
  const isGolden = minion.isGolden;
  
  // Visual Logic
  const [showDamage, setShowDamage] = useState(false);
  const [damageValue, setDamageValue] = useState(0);

  useEffect(() => {
    if (minion.lastDamageTaken && minion.lastDamageTaken > 0) {
        setDamageValue(minion.lastDamageTaken);
        setShowDamage(true);
        const timer = setTimeout(() => setShowDamage(false), 800);
        return () => clearTimeout(timer);
    }
  }, [minion.lastDamageTaken, minion.health]);

  // Keyword helpers
  const hasDivineShield = minion.keywords?.divineShield;
  const hasTaunt = minion.keywords?.taunt || minion.isTaunt;
  const hasCleave = minion.keywords?.cleave;
  const hasDeathrattle = minion.effects?.some(e => e.type === 'DEATHRATTLE') || minion.description?.includes('亡语');
  const hasBattlecry = minion.effects?.some(e => e.type === 'BATTLECRY') || minion.description?.includes('战吼');
  const hasReborn = minion.keywords?.reborn;

  // Animation Transforms
  let transformClass = '';
  if (isAttacking) {
      if (isEnemy) transformClass = 'translate-y-24 scale-125 z-50'; // Enemy moves down dramatically
      else transformClass = '-translate-y-24 scale-125 z-50'; // Player moves up dramatically
  }

  // --- Styles ---
  
  // Card Container
  // Shop/Discovery cards are larger. Board/Hand cards are standard.
  const sizeClasses = (isShop || isDiscovery) ? 'w-36 h-48' : 'w-28 h-36';
  
  // Frame Color (Golden vs Normal)
  const frameGradient = isGolden 
    ? 'bg-gradient-to-b from-yellow-300 via-yellow-600 to-yellow-800 border-yellow-400' 
    : 'bg-gradient-to-b from-gray-300 via-gray-500 to-gray-700 border-gray-400';

  const bgTexture = isGolden
    ? 'bg-amber-900' // Gold interior
    : 'bg-gray-800'; // Normal interior

  return (
    <div 
      className={`
        relative flex flex-col items-center select-none transition-all duration-300 ease-out
        ${sizeClasses}
        ${transformClass}
        ${isHit ? 'animate-shake' : ''}
        ${minion.isDying ? 'grayscale opacity-0 scale-50 filter blur-sm transition-opacity duration-700' : ''}
        ${disabled ? 'opacity-60 cursor-not-allowed' : draggable ? 'cursor-grab active:cursor-grabbing hover:scale-105' : 'cursor-pointer hover:scale-105'}
        ${hasTaunt ? 'z-10' : ''}
      `}
      onClick={!disabled ? onClick : undefined}
      draggable={!disabled && draggable}
      onDragStart={(e) => onDragStart && onDragStart(e, minion)}
      onDrop={(e) => onDrop && onDrop(e, minion)}
      onDragOver={onDragOver}
    >
      {/* Hit Effect / Shake placeholder class */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px) rotate(-5deg); }
          75% { transform: translateX(5px) rotate(5deg); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>

      {/* Floating Damage Text */}
      {showDamage && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none w-full text-center">
              <span className="damage-text font-fantasy font-black text-5xl text-white drop-shadow-[0_4px_4px_rgba(0,0,0,1)] [-webkit-text-stroke:2px_#880000]">
                  -{damageValue}
              </span>
          </div>
      )}

      {/* --- The Card Physical Object --- */}
      <div className={`
        w-full h-full rounded-[40px] p-1.5 shadow-[0_10px_20px_rgba(0,0,0,0.5)]
        ${frameGradient}
        ${isAttacking ? 'shadow-[0_0_30px_rgba(255,215,0,0.6)]' : ''}
      `}>
        <div className={`w-full h-full rounded-[34px] ${bgTexture} relative overflow-hidden flex flex-col items-center`}>
            
            {/* Header: Tier & Tribe (Top) */}
            <div className="absolute top-2 w-full flex justify-center z-20">
                 <div className="bg-black/60 px-2 py-0.5 rounded-full flex gap-1">
                    {Array.from({length: minion.tier}).map((_, i) => (
                        <span key={i} className="text-[8px] text-yellow-400">★</span>
                    ))}
                 </div>
            </div>

            {/* Minion Portrait (Oval) */}
            <div className={`
                mt-5 w-[85%] aspect-[3/4] rounded-[50%] overflow-hidden border-4 shadow-inner relative
                ${isGolden ? 'border-yellow-500/50' : 'border-black/30'}
                ${minion.imageColor || 'bg-gray-600'}
                flex items-center justify-center
            `}>
                {/* Simulated Art */}
                <span className={`font-fantasy font-bold text-white/90 drop-shadow-md ${isShop ? 'text-5xl' : 'text-4xl'}`}>
                    {minion.name.charAt(0)}
                </span>

                 {/* Keyword Icons Overlay on Art */}
                 <div className="absolute bottom-2 flex gap-1 justify-center w-full">
                    {hasDeathrattle && <Skull size={14} className="text-gray-300 drop-shadow-md" />}
                    {hasBattlecry && <Zap size={14} className="text-blue-300 drop-shadow-md" />}
                    {hasReborn && <span className="text-blue-200 text-xs font-bold drop-shadow-md">R</span>}
                </div>
            </div>

            {/* Divine Shield Overlay */}
            {hasDivineShield && (
                <div className="absolute top-5 w-[85%] aspect-[3/4] rounded-[50%] border-4 border-yellow-200 bg-yellow-100/20 shadow-[0_0_15px_rgba(255,255,0,0.5)] z-10 animate-pulse pointer-events-none" />
            )}

            {/* Name Banner */}
            <div className="absolute bottom-10 w-full z-20 px-1">
                <div className={`
                    mx-auto w-[95%] py-0.5 text-center skew-x-[-10deg] border-y border-black/50 shadow-md
                    ${isGolden ? 'bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-700' : 'bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700'}
                `}>
                    <div className="skew-x-[10deg]">
                        <span className={`block font-fantasy font-bold text-white leading-none whitespace-nowrap overflow-hidden text-ellipsis px-1 drop-shadow-sm ${isShop ? 'text-[11px]' : 'text-[9px]'}`}>
                            {minion.name}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Description Text (Hidden on board to save space, visible in shop/hover?) */}
            {/* For this style, we often hide description on board unless hovered, but let's keep it small at bottom for now or just hide it to look cleaner like HS */}
            {isShop && (
                <div className="absolute bottom-3 w-full px-3 text-center z-10">
                    <p className="text-[9px] text-gray-300 leading-tight line-clamp-2">{minion.description}</p>
                </div>
            )}
        </div>
      </div>

      {/* --- Stats Bubbles (Outside the main clip) --- */}
      
      {/* Attack (Left) */}
      <div className={`
        absolute bottom-0 left-0 w-10 h-10 z-30 flex items-center justify-center
        stat-bubble rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 border-2 border-yellow-900
        ${minion.attack > (minion.tier * 2) ? 'text-green-900' : 'text-white'}
      `}>
          <div className="relative z-10 font-black font-fantasy text-xl text-stroke shadow-black drop-shadow-md">
            {minion.attack}
          </div>
          <Sword className="absolute w-6 h-6 text-yellow-900/30 -z-0" />
      </div>

      {/* Health (Right) */}
      <div className={`
        absolute bottom-0 right-0 w-10 h-10 z-30 flex items-center justify-center
        stat-bubble rounded-full bg-gradient-to-br from-red-500 to-red-800 border-2 border-red-900
        ${minion.health < minion.maxHealth ? 'text-red-200' : 'text-white'}
      `}>
          <div className="relative z-10 font-black font-fantasy text-xl text-stroke shadow-black drop-shadow-md">
            {minion.health}
          </div>
          <Heart className="absolute w-6 h-6 text-red-900/30 -z-0" fill="currentColor" />
      </div>

      {/* Taunt Shield (Behind) */}
      {hasTaunt && (
          <div className="absolute inset-[-4px] border-4 border-gray-400 bg-gray-600/20 rounded-[44px] -z-10 clip-path-shield" style={{clipPath: 'polygon(50% 0, 100% 20%, 100% 80%, 50% 100%, 0 80%, 0 20%)'}}></div>
      )}

      {/* Cost (Shop Only) */}
      {isShop && (
        <div className="absolute -top-3 right-0 bg-blue-600 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-blue-300 shadow-lg z-40">
           {minion.cost}
        </div>
      )}

    </div>
  );
};

export default Card;