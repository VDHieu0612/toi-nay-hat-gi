import React from 'react';
import { Song } from '../lib/types';

interface SongCardProps {
  song: Song;
}

export const SongCard: React.FC<SongCardProps> = ({ song }) => {
  const stars = '★'.repeat(song.rarity);

  const voiceLabels: Record<string, string> = {
    nam: 'Nam',
    nu: 'Nữ',
    'song-ca': 'Song ca',
    'tat-ca': 'Tất cả',
  };

  return (
    <div className={`song-card-simple rarity-${song.rarity}`}>
      <div className="song-card-top">
        <span className={`song-stars rarity-${song.rarity}`}>{stars}</span>
        <span className="song-voice-tag">{voiceLabels[song.voice] || song.voice}</span>
      </div>

      <div className="song-title" title={song.title}>
        {song.title}
      </div>

      <div className="song-artist" title={song.artist}>
        {song.artist}
      </div>

      <div className="song-meta">
        <span>{song.genre.join(', ')}</span>
        <span>{song.year}</span>
      </div>
    </div>
  );
};
