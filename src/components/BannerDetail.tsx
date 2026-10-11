import React, { useState } from 'react';
import { Banner, Song } from '../lib/types';
import { SongCard } from './SongCard';

interface BannerDetailProps {
  banner: Banner;
  allSongs: Song[];
  poolCount: number;
  onPullOne: () => void;
  onPullTen: () => void;
  onOpenHistory?: () => void;
  onOpenFilter?: () => void;
  activeFilterCount?: number;
}

export const BannerDetail: React.FC<BannerDetailProps> = ({
  banner,
  allSongs,
  poolCount,
  onPullOne,
  onPullTen,
  onOpenHistory,
  onOpenFilter,
  activeFilterCount = 0,
}) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Tìm các bài hát rate-up nếu có
  const featuredSongs = (banner.featured || [])
    .map((id) => allSongs.find((s) => s.id === id))
    .filter((s): s is Song => Boolean(s));

  const hasFeatured = featuredSongs.length > 0;
  const isPoolEmpty = poolCount === 0;

  return (
    <section
      className="banner-detail-panel"
      style={{ '--banner-theme': banner.theme } as React.CSSProperties}
    >
      <div className="banner-poster-container">
        {/* Lớp phủ gradient và trang trí góc */}
        <div className="banner-poster-backdrop" />

        {/* Cột trái nội dung thông tin */}
        <div className="banner-poster-info">
          <div className="banner-tag-pill">
            {hasFeatured ? '✦ SỰ KIỆN RATE-UP ✦' : '✦ BANNER TIÊU CHUẨN ✦'}
          </div>

          <h2 className="banner-main-title">
            <span>{banner.name}</span>
          </h2>

          <div className="banner-rules-box">
            <p className="banner-guarantee-line">
              <span className="guarantee-icon">❖</span>
              Mỗi 10 lượt rút bảo đảm có ít nhất một bài 4★ trở lên.
            </p>
            {hasFeatured && (
              <p className="banner-rateup-line">
                <span className="guarantee-icon">★</span>
                Tăng 50% tỉ lệ rơi vào các bài hát Rate-Up!
              </p>
            )}
          </div>

          <p className="banner-desc-text">{banner.description}</p>
        </div>

        {/* Cột phải / Giữa: Hiển thị bài Rate-Up hoặc SVG sân khấu */}
        <div className="banner-poster-showcase">
          {hasFeatured ? (
            <div className="banner-featured-list">
              {featuredSongs.map((song) => (
                <div key={song.id} className="featured-card-wrapper">
                  <div className="featured-up-badge">UP!</div>
                  <SongCard song={song} className="preview-card" />
                </div>
              ))}
            </div>
          ) : (
            <div className="banner-illustration-wrapper">
              <svg
                className="banner-stage-svg"
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Vinyl turntable & stage lighting SVG */}
                <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <circle cx="100" cy="100" r="75" stroke="currentColor" strokeWidth="3" opacity="0.5" />
                <circle cx="100" cy="100" r="55" stroke="currentColor" strokeWidth="2" opacity="0.6" />
                <circle cx="100" cy="100" r="35" fill="currentColor" opacity="0.2" />
                <circle cx="100" cy="100" r="14" fill="currentColor" opacity="0.8" />
                <path
                  d="M100 15 L100 45 M100 155 L100 185 M15 100 L45 100 M155 100 L185 100"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <div className="banner-illu-caption">Quán Hát Muôn Màu</div>
            </div>
          )}
        </div>

        {/* Thanh dưới cùng của Poster */}
        <div className="banner-poster-bottom-bar">
          <div className="banner-bottom-left-btns">
            <button
              type="button"
              className={`genshin-sub-btn filter-trigger-btn ${activeFilterCount > 0 ? 'has-active-filters' : ''}`}
              onClick={onOpenFilter}
              title="Mở bộ lọc kho bài hát"
            >
              <span>Bộ lọc</span>
              {activeFilterCount > 0 && (
                <span className="filter-badge">{activeFilterCount}</span>
              )}
            </button>
            <button
              type="button"
              className="genshin-sub-btn"
              onClick={() => setShowDetailsModal(true)}
            >
              Chi tiết
            </button>
            <button
              type="button"
              className="genshin-sub-btn"
              onClick={onOpenHistory}
            >
              Lịch sử
            </button>
          </div>

          <div className="banner-bottom-right-container">
            {/* Cảnh báo pool bài hát (Mục 4.2) */}
            {poolCount > 0 && poolCount < 10 && (
              <div className="pool-warning-pill pool-warning-low" title="Kho bài còn ít">
                ⚠️ Còn {poolCount} bài sau lọc (cho phép bài trùng khi rút 10)
              </div>
            )}
            {poolCount === 0 && (
              <div className="pool-warning-pill pool-warning-empty" title="Kho bài rỗng">
                ⛔ Không có bài hát nào phù hợp bộ lọc. Vui lòng nới lỏng bộ lọc!
              </div>
            )}

            <div className="banner-bottom-right-btns">
              <button
                type="button"
                className="genshin-wish-btn wish-btn-single"
                onClick={onPullOne}
                disabled={isPoolEmpty}
                title={isPoolEmpty ? 'Bộ lọc không tìm thấy bài hát nào' : 'Rút 1 bài'}
              >
                <div className="wish-btn-content">
                  <span className="wish-btn-main">Rút ×1</span>
                  <span className="wish-btn-sub">1 bài hát</span>
                </div>
              </button>

              <button
                type="button"
                className="genshin-wish-btn wish-btn-ten"
                onClick={onPullTen}
                disabled={isPoolEmpty}
                title={isPoolEmpty ? 'Bộ lọc không tìm thấy bài hát nào' : 'Rút 10 bài setlist'}
              >
                <div className="wish-btn-content">
                  <span className="wish-btn-main">Rút ×10</span>
                  <span className="wish-btn-sub">Đảm bảo ≥ 4★ · Setlist</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Chi tiết banner */}
      {showDetailsModal && (
        <div className="details-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="details-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="details-modal-header">
              <h3>Chi tiết Banner: {banner.name}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="details-modal-body">
              <div className="details-section">
                <h4>Quy tắc xác suất</h4>
                <ul>
                  <li>5★ (Huyền thoại): <strong>3%</strong> cơ sở (Bảo hiểm 40 lần chắc chắn 5★).</li>
                  <li>4★ (Cao trào): <strong>15%</strong> cơ sở (Bảo hiểm rút 10 ít nhất 1 bài ≥ 4★).</li>
                  <li>3★ (Phổ biến): <strong>82%</strong> cơ sở.</li>
                  {hasFeatured && (
                    <li>Tỉ lệ Rate-Up: Khi ra 4★ hoặc 5★, có <strong>50%</strong> cơ hội là bài trong danh sách featured.</li>
                  )}
                </ul>
              </div>
              <div className="details-section">
                <h4>Số bài trong kho banner hiện tại</h4>
                <p>Tổng số bài khả dụng: <strong>{poolCount}</strong> bài</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
