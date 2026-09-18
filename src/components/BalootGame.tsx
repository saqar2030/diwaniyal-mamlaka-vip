import React, { useState } from 'react';

interface Card {
  name: string;
  suit: string;
}

export default function BalootGame() {
  const cardValues: { [key: string]: number } = { 'A': 11, '10': 10, 'K': 4, 'Q': 3, 'J': 2, '9': 0, '8': 0, '7': 0 };
  const cardRank = ['A', '10', 'K', 'Q', 'J', '9', '8', '7'];

  const [playerHand, setPlayerHand] = useState<Card[]>([
    { name: 'A', suit: '♥️' },
    { name: '10', suit: '♠️' },
    { name: 'K', suit: '♣️' },
    { name: '7', suit: '♦️' },
    { name: 'J', suit: '♥️' }
  ]);
  
  const [compHand, setCompHand] = useState<Card[]>([
    { name: 'Q', suit: '♥️' },
    { name: '8', suit: '♠️' },
    { name: 'A', suit: '♣️' },
    { name: '9', suit: '♦️' },
    { name: '10', suit: '♥️' }
  ]);

  const [playerPoints, setPlayerPoints] = useState(0);
  const [compPoints, setCompPoints] = useState(0);
  const [tablePlayer, setTablePlayer] = useState('-');
  const [tableComp, setTableComp] = useState('-');
  const [msg, setMsg] = useState('اختر كرت لترميه في الفرشة!');
  const [gameOver, setGameOver] = useState(false);

  const playTurn = (pIdx: number) => {
    if (gameOver) return;

    const pCard = playerHand[pIdx];
    const cIdx = Math.floor(Math.random() * compHand.length);
    const cCard = compHand[cIdx];

    setTablePlayer(`${pCard.name} ${pCard.suit}`);
    setTableComp(`${cCard.name} ${cCard.suit}`);

    const pRankIdx = cardRank.indexOf(pCard.name);
    const cRankIdx = cardRank.indexOf(cCard.name);
    const roundScore = cardValues[pCard.name] + cardValues[cCard.name];

    if (pRankIdx < cRankIdx) {
      setPlayerPoints(prev => prev + roundScore);
      setMsg(`أكلت الأكلة! كسبت ${roundScore} بنط.`);
    } else {
      setCompPoints(prev => prev + roundScore);
      setMsg(`الكمبيوتر قش الأكلة وكسب ${roundScore} بنط!`);
    }

    const newPlayerHand = [...playerHand];
    newPlayerHand.splice(pIdx, 1);
    setPlayerHand(newPlayerHand);

    const newCompHand = [...compHand];
    newCompHand.splice(cIdx, 1);
    setCompHand(newCompHand);

    if (newPlayerHand.length === 0) {
      setGameOver(true);
    }
  };

  return (
    <div style={{ maxWidth: '340px', background: '#0b5345', color: '#fff', padding: '15px', borderRadius: '12px', fontFamily: 'sans-serif', textAlign: 'center', direction: 'rtl', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', margin: '10px auto' }}>
      <h3 style={{ color: '#f1c40f', margin: '0 0 5px 0', fontSize: '18px' }}>🃏 لعبة بلوت (جولة صن سريعة)</h3>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px' }}>
        <div>أبناطك: <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>{playerPoints}</span></div>
        <div>أبناط الكمبيوتر: <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>{compPoints}</span></div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', color: '#ddd', display: 'block', marginBottom: '5px' }}>الفرشة (الورق الملعوب)</span>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <div style={{ fontSize: '12px' }}>الكمبيوتر:<br/><span style={{ padding: '4px 8px', borderRadius: '4px', background: '#fff', color: '#000', display: 'inline-block', marginTop: '3px', minWidth: '40px' }}>{tableComp}</span></div>
          <div style={{ fontSize: '12px' }}>أنت:<br/><span style={{ padding: '4px 8px', borderRadius: '4px', background: '#fff', color: '#000', display: 'inline-block', marginTop: '3px', minWidth: '40px' }}>{tablePlayer}</span></div>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: '#f39c12', margin: '5px 0 10px 0' }}>
        {gameOver ? (playerPoints > compPoints ? "🏆 انتهت القهوة! كفووو فزت بالصن!" : "😢 تعوضها.. فاز الكمبيوتر!") : msg}
      </p>

      <div style={{ fontSize: '11px', textAlign: 'right', color: '#ccc', marginBottom: '5px' }}>كروتك الحالية:</div>
      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {playerHand.map((card, idx) => {
          const isRed = card.suit === '♥️' || card.suit === '♦️';
          return (
            <button key={idx} onClick={() => playTurn(idx)} style={{ padding: '10px 5px', width: '52px', height: '75px', background: 'white', color: isRed ? 'red' : 'black', border: '2px solid #ccc', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
              {card.name} <br/> {card.suit}
            </button>
          );
        })}
      </div>
    </div>
  );
}
