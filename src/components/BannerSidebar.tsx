import React, { useEffect, useMemo, useState } from 'react';
import { Banner } from '../lib/types';
import { getArtistRotationInfo } from '../lib/rotation';

interface BannerSidebarProps {
  banners: Banner[];
  selectedBanner: Banner;
  onSelectBanner: (banner: Banner) => void;
}

interface BannerCategory {
  title: string;
  badge?: string;
  banners: Banner[];
}

export const BannerSidebar: React.FC<BannerSidebarProps> = ({
  banners,
  selectedBanner,
  onSelectBanner,
}) => {
  // Cập nhật thời gian thực mỗi 1 giây để đồng hồ đếm ngược nhảy liên tục
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Lấy thông tin xoay tua 2 ngày của các banner ca sĩ
  const rotationInfo = useMemo(() => {
    return getArtistRotationInfo(banners, currentTime);
  }, [banners, currentTime]);

  // Phân nhóm banner: chỉ TỔNG HỢP (Tổng Hợp Quán Hát) và CA SĨ (bỏ Thể Loại theo yêu cầu)
  const categories = useMemo<BannerCategory[]>(() => {
    const general = banners.filter((b) => b.type === 'general' && b.id === 'tong-hop');
    const artist = banners.filter((b) => b.type === 'artist');

    const result: BannerCategory[] = [];

    if (general.length > 0) {
      result.push({
        title: 'Tổng Hợp',
        banners: general,
      });
    }

    if (artist.length > 0) {
      result.push({
        title: 'Ca Sĩ · Xoay Tua 2 Ngày',
        badge: rotationInfo ? rotationInfo.countdownClock : undefined,
        banners: artist,
      });
    }

    return result;
  }, [banners, rotationInfo]);

  // Danh sách phẳng tất cả banner theo thứ tự hiển thị để hỗ trợ phím mũi tên
  const flattenedBanners = useMemo(() => {
    return categories.flatMap((cat) => cat.banners);
  }, [categories]);

  // Hỗ trợ phím mũi tên lên/xuống để đổi banner trên desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const currentIndex = flattenedBanners.findIndex((b) => b.id === selectedBanner.id);
      if (currentIndex === -1) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + flattenedBanners.length) % flattenedBanners.length;
        onSelectBanner(flattenedBanners[prevIndex]);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % flattenedBanners.length;
        onSelectBanner(flattenedBanners[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flattenedBanners, selectedBanner, onSelectBanner]);

  return (
    <aside className="banner-sidebar" aria-label="Danh sách banner">
      <div className="banner-sidebar-list">
        {categories.map((category) => (
          <div key={category.title} className="banner-category-group">
            <div className="banner-category-header">
              <span className="banner-category-title">{category.title}</span>
              {category.badge && (
                <span
                  className="banner-category-badge live-clock"
                  title="Đồng hồ đếm ngược đợt xoay tua 2 ngày (giờ : phút : giây)"
                >
                  <span className="live-clock-icon">⏱</span> {category.badge}
                </span>
              )}
            </div>

            <div className="banner-category-items">
              {category.banners.map((banner) => {
                const isSelected = banner.id === selectedBanner.id;
                const isArtist = banner.type === 'artist';
                const isCurrentActiveArtist =
                  isArtist && rotationInfo?.activeBannerId === banner.id;

                return (
                  <button
                    key={banner.id}
                    type="button"
                    className={`banner-thumb-item ${isSelected ? 'active' : ''} ${
                      isCurrentActiveArtist ? 'rotation-spotlight' : ''
                    }`}
                    onClick={() => onSelectBanner(banner)}
                    style={
                      isSelected
                        ? ({ '--banner-theme': banner.theme } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <div
                      className="banner-thumb-preview"
                      style={{ backgroundColor: banner.theme }}
                    >
                      {isCurrentActiveArtist ? (
                        <span className="banner-thumb-badge live">✦ MỞ</span>
                      ) : (
                        <span className="banner-thumb-badge std">
                          {isArtist ? '★' : 'STD'}
                        </span>
                      )}

                      {/* Vinyl record icon SVG inside thumbnail */}
                      <svg
                        className="banner-thumb-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="4" />
                        <circle cx="12" cy="12" r="1" fill="currentColor" />
                      </svg>
                    </div>

                    <div className="banner-thumb-info banner-thumb-info-clean">
                      {/* Về phần bên trái: chỉ hiển thị tên ca sĩ / tên banner, không cần thông tin gì khác */}
                      <span className="banner-thumb-name">{banner.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
