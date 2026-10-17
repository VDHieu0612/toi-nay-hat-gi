import React from 'react';
import { Song } from '../lib/types';
import { getSearchKaraokeUrl } from '../lib/filters';
import { Icon } from './ui/Icon';

// Component ngôi sao lấp lánh dạng SVG 4 cánh thanh lịch
const SparkleStar: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={`sparkle-star ${className}`}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" />
  </svg>
);

interface SongCardProps {
  song: Song;
  isFlipped?: boolean; // false = mặt sau (úp), true = mặt trước
  showBeam?: boolean;  // Giữ lại để tương thích ngược, điều khiển hiển thị hiệu ứng sao lấp lánh
  showSparkles?: boolean; // Hiển thị ngôi sao lấp lánh xung quanh thẻ bài
  isFocused5Star?: boolean; // Khi đang zoom lớn giữa màn hình ở nhịp 4
  starCountReveal?: number; // Đếm số sao dần dần (1..5) khi đang reveal 5★
  className?: string;
  style?: React.CSSProperties;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  isFlipped = true,
  showBeam = true,
  showSparkles,
  isFocused5Star = false,
  starCountReveal,
  className = '',
  style,
}) => {
  // Số sao hiển thị: nếu đang trong quá trình đếm sao (5★) thì hiển thị số sao tương ứng
  const totalStars = starCountReveal !== undefined ? starCountReveal : song.rarity;
  const starsString = '★'.repeat(Math.max(1, totalStars));
  const shouldShowSparkles = isFlipped && (showSparkles !== undefined ? showSparkles : showBeam);

  return (
    <div
      className={`card-wrapper rarity-${song.rarity} ${isFlipped ? 'is-flipped' : 'is-back'} ${
        isFocused5Star ? 'is-focused-5star' : ''
      } ${className}`}
      style={style}
    >
      {/* Các ngôi sao lấp lánh xung quanh thẻ bài (thay thế thanh dọc) */}
      {shouldShowSparkles && (
        <div className={`card-sparkles-surround sparkles-${song.rarity}star`} aria-hidden="true">
          <div className="sparkle-star-item s-top-center">
            <SparkleStar size={song.rarity === 5 ? 18 : song.rarity === 4 ? 15 : 12} />
          </div>
          <div className="sparkle-star-item s-top-left">
            <SparkleStar size={song.rarity === 5 ? 15 : 12} />
          </div>
          <div className="sparkle-star-item s-top-right">
            <SparkleStar size={song.rarity === 5 ? 14 : 11} />
          </div>
          <div className="sparkle-star-item s-mid-left">
            <SparkleStar size={song.rarity === 5 ? 13 : 10} />
          </div>
          <div className="sparkle-star-item s-mid-right">
            <SparkleStar size={song.rarity === 5 ? 15 : 11} />
          </div>
          <div className="sparkle-star-item s-bottom-left">
            <SparkleStar size={11} />
          </div>
          <div className="sparkle-star-item s-bottom-right">
            <SparkleStar size={13} />
          </div>
          {song.rarity >= 4 && (
            <>
              <div className="sparkle-star-item s-upper-right">
                <SparkleStar size={10} />
              </div>
              <div className="sparkle-star-item s-lower-left">
                <SparkleStar size={10} />
              </div>
            </>
          )}
          {song.rarity === 5 && (
            <>
              <div className="sparkle-star-item s-upper-left">
                <SparkleStar size={11} />
              </div>
              <div className="sparkle-star-item s-bottom-center">
                <SparkleStar size={16} />
              </div>
              <div className="sparkle-star-item s-center-left-far">
                <SparkleStar size={9} />
              </div>
              <div className="sparkle-star-item s-center-right-far">
                <SparkleStar size={9} />
              </div>
            </>
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
          </div>
        </div>

        {/* =========================================
            MẶT TRƯỚC (Nội dung thẻ: Đỉnh vòm tròn)
            ========================================= */}
        <div className={`card-side card-front-face rarity-${song.rarity}-bg`}>
          {/* Shimmer vàng quét qua cho 5★ */}
          {song.rarity === 5 && <div className="card-5star-shimmer" />}

          {/* Vùng an toàn (Safe Zone): cách đỉnh 18%, cách 2 bên 7% */}
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

            {/* 5. NÚT TÌM KARAOKE (M4) */}
            <a
              href={getSearchKaraokeUrl(song.title, song.artist)}
              target="_blank"
              rel="noopener noreferrer"
              className="card-karaoke-btn"
              title={`Tìm bài hát "${song.title} - ${song.artist}" trên YouTube Karaoke`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="card-karaoke-icon">
                <Icon name="music" size={12} />
              </span>
              <span className="card-karaoke-text">Tìm karaoke</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

