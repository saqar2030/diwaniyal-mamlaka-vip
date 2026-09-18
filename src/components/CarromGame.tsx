import React, { useState, useEffect, useRef } from 'react';

interface CarromCoin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isPocketed: boolean;
  radius: number;
}

export default function CarromGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('🥏 حرك الماوس/إصبعك لتحديد زاوية المضرب، ثم اضغط كليك للضرب!');
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const boardSize = 300;
    const pocketRadius = 16;
    
    // إحداثيات الحفر الأربعة في الزوايا
    const pockets = [
      { x: 20, y: 20 },
      { x: boardSize - 20, y: 20 },
      { x: 20, y: boardSize - 20 },
      { x: boardSize - 20, y: boardSize - 20 }
    ];

    // إعداد المضرب (Striker)
    let striker = {
      x: 150,
      y: 250,
      vx: 0,
      vy: 0,
      radius: 12,
      color: '#e74c3c' // المضرب باللون الأحمر
    };

    // إعداد حبوب الكيرم في المنتصف (حبة بيضاء، حبة سوداء، وحبة حمراء الملكة)
    let coins: CarromCoin[] = [
      { x: 150, y: 150, vx: 0, vy: 0, color: '#f1c40f', isPocketed: false, radius: 8 }, // الملكة (صفراء/ذهبية)
      { x: 135, y: 150, vx: 0, vy: 0, color: '#ffffff', isPocketed: false, radius: 8 }, // حبة بيضاء
      { x: 165, y: 150, vx: 0, vy: 0, color: '#2c3e50', isPocketed: false, radius: 8 }  // حبة سوداء
    ];

    let mouseX = 150;
    let mouseY = 200;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.touches[0].clientX - rect.left;
        mouseY = e.touches[0].clientY - rect.top;
      }
    };

    const handleShoot = () => {
      if (isMoving) return;
      // حساب اتجاه وقوة ضربة المضرب
      const angle = Math.atan2(mouseY - striker.y, mouseX - striker.x);
      striker.vx = Math.cos(angle) * 8;
      striker.vy = Math.sin(angle) * 8;
      setIsMoving(true);
      setStatus('⏳ تتحرك الحبوب الآن...');
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('click', handleShoot);

    let animationFrameId: number;

    const gameLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. رسم لوحة الكيرم الخشبية
      ctx.fillStyle = '#f7d794';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // رسم الإطار الخارجي السميك لـ لوحة الكيرم
      ctx.strokeStyle = '#574b90';
      ctx.lineWidth = 8;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // 2. رسم الحفر الأربعة في الزوايا
      ctx.fillStyle = '#1e272e';
      pockets.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, pocketRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. رسم الدائرة المركزية (السرّة)
      ctx.strokeStyle = '#cf6a87';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(150, 150, 25, 0, Math.PI * 2);
      ctx.stroke();

      // 4. تحديث حركة المضرب
      if (isMoving) {
        striker.x += striker.vx;
        striker.y += striker.vy;
        striker.vx *= 0.98; // احتكاك لتقليل السرعة
        striker.vy *= 0.98;

        // ارتداد المضرب عن الجدران
        if (striker.x < 15 || striker.x > boardSize - 15) striker.vx *= -1;
        if (striker.y < 15 || striker.y > boardSize - 15) striker.vy *= -1;

        // تحديث وحساب حركة حبوب الكيرم
        coins.forEach(coin => {
          if (coin.isPocketed) return;

          coin.x += coin.vx;
          coin.y += coin.vy;
          coin.vx *= 0.98;
          coin.vy *= 0.98;

          // ارتداد الحبوب عن الجدران
          if (coin.x < 12 || coin.x > boardSize - 12) coin.vx *= -1;
          if (coin.y < 12 || coin.y > boardSize - 12) coin.vy *= -1;

          // احتساب التصادم بين المضرب والحبوب
          const distToStriker = Math.hypot(coin.x - striker.x, coin.y - striker.y);
          if (distToStriker < coin.radius + striker.radius) {
            const angle = Math.atan2(coin.y - striker.y, coin.x - striker.x);
            coin.vx = Math.cos(angle) * 6;
            coin.vy = Math.sin(angle) * 6;
          }

          // التحقق من دخول الحبة في إحدى الحفر
          pockets.forEach(p => {
            const distToPocket = Math.hypot(coin.x - p.x, coin.y - p.y);
            if (distToPocket < pocketRadius) {
              coin.isPocketed = true;
              let reward = coin.color === '#f1c40f' ? 50 : 10; // نقاط أعلى للملكة
              setScore(prev => prev + reward);
              setStatus(`🎉 روعة! أسقطت حبة كيرم وكسبت ${reward} نقطة!`);
            }
          });
        });

          // التوقف عند سكون كل القطع تماماً
          const anyCoinMoving = coins.some(c => !c.isPocketed && (Math.abs(c.vx) > 0.1 || Math.abs(c.vy) > 0.1));
          const strikerMoving = Math.abs(striker.vx) > 0.1 || Math.abs(striker.vy) > 0.1;

          if (!anyCoinMoving && !strikerMoving) {
            setIsMoving(false);
            // إعادة المضرب لخط البداية للضربة التالية
            striker.x = 150;
            striker.y = 250;
            striker.vx = 0;
            striker.vy = 0;
            
            // تحقق إذا نزلت كل الحبوب
            if (coins.every(c => c.isPocketed)) {
              setStatus('🏆 مبروك! قشيت لوحة الكيرم بالكامل وأنهيت اللعبة!');
            } else {
              setStatus('🥏 رجع المضرب لمكانه. اضبط الزاوية واضرب مجدداً!');
            }
          }
      }

      // 5. رسم حبوب الكيرم النشطة
      coins.forEach(coin => {
        if (!coin.isPocketed) {
          ctx.fillStyle = coin.color;
          ctx.beginPath();
          ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // 6. رسم المضرب (Striker)
      ctx.fillStyle = striker.color;
      ctx.beginPath();
      ctx.arc(striker.x, striker.y, striker.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 7. رسم خط التوجيه عند الاستعداد للضرب
      if (!isMoving) {
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const angle = Math.atan2(mouseY - striker.y, mouseX - striker.x);
        ctx.moveTo(striker.x, striker.y);
        ctx.lineTo(striker.x + Math.cos(angle) * 60, striker.y + Math.sin(angle) * 60);
        ctx.stroke();
        ctx.setLineDash([]); // إعادة الخط لوضعه الطبيعي
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('click', handleShoot);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMoving]);

  return (
    <div style={{ maxWidth: '340px', background: '#34495e', color: '#fff', padding: '15px', borderRadius: '12px', textAlign: 'center', direction: 'rtl', fontFamily: 'sans-serif', margin: '10px auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
      <h3 style={{ color: '#f1c40f', margin: '0 0 5px 0', fontSize: '18px' }}>🥏 تحدي الكيرم التفاعلي</h3>
      
      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
        النقاط الحالية: <span style={{ color: '#2ecc71' }}>{score}</span>
      </div>

      <canvas 
        ref={canvasRef} 
        width={300} 
        height={300} 
        style={{ background: '#f7d794', borderRadius: '8px', cursor: 'crosshair', width: '100%', height: 'auto', display: 'block' }}
      />

      <p style={{ fontSize: '12px', color: '#f5cd79', marginTop: '10px', minHeight: '32px' }}>{status}</p>
    </div>
  );
}
