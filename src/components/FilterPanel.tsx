import React, { useMemo } from 'react';
import { Song, Banner, UserFilter, Voice, Genre } from '../lib/types';
import {
  ALL_GENRES,
  countActiveFilters,
  getFilteredPool,
  filterByBanner,
  filterByUser,
  matchVoice,
} from '../lib/filters';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { Notice } from './ui/Notice';
import { Icon } from './ui/Icon';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userFilter: UserFilter;
  onChangeFilter: (filter: UserFilter) => void;
  allSongs: Song[];
  selectedBanner: Banner;
}

const GENRE_LABELS: Record<Genre, string> = {
  ballad: 'Ballad',
  pop: 'Pop',
  rap: 'Rap',
  bolero: 'Bolero',
  rock: 'Rock',
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  userFilter,
  onChangeFilter,
  allSongs,
  selectedBanner,
}) => {
  if (!isOpen) return null;

  // Pool bài hát của banner (trước khi áp dụng filter của user)
  const bannerPool = useMemo(() => filterByBanner(allSongs, selectedBanner), [allSongs, selectedBanner]);

  const activeCount = countActiveFilters(userFilter);
  const currentVoice = userFilter.voice || 'tat-ca';
  const currentGenres = userFilter.genres || [];

  // Tính số lượng bài trong pool khi áp dụng bộ lọc hiện tại
  const previewPool = getFilteredPool(allSongs, selectedBanner, userFilter);
  const poolCount = previewPool.length;

  // Tính số bài khả dụng cho từng lựa chọn giọng
  const voiceCounts: Record<Voice, number> = {
    'tat-ca': filterByUser(bannerPool, { genres: userFilter.genres }).length,
    nam: filterByUser(bannerPool, { voice: 'nam', genres: userFilter.genres }).length,
    nu: filterByUser(bannerPool, { voice: 'nu', genres: userFilter.genres }).length,
    'song-ca': filterByUser(bannerPool, { voice: 'song-ca', genres: userFilter.genres }).length,
  };

  // Tính số bài khả dụng cho từng thể loại theo giọng đang chọn
  const genreCounts = useMemo(() => {
    const counts: Record<Genre, number> = {
      ballad: 0,
      pop: 0,
      rap: 0,
      bolero: 0,
      rock: 0,
    };
    ALL_GENRES.forEach((g) => {
      counts[g] = bannerPool.filter(
        (s) => matchVoice(s.voice, userFilter.voice) && s.genre.includes(g)
      ).length;
    });
    return counts;
  }, [bannerPool, userFilter.voice]);

  const handleVoiceChange = (v: Voice) => {
    onChangeFilter({
      ...userFilter,
      voice: v === 'tat-ca' ? undefined : v,
    });
  };

  const handleToggleGenre = (genre: Genre) => {
    let updated: Genre[];
    if (currentGenres.includes(genre)) {
      updated = currentGenres.filter((g) => g !== genre);
    } else {
      updated = [...currentGenres, genre];
    }
    onChangeFilter({
      ...userFilter,
      genres: updated.length > 0 ? updated : undefined,
    });
  };

  const handleSelectAllGenres = () => {
    // Chọn tất cả các thể loại có bài khả dụng
    const available = ALL_GENRES.filter((g) => genreCounts[g] > 0);
    onChangeFilter({
      ...userFilter,
      genres: available.length > 0 ? available : undefined,
    });
  };

  const handleClearGenres = () => {
    onChangeFilter({
      ...userFilter,
      genres: undefined,
    });
  };

  const handleResetAll = () => {
    onChangeFilter({});
  };

  return (
    <div className="filter-modal-overlay" onClick={onClose}>
      <div
        className="filter-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-modal-title"
      >
        {/* Header modal */}
        <div className="filter-modal-header">
          <div className="filter-modal-title-wrap">
            <h3 id="filter-modal-title">Bộ Lọc Kho Bài Hát</h3>
            {activeCount > 0 && (
              <span className="filter-active-count-badge">
                Đang lọc: {activeCount} tiêu chí
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className="filter-close-btn"
            onClick={onClose}
            aria-label="Đóng bảng lọc"
            title="Đóng bảng lọc"
          >
            <Icon name="close" size={16} />
          </Button>
        </div>

        {/* Nội dung các trường lọc (M4: chỉ giọng & thể loại) */}
        <div className="filter-modal-body">
          {/* 1. GIỌNG HÁT */}
          <section className="filter-group">
            <h4 className="filter-group-title">Giọng hát</h4>
            <div className="filter-pills-row">
              <Chip
                label="Tất cả"
                count={voiceCounts['tat-ca']}
                selected={currentVoice === 'tat-ca'}
                onClick={() => handleVoiceChange('tat-ca')}
                disabled={voiceCounts['tat-ca'] === 0}
              />
              <Chip
                label="Nam"
                count={voiceCounts.nam}
                selected={currentVoice === 'nam'}
                onClick={() => handleVoiceChange('nam')}
                disabled={voiceCounts.nam === 0}
              />
              <Chip
                label="Nữ"
                count={voiceCounts.nu}
                selected={currentVoice === 'nu'}
                onClick={() => handleVoiceChange('nu')}
                disabled={voiceCounts.nu === 0}
              />
              <Chip
                label="Song ca"
                count={voiceCounts['song-ca']}
                selected={currentVoice === 'song-ca'}
                onClick={() => handleVoiceChange('song-ca')}
                disabled={voiceCounts['song-ca'] === 0}
              />
            </div>
          </section>

          {/* 2. THỂ LOẠI (CHỌN NHIỀU TRONG 5 NHÓM: BALLAD, POP, RAP, BOLERO, ROCK) */}
          <section className="filter-group">
            <div className="filter-group-header-with-action">
              <h4 className="filter-group-title">Thể loại (Chọn nhiều)</h4>
              <div className="filter-group-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  className="filter-small-text-btn"
                  onClick={handleSelectAllGenres}
                >
                  Chọn tất cả
                </Button>
                <span className="filter-action-sep">·</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="filter-small-text-btn"
                  onClick={handleClearGenres}
                >
                  Bỏ chọn
                </Button>
              </div>
            </div>

            <div className="filter-tags-grid">
              {ALL_GENRES.map((g) => {
                const isSelected = currentGenres.includes(g);
                const count = genreCounts[g];
                const isDisabled = count === 0;

                return (
                  <Chip
                    key={g}
                    label={GENRE_LABELS[g]}
                    count={count}
                    selected={isSelected}
                    disabled={isDisabled}
                    onClick={() => handleToggleGenre(g)}
                    title={isDisabled ? `Không có bài ${GENRE_LABELS[g]} nào` : undefined}
                  />
                );
              })}
            </div>
          </section>

          {/* 3. THỐNG KÊ VÀ CẢNH BÁO THỜI GIAN THỰC */}
          <div className="filter-summary-card">
            <div className="filter-summary-info">
              <span>Số bài hát khả dụng:</span>
              <strong className="filter-summary-count">{poolCount} bài</strong>
            </div>

            {/* Cảnh báo < 10 bài */}
            {poolCount > 0 && poolCount < 10 && (
              <Notice level="warning" className="filter-alert filter-alert-warning">
                Kho bài còn dưới 10 bài ({poolCount} bài). Vẫn cho phép rút nhưng có thể xuất hiện bài trùng khi rút 10.
              </Notice>
            )}

            {/* Cảnh báo = 0 bài */}
            {poolCount === 0 && (
              <Notice level="danger" className="filter-alert filter-alert-danger">
                Không có bài hát nào thỏa mãn bộ lọc hiện tại. Vui lòng nới lỏng hoặc đặt lại bộ lọc để rút thẻ.
              </Notice>
            )}
          </div>
        </div>

        {/* Footer modal */}
        <div className="filter-modal-footer">
          <Button
            variant="ghost"
            size="md"
            className="genshin-sub-btn filter-reset-btn"
            onClick={handleResetAll}
            disabled={activeCount === 0}
          >
            Đặt lại bộ lọc
          </Button>

          <Button
            variant="primary"
            size="md"
            className="filter-apply-btn"
            onClick={onClose}
          >
            {poolCount === 0 ? 'Đóng bộ lọc' : `Áp dụng (${poolCount} bài)`}
          </Button>
        </div>
      </div>
    </div>
  );
};
