import React from 'react';
import { Song } from '../lib/types';
import { SongCard } from './SongCard';

interface ResultGridProps {
  songs: Song[];
}

export const ResultGrid: React.FC<ResultGridProps> = ({ songs }) => {
  if (songs.length === 0) {
    return (
      <div className="empty-state">
        Chưa có bài hát nào. Hãy bấm <strong>Rút 1</strong> hoặc <strong>Rút 10</strong> để bắt đầu!
      </div>
    );
  }

  return (
    <div className="cards-grid">
      {songs.map((song, index) => (
        <SongCard key={`${song.id}-${index}`} song={song} />
      ))}
    </div>
  );
};
