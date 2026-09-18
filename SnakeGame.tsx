import React, { useState } from 'react';

export default function SnakeGame() {
  const [playerPos, setPlayerPos] = useState(1);
  const [compPos, setCompPos] = useState(1);
  const [status, setStatus] = useState('اضغط على الزر لرمي النرد والبدء!');
  const [btnDisabled, setBtnDisabled] = useState(false);

  const shortcuts: { [key: number]: number } = {
    4: 14, 9: 31, 20: 38, // سلالم
    17: 7, 35: 12, 48: 22 // ثعابين
  };

  const playTurn = () => {
    if (btnDisabled || playerPos === 50 || compPos === 50) return;

    // دور اللاعب
    const pRoll = Math.floor(Math.random() * 6) + 1;
    let newP = playerPos + pRoll;
    if (newP > 50) newP = playerPos; // تجنب تجاوز النهاية
    
    const oldP = newP;
    if (shortcuts[newP]) newP = shortcuts[newP];
    setPlayerPos(newP);

    let msg = `رميت ${pRoll}. `;
    if (newP > oldP) msg += "🎉 واو! صعدت سلماً. ";
    if (newP < oldP) msg += "🐍 أوه لا! لدغك ثعبان. ";

    if (newP === 50) {
      setStatus("🏆 مبروك! لقد هزمت الكمبيوتر ووصلت للنهاية!");
      return;
    }

    // دور الكمبيوتر تلقائياً
    setBtnDisabled(true);
    setStatus(msg + "انتظر دور الكمبيوتر...");

    setTimeout(() => {
      const cRoll = Math.floor(Math.random() * 6) + 1;
      let newC = compPos + cRoll;
      if (newC > 50) newC = compPos;
      
      if (shortcuts[newC]) newC = shortcuts[newC];
      setCompPos(newC);

      if (newC === 50) {
        setStatus("😢 الكمبيوتر فاز هذه المرة! حاول مجدداً.");
      } else {
        setStatus(msg + `الكمبيوتر رمى ${cRoll} وهو في المربع ${newC}. دورك الآن!`);
        setBtnDisabled(false);
      }
    }, 1200);
  };

  return (
    <div style={{ maxWidth: '320px', background: '#fff3e0', border: '2px solid #e65100', padding: '15px', borderRadius: '12px', fontFamily: 'Arial, sans-serif', textAlign: 'center', direction: 'rtl', margin: '10px auto' }}>
      <h3 style={{ color: '#e65100', marginTop: 0 }}>🎲 لعبة السلم والثعبان</h3>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '10px', fontWeight: 'bold' }}>
        <div style={{ color: 'blue' }}>أنت: {playerPos}</div>
        <div style={{ color: 'red' }}>الكمبيوتر: {compPos}</div>
      </div>
      <p style={{ fontSize: '14px', color: '#555', minHeight: '40px' }}>{status}</p>
      <button onClick={playTurn} disabled={btnDisabled} style={{ background: '#ff9800', color: white, border: 'none', padding: '10px 20px', fontSize: '16px', borderRadius: '8px', cursor: 'pointer', width: '100%', opacity: btnDisabled ? 0.6 : 1 }}>
        🎲 ارمي النرد
      </button>
    </div>
  );
}
