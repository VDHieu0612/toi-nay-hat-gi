import React, { useEffect } from 'react';
import { Banner } from '../lib/types';

interface BannerSidebarProps {
  banners: Banner[];
  selectedBanner: Banner;
  onSelectBanner: (banner: Banner) => void;
}

export const BannerSidebar: React.FC<BannerSidebarProps> = ({
  banners,
  selectedBanner,
  onSelectBanner,
}) => {
  // Hỗ trợ phím mũi tên lên/xuống để đổi banner trên desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Chỉ kích hoạt khi không ở trong input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const currentIndex = banners.findIndex((b) => b.id === selectedBanner.id);
      if (currentIndex === -1) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + banners.length) % banners.length;
        onSelectBanner(banners[prevIndex]);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % banners.length;
        onSelectBanner(banners[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [banners, selectedBanner, onSelectBanner]);

  return (
    <aside className="banner-sidebar" aria-label="Danh sách banner">
      <div className="banner-sidebar-list">
        {banners.map((banner) => {
          const isSelected = banner.id === selectedBanner.id;
          return (
            <button
              key={banner.id}
              type="button"
              className={`banner-thumb-item ${isSelected ? 'active' : ''}`}
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
                {banner.featured && banner.featured.length > 0 ? (
                  <span className="banner-thumb-badge">UP</span>
                ) : (
                  <span className="banner-thumb-badge std">STD</span>
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

              <div className="banner-thumb-info">
                <span className="banner-thumb-name">{banner.name}</span>
                <span className="banner-thumb-tagline">
                  {banner.tagline || (banner.featured?.length ? 'Rate-Up' : 'Tiêu Chuẩn')}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
