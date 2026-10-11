import React, { useState, useEffect, useMemo } from 'react';
import songsData from './data/songs.json';
import bannersData from './data/banners.json';
import { Song, Banner, PullState, UserFilter } from './lib/types';
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
import { DebugBar } from './components/DebugBar';
import { ANIMATION_CONFIG } from './lib/animationConfig';

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

  // Bộ lọc người dùng chọn trước khi rút (M4)
  const [userFilter, setUserFilter] = useState<UserFilter>({});

  const [pullState, setPullState] = useState<PullState>(() => loadPullState());

  // Kết quả lượt rút hiện tại (khi có giá trị sẽ mở ResultScreen với chuỗi 5 nhịp gacha)
  const [activeResult, setActiveResult] = useState<{
    songs: Song[];
    lastPullType: 1 | 10;
  } | null>(null);

  // Key để force remount ResultScreen khi bấm Replay hoặc chạy lại
  const [resultKeyNonce, setResultKeyNonce] = useState<number>(0);

  // Chế độ Debug khi có ?debug=1 trên URL (Điểm I)
  const isDebugMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.location.search.includes('debug=1');
  }, []);

  const [speedMultiplier, setSpeedMultiplier] = useState<number>(() => ANIMATION_CONFIG.speedMultiplier);

  const handleSpeedChange = (newSpeed: number) => {
    ANIMATION_CONFIG.speedMultiplier = newSpeed;
    setSpeedMultiplier(newSpeed);
  };

  // Giả lập kết quả không ảnh hưởng pity thật (Điểm I)
  const handleSimulateAll3 = () => {
    const threeStarSongs = allSongs.filter((s) => s.rarity === 3);
    const mock = threeStarSongs.slice(0, 10);
    setResultKeyNonce((n) => n + 1);
    setActiveResult({ songs: mock, lastPullType: 10 });
  };

  const handleSimulateWith4 = () => {
    const threeStarSongs = allSongs.filter((s) => s.rarity === 3);
    const fourStarSongs = allSongs.filter((s) => s.rarity === 4);
    const mock = [
      fourStarSongs[0] || threeStarSongs[0],
      ...threeStarSongs.slice(0, 9),
    ];
    setResultKeyNonce((n) => n + 1);
    setActiveResult({ songs: mock, lastPullType: 10 });
  };

  const handleSimulateWith5 = () => {
    const threeStarSongs = allSongs.filter((s) => s.rarity === 3);
    const fourStarSongs = allSongs.filter((s) => s.rarity === 4);
    const fiveStarSongs = allSongs.filter((s) => s.rarity === 5);
    const mock = [
      fiveStarSongs[0] || threeStarSongs[0],
      fourStarSongs[0] || threeStarSongs[1],
      ...threeStarSongs.slice(0, 8),
    ];
    setResultKeyNonce((n) => n + 1);
    setActiveResult({ songs: mock, lastPullType: 10 });
  };

  const handleReplay = () => {
    setResultKeyNonce((n) => n + 1);
  };

  // Lưu banner vào localStorage khi đổi
  const handleSelectBanner = (banner: Banner) => {
    setSelectedBanner(banner);
    saveSelectedBannerId(banner.id);
  };

  // Lưu pullState vào localStorage
  useEffect(() => {
    savePullState(pullState);
  }, [pullState]);

  // Pool bài hát khả dụng sau khi áp dụng filter của banner và filter người dùng (M4)
  const currentPool = useMemo(() => {
    return getFilteredPool(allSongs, selectedBanner, userFilter);
  }, [selectedBanner, userFilter]);

  const handlePullOne = () => {
    try {
      const result = pull(currentPool, selectedBanner, pullState);
      setPullState(result.state);
      setResultKeyNonce((n) => n + 1);
      setActiveResult({ songs: result.songs, lastPullType: 1 });
    } catch (err: any) {
      alert(err.message || 'Lỗi khi rút thẻ');
    }
  };

  const handlePullTen = () => {
    try {
      const result = pullTen(currentPool, selectedBanner, pullState);
      setPullState(result.state);
      setResultKeyNonce((n) => n + 1);
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
      {/* Bảng điều khiển Debug mode khi có ?debug=1 trên URL (Điểm I) */}
      {isDebugMode && (
        <DebugBar
          onSimulateAll3={handleSimulateAll3}
          onSimulateWith4={handleSimulateWith4}
          onSimulateWith5={handleSimulateWith5}
          onReplay={handleReplay}
          speedMultiplier={speedMultiplier}
          onSpeedChange={handleSpeedChange}
          isInResult={Boolean(activeResult)}
        />
      )}

      {activeResult ? (
        <ResultScreen
          key={`${resultKeyNonce}-${activeResult.songs.map((s) => s.id).join('-')}`}
          songs={activeResult.songs}
          lastPullType={activeResult.lastPullType}
          onBack={() => setActiveResult(null)}
          onPullAgain={handlePullAgain}
          speedMultiplier={speedMultiplier}
          onReplay={handleReplay}
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
          userFilter={userFilter}
          onChangeFilter={setUserFilter}
        />
      )}
    </div>
  );
};

export default App;
