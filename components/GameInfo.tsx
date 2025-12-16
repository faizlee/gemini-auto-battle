import React from 'react';
import { Player, GameState } from '../types';
import { Coins, Heart, Zap, RefreshCw, Book } from 'lucide-react';

interface GameInfoProps {
  state: GameState;
  onRefresh: () => void;
  onUpgrade: () => void;
  onFreeze: () => void;
  onOpenGallery: () => void;
}

const GameInfo: React.FC<GameInfoProps> = ({ state, onRefresh, onUpgrade, onFreeze, onOpenGallery }) => {
  const { player, turn, phase, freezeShop } = state;
  const upgradeCost = 5; // Simplified constant upgrade cost

  return (
    <div className="w-full max-w-5xl flex items-center justify-between bg-gray-900 p-4 rounded-xl shadow-2xl border border-gray-700 mb-4 text-white">
      {/* Player Stats */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2" title="生命值">
            <div className="relative">
                <Heart className="w-8 h-8 text-red-600 fill-current" />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white">
                    {player.hp}
                </span>
            </div>
        </div>
        
        <div className="flex items-center gap-2 bg-yellow-900/30 px-3 py-1 rounded-full border border-yellow-700/50" title="铸币">
           <Coins className="w-5 h-5 text-yellow-400" />
           <span className="font-bold text-yellow-100">{player.gold} / {player.maxGold}</span>
        </div>

        <div className="flex items-center gap-2 bg-blue-900/30 px-3 py-1 rounded-full border border-blue-700/50" title="酒馆等级">
            <Zap className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-blue-100">等级 {player.tier}</span>
        </div>
        
        <div className="text-gray-400 font-mono text-sm hidden sm:block">
            第 {turn} 回合
        </div>
      </div>

      {/* Shop Actions */}
      <div className="flex gap-2">
          {phase === 'SHOP' && (
            <>
                <button 
                    onClick={onUpgrade}
                    disabled={player.gold < upgradeCost || player.tier >= 6}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:bg-gray-700 rounded-lg font-bold transition-colors text-xs sm:text-sm"
                >
                    <Zap size={14} />
                    升级 ({upgradeCost})
                </button>
                
                <button 
                    onClick={onRefresh}
                    disabled={player.gold < 1}
                    className="flex items-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:bg-gray-700 rounded-lg font-bold transition-colors text-xs sm:text-sm text-black"
                >
                    <RefreshCw size={14} />
                    刷新 (1)
                </button>
                 <button 
                    onClick={onFreeze}
                    className={`flex items-center gap-2 px-3 py-2 border disabled:opacity-50 rounded-lg font-bold transition-colors text-xs sm:text-sm ${freezeShop ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-cyan-500 text-cyan-400 hover:bg-cyan-900/50'}`}
                >
                    {freezeShop ? '解冻' : '冻结'}
                </button>
            </>
          )}
          <button 
                onClick={onOpenGallery}
                className="flex items-center gap-2 px-3 py-2 border border-gray-600 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold transition-colors text-xs sm:text-sm text-gray-300"
                title="图鉴"
          >
                <Book size={14} />
          </button>
      </div>
    </div>
  );
};

export default GameInfo;