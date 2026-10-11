import React, { useState, useEffect } from 'react';
import songsData from './data/songs.json';
import bannersData from './data/banners.json';
import { Song, Banner, PullState } from './lib/types';
import { pull, pullTen, CONFIG } from './lib/gacha';
import { getFilteredPool } from './lib/filters';
import { loadPullState, savePullState, resetPullState } from './lib/storage';
import { BannerSelect } from './components/BannerSelect';
import { ResultGrid } from './components/ResultGrid';
import { PullAnimation } from './components/PullAnimation';

const allSongs = songsData as Song[];
const banners = bannersData as Banner[];

export const App: React.FC = () => {
  const [selectedBanner, setSelectedBanner] = useState<Banner>(banners[0]);
  const [pullState, setPullState] = useState<PullState>(() => loadPullState());
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [animatingSongs, setAnimatingSongs] = useState<Song[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Lưu pullState vào localStorage mỗi khi state thay đổi
  useEffect(() => {
    savePullState(pullState);
  }, [pullState]);

  const handlePullOne = () => {
    try {
      const pool = getFilteredPool(allSongs, selectedBanner);
      const result = pull(pool, selectedBanner, pullState);
      setPullState(result.state);
      setAnimatingSongs(result.songs);
      setIsAnimating(true);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi rút thẻ');
    }
  };

  const handlePullTen = () => {
    try {
      const pool = getFilteredPool(allSongs, selectedBanner);
      const result = pullTen(pool, selectedBanner, pullState);
      setPullState(result.state);
      setAnimatingSongs(result.songs);
      setIsAnimating(true);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi rút thẻ');
    }
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
    setRecentSongs(animatingSongs);
  };

  const handleResetPity = () => {
    const newState = resetPullState();
    setPullState(newState);
  };

  const remainingToFiveStar = Math.max(0, CONFIG.pityFiveStar - pullState.pullsSinceFiveStar);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">GACHA KARAOKE</h1>
        <p className="app-subtitle">Rút bài ngẫu nhiên cho buổi hát bùng nổ</p>

        {/* Pity Tracker */}
        <div className="pity-tracker">
          <div className="pity-badge">
            <span>Bảo hiểm 5★:</span>
            <span className="pity-number">
              {pullState.pullsSinceFiveStar} / {CONFIG.pityFiveStar}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({remainingToFiveStar === 1 ? 'Lượt sau chắc chắn 5★!' : `còn ${remainingToFiveStar} lượt`})
            </span>
          </div>
          <button
            type="button"
            className="pity-reset-btn"
            onClick={handleResetPity}
            title="Đặt lại bộ đếm bảo hiểm"
          >
            Đặt lại
          </button>
        </div>
      </header>

      {/* Chọn Banner */}
      <BannerSelect
        banners={banners}
        selectedBanner={selectedBanner}
        onSelectBanner={setSelectedBanner}
      />

      {/* Nút Rút */}
      <div className="pull-actions">
        <button
          type="button"
          className="pull-btn pull-btn-single"
          onClick={handlePullOne}
        >
          <span>Rút 1</span>
          <span className="pull-btn-sub">1 bài hát</span>
        </button>

        <button
          type="button"
          className="pull-btn pull-btn-ten"
          onClick={handlePullTen}
        >
          <span>Rút 10</span>
          <span className="pull-btn-sub">Bảo đảm ≥ 4★ • Setlist</span>
        </button>
      </div>

      {/* Khu vực kết quả */}
      <main className="results-section">
        <div className="results-header">
          <div className="section-label">Kết quả lượt rút</div>
          {recentSongs.length > 0 && (
            <span className="results-count">{recentSongs.length} bài hát</span>
          )}
        </div>

        <ResultGrid songs={recentSongs} />
      </main>

      {/* Hiệu ứng gacha toàn màn hình (M3) */}
      <PullAnimation
        isOpen={isAnimating}
        songs={animatingSongs}
        onComplete={handleAnimationComplete}
      />
    </div>
  );
};

export default App;
