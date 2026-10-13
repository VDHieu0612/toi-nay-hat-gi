import React, { useState, useMemo, useEffect } from 'react';
import { Banner, Song, Rarity } from '../lib/types';
import { getArtistRotationInfo } from '../lib/rotation';
import { calculateSongDropRates, SongRateInfo } from '../lib/dropRates';
import { getSearchKaraokeUrl } from '../lib/filters';
import { Button } from './ui/Button';
import { Notice } from './ui/Notice';
import { Icon } from './ui/Icon';
import diaThanPoster from '../assets/dia_than.jpg';

interface BannerDetailProps {
  banner: Banner;
  allBanners?: Banner[];
  allSongs: Song[];
  poolCount: number;
  onPullOne: () => void;
  onPullTen: () => void;
  onOpenHistory?: () => void;
  onOpenFilter?: () => void;
  activeFilterCount?: number;
}

export const BannerDetail: React.FC<BannerDetailProps> = ({
  banner,
  allBanners = [],
  allSongs,
  poolCount,
  onPullOne,
  onPullTen,
  onOpenHistory,
  onOpenFilter,
  activeFilterCount = 0,
}) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());
  const [modalStarFilter, setModalStarFilter] = useState<'all' | Rarity>('all');
  const [modalSearch, setModalSearch] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isArtist = banner.type === 'artist';

  // Tính thông tin xoay tua 2 ngày nếu là banner ca sĩ
  const rotationInfo = useMemo(() => {
    return getArtistRotationInfo(allBanners.length > 0 ? allBanners : [banner], currentTime);
  }, [allBanners, banner, currentTime]);

  const isPoolEmpty = poolCount === 0;

  // Danh sách bài hát cho banner này:
  // - Theo banner từng ca sĩ: chỉ xuất hiện các bài hát của ca sĩ đó
  // - Banner tổng hợp: đầy đủ toàn bộ bài hát trong sheet
  const targetSongs = useMemo<Song[]>(() => {
    if (isArtist && banner.artistId) {
      const extraIds = banner.extraSongIds || [];
      return allSongs.filter(
        (s) => s.artistId === banner.artistId || extraIds.includes(s.id)
      );
    }
    return allSongs;
  }, [allSongs, banner, isArtist]);

  // Tính toán số sao và tỉ lệ ra chính xác cho từng bài hát
  const songRateList = useMemo<SongRateInfo[]>(() => {
    return calculateSongDropRates(targetSongs, banner);
  }, [targetSongs, banner]);

  // Thống kê số lượng theo sao
  const count5 = useMemo(() => songRateList.filter((item) => item.rarity === 5).length, [songRateList]);
  const count4 = useMemo(() => songRateList.filter((item) => item.rarity === 4).length, [songRateList]);
  const count3 = useMemo(() => songRateList.filter((item) => item.rarity === 3).length, [songRateList]);

  // Lọc bài hát hiển thị trong modal Chi tiết
  const filteredModalSongs = useMemo(() => {
    return songRateList.filter((item) => {
      if (modalStarFilter !== 'all' && item.rarity !== modalStarFilter) {
        return false;
      }
      // Chỉ tìm kiếm ở banner Tổng Hợp
      if (!isArtist && modalSearch.trim()) {
        const q = modalSearch.toLowerCase().trim();
        const matchTitle = item.song.title.toLowerCase().includes(q);
        const matchArtist = item.song.artist.toLowerCase().includes(q);
        const matchGenre = item.song.genre.some((g) => g.toLowerCase().includes(q));
        if (!matchTitle && !matchArtist && !matchGenre) return false;
      }
      return true;
    });
  }, [songRateList, modalStarFilter, modalSearch, isArtist]);

  const renderStarBadges = (rarity: Rarity) => {
    if (rarity === 5) {
      return <span className="star-rating stars-5" title="5 sao (Siêu hit)">★★★★★</span>;
    }
    if (rarity === 4) {
      return <span className="star-rating stars-4" title="4 sao (Bản hit)">★★★★</span>;
    }
    return <span className="star-rating stars-3" title="3 sao (Bài hay)">★★★</span>;
  };

  return (
    <section
      className="banner-detail-panel"
      style={{ '--banner-theme': banner.theme } as React.CSSProperties}
    >
      <div className="banner-poster-container has-custom-poster">
        {/* Lớp hiển thị tranh poster full khung hình banner (hình đĩa than đồng bộ) */}
        <div className="banner-full-poster-wrapper">
          <img
            src={diaThanPoster}
            alt={banner.name}
            className="banner-full-poster-image"
          />
          {/* Lớp Scrim gradient bảo vệ độ tương phản để chữ bên trái và nút roll luôn nổi bật trên nền */}
          <div className="banner-poster-scrim" />
        </div>

        {/* Cột trái: Nội dung thông tin banner (tiêu đề, luật rút, đợt xoay tua, mô tả) - sát về tay trái */}
        <div className="banner-poster-info">
          <div className="banner-tag-pill">
            {isArtist
              ? 'TIÊU ĐIỂM CA SĨ · XOAY TUA 2 NGÀY'
              : 'BANNER TIÊU CHUẨN'}
          </div>

          <h2 className="banner-main-title">
            <span>{banner.name}</span>
          </h2>

          <div className="banner-rules-box">
            <p className="banner-guarantee-line">
              <span className="guarantee-icon">·</span>
              Mỗi 10 lượt rút bảo đảm có ít nhất một bài 4★ trở lên.
            </p>
            {isArtist && rotationInfo && (
              <p className="banner-rateup-line banner-rotation-status-line">
                <span className="guarantee-icon">
                  <Icon name="clock" size={13} />
                </span>
                <span>
                  <strong>Đang mở trong đợt xoay tua 2 ngày:</strong>{' '}
                  <span className="clock-digits">{rotationInfo.countdownClock}</span>
                </span>
              </p>
            )}
            <p className="banner-disclaimer-line">
              <span className="guarantee-icon">·</span>
              <span>Lưu ý: Số sao chỉ mang tính tham khảo, vui vẻ giải trí khi rút bài; không mang tính đánh giá chủ quan hay gây tranh cãi giữa các nghệ sĩ.</span>
            </p>
          </div>

          <p className="banner-desc-text">{banner.description}</p>
        </div>

        {/* Thanh dưới cùng của Poster */}
        <div className="banner-poster-bottom-bar">
          <div className="banner-bottom-left-btns">
            {/* XOÁ BỘ LỌC Ở PHẦN BANNER CA SĨ: Chỉ hiển thị bộ lọc khi là banner Tổng Hợp */}
            {!isArtist && (
              <Button
                variant="ghost"
                size="sm"
                className={`genshin-sub-btn filter-trigger-btn ${activeFilterCount > 0 ? 'has-active-filters' : ''}`}
                onClick={onOpenFilter}
                title="Mở bộ lọc kho bài hát"
              >
                <span>Bộ lọc</span>
                {activeFilterCount > 0 && (
                  <span className="filter-badge">{activeFilterCount}</span>
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="genshin-sub-btn"
              onClick={() => setShowDetailsModal(true)}
              title="Xem danh sách bài hát, số sao và tỉ lệ ra chi tiết"
            >
              Chi tiết
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="genshin-sub-btn"
              onClick={onOpenHistory}
            >
              Lịch sử
            </Button>
          </div>

          <div className="banner-bottom-right-container">
            {poolCount === 0 && (
              <Notice level="danger" className="pool-warning-pill pool-warning-empty" title="Kho bài rỗng">
                Không có bài hát nào phù hợp bộ lọc. Vui lòng nới lỏng bộ lọc!
              </Notice>
            )}

            <div className="banner-bottom-right-btns">
              <Button
                variant="secondary"
                size="lg"
                className="genshin-wish-btn wish-btn-single"
                onClick={onPullOne}
                disabled={isPoolEmpty}
                title={isPoolEmpty ? 'Bộ lọc không tìm thấy bài hát nào' : 'Rút 1 bài'}
              >
                <div className="wish-btn-content">
                  <span className="wish-btn-main">Rút ×1</span>
                  <span className="wish-btn-sub">1 bài hát</span>
                </div>
              </Button>

              <Button
                variant="primary"
                size="lg"
                className="genshin-wish-btn wish-btn-ten"
                onClick={onPullTen}
                disabled={isPoolEmpty}
                title={isPoolEmpty ? 'Bộ lọc không tìm thấy bài hát nào' : 'Rút 10 bài setlist'}
              >
                <div className="wish-btn-content">
                  <span className="wish-btn-main">Rút ×10</span>
                  <span className="wish-btn-sub">Đảm bảo ≥ 4★ · Setlist</span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>


      {/* Modal Chi tiết banner: Danh sách bài hát, số sao và tỉ lệ rơi */}
      {showDetailsModal && (
        <div className="details-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="details-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Header modal */}
            <div className="details-modal-header">
              <div className="details-modal-title-wrap">
                <div>
                  <h3 className="details-modal-title">Chi Tiết Banner: {banner.name}</h3>
                  <p className="details-modal-subtitle">
                    {isArtist
                      ? `Danh sách toàn bộ bài hát của ${banner.name} trong kho dữ liệu`
                      : 'Đầy đủ toàn bộ bài hát trong kho dữ liệu Google Sheet'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                className="modal-close-btn"
                onClick={() => setShowDetailsModal(false)}
                title="Đóng modal"
                aria-label="Đóng modal"
              >
                <Icon name="close" size={16} />
              </Button>
            </div>

            <div className="details-modal-body">
              {/* Thống kê tỷ lệ rơi cơ sở */}
              <div className="details-rates-overview">
                <div className="rate-capsule rate-5">
                  <span className="rate-star">★★★★★ 5★</span>
                  <span className="rate-pct">3.00%</span>
                  <span className="rate-desc">Siêu Hit ({count5} bài)</span>
                </div>
                <div className="rate-capsule rate-4">
                  <span className="rate-star">★★★★ 4★</span>
                  <span className="rate-pct">15.00%</span>
                  <span className="rate-desc">Bản Hit ({count4} bài)</span>
                </div>
                <div className="rate-capsule rate-3">
                  <span className="rate-star">★★★ 3★</span>
                  <span className="rate-pct">82.00%</span>
                  <span className="rate-desc">Quen Thuộc ({count3} bài)</span>
                </div>
              </div>

              {/* Lưu ý số sao */}
              <div className="details-disclaimer-box">
                <span className="details-disclaimer-icon">💡</span>
                <span className="details-disclaimer-text">
                  <strong>Lưu ý:</strong> Số sao (độ hiếm) chỉ mang tính tham khảo và tạo không khí vui vẻ cho phòng hát karaoke; hoàn toàn không mang tính đánh giá chủ quan hay xếp hạng gây tranh cãi giữa các fan và nghệ sĩ.
                </span>
              </div>

              {/* Bộ lọc theo số sao & Ô tìm kiếm */}
              <div className="details-filter-toolbar">
                <div className="details-tabs-row">
                  <Button
                    variant={modalStarFilter === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={`details-tab-btn ${modalStarFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setModalStarFilter('all')}
                  >
                    Tất cả ({songRateList.length})
                  </Button>
                  <Button
                    variant={modalStarFilter === 5 ? 'secondary' : 'ghost'}
                    size="sm"
                    className={`details-tab-btn star-5-tab ${modalStarFilter === 5 ? 'active' : ''}`}
                    onClick={() => setModalStarFilter(5)}
                  >
                    ★★★★★ 5★ ({count5})
                  </Button>
                  <Button
                    variant={modalStarFilter === 4 ? 'secondary' : 'ghost'}
                    size="sm"
                    className={`details-tab-btn star-4-tab ${modalStarFilter === 4 ? 'active' : ''}`}
                    onClick={() => setModalStarFilter(4)}
                  >
                    ★★★★ 4★ ({count4})
                  </Button>
                  <Button
                    variant={modalStarFilter === 3 ? 'secondary' : 'ghost'}
                    size="sm"
                    className={`details-tab-btn star-3-tab ${modalStarFilter === 3 ? 'active' : ''}`}
                    onClick={() => setModalStarFilter(3)}
                  >
                    ★★★ 3★ ({count3})
                  </Button>
                </div>

                {/* KHÔNG CẦN Ô SEARCH Ở BANNER CA SĨ, CHỈ CẦN Ở TỔNG HỢP */}
                {!isArtist && (
                  <div className="details-search-wrap">
                    <input
                      type="text"
                      className="details-search-input"
                      placeholder="Tìm theo tên bài, ca sĩ, thể loại..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                    />
                    {modalSearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        className="details-search-clear"
                        onClick={() => setModalSearch('')}
                        aria-label="Xóa tìm kiếm"
                      >
                        <Icon name="close" size={12} />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Bảng danh sách bài hát chi tiết */}
              <div className="details-table-wrapper">
                <table className="details-song-table">
                  <thead>
                    <tr>
                      <th style={{ width: '38%' }}>Bài Hát</th>
                      <th style={{ width: '22%' }}>Ca Sĩ</th>
                      <th style={{ width: '15%' }}>Thể Loại / Giọng</th>
                      <th style={{ width: '13%' }}>Số Sao</th>
                      <th style={{ width: '12%', textAlign: 'right' }}>Tỉ Lệ Ra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModalSongs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="details-empty-td">
                          Không tìm thấy bài hát nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredModalSongs.map((item) => (
                        <tr key={item.song.id} className={`details-row rarity-${item.rarity}`}>
                          <td>
                            <div className="table-song-title-group">
                              <span className="table-song-title">{item.song.title}</span>
                              <a
                                href={getSearchKaraokeUrl(item.song.title, item.song.artist)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="table-youtube-btn"
                                title="Tìm beat Karaoke trên YouTube"
                              >
                                Karaoke
                              </a>
                            </div>
                          </td>
                          <td>
                            <span className="table-song-artist">{item.song.artist}</span>
                          </td>
                          <td>
                            <div className="table-tags-group">
                              <span className="table-genre-tag">{item.song.genre.join(', ')}</span>
                              <span className="table-voice-tag">{item.song.voice}</span>
                            </div>
                          </td>
                          <td>
                            {renderStarBadges(item.rarity)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-rate-group">
                              <span className="table-rate-value">{item.percentageFormatted}</span>
                              {item.isFeatured && (
                                <span className="rateup-pill" title="Bài tiêu điểm (Rate-up)">
                                  RATE UP
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
