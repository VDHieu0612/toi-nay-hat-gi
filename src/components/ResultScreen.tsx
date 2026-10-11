import React from 'react';
import { Song } from '../lib/types';
import { SongCard } from './SongCard';

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
  return (
    <div className="result-screen-overlay">
      {/* Thanh điều khiển trên cùng */}
      <div className="result-screen-top-bar">
        <button
          type="button"
          className="result-nav-btn result-back-btn"
          onClick={onBack}
        >
          ← Quay lại
        </button>

        <div className="result-screen-title">
          Kết quả {songs.length === 1 ? 'Rút ×1' : 'Rút ×10'}
        </div>

        <button
          type="button"
          className="result-nav-btn result-again-btn"
          onClick={() => onPullAgain(lastPullType)}
        >
          Rút tiếp ×{lastPullType} ↻
        </button>
      </div>

      {/* Vùng hiển thị thẻ bài */}
      <div className={`result-screen-body ${songs.length === 1 ? 'single-view' : 'ten-view'}`}>
        <div className="result-cards-row">
          {songs.map((song, index) => (
            <div key={`${song.id}-${index}`} className="result-card-slot">
              <SongCard song={song} />
            </div>
          ))}
        </div>
      </div>

      {/* Thanh dưới cùng */}
      <div className="result-screen-bottom-bar">
        <button
          type="button"
          className="genshin-sub-btn"
          onClick={onBack}
        >
          Trở về Wish
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
    </div>
  );
};
