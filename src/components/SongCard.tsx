import React from 'react';
import { Song } from '../lib/types';

interface SongCardProps {
  song: Song;
  className?: string;
}

export const SongCard: React.FC<SongCardProps> = ({ song, className = '' }) => {
  const stars = '★'.repeat(song.rarity);
  const primaryGenre = song.genre[0]?.toLowerCase() || 'vpop';

  const voiceLabels: Record<string, string> = {
    nam: 'Nam',
    nu: 'Nữ',
    'song-ca': 'Song ca',
    'tat-ca': 'Tất cả',
  };

  return (
    <div
      className={`song-card rarity-${song.rarity} genre-${primaryGenre} ${className}`}
      data-rarity={song.rarity}
    >
      {/* Vinyl Record SVG watermark in background */}
      <svg
        className="card-disc-watermark"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="3" />
        <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="18" fill="currentColor" opacity="0.3" />
        <circle cx="50" cy="50" r="6" fill="currentColor" />
      </svg>

      <div className="song-card-header">
        <span className={`song-rarity-stars rarity-${song.rarity}`}>{stars}</span>
        <span className="song-voice-badge">{voiceLabels[song.voice] || song.voice}</span>
      </div>

      <div className="song-card-body">
        <h3 className="song-card-title" title={song.title}>
          {song.title}
        </h3>
        <p className="song-card-artist" title={song.artist}>
          {song.artist}
        </p>

        {/* Difficulty Indicator dots */}
        <div className="song-difficulty-bar" title={`Độ khó: ${song.difficulty}/5`}>
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`diff-dot ${level <= song.difficulty ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* 5-star Challenge if available */}
        {song.challenge && (
          <div className="song-challenge-badge">
            <strong>Thử thách:</strong> {song.challenge}
          </div>
        )}
      </div>

      <div className="song-card-footer">
        <span>{song.genre.join(', ')}</span>
        <span>{song.year}</span>
      </div>
    </div>
  );
};
