import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Song, Rarity } from '../lib/types';
import { SongCard } from './SongCard';

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
  const [phase, setPhase] = useState<'meteor' | 'reveal'>('meteor');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Tính độ hiếm cao nhất của lượt rút để báo trước màu sao băng
  const maxRarity: Rarity = useMemo(() => {
    if (!songs || songs.length === 0) return 3;
    const max = Math.max(...songs.map((s) => s.rarity));
    return (max as Rarity) || 3;
  }, [songs]);

  // Tạo âm thanh nhẹ bằng Web Audio API (chỉ khi người dùng bật âm thanh)
  const playSoundEffect = (rarity: number) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (rarity === 5) {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      } else if (rarity === 4) {
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.25); // E5
      } else {
        osc.frequency.setValueAtTime(329.63, ctx.currentTime); // E4
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2); // A4
      }

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Bỏ qua lỗi audio nếu trình duyệt chặn
    }
  };

  // Reset state khi mở modal mới
  useEffect(() => {
    if (isOpen) {
      setPhase('meteor');
      setCurrentIndex(0);

      // Chuyển từ meteor sang reveal sau 1.3 giây
      const timer = setTimeout(() => {
        setPhase('reveal');
        if (songs[0]) {
          playSoundEffect(songs[0].rarity);
        }
      }, 1300);

      return () => clearTimeout(timer);
    }
  }, [isOpen, songs]);

  if (!isOpen || songs.length === 0) {
    return null;
  }

  const handleNext = () => {
    if (currentIndex < songs.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      playSoundEffect(songs[nextIndex].rarity);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentSong = songs[currentIndex];
  const isLast = currentIndex === songs.length - 1;

  return (
    <div className="pull-overlay">
      {/* Nút Skip luôn hiển thị ở mọi thời điểm */}
      <button
        type="button"
        className="pull-skip-btn"
        onClick={handleSkip}
        title="Bỏ qua hiệu ứng và xem toàn bộ kết quả"
      >
        Skip ⏭
      </button>

      {/* Nút bật/tắt âm thanh (tùy chọn, mặc định tắt) */}
      <button
        type="button"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 20,
          fontSize: '0.8125rem',
          cursor: 'pointer',
          zIndex: 10001,
        }}
        onClick={() => setSoundEnabled((prev) => !prev)}
        title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
      >
        {soundEnabled ? '🔊 Bật' : '🔇 Tắt'}
      </button>

      {/* Giai đoạn 1: Sao băng báo trước độ hiếm cao nhất */}
      {phase === 'meteor' && (
        <div className={`meteor-stage rarity-${maxRarity}`}>
          <div className="meteor-track">
            <div className="meteor-head" />
          </div>
          <div className="meteor-flash" />
          <div className="meteor-text">
            {maxRarity === 5 ? '★ ★ ★ HUYỀN THOẠI 5★ ★ ★' : maxRarity === 4 ? '★ ★ CAO TRÀO 4★ ★' : 'QUÁN HÁT ĐANG CHỌN BÀI...'}
          </div>
        </div>
      )}

      {/* Giai đoạn 2: Lật thẻ từng bài */}
      {phase === 'reveal' && currentSong && (
        <div className="reveal-stage">
          {songs.length > 1 && (
            <div className="reveal-progress">
              Bài {currentIndex + 1} / {songs.length}
            </div>
          )}

          <div
            className="reveal-card-wrapper"
            onClick={handleNext}
            title="Bấm để tiếp tục"
          >
            <div
              key={currentSong.id + currentIndex}
              className={`reveal-card-inner ${currentSong.rarity === 5 ? 'celebrate-5star' : ''}`}
            >
              <SongCard song={currentSong} />
            </div>
          </div>

          <div className="reveal-controls">
            <button
              type="button"
              className="reveal-next-btn"
              onClick={handleNext}
            >
              {isLast ? 'Xem toàn bộ Setlist 🎉' : 'Bài tiếp theo →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
