import React, { useState } from 'react';

interface Card {
  name: string;
  value: number;
  suit: string;
}

export default function BasraGame() {
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  
  // دالة لإنشاء كرت عشوائي
  const generateRandomCard = (): Card => {
    const names = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const values =; // قيمة الأك 1 والولد 11
    const randomIdx = Math.floor(Math.random() * names.length);
    const suit = suits[Math.floor(Math.random() * suits.length)];
    return {
      name: names[randomIdx],
      value: values[randomIdx],
      suit: suit
    };
  };

  // أوراق اللاعب والكمبيوتر والأرض
  const [playerHand, setPlayerHand] = useState<Card[]>(() => [generateRandomCard(), generateRandomCard(), generateRandomCard(), generateRandomCard()]);
  const [compHand, setCompHand] = useState<Card[]>(() => [generateRandomCard(), generateRandomCard(), generateRandomCard(), generateRandomCard()]);
  const [tableCards, setTableCards] = useState<Card[]>(() => [generateRandomCard(), generateRandomCard()]);

  // النقاط والبصمات
  const [playerScore, setPlayerScore] = useState(0);
  const [compScore, setCompScore] = useState(0);
  const [status, setStatus] = useState('🃏 دورك الآن! اختر كرت لترميه أو تلم به الأرض.');
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  // منطق رمي الورقة وحساب اللم أو البصرة
  const playCard = (pIdx: number) => {
    if (!isPlayerTurn || playerHand.length === 0) return;

    const card = playerHand[pIdx];
    let newTable = [...tableCards];
    let collected = false;
    let earnedPoints = 0;
    let isBasra = false;

    // 1. بصرة الولد (J) أو الشايب (K): يلم كل الأرض
    if (card.name === 'J' || card.name === 'K') {
      if (newTable.length > 0) {
        // إذا كانت ورقة واحدة بالفرشة ومطابقة تماماً تعتبر بصرة، أو بصرة ولد على كروت متعددة
        isBasra = newTable.length === 1 && newTable[0].name === card.name;
        earnedPoints = newTable.reduce((acc, c) => acc + (c.value === 10 || c.name === 'A' ? 1 : 0), 0) + (isBasra ? 10 : 0);
        newTable = [];
        collected = true;
      }
    } else {
      // 2. اللم العادي: البحث عن تطابق بالرقم أو كروت مجموعها يساوي 10
      const matchedIdx = newTable.findIndex(c => c.value === card.value);
      
      if (matchedIdx !== -1) {
        // بصرة إذا كانت الأرض فيها ورقة واحدة فقط ومطابقة لكرتك
        if (newTable.length === 1) isBasra = true;
        
        earnedPoints += (card.value === 10 ? 1 : 0) + (newTable[matchedIdx].value === 10 ? 1 : 0);
        if (isBasra) earnedPoints += 10;

        newTable.splice(matchedIdx, 1);
        collected = true;
      }
    }

    // إذا لم يلم، ينزل الكرت في الأرض
    if (!collected) {
      newTable.push(card);
    } else {
      setPlayerScore(prev => prev + earnedPoints + 1); // 1 نقطة للأكلة العادية
    }

    // تحديث يد اللاعب والأرض
    const newHand = [...playerHand];
    newHand.splice(pIdx, 1);
    setPlayerHand(newHand);
    setTableCards(newTable);

    if (isBasra) {
      setStatus(`🔥 بصصصرة!! كسبت بصمة ونقاط إضافية.`);
    } else if (collected) {
      setStatus(`🎉 قشيت الكروت الملعوبة بنجاح.`);
    } else {
      setStatus(`⬇️ رميت ${card.name} ${card.suit} في الفرشة.`);
    }

    // نقل الدور للكمبيوتر
    setIsPlayerTurn(false);
    setTimeout(() => computerTurn(newTable, newHand), 1200);
  };

  // دور الكمبيوتر تلقائياً
  const computerTurn = (currentTable: Card[], pHand: Card[]) => {
    if (compHand.length === 0) {
      // توزيع كروت جديدة إذا خلصت الورق باليد
      if (pHand.length === 0) {
        setPlayerHand([generateRandomCard(), generateRandomCard(), generateRandomCard(), generateRandomCard()]);
        setCompHand([generateRandomCard(), generateRandomCard(), generateRandomCard(), generateRandomCard()]);
        setStatus('🔄 تم توزيع 4 كروت جديدة لكل لاعب! دورك الآن.');
      } else {
        setStatus('دورك الآن! اختر كرت للعب.');
      }
      setIsPlayerTurn(true);
      return;
    }

    // ذكاء اصطناعي مبسط للكمبيوتر: يختار كرت عشوائي ليلعب به
    const cIdx = Math.floor(Math.random() * compHand.length);
    const card = compHand[cIdx];
    let newTable = [...currentTable];
    let collected = false;
    let earnedPoints = 0;

    if (card.name === 'J' || card.name === 'K') {
      if (newTable.length > 0) {
        earnedPoints = newTable.reduce((acc, c) => acc + (c.value === 10 || c.name === 'A' ? 1 : 0), 0);
        newTable = [];
        collected = true;
      }
    } else {
      const matchedIdx = newTable.findIndex(c => c.value === card.value);
      if (matchedIdx !== -1) {
        earnedPoints += (card.value === 10 ? 1 : 0) + (newTable[matchedIdx].value === 10 ? 1 : 0);
        newTable.splice(matchedIdx, 1);
        collected = true;
      }
    }

    if (!collected) {
      newTable.push(card);
      setStatus(`🤖 الكمبيوتر رمى ${card.name} ${card.suit}. دورك الآن!`);
    } else {
      setCompScore(prev => prev + earnedPoints + 1);
      setStatus(`😢 الكمبيوتر قش الأرض وأخذ الكروت! دورك الآن.`);
    }

    const newCompHand = [...compHand];
    newCompHand.splice(cIdx, 1);
    setCompHand(newCompHand);
    setTableCards(newTable);
    setIsPlayerTurn(true);
  };

  return (
    <div style={{ maxWidth: '340px', background: '#2c3e50', color: '#fff', padding: '15px', borderRadius: '12px', textAlign: 'center', direction: 'rtl', fontFamily: 'sans-serif', margin: '10px auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
      <h3 style={{ color: '#f1c40f', margin: '0 0 5px 0', fontSize: '18px' }}>🃏 لعبة البصرة العادية</h3>
      
      <div style={{ display: 'flex', justifyBetween: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px', fontWeight: 'bold', justifyContent: 'space-between' }}>
        <div>نقاطك: <span style={{ color: '#2ecc71' }}>{playerScore}</span></div>
        <div>ورق الكمبيوتر: <span>{compHand.length} كروت</span></div>
        <div>نقاط الكمبيوتر: <span style={{ color: '#e74c3c' }}>{compScore}</span></div>
      </div>

      {/* الفرشة / الأرض */}
      <div style={{ background: '#1e272e', padding: '15px', borderRadius: '10px', marginBottom: '12px', minHeight: '90px' }}>
        <span style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '8px' }}>الفرشة (الكروت المكشوفة في الأرض)</span>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {tableCards.length === 0 ? (
            <span style={{ fontSize: '12px', color: '#777', marginTop: '15px' }}>الأرض خالية (جاهزة للبصرة!)</span>
          ) : (
            tableCards.map((card, idx) => {
              const isRed = card.suit === '♥️' || card.suit === '♦️';
              return (
                <div key={idx} style={{ background: 'white', color: isRed ? 'red' : 'black', width: '42px', height: '60px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  {card.name}<br/>{card.suit}
                </div>
              );
            })
          )}
        </div>
      </div>

      <p style={{ fontSize: '12px', color: '#f5cd79', minHeight: '32px', margin: '5px 0' }}>{status}</p>

      {/* ورق اللاعب في يده */}
      <div style={{ fontSize: '11px', textAlign: 'right', color: '#ccc', marginBottom: '5px' }}>كروتك الحالية باليد:</div>
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {playerHand.map((card, idx) => {
          const isRed = card.suit === '♥️' || card.suit === '♦️';
          return (
            <button 
              key={idx} 
              onClick={() => playCard(idx)} 
              disabled={!isPlayerTurn}
              style={{ padding: '8px 4px', width: '48px', height: '68px', background: 'white', color: isRed ? 'red' : 'black', border: '2px solid #ccc', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
            >
              {card.name} <br/> {card.suit}
            </button>
          );
        })}
      </div>
    </div>
  );
}
