import React from 'react';
import { Song, Banner, UserFilter, Voice } from '../lib/types';
import { getAllGenres, DECADE_RANGES, countActiveFilters, getFilteredPool } from '../lib/filters';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userFilter: UserFilter;
  onChangeFilter: (filter: UserFilter) => void;
  allSongs: Song[];
  selectedBanner: Banner;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  userFilter,
  onChangeFilter,
  allSongs,
  selectedBanner,
}) => {
  if (!isOpen) return null;

  const allAvailableGenres = getAllGenres(allSongs);
  const activeCount = countActiveFilters(userFilter);

  // Tính số lượng bài trong pool khi áp dụng bộ lọc hiện tại
  const previewPool = getFilteredPool(allSongs, selectedBanner, userFilter);
  const poolCount = previewPool.length;

  const handleVoiceChange = (v: Voice) => {
    onChangeFilter({
      ...userFilter,
      voice: v === 'tat-ca' ? undefined : v,
    });
  };

  const handleToggleGenre = (genre: string) => {
    const current = userFilter.genres || [];
    let updated: string[];
    if (current.includes(genre)) {
      updated = current.filter((g) => g !== genre);
    } else {
      updated = [...current, genre];
    }
    onChangeFilter({
      ...userFilter,
      genres: updated.length > 0 ? updated : undefined,
    });
  };

  const handleSelectAllGenres = () => {
    onChangeFilter({
      ...userFilter,
      genres: [...allAvailableGenres],
    });
  };

  const handleClearGenres = () => {
    onChangeFilter({
      ...userFilter,
      genres: undefined,
    });
  };

  const handleDecadeChange = (decadeKey: string) => {
    onChangeFilter({
      ...userFilter,
      decade: decadeKey === 'tat-ca' ? undefined : decadeKey,
    });
  };

  const handleMaxDifficultyChange = (diff: number) => {
    onChangeFilter({
      ...userFilter,
      maxDifficulty: diff === 5 ? undefined : diff,
    });
  };

  const handleResetAll = () => {
    onChangeFilter({});
  };

  const currentVoice = userFilter.voice || 'tat-ca';
  const currentGenres = userFilter.genres || [];
  const currentDecade = userFilter.decade || 'tat-ca';
  const currentMaxDiff = userFilter.maxDifficulty || 5;

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
          <button
            type="button"
            className="filter-close-btn"
            onClick={onClose}
            title="Đóng bảng lọc"
          >
            ✕
          </button>
        </div>

        {/* Nội dung các trường lọc */}
        <div className="filter-modal-body">
          {/* 1. GIỌNG HÁT */}
          <section className="filter-group">
            <h4 className="filter-group-title">
              <span className="filter-group-icon">🎙️</span> Giọng Hát
            </h4>
            <div className="filter-pills-row">
              <button
                type="button"
                className={`filter-pill ${currentVoice === 'tat-ca' ? 'is-active' : ''}`}
                onClick={() => handleVoiceChange('tat-ca')}
              >
                Tất cả giọng
              </button>
              <button
                type="button"
                className={`filter-pill ${currentVoice === 'nam' ? 'is-active' : ''}`}
                onClick={() => handleVoiceChange('nam')}
              >
                Nam 👨
              </button>
              <button
                type="button"
                className={`filter-pill ${currentVoice === 'nu' ? 'is-active' : ''}`}
                onClick={() => handleVoiceChange('nu')}
              >
                Nữ 👩
              </button>
              <button
                type="button"
                className={`filter-pill ${currentVoice === 'song-ca' ? 'is-active' : ''}`}
                onClick={() => handleVoiceChange('song-ca')}
              >
                Song ca 👥
              </button>
            </div>
          </section>

          {/* 2. THỂ LOẠI (CHỌN NHIỀU) */}
          <section className="filter-group">
            <div className="filter-group-header-with-action">
              <h4 className="filter-group-title">
                <span className="filter-group-icon">🎵</span> Thể Loại (Chọn nhiều)
              </h4>
              <div className="filter-group-actions">
                <button
                  type="button"
                  className="filter-small-text-btn"
                  onClick={handleSelectAllGenres}
                >
                  Chọn tất cả
                </button>
                <span className="filter-action-sep">•</span>
                <button
                  type="button"
                  className="filter-small-text-btn"
                  onClick={handleClearGenres}
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            <div className="filter-tags-grid">
              {allAvailableGenres.map((g) => {
                const isSelected = currentGenres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    className={`filter-tag-pill ${isSelected ? 'is-active' : ''}`}
                    onClick={() => handleToggleGenre(g)}
                  >
                    {isSelected ? '✓ ' : ''}{g.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. THẬP NIÊN */}
          <section className="filter-group">
            <h4 className="filter-group-title">
              <span className="filter-group-icon">⏳</span> Thập Niên
            </h4>
            <div className="filter-pills-row">
              <button
                type="button"
                className={`filter-pill ${currentDecade === 'tat-ca' ? 'is-active' : ''}`}
                onClick={() => handleDecadeChange('tat-ca')}
              >
                Mọi thời kỳ
              </button>
              {Object.entries(DECADE_RANGES).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  className={`filter-pill ${currentDecade === key ? 'is-active' : ''}`}
                  onClick={() => handleDecadeChange(key)}
                  title={item.label}
                >
                  {key}
                </button>
              ))}
            </div>
          </section>

          {/* 4. ĐỘ KHÓ TỐI ĐA */}
          <section className="filter-group">
            <h4 className="filter-group-title">
              <span className="filter-group-icon">⚡</span> Độ Khó Tối Đa
            </h4>
            <div className="filter-difficulty-row">
              {[1, 2, 3, 4, 5].map((diff) => {
                const isSelected = currentMaxDiff === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    className={`filter-diff-btn ${isSelected ? 'is-active' : ''}`}
                    onClick={() => handleMaxDifficultyChange(diff)}
                  >
                    <span className="diff-number">{diff}★</span>
                    <span className="diff-label">
                      {diff === 1
                        ? 'Rất dễ'
                        : diff === 2
                        ? 'Dễ'
                        : diff === 3
                        ? 'Vừa'
                        : diff === 4
                        ? 'Khó'
                        : 'Mọi cấp'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 5. THỐNG KÊ VÀ CẢNH BÁO THỜI GIAN THỰC */}
          <div className="filter-summary-card">
            <div className="filter-summary-info">
              <span>Số bài hát khả dụng:</span>
              <strong className="filter-summary-count">{poolCount} bài</strong>
            </div>

            {/* Cảnh báo < 10 bài */}
            {poolCount > 0 && poolCount < 10 && (
              <div className="filter-alert filter-alert-warning">
                ⚠️ Kho bài còn dưới 10 bài ({poolCount} bài). Vẫn cho phép rút nhưng có thể xuất hiện bài trùng khi rút 10.
              </div>
            )}

            {/* Cảnh báo = 0 bài */}
            {poolCount === 0 && (
              <div className="filter-alert filter-alert-danger">
                ⛔ Không có bài hát nào thỏa mãn bộ lọc hiện tại. Vui lòng nới lỏng hoặc đặt lại bộ lọc để rút thẻ.
              </div>
            )}
          </div>
        </div>

        {/* Footer modal */}
        <div className="filter-modal-footer">
          <button
            type="button"
            className="genshin-sub-btn filter-reset-btn"
            onClick={handleResetAll}
            disabled={activeCount === 0}
          >
            Đặt lại bộ lọc
          </button>

          <button
            type="button"
            className="genshin-wish-btn wish-btn-ten filter-apply-btn"
            onClick={onClose}
          >
            <div className="wish-btn-content">
              <span className="wish-btn-main">
                {poolCount === 0 ? 'Đóng bộ lọc' : `Áp dụng (${poolCount} bài)`}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
