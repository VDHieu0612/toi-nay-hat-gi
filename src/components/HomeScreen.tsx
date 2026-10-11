import React, { useState } from 'react';
import { Banner, Song, PullState } from '../lib/types';
import { BannerSidebar } from './BannerSidebar';
import { BannerDetail } from './BannerDetail';
import { CONFIG } from '../lib/gacha';
import { loadDismissOrientationHint, saveDismissOrientationHint } from '../lib/storage';

interface HomeScreenProps {
  banners: Banner[];
  selectedBanner: Banner;
  onSelectBanner: (banner: Banner) => void;
  pullState: PullState;
  onResetPity: () => void;
  allSongs: Song[];
  poolCount: number;
  onPullOne: () => void;
  onPullTen: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  banners,
  selectedBanner,
  onSelectBanner,
  pullState,
  onResetPity,
  allSongs,
  poolCount,
  onPullOne,
  onPullTen,
}) => {
  const [hintDismissed, setHintDismissed] = useState(() => loadDismissOrientationHint());
  const [soundEnabled, setSoundEnabled] = useState(false);

  const handleDismissHint = () => {
    setHintDismissed(true);
    saveDismissOrientationHint(true);
  };

  const handleConfirmResetPity = () => {
    if (window.confirm('Bạn có chắc muốn đặt lại bộ đếm bảo hiểm Pity 5★ về 0?')) {
      onResetPity();
    }
  };

  return (
    <div className="genshin-wish-screen">
      {/* Gợi ý xoay ngang cho điện thoại portrait (non-blocking) */}
      {!hintDismissed && (
        <aside className="orientation-hint-banner" aria-label="Gợi ý xoay ngang">
          <span className="orientation-hint-text">
            📱 <strong>Gợi ý:</strong> Xoay ngang điện thoại để có trải nghiệm Wish trọn vẹn nhất!
          </span>
          <button
            type="button"
            className="orientation-hint-close"
            onClick={handleDismissHint}
            title="Đóng gợi ý"
          >
            ✕
          </button>
        </aside>
      )}

      {/* Thanh trên cùng (Top Bar) */}
      <header className="genshin-top-bar">
        <div className="top-bar-left">
          <span className="genshin-star-icon">✦</span>
          <h1 className="genshin-app-title">GACHA KARAOKE</h1>
          <span className="genshin-tagline-badge">Phòng Hát Chiêm Tinh</span>
        </div>

        <div className="top-bar-right">
          {/* Pity Counter capsule */}
          <div className="genshin-pity-capsule" title="Bộ đếm bảo hiểm 5★">
            <span className="pity-icon">★</span>
            <span className="pity-label">Bảo hiểm 5★:</span>
            <span className="pity-value">
              {pullState.pullsSinceFiveStar} / {CONFIG.pityFiveStar}
            </span>
          </div>

          <button
            type="button"
            className="top-bar-icon-btn"
            onClick={handleConfirmResetPity}
            title="Đặt lại Pity"
          >
            ↺ Đặt lại
          </button>

          <button
            type="button"
            className="top-bar-icon-btn"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      {/* Bố cục chính: Cột trái 30% / Cột phải 70% */}
      <main className="genshin-main-grid">
        <BannerSidebar
          banners={banners}
          selectedBanner={selectedBanner}
          onSelectBanner={onSelectBanner}
        />

        <BannerDetail
          banner={selectedBanner}
          allSongs={allSongs}
          poolCount={poolCount}
          onPullOne={onPullOne}
          onPullTen={onPullTen}
          onOpenHistory={() => alert('Lịch sử sẽ được hoàn thiện ở M5')}
        />
      </main>
    </div>
  );
};
