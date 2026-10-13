import React, { useState, useEffect } from 'react';
import { Song } from '../lib/types';
import {
  loadHistory,
  clearHistory,
  loadCollection,
  clearCollection,
  HistoryEntry,
} from '../lib/storage';
import { getSearchKaraokeUrl } from '../lib/filters';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

interface HistoryProps {
  isOpen: boolean;
  onClose: () => void;
  allSongs: Song[];
  onOpenSetlistForEntry?: (songs: Song[], bannerName: string) => void;
}

export const History: React.FC<HistoryProps> = ({
  isOpen,
  onClose,
  allSongs,
  onOpenSetlistForEntry,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'collection'>('history');
  const [historyList, setHistoryList] = useState<HistoryEntry[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHistoryList(loadHistory());
      setCollectionIds(loadCollection());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearHistory = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ 20 lượt rút gần nhất?')) {
      clearHistory();
      setHistoryList([]);
    }
  };

  const handleClearCollection = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ bộ sưu tập bài hát đã thu thập?')) {
      clearCollection();
      setCollectionIds([]);
    }
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const toggleExpand = (id: string) => {
    setExpandedEntryId((prev) => (prev === id ? null : id));
  };

  // Thống kê bộ sưu tập
  const totalSongsCount = allSongs.length;
  const collectedCount = allSongs.filter((s) => collectionIds.includes(s.id)).length;
  const collectionPercent = totalSongsCount > 0 ? Math.round((collectedCount / totalSongsCount) * 100) : 0;

  // Lọc theo độ hiếm trong bộ sưu tập
  const songs5 = allSongs.filter((s) => s.rarity === 5);
  const songs4 = allSongs.filter((s) => s.rarity === 4);
  const songs3 = allSongs.filter((s) => s.rarity === 3);

  return (
    <div className="filter-modal-overlay history-modal-overlay" onClick={onClose}>
      <div
        className="filter-modal-content history-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
      >
        {/* Header modal */}
        <div className="filter-modal-header">
          <div className="filter-modal-title-wrap">
            <h3 id="history-modal-title">Nhật Ký & Bộ Sưu Tập</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className="filter-close-btn"
            onClick={onClose}
            title="Đóng bảng lịch sử"
          >
            <Icon name="close" size={16} />
          </Button>
        </div>

        {/* Tab switch */}
        <div className="history-tab-bar">
          <Button
            variant={activeTab === 'history' ? 'secondary' : 'ghost'}
            size="sm"
            className={`history-tab-btn ${activeTab === 'history' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Lịch Sử Rút ({historyList.length})
          </Button>
          <Button
            variant={activeTab === 'collection' ? 'secondary' : 'ghost'}
            size="sm"
            className={`history-tab-btn ${activeTab === 'collection' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('collection')}
          >
            Bộ Sưu Tập ({collectedCount}/{totalSongsCount})
          </Button>
        </div>

        {/* Modal body */}
        <div className="filter-modal-body history-body">
          {/* TAB 1: LỊCH SỬ RÚT */}
          {activeTab === 'history' && (
            <div className="history-tab-content">
              {historyList.length === 0 ? (
                <div className="history-empty-state">
                  <span className="empty-icon"><Icon name="info" size={24} /></span>
                  <p>Chưa có lượt rút nào được ghi nhận. Hãy thực hiện lượt rút thẻ đầu tiên!</p>
                </div>
              ) : (
                <div className="history-entries-list">
                  {historyList.map((entry, idx) => {
                    const isExpanded = expandedEntryId === entry.id;
                    const maxRarity = Math.max(...entry.songs.map((s) => s.rarity), 3);

                    return (
                      <div key={entry.id || idx} className={`history-entry-card rarity-${maxRarity}`}>
                        <div
                          className="history-entry-header"
                          onClick={() => toggleExpand(entry.id)}
                        >
                          <div className="history-entry-main-info">
                            <span className="history-entry-index">#{historyList.length - idx}</span>
                            <div className="history-entry-text">
                              <h4 className="history-banner-name">{entry.bannerName}</h4>
                              <span className="history-entry-time">{formatTimestamp(entry.timestamp)}</span>
                            </div>
                          </div>

                          <div className="history-entry-meta">
                            <span className={`history-rarity-pill rarity-${maxRarity}-pill`}>
                              {'★'.repeat(maxRarity)}
                            </span>
                            <span className="history-count-badge">
                              {entry.songs.length === 1 ? 'Rút ×1' : 'Rút ×10'}
                            </span>
                            <span className="history-expand-icon">
                              <Icon name={isExpanded ? 'arrowUp' : 'arrowDown'} size={12} />
                            </span>
                          </div>
                        </div>

                        {/* Danh sách bài hát khi mở rộng */}
                        {isExpanded && (
                          <div className="history-entry-details">
                            <div className="history-song-chips-grid">
                              {entry.songs.map((song, sIdx) => (
                                <div key={`${song.id}-${sIdx}`} className={`history-song-chip rarity-${song.rarity}`}>
                                  <span className="chip-song-title">{song.title}</span>
                                  <span className="chip-song-artist">{song.artist}</span>
                                  <span className={`chip-song-stars star-rarity-${song.rarity}`}>
                                    {'★'.repeat(song.rarity)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {onOpenSetlistForEntry && (
                              <div className="history-entry-actions">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="genshin-sub-btn history-setlist-btn"
                                  onClick={() => onOpenSetlistForEntry(entry.songs, entry.bannerName)}
                                >
                                  <Icon name="music" size={14} />
                                  <span>Mở xem Setlist & Chia nhóm</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BỘ SƯU TẬP BÀI HÁT */}
          {activeTab === 'collection' && (
            <div className="collection-tab-content">
              {/* Thanh tiến trình */}
              <div className="collection-progress-card">
                <div className="progress-label-row">
                  <span>Tiến độ mở khóa kho bài hát</span>
                  <strong>{collectedCount} / {totalSongsCount} ({collectionPercent}%)</strong>
                </div>
                <div className="collection-progress-bar-bg">
                  <div
                    className="collection-progress-bar-fill"
                    style={{ width: `${collectionPercent}%` }}
                  />
                </div>
              </div>

              {/* Nhóm 5★ */}
              <section className="collection-rarity-section">
                <h4 className="collection-section-title star-5-title">
                  · Bài Hát 5★ Siêu Hit ({songs5.filter((s) => collectionIds.includes(s.id)).length}/{songs5.length})
                </h4>
                <div className="collection-cards-grid">
                  {songs5.map((song) => {
                    const isUnlocked = collectionIds.includes(song.id);
                    return (
                      <div
                        key={song.id}
                        className={`collection-item-card ${isUnlocked ? 'is-unlocked rarity-5' : 'is-locked'}`}
                      >
                        {isUnlocked ? (
                          <>
                            <div className="collection-item-stars star-rarity-5">★★★★★</div>
                            <h5 className="collection-item-title">{song.title}</h5>
                            <span className="collection-item-artist">{song.artist}</span>
                            <a
                              href={getSearchKaraokeUrl(song.title, song.artist)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="collection-karaoke-link"
                              title="Tìm karaoke trên YouTube"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Icon name="music" size={12} />
                              <span>Hát ngay</span>
                            </a>
                          </>
                        ) : (
                          <div className="collection-locked-content">
                            <span className="locked-icon"><Icon name="lock" size={14} /></span>
                            <span className="locked-text">Chưa mở</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Nhóm 4★ */}
              <section className="collection-rarity-section">
                <h4 className="collection-section-title star-4-title">
                  · Bài Hát 4★ Cao Trào ({songs4.filter((s) => collectionIds.includes(s.id)).length}/{songs4.length})
                </h4>
                <div className="collection-cards-grid">
                  {songs4.map((song) => {
                    const isUnlocked = collectionIds.includes(song.id);
                    return (
                      <div
                        key={song.id}
                        className={`collection-item-card ${isUnlocked ? 'is-unlocked rarity-4' : 'is-locked'}`}
                      >
                        {isUnlocked ? (
                          <>
                            <div className="collection-item-stars star-rarity-4">★★★★</div>
                            <h5 className="collection-item-title">{song.title}</h5>
                            <span className="collection-item-artist">{song.artist}</span>
                            <a
                              href={getSearchKaraokeUrl(song.title, song.artist)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="collection-karaoke-link"
                              title="Tìm karaoke trên YouTube"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Icon name="music" size={12} />
                              <span>Hát ngay</span>
                            </a>
                          </>
                        ) : (
                          <div className="collection-locked-content">
                            <span className="locked-icon"><Icon name="lock" size={14} /></span>
                            <span className="locked-text">Chưa mở</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Nhóm 3★ */}
              <section className="collection-rarity-section">
                <h4 className="collection-section-title star-3-title">
                  · Bài Hát 3★ Quen Thuộc ({songs3.filter((s) => collectionIds.includes(s.id)).length}/{songs3.length})
                </h4>
                <div className="collection-cards-grid">
                  {songs3.map((song) => {
                    const isUnlocked = collectionIds.includes(song.id);
                    return (
                      <div
                        key={song.id}
                        className={`collection-item-card ${isUnlocked ? 'is-unlocked rarity-3' : 'is-locked'}`}
                      >
                        {isUnlocked ? (
                          <>
                            <div className="collection-item-stars star-rarity-3">★★★</div>
                            <h5 className="collection-item-title">{song.title}</h5>
                            <span className="collection-item-artist">{song.artist}</span>
                            <a
                              href={getSearchKaraokeUrl(song.title, song.artist)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="collection-karaoke-link"
                              title="Tìm karaoke trên YouTube"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Icon name="music" size={12} />
                              <span>Hát ngay</span>
                            </a>
                          </>
                        ) : (
                          <div className="collection-locked-content">
                            <span className="locked-icon"><Icon name="lock" size={14} /></span>
                            <span className="locked-text">Chưa mở</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer modal */}
        <div className="filter-modal-footer history-footer">
          {activeTab === 'history' ? (
            <Button
              variant="danger"
              size="sm"
              className="delete-data-btn"
              onClick={handleClearHistory}
              disabled={historyList.length === 0}
            >
              <Icon name="trash" size={14} />
              <span>Xóa lịch sử</span>
            </Button>
          ) : (
            <Button
              variant="danger"
              size="sm"
              className="delete-data-btn"
              onClick={handleClearCollection}
              disabled={collectedCount === 0}
            >
              <Icon name="trash" size={14} />
              <span>Xóa bộ sưu tập</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="md"
            className="genshin-sub-btn"
            onClick={onClose}
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
