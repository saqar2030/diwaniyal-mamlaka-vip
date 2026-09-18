import React, { useState, useEffect, useRef } from 'react';

export default function BilliardsGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('🎱 حرك الماوس/إصبعك لتحديد الزاوية، ثم اضغط كليك للضرب!');

  // إعدادات اللعبة الداخلية
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let ballX = 150;
    let ballY = 200;
    let ballVX = 0;
    let ballVY = 0;
    let isMoving = false;

    // موقع الحفرة المستهدفة
    const holeX = 150;
    const holeY = 40;
    const holeRadius = 20;

    let mouseX = 150;
    let mouseY = 100;

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
      // حساب اتجاه وقوة ضربة العصا بناءً على موقع الماوس
      const angle = Math.atan2(mouseY - ballY, mouseX - ballX);
      ballVX = Math.cos(angle) * 7;
      ballVY = Math.sin(angle) * 7;
      isMoving = true;
      setStatus('⏳ الكرات تتحرك الآن...');
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('click', handleShoot);

    // حلقة التحديث والرسم المستمر (Game Loop)
    let animationFrameId: number;
    const updateGame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. رسم طاولة البلياردو الخضراء
      ctx.fillStyle = '#0a5c36';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#4e2f1d';
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // 2. رسم الحفرة
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(holeX, holeY, holeRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. تحديث حركة الكرة وإضافة احتكاك لتقليل السرعة تدريجياً
      if (isMoving) {
        ballX += ballVX;
        ballY += ballVY;
        ballVX *= 0.98;
        ballVY *= 0.98;

        // ارتداد الكرة عن الجدران
        if (ballX < 15 || ballX > canvas.width - 15) ballVX *= -1;
        if (ballY < 15 || ballY > canvas.height - 15) ballVY *= -1;

        // التحقق من دخول الكرة في الحفرة
        const dist = Math.hypot(ballX - holeX, ballY - holeY);
        if (dist < holeRadius) {
          setScore(prev => prev + 1);
          setStatus('🎉 هدف رائع! الكرة دخلت في الحفرة.');
          ballX = 150;
          ballY = 200;
          ballVX = 0;
          ballVY = 0;
          isMoving = false;
        }

        // التوقف إذا أصبحت السرعة قريبة من الصفر
        if (Math.abs(ballVX) < 0.1 && Math.abs(ballVY) < 0.1) {
          isMoving = false;
          setStatus('🎱 توقفت الكرة. اضبط الزاوية واضرب مجدداً!');
        }
      }

      // 4. رسم الكرة البيضاء
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ballX, ballY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 5. رسم عصا البلياردو التوجيهية (عند توقف الكرة)
      if (!isMoving) {
        ctx.strokeStyle = '#d2b48c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        // امتداد خط العصا
        const angle = Math.atan2(mouseY - ballY, mouseX - ballX);
        ctx.moveTo(ballX - Math.cos(angle) * 20, ballY - Math.sin(angle) * 20);
        ctx.lineTo(ballX - Math.cos(angle) * 80, ballY - Math.sin(angle) * 80);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(updateGame);
    };

    updateGame();

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('click', handleShoot);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMoving]);

  return (
    <div style={{ maxWidth: '340px', background: '#2c3e50', color: '#fff', padding: '15px', borderRadius: '12px', textAlign: 'center', direction: 'rtl', fontFamily: 'sans-serif', margin: '10px auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
      <h3 style={{ color: '#f1c40f', margin: '0 0 5px 0', fontSize: '18px' }}>🎱 تحدي البلياردو السريع</h3>
      
      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
        النقاط الحالية: <span style={{ color: '#2ecc71' }}>{score}</span>
      </div>

      <canvas 
        ref={canvasRef} 
        width={300} 
        height={300} 
        style={{ background: '#0a5c36', borderRadius: '8px', cursor: 'crosshair', width: '100%', height: 'auto', display: 'block' }}
      />

      <p style={{ fontSize: '12px', color: '#f5cd79', marginTop: '10px', minHeight: '32px' }}>{status}</p>
    </div>
  );
}
