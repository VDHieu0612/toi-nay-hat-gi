import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Song } from '../lib/types';
import { SongCard } from './SongCard';
import { loadCollection, addSongsToCollection } from '../lib/storage';

interface ResultScreenProps {
  songs: Song[];
  lastPullType: 1 | 10;
  onBack: () => void;
  onPullAgain: (count: 1 | 10) => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  songs,
  lastPullType,
  onBack,
  onPullAgain,
}) => {
  // Lấy bộ sưu tập trước khi rút để đánh dấu thẻ "Mới"
  const previousCollection = useMemo(() => new Set(loadCollection()), []);

  // Thêm các bài vừa rút vào bộ sưu tập
  useEffect(() => {
    if (songs.length > 0) {
      addSongsToCollection(songs.map((s) => s.id));
    }
  }, [songs]);

  // Sắp xếp các bài theo độ hiếm giảm dần từ trái sang phải (5★ -> 4★ -> 3★) cho Rút 10
  const sortedSongs = useMemo(() => {
    if (lastPullType === 1) return songs;
    return [...songs].sort((a, b) => b.rarity - a.rarity);
  }, [songs, lastPullType]);

  // Trạng thái đã lật của từng thẻ: Record<songId_index, boolean>
  const [flippedMap, setFlippedMap] = useState<Record<number, boolean>>({});
  const rowContainerRef = useRef<HTMLDivElement | null>(null);

  // Danh sách các index cần lật theo thứ tự tăng dần độ hồi hộp (độ hiếm thấp lật trước, độ hiếm cao lật sau cùng)
  const flipOrder = useMemo(() => {
    if (sortedSongs.length === 1) return [0];
    // Sắp xếp index theo độ hiếm TĂNG DẦN (3★ lật trước, 4★, 5★ sau cùng)
    const indices = sortedSongs.map((_, idx) => idx);
    indices.sort((idxA, idxB) => sortedSongs[idxA].rarity - sortedSongs[idxB].rarity);
    return indices;
  }, [sortedSongs]);

  // Tự động lật lần lượt theo thứ tự hồi hộp
  useEffect(() => {
    if (sortedSongs.length === 1) {
      // Rút 1: tự động lật sau 300ms
      const t = setTimeout(() => {
        setFlippedMap({ 0: true });
      }, 300);
      return () => clearTimeout(t);
    }

    // Rút 10: lật cách nhau 220ms
    const timers: NodeJS.Timeout[] = [];
    flipOrder.forEach((cardIndex, step) => {
      const isHighRarity = sortedSongs[cardIndex].rarity >= 4;
      // Thẻ 4★ và 5★ lật chậm hơn một chút
      const delay = step * 220 + (isHighRarity ? 120 : 0);

      const timer = setTimeout(() => {
        setFlippedMap((prev) => ({ ...prev, [cardIndex]: true }));

        // Tự cuộn tới thẻ vừa lật trên điện thoại
        if (rowContainerRef.current) {
          const cardEl = rowContainerRef.current.children[cardIndex] as HTMLElement;
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }
      }, delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [sortedSongs, flipOrder]);

  const handleFlipSingle = (index: number) => {
    setFlippedMap((prev) => ({ ...prev, [index]: true }));
  };

  const handleFlipAll = () => {
    const allFlipped: Record<number, boolean> = {};
    sortedSongs.forEach((_, idx) => {
      allFlipped[idx] = true;
    });
    setFlippedMap(allFlipped);
  };

  const flippedCount = Object.values(flippedMap).filter(Boolean).length;
  const isAllFlipped = flippedCount === sortedSongs.length;

  return (
    <div className="genshin-result-screen">
      {/* Thanh trên cùng */}
      <header className="result-top-bar">
        <button
          type="button"
          className="result-nav-back-btn"
          onClick={onBack}
        >
          ← Trở về Wish
        </button>

        <div className="result-title-badge">
          <span>KẾT QUẢ {lastPullType === 1 ? 'RÚT ×1' : 'RÚT ×10'}</span>
          {lastPullType === 10 && (
            <span className="result-progress-counter">
              ({flippedCount}/{sortedSongs.length})
            </span>
          )}
        </div>

        <div className="result-top-actions">
          {!isAllFlipped && lastPullType === 10 && (
            <button
              type="button"
              className="result-flip-all-btn"
              onClick={handleFlipAll}
            >
              Lật tất cả ⚡
            </button>
          )}
          <button
            type="button"
            className="result-again-btn"
            onClick={() => onPullAgain(lastPullType)}
          >
            Rút tiếp ×{lastPullType} ↻
          </button>
        </div>
      </header>

      {/* Vùng một hàng ngang duy nhất cho 10 thẻ */}
      <main className="result-stage-area">
        <div
          ref={rowContainerRef}
          className={`result-cards-horizontal-row ${lastPullType === 1 ? 'single-card-mode' : 'ten-cards-mode'}`}
        >
          {sortedSongs.map((song, index) => {
            const isFlipped = Boolean(flippedMap[index]);
            const isNew = !previousCollection.has(song.id);

            return (
              <div
                key={`${song.id}-${index}`}
                className={`result-card-column ${isFlipped ? 'revealed' : 'hidden-back'}`}
              >
                <SongCard
                  song={song}
                  isFlipped={isFlipped}
                  onFlip={() => handleFlipSingle(index)}
                  isNew={isNew}
                  showBeam={isFlipped}
                />
              </div>
            );
          })}
        </div>
      </main>

      {/* Thanh dưới cùng */}
      <footer className="result-bottom-bar">
        <div className="result-bottom-left">
          <span className="result-hint-text">
            {!isAllFlipped
              ? '✦ Bấm vào thẻ để lật ngay'
              : '✦ Thứ tự đã sắp xếp theo độ hiếm giảm dần (5★ → 3★)'}
          </span>
        </div>

        <div className="result-bottom-right">
          <button
            type="button"
            className="genshin-sub-btn"
            onClick={onBack}
          >
            {isAllFlipped ? 'Xem toàn bộ Setlist 🎉' : 'Quay lại'}
          </button>

          <button
            type="button"
            className="genshin-wish-btn wish-btn-ten"
            onClick={() => onPullAgain(lastPullType)}
          >
            <div className="wish-btn-content">
              <span className="wish-btn-main">Rút tiếp ×{lastPullType}</span>
            </div>
          </button>
        </div>
      </footer>
    </div>
  );
};
