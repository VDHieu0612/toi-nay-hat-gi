import React, { useState, useEffect, useMemo } from 'react';
import songsData from './data/songs.json';
import bannersData from './data/banners.json';
import { Song, Banner, PullState } from './lib/types';
import { pull, pullTen } from './lib/gacha';
import { getFilteredPool } from './lib/filters';
import {
  loadPullState,
  savePullState,
  resetPullState,
  loadSelectedBannerId,
  saveSelectedBannerId,
} from './lib/storage';
import { HomeScreen } from './components/HomeScreen';
import { ResultScreen } from './components/ResultScreen';

const allSongs = songsData as Song[];
const banners = bannersData as Banner[];

export const App: React.FC = () => {
  // Lấy banner đã lưu hoặc mặc định
  const [selectedBanner, setSelectedBanner] = useState<Banner>(() => {
    const savedId = loadSelectedBannerId();
    if (savedId) {
      const found = banners.find((b) => b.id === savedId);
      if (found) return found;
    }
    return banners[0];
  });

  const [pullState, setPullState] = useState<PullState>(() => loadPullState());
  const [recentResult, setRecentResult] = useState<{
    songs: Song[];
    lastPullType: 1 | 10;
  } | null>(null);

  // Lưu banner đã chọn vào localStorage
  const handleSelectBanner = (banner: Banner) => {
    setSelectedBanner(banner);
    saveSelectedBannerId(banner.id);
  };

  // Lưu pullState vào localStorage mỗi khi thay đổi
  useEffect(() => {
    savePullState(pullState);
  }, [pullState]);

  // Pool bài hát của banner hiện tại
  const currentPool = useMemo(() => {
    return getFilteredPool(allSongs, selectedBanner);
  }, [selectedBanner]);

  const handlePullOne = () => {
    try {
      const result = pull(currentPool, selectedBanner, pullState);
      setPullState(result.state);
      setRecentResult({ songs: result.songs, lastPullType: 1 });
    } catch (err: any) {
      alert(err.message || 'Lỗi khi rút thẻ');
    }
  };

  const handlePullTen = () => {
    try {
      const result = pullTen(currentPool, selectedBanner, pullState);
      setPullState(result.state);
      setRecentResult({ songs: result.songs, lastPullType: 10 });
    } catch (err: any) {
      alert(err.message || 'Lỗi khi rút thẻ');
    }
  };

  const handlePullAgain = (count: 1 | 10) => {
    if (count === 1) {
      handlePullOne();
    } else {
      handlePullTen();
    }
  };

  const handleResetPity = () => {
    const newState = resetPullState();
    setPullState(newState);
  };

  return (
    <div className="genshin-app-wrapper">
      {recentResult ? (
        <ResultScreen
          songs={recentResult.songs}
          lastPullType={recentResult.lastPullType}
          onBack={() => setRecentResult(null)}
          onPullAgain={handlePullAgain}
        />
      ) : (
        <HomeScreen
          banners={banners}
          selectedBanner={selectedBanner}
          onSelectBanner={handleSelectBanner}
          pullState={pullState}
          onResetPity={handleResetPity}
          allSongs={allSongs}
          poolCount={currentPool.length}
          onPullOne={handlePullOne}
          onPullTen={handlePullTen}
        />
      )}
    </div>
  );
};

export default App;
