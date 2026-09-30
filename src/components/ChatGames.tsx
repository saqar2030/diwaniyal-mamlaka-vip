import React, { useState } from 'react';
import UnoGame from './UnoGame';
import BalootGame from './BalootGame';
import SnakeGame from './SnakeGame';
import LudoGame from './LudoGame';
import BilliardsGame from './BilliardsGame';
import BowlingGame from './BowlingGame';
import CarromGame from './CarromGame';
import BasraGame from './BasraGame';
import DominoGame from './DominoGame';

export default function ChatGames() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const gamesList = [
    { id: 'uno', name: 'لعبة أونو', icon: '🃏', color: '#e74c3c' },
    { id: 'baloot', name: 'لعبة البلوت', icon: '🃏', color: '#0b5345' },
    { id: 'basra', name: 'لعبة البصرة', icon: '🃏', color: '#2c3e50' },
    { id: 'domino', name: 'لعبة الدومينو', icon: '🀰', color: '#2980b9' },
    { id: 'snake', name: 'السلم والثعبان', icon: '🎲', color: '#e67e22' },
    { id: 'ludo', name: 'لعبة لودو', icon: '🎲', color: '#1e3799' },
    { id: 'billiards', name: 'البلياردو', icon: '🎱', color: '#27ae60' },
    { id: 'bowling', name: 'البولينج', icon: '🎳', color: '#8e44ad' },
    { id: 'carrom', name: 'لعبة الكيرم', icon: '🥏', color: '#d35400' },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '360px', background: '#1e272e', padding: '15px', borderRadius: '12px', color: '#fff', direction: 'rtl', fontFamily: 'sans-serif', margin: '10px auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
      {!activeGame ? (
        <div>
          <h3 style={{ textAlign: 'center', color: '#f1c40f', margin: '0 0 15px 0', fontSize: '18px' }}>🎮 صالة الألعاب التفاعلية</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {gamesList.map((game) => (
              <button 
                key={game.id} 
                onClick={() => setActiveGame(game.id)} 
                style={{ padding: '15px 10px', background: game.color, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}
              >
                <span style={{ fontSize: '20px' }}>{game.icon}</span>
                <span>{game.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <button 
            onClick={() => setActiveGame(null)} 
            style={{ background: '#7f8c8d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginBottom: '15px', fontSize: '13px', fontWeight: 'bold' }}
          >
            ➡️ العودة للقائمة
          </button>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '5px', borderRadius: '8px' }}>
            {activeGame === 'uno' && <UnoGame />}
            {activeGame === 'baloot' && <BalootGame />}
            {activeGame === 'snake' && <SnakeGame />}
            {activeGame === 'ludo' && <LudoGame />}
            {activeGame === 'billiards' && <BilliardsGame />}
            {activeGame === 'bowling' && <BowlingGame />}
            {activeGame === 'carrom' && <CarromGame />}
            {activeGame === 'basra' && <BasraGame />}
            {activeGame === 'domino' && <DominoGame />}
          </div>
        </div>
      )}
    </div>
  );
}
