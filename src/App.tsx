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
  // Banner đang chọn
  const [selectedBanner, setSelectedBanner] = useState<Banner>(() => {
    const savedId = loadSelectedBannerId();
    if (savedId) {
      const found = banners.find((b) => b.id === savedId);
      if (found) return found;
    }
    return banners[0];
  });

  const [pullState, setPullState] = useState<PullState>(() => loadPullState());

  // Kết quả lượt rút hiện tại (khi có giá trị sẽ mở ResultScreen với chuỗi 5 nhịp gacha)
  const [activeResult, setActiveResult] = useState<{
    songs: Song[];
    lastPullType: 1 | 10;
  } | null>(null);

  // Lưu banner vào localStorage khi đổi
  const handleSelectBanner = (banner: Banner) => {
    setSelectedBanner(banner);
    saveSelectedBannerId(banner.id);
  };

  // Lưu pullState vào localStorage
  useEffect(() => {
    savePullState(pullState);
  }, [pullState]);

  // Pool bài hát khả dụng
  const currentPool = useMemo(() => {
    return getFilteredPool(allSongs, selectedBanner);
  }, [selectedBanner]);

  const handlePullOne = () => {
    try {
      const result = pull(currentPool, selectedBanner, pullState);
      setPullState(result.state);
      setActiveResult({ songs: result.songs, lastPullType: 1 });
    } catch (err: any) {
      alert(err.message || 'Lỗi khi rút thẻ');
    }
  };

  const handlePullTen = () => {
    try {
      const result = pullTen(currentPool, selectedBanner, pullState);
      setPullState(result.state);
      setActiveResult({ songs: result.songs, lastPullType: 10 });
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
      {activeResult ? (
        <ResultScreen
          key={JSON.stringify(activeResult.songs.map((s) => s.id)) + Date.now()}
          songs={activeResult.songs}
          lastPullType={activeResult.lastPullType}
          onBack={() => setActiveResult(null)}
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
