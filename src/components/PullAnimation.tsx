import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Song, Rarity } from '../lib/types';

interface PullAnimationProps {
  isOpen: boolean;
  songs: Song[];
  onComplete: () => void;
}

export const PullAnimation: React.FC<PullAnimationProps> = ({
  isOpen,
  songs,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'meteor' | 'burst' | 'done'>('meteor');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Tính độ hiếm cao nhất để báo trước màu sao băng
  const maxRarity: Rarity = useMemo(() => {
    if (!songs || songs.length === 0) return 3;
    const max = Math.max(...songs.map((s) => s.rarity));
    return (max as Rarity) || 3;
  }, [songs]);

  // Âm thanh Web Audio nhỏ khi bùng nổ (tùy chọn)
  const playGachaSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (maxRarity === 5) {
        // Hợp âm vang sáng cho 5★
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.4); // D6
      } else if (maxRarity === 4) {
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      } else {
        osc.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.25); // E5
      }

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // Bỏ qua lỗi audio
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setPhase('meteor');

    // Giai đoạn 1: Chờ đợi sao băng lao vào (1.2s)
    const meteorTimer = setTimeout(() => {
      setPhase('burst');
      playGachaSound();

      // Giai đoạn 2: Bùng nổ chớp sáng (0.3s)
      const burstTimer = setTimeout(() => {
        setPhase('done');
        onComplete();
      }, 350);

      return () => clearTimeout(burstTimer);
    }, 1200);

    return () => clearTimeout(meteorTimer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className={`genshin-pull-overlay phase-${phase} max-rarity-${maxRarity}`}>
      {/* Nút Skip luôn hiển thị ở góc trên */}
      <button
        type="button"
        className="pull-skip-top-btn"
        onClick={handleSkip}
        title="Bỏ qua hiệu ứng và xem ngay kết quả"
      >
        Skip ⏭
      </button>

      {/* Nút bật/tắt âm thanh */}
      <button
        type="button"
        className="pull-sound-toggle-btn"
        onClick={() => setSoundEnabled((prev) => !prev)}
        title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
      >
        {soundEnabled ? '🔊 Bật' : '🔇 Tắt'}
      </button>

      {/* Giai đoạn 1: Sao băng / Quả cầu sáng bay vào trung tâm */}
      {phase === 'meteor' && (
        <div className={`genshin-meteor-container rarity-${maxRarity} ${maxRarity === 5 ? 'shake-5star' : ''}`}>
          <div className="meteor-trail" />
          <div className="meteor-orb">
            <div className="meteor-core" />
            <div className="meteor-halo" />
          </div>
          <div className="meteor-title-preview">
            {maxRarity === 5 ? '✦ HUYỀN THOẠI 5★ ✦' : maxRarity === 4 ? '✦ CAO TRÀO 4★ ✦' : '✦ BÀI HÁT PHỔ BIẾN ✦'}
          </div>
        </div>
      )}

      {/* Giai đoạn 2: Bùng nổ chớp sáng toàn màn hình */}
      {phase === 'burst' && (
        <div className={`genshin-burst-flash rarity-${maxRarity}`} />
      )}
    </div>
  );
};
