import React, { useState } from 'react';

interface UnoCard {
  color: string;
  value: number;
}

export default function UnoGame() {
  const unoColors = ["أحمر", "أزرق", "أخضر", "أصفر"];
  const colorMap: { [key: string]: string } = { 
    "أحمر": "#e74c3c", 
    "أزرق": "#3498db", 
    "أخضر": "#2ecc71", 
    "أصفر": "#f1c40f" 
  };
  
  const [unoTop, setUnoTop] = useState<UnoCard>({ color: "أحمر", value: 5 });
  const [unoPlayer, setUnoPlayer] = useState<UnoCard>([
    { color: "أزرق", value: 5 }, 
    { color: "أخضر", value: 7 }, 
    { color: "أصفر", value: 2 }, 
    { color: "أحمر", value: 9 }
  ]);
  const [unoCompCards, setUnoCompCards] = useState(4);
  const [status, setStatus] = useState("ابدأ اللعب، دورك الآن!");
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  const unoPlayCard = (idx: number) => {
    if (!isPlayerTurn) return;
    const card = unoPlayer[idx];
    
    // التحقق من شروط اللعب (تطابق اللون أو الرقم)
    if (card.color === unoTop.color || card.value === unoTop.value) {
      setUnoTop(card);
      const newHand = [...unoPlayer];
      newHand.splice(idx, 1);
      setUnoPlayer(newHand);
      
      if (newHand.length === 0) {
        setStatus("🎉 كفووو! لقد فزت في اللعبة!");
        setIsPlayerTurn(false);
        return;
      }
      
      setIsPlayerTurn(false);
      setStatus("لعبت ورقتك بنجاح. تفكير الكمبيوتر...");
      
      // محاكاة دور الكمبيوتر (ذكاء اصطناعي مبسط)
      setTimeout(() => {
        if (Math.random() > 0.35 && unoCompCards > 0) {
          // الكمبيوتر يرمي كرت يطابق إما اللون أو الرقم بشكل عشوائي
          if (Math.random() > 0.5) {
            setUnoTop({ color: unoColors[Math.floor(Math.random() * 4)], value: card.value });
          } else {
            setUnoTop({ color: card.color, value: Math.floor(Math.random() * 10) });
          }
          setUnoCompCards(prev => {
            if (prev - 1 === 0) {
              setStatus("😢 الكمبيوتر تخلص من كل أوراقه وفاز!");
            } else {
              setStatus("رمى الكمبيوتر ورقة. دورك الآن!");
            }
            return prev - 1;
          });
        } else {
          // الكمبيوتر يسحب كرت
          setUnoCompCards(prev => prev + 1);
          setStatus("الكمبيوتر لم يجد ورقة وسحب من الأرض! دورك الآن.");
        }
        setIsPlayerTurn(true);
      }, 1200);
    } else {
      setStatus("❌ لا يمكنك لعب هذه الورقة! يجب مطابقة اللون أو الرقم.");
    }
  };

  const drawCard = () => {
    if (!isPlayerTurn) return;
    const newCard: UnoCard = { 
      color: unoColors[Math.floor(Math.random() * 4)], 
      value: Math.floor(Math.random() * 10) 
    };
    setUnoPlayer([...unoPlayer, newCard]);
    setStatus("سحبت ورقة. دور الكمبيوتر الآن...");
    setIsPlayerTurn(false);
    
    setTimeout(() => {
      setUnoCompCards(prev => prev + 1);
      setStatus("الكمبيوتر سحب ورقة أيضاً. دورك الآن!");
      setIsPlayerTurn(true);
    }, 1200);
  };

  return (
    <div style={{ maxWidth: '340px', background: '#1a1a1a', color: '#fff', padding: '15px', borderRadius: '12px', textAlign: 'center', direction: 'rtl', fontFamily: 'sans-serif', margin: '10px auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
      <h3 style={{ color: '#f1c40f', margin: '0 0 10px 0', fontSize: '18px' }}>🃏 تحدي أونو (ضد الكمبيوتر)</h3>
      
      <div style={{ background: '#2b2b2b', padding: '8px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>
        <span>كروت الكمبيوتر المتبقية: </span><b style={{ color: '#e74c3c' }}>{unoCompCards}</b>
      </div>

      <div style={{ background: '#333', padding: '15px', borderRadius: '10px', marginBottom: '12px', display: 'inline-block', minWidth: '100px' }}>
        <span style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '5px' }}>الورقة المكشوفة</span>
        <div style={{ background: colorMap[unoTop.color], fontSize: '20px', fontWeight: 'bold', width: '80px', height: '110px', lineHeight: '110px', margin: '0 auto', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
          {unoTop.color} {unoTop.value}
        </div>
      </div>

      <p style={{ fontSize: '13px', color: '#2ecc71', minHeight: '30px' }}>{status}</p>
      
      <div style={{ fontSize: '12px', textAlign: 'right', color: '#ccc', marginBottom: '5px' }}>أوراقك في يدك:</div>
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px', maxHeight: '120px', overflowY: 'auto', padding: '5px' }}>
        {unoPlayer.map((card, idx) => (
          <button 
            key={idx} 
            onClick={() => unoPlayCard(idx)} 
            style={{ background: colorMap[card.color], color: 'white', padding: '8px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
          >
            {card.color} <br/> {card.value}
          </button>
        ))}
      </div>

      <button 
        onClick={drawCard} 
        disabled={!isPlayerTurn}
        style={{ background: '#e67e22', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', width: '100%', opacity: isPlayerTurn ? 1 : 0.6 }}
      >
        ➕ سحب ورقة من الأرض
      </button>
    </div>
  );
}
