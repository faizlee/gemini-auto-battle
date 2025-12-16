import React from 'react';
import { MINION_POOL } from '../constants';
import Card from './Card';
import { X } from 'lucide-react';

interface MinionGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

const MinionGallery: React.FC<MinionGalleryProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Group by Tier
  const minionsByTier = MINION_POOL.reduce((acc, minion) => {
    const tier = minion.tier;
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(minion);
    return acc;
  }, {} as Record<number, typeof MINION_POOL>);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 w-full max-w-6xl h-[90vh] rounded-2xl border border-gray-700 flex flex-col overflow-hidden relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
        >
            <X size={32} />
        </button>
        
        <h2 className="text-3xl font-fantasy text-center text-yellow-500 py-4 bg-gray-950 border-b border-gray-800">
            随从图鉴
        </h2>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {[1, 2, 3, 4, 5, 6].map(tier => (
                <div key={tier} className="bg-gray-800/30 p-6 rounded-xl border border-gray-700/50">
                    <h3 className="text-2xl font-bold text-blue-400 mb-4 border-b border-blue-900/50 pb-2">
                        {tier} 星随从
                    </h3>
                    <div className="flex flex-wrap gap-4">
                        {minionsByTier[tier]?.map((m, idx) => (
                            <div key={idx} className="scale-90 origin-top-left">
                                <Card 
                                    minion={{...m, id: `gallery-${idx}`, maxHealth: m.health}} 
                                    location="shop"
                                    disabled={true} 
                                />
                            </div>
                        ))}
                        {!minionsByTier[tier] && <p className="text-gray-500 italic">暂无随从</p>}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default MinionGallery;