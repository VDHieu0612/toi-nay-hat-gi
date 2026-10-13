import React, { useState, useRef, useMemo } from 'react';
import { Song } from '../lib/types';
import {
  distributeSongs,
  formatSetlistText,
  copyTextToClipboard,
  downloadElementAsPng,
  PlayerAssignment,
} from '../lib/share';
import { GroupMode, loadSavedPlayers } from './GroupMode';
import { getSearchKaraokeUrl } from '../lib/filters';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

interface SetlistProps {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
  bannerName?: string;
  initialPlayers?: string[];
}

export const Setlist: React.FC<SetlistProps> = ({
  isOpen,
  onClose,
  songs,
  bannerName = 'Quán Hát Chiêm Tinh',
  initialPlayers,
}) => {
  const [players, setPlayers] = useState<string[]>(() => initialPlayers || loadSavedPlayers());
  const [distributionMethod, setDistributionMethod] = useState<'round-robin' | 'random'>('round-robin');
  const [isGroupModeOpen, setIsGroupModeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'group'>('group');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const captureCardRef = useRef<HTMLDivElement | null>(null);

  // Tính danh sách chia theo nhóm
  const assignments: PlayerAssignment[] = useMemo(() => {
    return distributeSongs(songs, players, distributionMethod);
  }, [songs, players, distributionMethod]);

  if (!isOpen) return null;

  const handleCopyText = async () => {
    const text = formatSetlistText({
      bannerName,
      songs,
      assignments: activeTab === 'group' ? assignments : undefined,
    });
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2200);
    } else {
      alert('Không thể sao chép văn bản vào bộ nhớ tạm.');
    }
  };

  const handleDownloadPng = async () => {
    if (!captureCardRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const filename = `setlist-karaoke-${Date.now().toString().slice(-6)}.png`;
      await downloadElementAsPng(captureCardRef.current, filename);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="filter-modal-overlay setlist-modal-overlay" onClick={onClose}>
      <div
        className="filter-modal-content setlist-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="setlist-modal-title"
      >
        {/* Header modal */}
        <div className="filter-modal-header setlist-header">
          <div className="filter-modal-title-wrap">
            <h3 id="setlist-modal-title">Setlist Buổi Hát ({songs.length} bài)</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className="filter-close-btn"
            onClick={onClose}
            title="Đóng bảng Setlist"
          >
            <Icon name="close" size={16} />
          </Button>
        </div>

        {/* Thanh công cụ và chọn chế độ xem */}
        <div className="setlist-toolbar">
          <div className="setlist-tabs">
            <Button
              variant={activeTab === 'group' ? 'secondary' : 'ghost'}
              size="sm"
              className={`setlist-tab-btn ${activeTab === 'group' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('group')}
            >
              <Icon name="users" size={14} />
              <span>Chia theo người ({players.length})</span>
            </Button>
            <Button
              variant={activeTab === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className={`setlist-tab-btn ${activeTab === 'all' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span>Toàn bộ danh sách</span>
            </Button>
          </div>

          <div className="setlist-action-btns">
            <Button
              variant="ghost"
              size="sm"
              className="genshin-sub-btn setlist-tool-btn"
              onClick={() => setIsGroupModeOpen(true)}
              title="Đổi thành viên hoặc cách chia"
            >
              <Icon name="settings" size={14} />
              <span>Đổi nhóm</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`genshin-sub-btn setlist-tool-btn ${copyFeedback ? 'copied-btn' : ''}`}
              onClick={handleCopyText}
              title="Copy văn bản để dán vào Zalo/Messenger"
            >
              <Icon name={copyFeedback ? 'check' : 'copy'} size={14} />
              <span>{copyFeedback ? 'Đã copy!' : 'Copy text'}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="setlist-download-btn"
              onClick={handleDownloadPng}
              disabled={isDownloading}
              title="Tải ảnh PNG setlist để gửi vào chat"
            >
              <Icon name="download" size={14} />
              <span>{isDownloading ? 'Đang tạo...' : 'Tải ảnh'}</span>
            </Button>
          </div>
        </div>

        {/* VÙNG NỘI DUNG ĐƯỢC CHỤP ẢNH (Capture Card) */}
        <div className="setlist-scroll-body">
          <div ref={captureCardRef} className="setlist-poster-card">
            {/* Header Poster */}
            <div className="setlist-poster-header">
              <div className="setlist-poster-logo">· TỐI NAY HÁT GÌ ·</div>
              <h2 className="setlist-poster-title">SETLIST PHÒNG HÁT</h2>
              <div className="setlist-poster-meta">
                <span>Banner: <strong>{bannerName}</strong></span>
                <span>•</span>
                <span>{songs.length} ca khúc</span>
              </div>
            </div>

            {/* CHẾ ĐỘ 1: CHIA THEO NGƯỜI HÁT */}
            {activeTab === 'group' && (
              <div className="setlist-players-grid">
                {assignments.map((assignment, pIdx) => (
                  <div key={pIdx} className="setlist-player-card">
                    <div className="setlist-player-header">
                      <div className="setlist-player-name-wrap">
                        <span className="player-avatar-icon"><Icon name="user" size={14} /></span>
                        <strong className="player-display-name">{assignment.name}</strong>
                      </div>
                      <span className="player-song-count-badge">
                        {assignment.songs.length} bài
                      </span>
                    </div>

                    <div className="setlist-song-items">
                      {assignment.songs.map((song, sIdx) => (
                        <div key={`${song.id}-${sIdx}`} className={`setlist-song-row rarity-${song.rarity}`}>
                          <span className="song-row-num">{sIdx + 1}</span>
                          <div className="song-row-details">
                            <span className="song-row-title">{song.title}</span>
                            <span className="song-row-artist">{song.artist}</span>
                          </div>
                          <span className={`song-row-stars star-rarity-${song.rarity}`}>
                            {'★'.repeat(song.rarity)}
                          </span>
                          <a
                            href={getSearchKaraokeUrl(song.title, song.artist)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="song-row-karaoke-link"
                            title={`Tìm karaoke bài ${song.title}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Icon name="music" size={13} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CHẾ ĐỘ 2: TOÀN BỘ DANH SÁCH */}
            {activeTab === 'all' && (
              <div className="setlist-full-list">
                {songs.map((song, idx) => (
                  <div key={`${song.id}-${idx}`} className={`setlist-song-row rarity-${song.rarity}`}>
                    <span className="song-row-num">{idx + 1}</span>
                    <div className="song-row-details">
                      <span className="song-row-title">{song.title}</span>
                      <span className="song-row-artist">{song.artist}</span>
                    </div>
                    <span className={`song-row-stars star-rarity-${song.rarity}`}>
                      {'★'.repeat(song.rarity)}
                    </span>
                    <a
                      href={getSearchKaraokeUrl(song.title, song.artist)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="song-row-karaoke-link"
                      title={`Tìm karaoke bài ${song.title}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Icon name="music" size={13} />
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Footer Poster */}
            <div className="setlist-poster-footer">
              <span>Chúc cả phòng quẩy hết mình • Tối Nay Hát Gì</span>
            </div>
          </div>
        </div>

        {/* Footer modal */}
        <div className="filter-modal-footer setlist-modal-footer">
          <div className="setlist-footer-tip">
            <em>Mẹo: Bấm nút "Tải ảnh" hoặc "Copy text" để chia sẻ vào nhóm Zalo/Messenger!</em>
          </div>
          <Button
            variant="ghost"
            size="md"
            className="genshin-sub-btn"
            onClick={onClose}
          >
            Đóng Setlist
          </Button>
        </div>
      </div>

      {/* Modal chỉnh sửa thành viên nhóm */}
      <GroupMode
        isOpen={isGroupModeOpen}
        onClose={() => setIsGroupModeOpen(false)}
        players={players}
        onSavePlayers={setPlayers}
        distributionMethod={distributionMethod}
        onChangeMethod={setDistributionMethod}
      />
    </div>
  );
};
