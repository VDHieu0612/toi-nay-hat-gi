import React from 'react';
import { Banner } from '../lib/types';

interface BannerSelectProps {
  banners: Banner[];
  selectedBanner: Banner;
  onSelectBanner: (banner: Banner) => void;
}

export const BannerSelect: React.FC<BannerSelectProps> = ({
  banners,
  selectedBanner,
  onSelectBanner,
}) => {
  return (
    <div className="banner-section">
      <div className="section-label">Chọn Banner</div>
      <div className="banner-list">
        {banners.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`banner-tab ${b.id === selectedBanner.id ? 'active' : ''}`}
            onClick={() => onSelectBanner(b)}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div className="banner-card">
        <h2 className="banner-card-title">{selectedBanner.name}</h2>
        <p className="banner-card-desc">{selectedBanner.description}</p>
        {selectedBanner.featured && selectedBanner.featured.length > 0 && (
          <span className="banner-featured-tag">
            ★ Rate-up: {selectedBanner.featured.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
};
