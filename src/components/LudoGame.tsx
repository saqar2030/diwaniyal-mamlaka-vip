import React, { useState } from 'react';

export default function LudoGame() {
  const [playerPos, setPlayerPos] = useState(0);
  const [compPos, setCompPos] = useState(0);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [status, setStatus] = useState('اضغط لرمي النرد وتحريك قطعتك نحو خط النهاية (المربع 30)!');
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  const targetSquare = 30; // خط النهاية للفوز

  const rollDice = () => {
    if (!isPlayerTurn || playerPos === targetSquare || compPos === targetSquare) return;

    // دور اللاعب
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceResult(roll);
    
    let newPos = playerPos + roll;
    if (newPos > targetSquare) {
      newPos = playerPos; // لا يتحرك إذا تجاوز الرقم المطلوب تماماً
      setStatus(`🎲 رميت ${roll}! تحتاج رقمًا دقيقًا للوصول للمربع ${targetSquare}.`);
    } else {
      setStatus(`🎲 رميت ${roll}! تقدمت قطعتك إلى المربع ${newPos}.`);
    }
    
    setPlayerPos(newPos);

    if (newPos === targetSquare) {
      setStatus('🏆 كفووو! وصلت لخط النهاية وفزت في لودو!');
      return;
    }

    // نقل الدور للكمبيوتر بعد ثانية
    setIsPlayerTurn(false);
    setTimeout(() => {
      const compRoll = Math.floor(Math.random() * 6) + 1;
      let newCompPos = compPos + compRoll;
      
      if (newCompPos > targetSquare) {
        newCompPos = compPos;
      }
      
      setCompPos(newCompPos);

      if (newCompPos === targetSquare) {
        setStatus(`😢 الكمبيوتر رمى ${compRoll} ووصل للمربع النهائي وفاز!`);
      } else {
        setStatus(`🤖 الكمبيوتر رمى ${compRoll} وتحرك للمربع ${newCompPos}. دورك الآن!`);
        setIsPlayerTurn(true);
      }
    }, 1200);
  };

  return (
    <div style={{ maxWidth: '340px', background: '#1e3799', color: '#fff', padding: '15px', borderRadius: '12px', textAlign: 'center', direction: 'rtl', fontFamily: 'sans-serif', margin: '10px auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
      <h3 style={{ color: '#f1c40f', margin: '0 0 10px 0', fontSize: '18px' }}>🎲 تحدي لودو المصغر</h3>

      {/* مسار اللوحة المبسط */}
      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
        <div style={{ fontSize: '13px', marginBottom: '5px', textAlign: 'right' }}>📊 خارطة السباق (الهدف: المربع {targetSquare})</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0c2461', padding: '8px', borderRadius: '5px' }}>
          <div>🟢 قطعتك: <span style={{ color: '#4cd137', fontWeight: 'bold' }}>المربع {playerPos}</span></div>
          <div>🔴 الكمبيوتر: <span style={{ color: '#e84118', fontWeight: 'bold' }}>المربع {compPos}</span></div>
        </div>
      </div>

      {/* منطقة النرد الملعوب */}
      <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
        {diceResult && (
          <div style={{ width: '45px', height: '45px', background: '#fff', color: '#000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', boxShadow: '0 3px 6px rgba(0,0,0,0.2)' }}>
            {diceResult}
          </div>
        )}
      </div>

      <p style={{ fontSize: '13px', color: '#f5cd79', minHeight: '35px', margin: '5px 0' }}>{status}</p>

      <button 
        onClick={rollDice} 
        disabled={!isPlayerTurn || playerPos === targetSquare || compPos === targetSquare}
        style={{ background: '#4cd137', color: '#000', border: 'none', padding: '10px 16px', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', width: '100%', boxShadow: '0 3px 5px rgba(0,0,0,0.2)', opacity: isPlayerTurn ? 1 : 0.6 }}
      >
        🎲 حرك القطعة (ارمِ النرد)
      </button>
    </div>
  );
}
