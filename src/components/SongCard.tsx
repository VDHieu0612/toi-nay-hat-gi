import React from 'react';
import { Song } from '../lib/types';

interface SongCardProps {
  song: Song;
  isFlipped?: boolean; // false = mặt sau (úp), true = mặt trước
  onFlip?: () => void;
  showBeam?: boolean;  // Hiển thị chùm sáng vươn lên
  isFocused5Star?: boolean; // Khi đang zoom lớn giữa màn hình ở nhịp 4
  starCountReveal?: number; // Đếm số sao dần dần (1..5) khi đang reveal 5★
  className?: string;
  style?: React.CSSProperties;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  isFlipped = true,
  onFlip,
  showBeam = true,
  isFocused5Star = false,
  starCountReveal,
  className = '',
  style,
}) => {
  // Số sao hiển thị: nếu đang trong quá trình đếm sao (5★) thì hiển thị số sao tương ứng
  const totalStars = starCountReveal !== undefined ? starCountReveal : song.rarity;
  const starsString = '★'.repeat(Math.max(1, totalStars));

  return (
    <div
      className={`card-wrapper rarity-${song.rarity} ${isFlipped ? 'is-flipped' : 'is-back'} ${
        isFocused5Star ? 'is-focused-5star' : ''
      } ${className}`}
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
      {/* Chùm sáng (beam) bốc lên từ đỉnh vòm - phần tử riêng biệt không bị che */}
      {isFlipped && showBeam && (
        <div className={`card-top-beam beam-${song.rarity}star`}>
          <div className="beam-vertical-ray" />
          <div className="beam-glow-spread" />
          {song.rarity >= 4 && (
            <div className="beam-particles">
              <span className="p1">✦</span>
              <span className="p2">✦</span>
              {song.rarity === 5 && <span className="p3">✦</span>}
            </div>
          )}
        </div>
      )}

      {/* 3D Flipper Container */}
      <div className="card-flipper-3d">
        {/* =========================================
            MẶT SAU (Úp - Họa tiết chung không lộ độ hiếm)
            ========================================= */}
        <div className="card-side card-back-face">
          <div className="card-back-pattern">
            <svg
              className="card-back-svg"
              viewBox="0 0 100 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="55" r="38" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="50" cy="55" r="28" stroke="currentColor" strokeWidth="1.5" />
              <polygon points="50,25 58,47 80,55 58,63 50,85 42,63 20,55 42,47" fill="currentColor" opacity="0.6" />
              <circle cx="50" cy="55" r="7" fill="currentColor" />
            </svg>
            <span className="card-back-prompt">Lật thẻ</span>
          </div>
        </div>

        {/* =========================================
            MẶT TRƯỚC (Nội dung thẻ: Đỉnh vòm tròn, 4 mục duy nhất)
            ========================================= */}
        <div className={`card-side card-front-face rarity-${song.rarity}-bg`}>
          {/* Shimmer vàng quét qua cho 5★ */}
          {song.rarity === 5 && <div className="card-5star-shimmer" />}

          {/* Vùng an toàn (Safe Zone): cách đỉnh 20%, cách 2 bên 8% */}
          <div className="card-safe-content">
            {/* 1. SỐ SAO (Hiển thị rõ ràng ở trên) */}
            <div className={`card-stars-zone star-rarity-${song.rarity}`}>
              {starsString}
            </div>

            {/* 2. HÌNH MINH HỌA SVG ĐƠN GIẢN Ở GIỮA */}
            <div className="card-art-zone">
              <div className="card-art-icon-container">
                <svg
                  className="card-mini-svg"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Đĩa than vinyl đơn giản, tô màu theo độ hiếm */}
                  <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="3" opacity="0.7" />
                  <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                  <circle cx="50" cy="50" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                  <circle cx="50" cy="50" r="14" fill="currentColor" opacity="0.4" />
                  <circle cx="50" cy="50" r="5" fill="currentColor" />
                  {/* Kim máy hát nhỏ trang trí */}
                  <line x1="22" y1="20" x2="44" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* 3. TÊN BÀI & 4. TÊN CA SĨ */}
            <div className="card-info-zone">
              <h3 className="card-song-name" title={song.title}>
                {song.title}
              </h3>
              <p className="card-artist-name" title={song.artist}>
                {song.artist}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
