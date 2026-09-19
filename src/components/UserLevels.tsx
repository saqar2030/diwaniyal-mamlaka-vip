import React, { useState } from 'react';
import { Award, Zap, ChevronUp } from 'lucide-react';

interface UserStats {
  xp: number;
  level: number;
  messagesCount: number;
}

export default function UserLevels() {
  // محاكاة بيانات مستوى المستخدم ونقاطه (تتحدث تلقائيًا مع تفاعله)
  const [stats, setStats] = useState<UserStats>({
    xp: 240,
    level: 3,
    messagesCount: 45
  });

  const [showLevelUp, setShowLevelUp] = useState(false);

  // حساب النقاط المطلوبة للانتقال للمستوى التالي (معادلة تفاعلية)
  const xpNeededForNextLevel = stats.level * 150;
  const progressPercentage = Math.min((stats.xp / xpNeededForNextLevel) * 100, 100);

  // دالة محاكاة لكسب النقاط عند التفاعل أو إرسال رسالة
  const simulateNewMessage = () => {
    let newXp = stats.xp + 25; // يحصل على 25 نقطة لكل رسالة
    let newLevel = stats.level;

    if (newXp >= xpNeededForNextLevel) {
      newXp = newXp - xpNeededForNextLevel;
      newLevel += 1;
      setShowLevelUp(true);
      // إخفاء إشعار الترقية بعد 4 ثوانٍ
      setTimeout(() => setShowLevelUp(false), 4000);
    }

    setStats({
      xp: newXp,
      level: newLevel,
      messagesCount: stats.messagesCount + 1
    });
  };

  return (
    <div style={{ maxWidth: '340px', background: '#1e272e', color: '#fff', padding: '15px', borderRadius: '12px', direction: 'rtl', fontFamily: 'sans-serif', margin: '15px auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
      
      {/* تأثير صعود المستوى (Level Up Alert) */}
      {showLevelUp && (
        <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(45deg, #f1c40f, #e67e22)', color: '#000', padding: '6px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 10px rgba(241,196,15,0.5)', zIndex: 10 }}>
          <ChevronUp size={16} /> مبروك! صعدت للمستوى {stats.level} 🔥
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ background: '#f1c40f', color: '#000', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Award size={20} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <h4 style={{ margin: 0, fontSize: '15px', color: '#f1c40f' }}>رتبة العضوية والمستويات</h4>
          <span style={{ fontSize: '11px', color: '#aaa' }}>تفاعل بالرومات لترفع لفلك</span>
        </div>
      </div>

      {/* تفاصيل المستوى الحالي */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '13px' }}>
        <div>المستوى الحركي: <b style={{ color: '#f1c40f', fontSize: '16px' }}>{stats.level}</b></div>
        <div style={{ color: '#aaa', fontSize: '12px' }}>{stats.xp} / {xpNeededForNextLevel} XP</div>
      </div>

      {/* شريط التقدم (Progress Bar) */}
      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ width: `${progressPercentage}%`, height: '100%', background: 'linear-gradient(90deg, #f1c40f, #f39c12)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', fontSize: '12px', color: '#ddd', marginBottom: '10px' }}>
        <div>💬 رسائلك: <b>{stats.messagesCount}</b></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Zap size={12} color="#f1c40f" /> قوة التفاعل: <b>نشط جداً</b></div>
      </div>

      {/* زر محاكاة تجريبي لكسب النقاط ورؤية لفل أب */}
      <button 
        onClick={simulateNewMessage}
        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px dashed rgba(255,255,255,0.2)', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
      >
        ⚡ اضغط لمحاكاة إرسال رسالة وكسب +25 XP
      </button>
    </div>
  );
}
