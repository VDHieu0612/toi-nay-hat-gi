import React, { useState, useMemo } from 'react';
import { Banner, Song } from '../lib/types';
import { getArtistRotationInfo } from '../lib/rotation';

interface BannerDetailProps {
  banner: Banner;
  allBanners?: Banner[];
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
  allBanners = [],
  poolCount,
  onPullOne,
  onPullTen,
  onOpenHistory,
  onOpenFilter,
  activeFilterCount = 0,
}) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Tính thông tin xoay tua 2 ngày nếu là banner ca sĩ
  const rotationInfo = useMemo(() => {
    return getArtistRotationInfo(allBanners.length > 0 ? allBanners : [banner]);
  }, [allBanners, banner]);

  const isArtist = banner.type === 'artist';
  const isActiveArtist = isArtist && rotationInfo?.activeBannerId === banner.id;
  const isPoolEmpty = poolCount === 0;

  return (
    <section
      className="banner-detail-panel"
      style={{ '--banner-theme': banner.theme } as React.CSSProperties}
    >
      <div className="banner-poster-container">
        {/* Lớp phủ gradient và trang trí góc */}
        <div className="banner-poster-backdrop" />

        {/* Cột trái: Nội dung thông tin banner (tiêu đề, luật rút, đợt xoay tua, mô tả) */}
        <div className="banner-poster-info">
          <div className="banner-tag-pill">
            {isArtist
              ? '✦ TIÊU ĐIỂM CA SĨ · XOAY TUA 2 NGÀY ✦'
              : '✦ BANNER TIÊU CHUẨN ✦'}
          </div>

          <h2 className="banner-main-title">
            <span>{banner.name}</span>
          </h2>

          <div className="banner-rules-box">
            <p className="banner-guarantee-line">
              <span className="guarantee-icon">❖</span>
              Mỗi 10 lượt rút bảo đảm có ít nhất một bài 4★ trở lên.
            </p>
            {isArtist && rotationInfo && (
              <p className="banner-rateup-line banner-rotation-status-line">
                <span className="guarantee-icon">⏰</span>
                {isActiveArtist ? (
                  <span>
                    <strong>Đang mở đợt này:</strong> {rotationInfo.timeRemainingFormatted} (Kỳ sau: {rotationInfo.nextBanner.name})
                  </span>
                ) : (
                  <span>
                    <strong>Xoay tua 2 ngày:</strong> Sẽ mở trong chu kỳ tiếp theo
                  </span>
                )}
              </p>
            )}
          </div>

          <p className="banner-desc-text">{banner.description}</p>
        </div>

        {/* Cột phải / Giữa: Khoảng trống để chèn hình ảnh banner (thay thế thẻ card theo yêu cầu) */}
        <div className="banner-poster-showcase">
          <div className="banner-image-placeholder-container">
            {banner.imageUrl ? (
              <img
                src={banner.imageUrl}
                alt={`Tranh banner ${banner.name}`}
                className="banner-artwork-image"
              />
            ) : (
              <div className="banner-image-artwork-slot" title="Khu vực hình ảnh banner">
                {/* Khung minh họa nghệ thuật sân khấu & đĩa than */}
                <div className="artwork-ambient-glow" style={{ backgroundColor: banner.theme }} />
                <svg
                  className="banner-stage-svg"
                  viewBox="0 0 240 240"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="120" cy="120" r="105" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                  <circle cx="120" cy="120" r="85" stroke="currentColor" strokeWidth="3" opacity="0.4" />
                  <circle cx="120" cy="120" r="60" stroke="currentColor" strokeWidth="2" opacity="0.6" />
                  <circle cx="120" cy="120" r="40" fill="currentColor" opacity="0.15" />
                  <circle cx="120" cy="120" r="16" fill="currentColor" opacity="0.8" />
                  {/* Kim máy đĩa than / micro nghệ thuật */}
                  <path
                    d="M120 15 L120 45 M120 195 L120 225 M15 120 L45 120 M195 120 L225 120"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.4"
                  />
                  <path
                    d="M170 60 L135 105"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                </svg>
                <div className="artwork-label-badge">
                  <span>✦ KHU VỰC HÌNH ẢNH BANNER ✦</span>
                </div>
              </div>
            )}
          </div>
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
                  <li>5★ (Siêu hit): <strong>3%</strong> cơ sở (Bảo hiểm 40 lần chắc chắn 5★, dùng chung toàn bộ các banner).</li>
                  <li>4★ (Hit): <strong>15%</strong> cơ sở (Bảo hiểm rút 10 ít nhất 1 bài ≥ 4★).</li>
                  <li>3★ (Bài ngon): <strong>82%</strong> cơ sở.</li>
                  {banner.featured && banner.featured.length > 0 && (
                    <li>Tỉ lệ Rate-Up: Khi ra 4★ hoặc 5★, có <strong>50%</strong> cơ hội trúng các bài tiêu điểm.</li>
                  )}
                  {isArtist && (
                    <li>Chu kỳ xoay tua: Banner ca sĩ thay đổi mỗi <strong>2 ngày</strong>.</li>
                  )}
                </ul>
              </div>
              <div className="details-section">
                <h4>Kho bài hát khả dụng</h4>
                <p>Tổng số bài hiện tại trong banner: <strong>{poolCount}</strong> bài</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
