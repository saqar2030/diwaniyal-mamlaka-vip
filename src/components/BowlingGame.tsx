import React, { useState, useEffect, useRef } from 'react';

interface Pin {
  x: number;
  y: number;
  isHit: boolean;
}

export default function BowlingGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [status, setStatus] = useState('🎳 الكرة تتحرك! اضغط كليك في التوقيت الصحيح لإطلاقها نحو القوارير!');
  
  const [isShooting, setIsShooting] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // إعدادات الكرة
    let ballX = 150;
    let ballY = 270;
    let ballRadius = 12;
    let ballSpeedX = 3; 
    let ballSpeedY = 0;

    // توزيع القوارير (Pins) بشكل مثلثي مقلوب في الأعلى
    let pins: Pin[] = [
      { x: 150, y: 40, isHit: false }, // الصف الأول
      { x: 130, y: 60, isHit: false }, { x: 170, y: 60, isHit: false }, // الصف الثاني
      { x: 110, y: 80, isHit: false }, { x: 150, y: 80, isHit: false }, { x: 190, y: 80, isHit: false } // الصف الثالث
    ];

    const handleCanvasClick = () => {
      if (isShooting) return;
      ballSpeedY = -7; // إطلاق الكرة للأعلى
      ballSpeedX = 0;  // إيقاف الحركة الأفقية
      setIsShooting(true);
      setStatus('⏳ انتظر نتيجة الرمية...');
    };

    canvas.addEventListener('click', handleCanvasClick);

    let animationFrameId: number;
    
    const gameLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. رسم حارة البولينج الخشبية
      ctx.fillStyle = '#f3d9b1'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // رسم الخطوط الجانبية للحارة (Gutters)
      ctx.fillStyle = '#3d3d3d';
      ctx.fillRect(0, 0, 30, canvas.height);
      ctx.fillRect(canvas.width - 30, 0, 30, canvas.height);

      // 2. تحديث حركة الكرة
      if (!isShooting) {
        // تحريك الكرة يميناً ويساراً لتحديد زاوية الرمي قبل الإطلاق
        ballX += ballSpeedX;
        if (ballX < 45 || ballX > canvas.width - 45) {
          ballSpeedX *= -1;
        }
      } else {
        // اندفاع الكرة للأعلى بعد الضغط
        ballY += ballSpeedY;

        // التحقق من التصادم مع القوارير
        pins.forEach(pin => {
          if (!pin.isHit) {
            const dist = Math.hypot(ballX - pin.x, ballY - pin.y);
            if (dist < ballRadius + 8) {
              pin.isHit = true;
            }
          }
        });

        // عند خروج الكرة من الشاشة بالأعلى، يتم حساب النتيجة
        if (ballY < 0) {
          const hitCount = pins.filter(p => p.isHit).length;
          setScore(prev => prev + hitCount);
          
          if (hitCount === pins.length) {
            setStrikes(prev => prev + 1);
            setStatus(`🔥 واو!! سترايك (Strike)! أسقطت جميع القوارير الـ ${hitCount}!`);
          } else if (hitCount > 0) {
            setStatus(`🎉 رمية جيدة! أسقطت ${hitCount} قوارير.`);
          } else {
            setStatus('😢 أوه لا! لم تسقط أي قارورة (رمية في المجرى الجانبي).');
          }

          // إعادة تعيين الكرة والقوارير لرمية جديدة
          ballX = 150;
          ballY = 270;
          ballSpeedX = 3;
          ballSpeedY = 0;
          pins.forEach(p => p.isHit = false);
          setIsShooting(false);
        }
      }

      // 3. رسم القوارير المتبقية
      pins.forEach(pin => {
        if (!pin.isHit) {
          // جسم القارورة الأبيض
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(pin.x, pin.y, 8, 0, Math.PI * 2);
          ctx.fill();
          
          // الخط الأحمر الشهير على القارورة
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(pin.x - 8, pin.y - 2, 16, 3);
        }
      });

      // 4. رسم كرة البولينج
      ctx.fillStyle = '#3c40c6'; // لون الكرة
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // رسم الثقوب الثلاثة على الكرة لتبدو حقيقية
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ballX - 4, ballY - 4, 2, 0, Math.PI * 2);
      ctx.arc(ballX + 4, ballY - 4, 2, 0, Math.PI * 2);
      ctx.arc(ballX, ballY + 2, 2, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isShooting]);

  return (
    <div style={{ maxWidth: '340px', background: '#2c3e50', color: '#fff', padding: '15px', borderRadius: '12px', textAlign: 'center', direction: 'rtl', fontFamily: 'sans-serif', margin: '10px auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
      <h3 style={{ color: '#f1c40f', margin: '0 0 5px 0', fontSize: '18px' }}>🎳 تحدي البولينج السريع</h3>
      
      <div style={{ display: 'flex', justifyContent: 'space-around', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px', fontWeight: 'bold' }}>
        <div>مجموع النقاط: <span style={{ color: '#2ecc71' }}>{score}</span></div>
        <div>مرات الـ Strike: <span style={{ color: '#f1c40f' }}>{strikes}</span></div>
      </div>

      <canvas 
        ref={canvasRef} 
        width={300} 
        height={320} 
        style={{ background: '#f3d9b1', borderRadius: '8px', cursor: 'pointer', width: '100%', height: 'auto', display: 'block' }}
      />

      <p style={{ fontSize: '12px', color: '#f5cd79', marginTop: '10px', minHeight: '32px' }}>{status}</p>
    </div>
  );
}
