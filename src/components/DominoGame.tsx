import React, { useState } from 'react';

interface DominoTile {
  left: number;
  right: number;
}

export default function DominoGame() {
  // دالة لإنشاء قطعة دومينو عشوائية
  const generateRandomTile = (): DominoTile => {
    return {
      left: Math.floor(Math.random() * 7),
      right: Math.floor(Math.random() * 7)
    };
  };

  // إعداد القطع الموزعة والأرض
  const [playerHand, setPlayerHand] = useState<DominoTile[]>(() => [
    generateRandomTile(), generateRandomTile(), generateRandomTile(), generateRandomTile(), generateRandomTile()
  ]);
  const [compHandCount, setCompHandCount] = useState(5);
  const [board, setBoard] = useState<DominoTile[]>(() => [
    { left: 3, right: 3 } // قطعة البداية في الأرض
  ]);

  const [status, setStatus] = useState('🀰 دورك الآن! طابق أرقام القطع مع الأطراف المفتوحة في الأرض.');
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);

  // منطق لعب القطعة
  const playTile = (idx: number) => {
    if (!isPlayerTurn || playerHand.length === 0) return;

    const tile = playerHand[idx];
    const leftEnd = board[0].left;
    const rightEnd = board[board.length - 1].right;

    let newBoard = [...board];
    let isValid = false;

    // التحقق من إمكانية مطابقة القطعة مع الطرف الأيمن أو الأيسر للفرشة
    if (tile.left === rightEnd) {
      newBoard.push(tile);
      isValid = true;
    } else if (tile.right === rightEnd) {
      newBoard.push({ left: tile.right, right: tile.left }); // قلب القطعة للمطابقة
      isValid = true;
    } else if (tile.right === leftEnd) {
      newBoard.unshift(tile);
      isValid = true;
    } else if (tile.left === leftEnd) {
      newBoard.unshift({ left: tile.right, right: tile.left }); // قلب القطعة للمطابقة
      isValid = true;
    }

    if (isValid) {
      const nextHand = [...playerHand];
      nextHand.splice(idx, 1);
      setPlayerHand(nextHand);
      setBoard(newBoard);

      if (nextHand.length === 0) {
        setStatus('🎉 مبروك! تخلصت من جميع قطعك وفزت في الدومينو!');
        setIsPlayerTurn(false);
        return;
      }

      setStatus('لعبت قطعة بنجاح! تفكير الكمبيوتر...');
      setIsPlayerTurn(false);
      
      // نقل الدور للكمبيوتر تلقائياً بعد ثانية ونصف
      setTimeout(() => computerTurn(newBoard, nextHand), 1500);
    } else {
      setStatus('❌ هذه القطعة لا تطابق أياً من الأطراف المفتوحة في الأرض!');
    }
  };

  // سحب قطعة جديدة للاعب عند انغلاق اللعب
  const drawTile = () => {
    if (!isPlayerTurn) return;
    const newTile = generateRandomTile();
    setPlayerHand([...playerHand, newTile]);
    setStatus('➕ سحبت قطعة جديدة. إذا كانت تطابق الأرض يمكنك لعبها، وإلا سينتقل الدور.');
  };

  // دور الكمبيوتر تلقائياً
  const computerTurn = (currentBoard: DominoTile[], pHand: DominoTile[]) => {
    if (compHandCount === 0) return;

    const leftEnd = currentBoard[0].left;
    const rightEnd = currentBoard[currentBoard.length - 1].right;
    let newBoard = [...currentBoard];
    let compPlayed = false;

    // محاكاة ذكاء اصطناعي يبحث عن قطعة مطابقة (نسبة نجاح عشوائية تحاكي امتلاكه لقطع متوافقة)
    if (Math.random() > 0.4) {
      // محاكاة وضع قطعة متوافقة مع الأطراف
      if (Math.random() > 0.5) {
        newBoard.push({ left: rightEnd, right: Math.floor(Math.random() * 7) });
      } else {
        newBoard.unshift({ left: Math.floor(Math.random() * 7), right: leftEnd });
      }
      setCompHandCount(prev => prev - 1);
      compPlayed = true;
      setBoard(newBoard);
    }

    if (compPlayed) {
      if (compHandCount - 1 === 0) {
        setStatus('😢 انتهت اللعبة! الكمبيوتر تخلص من قطعه أولاً وفاز.');
        return;
      }
      setStatus('🤖 لعب الكمبيوتر قطعة من يده. دورك الآن!');
    } else {
      // الكمبيوتر لم يجد قطعة وسحب من الأرض
      setCompHandCount(prev => prev + 1);
      setStatus('📥 لم يجد الكمبيوتر قطعة مطابقة وقام بالسحب! دورك الآن.');
    }
    
    setIsPlayerTurn(true);
  };

  return (
    <div style={{ maxWidth: '340px', background: '#2c3e50', color: '#fff', padding: '15px', borderRadius: '12px', textAlign: 'center', direction: 'rtl', fontFamily: 'sans-serif', margin: '10px auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
      <h3 style={{ color: '#f1c40f', margin: '0 0 5px 0', fontSize: '18px' }}>🀰 لعبة الدومينو التفاعلية</h3>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px', fontWeight: 'bold' }}>
        <div>قطعك المتبقية: <span style={{ color: '#2ecc71' }}>{playerHand.length}</span></div>
        <div>قطع الكمبيوتر: <span style={{ color: '#e74c3c' }}>{compHandCount}</span></div>
      </div>

      {/* الأرض / سلسلة الدومينو الملعوبة */}
      <div style={{ background: '#1e272e', padding: '15px', borderRadius: '10px', marginBottom: '12px', overflowX: 'auto', whiteSpace: 'nowrap', minHeight: '65px', display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
        {board.map((tile, idx) => (
          <div key={idx} style={{ background: '#fff', color: '#000', padding: '4px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px', border: '1px solid #777', display: 'inline-block', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            {tile.left} | {tile.right}
          </div>
        ))}
      </div>

      <p style={{ fontSize: '12px', color: '#f5cd79', minHeight: '32px', margin: '5px 0' }}>{status}</p>

      {/* قطع اللاعب في يده */}
      <div style={{ fontSize: '11px', textAlign: 'right', color: '#ccc', marginBottom: '5px' }}>قطع الدومينو الخاصة بك:</div>
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
        {playerHand.map((tile, idx) => (
          <button 
            key={idx} 
            onClick={() => playTile(idx)} 
            disabled={!isPlayerTurn}
            style={{ padding: '8px 12px', background: '#ecf0f1', color: '#2c3e50', border: '2px solid #bdc3c7', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
          >
            {tile.left} : {tile.right}
          </button>
        ))}
      </div>

      <button 
        onClick={drawTile} 
        disabled={!isPlayerTurn}
        style={{ background: '#e67e22', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', width: '100%', opacity: isPlayerTurn ? 1 : 0.6 }}
      >
        ➕ سحب قطعة جديدة (+)
      </button>
    </div>
  );
}
