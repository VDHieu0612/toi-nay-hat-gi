import React from 'react';
import { Song } from '../lib/types';

interface SongCardProps {
  song: Song;
  isFlipped?: boolean; // false = mặt sau (úp), true = mặt trước
  onFlip?: () => void;
  isNew?: boolean;     // Hiển thị nhãn "Mới"
  showBeam?: boolean;  // Hiển thị chùm sáng vươn lên
  className?: string;
  style?: React.CSSProperties;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  isFlipped = true,
  onFlip,
  isNew = false,
  showBeam = true,
  className = '',
  style,
}) => {
  const stars = '★'.repeat(song.rarity);
  const primaryGenre = song.genre[0]?.toLowerCase() || 'vpop';

  const voiceLabels: Record<string, string> = {
    nam: 'Nam',
    nu: 'Nữ',
    'song-ca': 'Song ca',
    'tat-ca': 'Tất cả',
  };

  const difficultyLabels: Record<number, string> = {
    1: '🎤 Rất dễ',
    2: '🎤 Dễ hát',
    3: '🎤 Vừa sức',
    4: '🎤 Cần giọng',
    5: '🎤 Thách thức cực đại',
  };

  return (
    <div
      className={`genshin-card-container rarity-${song.rarity} ${isFlipped ? 'flipped' : 'unflipped'} ${className}`}
      style={style}
      onClick={!isFlipped && onFlip ? onFlip : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          !isFlipped && onFlip && onFlip();
        }
      }}
    >
      {/* Chùm sáng (Light Beam) vươn lên trên đỉnh thẻ khi đã lật */}
      {isFlipped && showBeam && (
        <div className={`card-light-beam beam-rarity-${song.rarity}`}>
          <div className="beam-core" />
          <div className="beam-glow" />
          <div className="beam-sparkles">
            <span className="sparkle s1">✦</span>
            <span className="sparkle s2">✦</span>
            <span className="sparkle s3">✦</span>
          </div>
        </div>
      )}

      {/* 3D Card Inner (Chuyển đổi mặt trước / mặt sau) */}
      <div className="genshin-card-flipper">
        {/* =========================================
            MẶT SAU (Úp - Họa tiết chung huyền bí)
            ========================================= */}
        <div className="card-face card-back">
          <div className="card-back-ornament">
            <div className="card-back-diamond" />
            <svg
              className="card-back-symbol"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
              <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1.5" />
              <polygon points="50,16 60,40 84,50 60,60 50,84 40,60 16,50 40,40" fill="currentColor" opacity="0.7" />
              <circle cx="50" cy="50" r="8" fill="currentColor" />
            </svg>
            <div className="card-back-hint">Bấm để lật</div>
          </div>
        </div>

        {/* =========================================
            MẶT TRƯỚC (Nội dung bài hát, đỉnh vòm nhọn)
            ========================================= */}
        <div className={`card-face card-front genre-${primaryGenre}`}>
          {/* Holographic shimmer overlay cho thẻ 5★ */}
          {song.rarity === 5 && <div className="card-holographic-sheen" />}

          {/* Nhãn "Mới" góc trên phải thẻ */}
          {isNew && <div className="card-new-badge">Mới</div>}

          {/* VÙNG 1: TRÊN (Số sao lớn + Giọng hát) */}
          <div className="card-zone-top">
            <div className={`card-stars-display rarity-${song.rarity}`}>
              {stars}
            </div>
            <div className="card-voice-tag">
              {voiceLabels[song.voice] || song.voice}
            </div>
          </div>

          {/* VÙNG 2: GIỮA (Hình minh họa SVG theo thể loại) */}
          <div className="card-zone-middle">
            <div className="card-artwork-frame">
              {primaryGenre === 'rock' ? (
                /* Icon Rock Micro Sấm Sét SVG */
                <svg viewBox="0 0 100 100" className="card-illustration-svg" fill="none">
                  <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="2" opacity="0.4" />
                  <path d="M46 22 H54 V46 H46 Z" fill="currentColor" opacity="0.8" />
                  <circle cx="50" cy="30" r="12" fill="currentColor" opacity="0.6" />
                  <path d="M42 42 C42 54 58 54 58 42" stroke="currentColor" strokeWidth="3" />
                  <path d="M50 54 V75 M40 75 H60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <path d="M68 28 L56 50 H66 L52 74" stroke="#fbbf24" strokeWidth="3" strokeLinejoin="round" />
                </svg>
              ) : primaryGenre === 'rap' ? (
                /* Icon Cassette Retro Tape SVG */
                <svg viewBox="0 0 100 100" className="card-illustration-svg" fill="none">
                  <rect x="16" y="28" width="68" height="44" rx="6" stroke="currentColor" strokeWidth="3" />
                  <rect x="26" y="42" width="48" height="20" rx="3" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="38" cy="52" r="7" stroke="currentColor" strokeWidth="2.5" />
                  <circle cx="62" cy="52" r="7" stroke="currentColor" strokeWidth="2.5" />
                  <line x1="38" y1="52" x2="62" y2="52" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
                </svg>
              ) : (
                /* Icon Đĩa Than Vinyl Cổ Điển SVG */
                <svg viewBox="0 0 100 100" className="card-illustration-svg" fill="none">
                  <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="3" opacity="0.6" />
                  <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                  <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                  <circle cx="50" cy="50" r="18" fill="currentColor" opacity="0.4" />
                  <circle cx="50" cy="50" r="6" fill="currentColor" />
                  <circle cx="50" cy="50" r="2" fill="#fff" />
                  {/* Kim máy hát / Stage light beam */}
                  <line x1="20" y1="18" x2="44" y2="44" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
          </div>

          {/* VÙNG 3: DƯỚI (Tên bài, ca sĩ, độ khó, năm, thể loại) */}
          <div className="card-zone-bottom">
            <h3 className="card-song-title" title={song.title}>
              {song.title}
            </h3>

            <p className="card-song-artist" title={song.artist}>
              {song.artist}
            </p>

            <div className="card-difficulty-tag">
              {difficultyLabels[song.difficulty] || `Độ khó: ${song.difficulty}`}
            </div>

            {song.challenge && song.rarity === 5 && (
              <div className="card-challenge-snippet" title={song.challenge}>
                ⚡ {song.challenge}
              </div>
            )}

            <div className="card-footer-meta">
              <span>{song.genre.join(', ')}</span>
              <span>{song.year}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
