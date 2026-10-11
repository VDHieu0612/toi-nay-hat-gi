import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Song, Rarity } from '../lib/types';
import { SongCard } from './SongCard';
import { GachaCanvas } from './GachaCanvas';
import { addSongsToCollection } from '../lib/storage';

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
  // 5 Nhịp: 0 (Chuẩn bị), 1 (Sao băng), 2 (Va chạm), 3 (Thẻ rơi vào hàng), 4 (Lật thẻ), 5 (Tổng kết)
  const [phase, setPhase] = useState<number>(0);
  const [meteorProgress, setMeteorProgress] = useState<number>(0);
  const [impactTriggered, setImpactTriggered] = useState<boolean>(false);
  const [cameraShake, setCameraShake] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Thẻ 5★ đang được phóng to giữa màn hình để đếm sao (nếu có)
  const [spotlight5StarIndex, setSpotlight5StarIndex] = useState<number | null>(null);
  const [spotlightStarCount, setSpotlightStarCount] = useState<number>(1);

  // Thêm các bài vào bộ sưu tập
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

  // Độ hiếm cao nhất của lượt rút
  const maxRarity: Rarity = useMemo(() => {
    if (!songs || songs.length === 0) return 3;
    const max = Math.max(...songs.map((s) => s.rarity));
    return (max as Rarity) || 3;
  }, [songs]);

  // Trạng thái đã lật của từng thẻ: Record<index, boolean>
  const [flippedMap, setFlippedMap] = useState<Record<number, boolean>>({});
  const rowContainerRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Âm thanh Web Audio tổng hợp tự động theo nhịp
  const playAudioTone = (type: 'whoosh' | 'impact' | 'flip3' | 'flip4' | 'flip5' | 'starCount') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'whoosh') {
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 1.2);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.start(now);
        osc.stop(now + 1.2);
      } else if (type === 'impact') {
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'flip3') {
        osc.frequency.setValueAtTime(440, now); // A4
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'flip4') {
        osc.frequency.setValueAtTime(587.33, now); // D5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'flip5') {
        osc.frequency.setValueAtTime(880, now); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'starCount') {
        osc.frequency.setValueAtTime(659.25, now); // E5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {
      // Bỏ qua lỗi audio
    }
  };

  // Thứ tự lật tăng hồi hộp: lật thẻ độ hiếm THẤP trước (3★ trước, rồi 4★, và 5★ sau cùng)
  const flipOrder = useMemo(() => {
    if (sortedSongs.length === 1) return [0];
    const indices = sortedSongs.map((_, idx) => idx);
    indices.sort((a, b) => sortedSongs[a].rarity - sortedSongs[b].rarity);
    return indices;
  }, [sortedSongs]);

  // Tiết tấu thời gian chính cho 5 Nhịp
  useEffect(() => {
    // Kiểm tra prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Bỏ qua sao băng và va chạm, nhảy thẳng vào nhịp 5
      const all: Record<number, boolean> = {};
      sortedSongs.forEach((_, i) => (all[i] = true));
      setFlippedMap(all);
      setPhase(5);
      return;
    }

    let cancel = false;
    const timeouts: NodeJS.Timeout[] = [];

    // Nhịp 0: Chuẩn bị (0 -> 0.6s)
    setPhase(0);

    // Nhịp 1: Bắt đầu sao băng ở 0.6s
    timeouts.push(
      setTimeout(() => {
        if (cancel) return;
        setPhase(1);
        playAudioTone('whoosh');

        if (maxRarity === 5) {
          setCameraShake(true);
        }

        // Animate meteor progress từ 0 đến 1 trong 1.7s
        const startTime = Date.now();
        const duration = 1700;
        const tick = () => {
          if (cancel) return;
          const elapsed = Date.now() - startTime;
          const p = Math.min(1, elapsed / duration);
          setMeteorProgress(p);
          if (p < 1) {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }, 600)
    );

    // Nhịp 2: Va chạm (ở 2.3s)
    timeouts.push(
      setTimeout(() => {
        if (cancel) return;
        setPhase(2);
        setCameraShake(false);
        setImpactTriggered(true);
        playAudioTone('impact');
      }, 2300)
    );

    // Nhịp 3: Thẻ rơi vào hàng (ở 3.0s)
    timeouts.push(
      setTimeout(() => {
        if (cancel) return;
        setPhase(3);
      }, 3000)
    );

    // Nhịp 4: Bắt đầu lật thẻ (ở 3.9s)
    timeouts.push(
      setTimeout(() => {
        if (cancel) return;
        setPhase(4);
        startFlippingSequence();
      }, 3900)
    );

    return () => {
      cancel = true;
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [sortedSongs, maxRarity]);

  // Luồng lật thẻ ở Nhịp 4
  const startFlippingSequence = () => {
    if (sortedSongs.length === 1) {
      // Rút 1: lật thẻ đơn sau 200ms
      setTimeout(() => {
        setFlippedMap({ 0: true });
        playAudioTone(sortedSongs[0].rarity === 5 ? 'flip5' : sortedSongs[0].rarity === 4 ? 'flip4' : 'flip3');
        setPhase(5);
      }, 250);
      return;
    }

    // Rút 10: lật lần lượt từ thấp đến cao
    let cumulativeDelay = 0;

    flipOrder.forEach((cardIndex) => {
      const currentRarity = sortedSongs[cardIndex].rarity;
      const isFiveStar = currentRarity === 5;
      const isFourStar = currentRarity === 4;

      cumulativeDelay += isFiveStar ? 450 : isFourStar ? 300 : 200;

      setTimeout(() => {
        // Tự cuộn tới thẻ vừa lật trên điện thoại
        if (rowContainerRef.current) {
          const cardEl = rowContainerRef.current.children[cardIndex] as HTMLElement;
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }

        if (isFiveStar) {
          // 5★ Zoom ra giữa màn hình và đếm sao!
          setSpotlight5StarIndex(cardIndex);
          setSpotlightStarCount(1);
          playAudioTone('flip5');

          // Đếm từng sao từ 1 đến 5
          for (let s = 2; s <= 5; s++) {
            setTimeout(() => {
              setSpotlightStarCount(s);
              playAudioTone('starCount');
            }, (s - 1) * 200);
          }

          // Sau 1.2s thu thẻ 5★ về vị trí trong hàng
          setTimeout(() => {
            setSpotlight5StarIndex(null);
            setFlippedMap((prev) => ({ ...prev, [cardIndex]: true }));
            setPhase(5); // Kết thúc chuyển sang Nhịp 5
          }, 1300);
        } else {
          setFlippedMap((prev) => ({ ...prev, [cardIndex]: true }));
          playAudioTone(isFourStar ? 'flip4' : 'flip3');
        }
      }, cumulativeDelay);
    });

    // Khi lật xong toàn bộ -> Nhịp 5
    setTimeout(() => {
      setPhase(5);
    }, cumulativeDelay + 800);
  };

  // Nút Skip ở mọi nhịp: bỏ qua thẳng tới nhịp 5 với tất cả thẻ đã ngửa
  const handleSkipAll = () => {
    const allFlipped: Record<number, boolean> = {};
    sortedSongs.forEach((_, idx) => {
      allFlipped[idx] = true;
    });
    setFlippedMap(allFlipped);
    setSpotlight5StarIndex(null);
    setCameraShake(false);
    setPhase(5);
  };

  const handleFlipSingle = (index: number) => {
    setFlippedMap((prev) => ({ ...prev, [index]: true }));
    const r = sortedSongs[index].rarity;
    playAudioTone(r === 5 ? 'flip5' : r === 4 ? 'flip4' : 'flip3');
  };

  const flippedCount = Object.values(flippedMap).filter(Boolean).length;
  const isAllFlipped = flippedCount === sortedSongs.length;

  return (
    <div
      className={`gacha-result-viewport phase-${phase} ${
        cameraShake ? 'camera-shake-active' : ''
      }`}
    >
      {/* 2D Canvas cho sao, sao băng, shockwave và particles */}
      <GachaCanvas
        phase={phase}
        maxRarity={maxRarity}
        meteorProgress={meteorProgress}
        impactTriggered={impactTriggered}
      />

      {/* Chớp trắng toàn màn hình ở Nhịp 2 (Va chạm) */}
      {phase === 2 && (
        <div className={`fullscreen-impact-flash rarity-${maxRarity}`} />
      )}

      {/* Nút Skip luôn hiển thị ở mọi nhịp (trừ khi đã vào nhịp 5 hoàn tất) */}
      {phase < 5 && (
        <button
          type="button"
          className="genshin-global-skip-btn"
          onClick={handleSkipAll}
          title="Bỏ qua hiệu ứng và xem ngay toàn bộ kết quả"
        >
          Skip ⏭
        </button>
      )}

      {/* Nút bật/tắt âm thanh */}
      <button
        type="button"
        className="genshin-sound-btn"
        onClick={() => setSoundEnabled((prev) => !prev)}
        title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>

      {/* Thanh trên cùng khi ở Nhịp 3, 4, 5 */}
      {phase >= 3 && (
        <header className="result-header-bar">
          <button
            type="button"
            className="genshin-sub-btn"
            onClick={onBack}
          >
            ← Trở về Wish
          </button>

          <div className="result-header-title">
            <span>KẾT QUẢ {lastPullType === 1 ? 'RÚT ×1' : 'RÚT ×10'}</span>
            {lastPullType === 10 && (
              <span className="result-header-counter">
                ({flippedCount}/{sortedSongs.length})
              </span>
            )}
          </div>

          <div className="result-header-right">
            {phase === 4 && !isAllFlipped && (
              <button
                type="button"
                className="genshin-flip-all-btn"
                onClick={handleSkipAll}
              >
                Lật tất cả ⚡
              </button>
            )}
            <button
              type="button"
              className="genshin-again-top-btn"
              onClick={() => onPullAgain(lastPullType)}
            >
              Rút tiếp ×{lastPullType} ↻
            </button>
          </div>
        </header>
      )}

      {/* VÙNG MỘT HÀNG NGANG CHO CÁC THẺ (Nhịp 3, 4, 5) */}
      {phase >= 3 && (
        <main className="result-cards-main-stage">
          <div
            ref={rowContainerRef}
            className={`cards-horizontal-track ${
              lastPullType === 1 ? 'track-single-card' : 'track-ten-cards'
            }`}
          >
            {sortedSongs.map((song, index) => {
              const isFlipped = Boolean(flippedMap[index]);
              const isBeingSpotlighted = spotlight5StarIndex === index;

              return (
                <div
                  key={`${song.id}-${index}`}
                  className={`card-track-slot slot-${index} ${
                    isFlipped ? 'slot-flipped' : 'slot-unflipped'
                  } ${isBeingSpotlighted ? 'slot-in-spotlight' : ''}`}
                  style={{
                    // So le thời gian rơi vào hàng ở nhịp 3: 40-60ms mỗi thẻ
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <SongCard
                    song={song}
                    isFlipped={isFlipped}
                    onFlip={() => handleFlipSingle(index)}
                    showBeam={isFlipped && phase >= 4}
                  />
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* MODAL PHÓNG TO 5★ GIỮA MÀN HÌNH Ở NHỊP 4 */}
      {spotlight5StarIndex !== null && sortedSongs[spotlight5StarIndex] && (
        <div className="spotlight-5star-overlay">
          <div className="spotlight-5star-aura" />
          <div className="spotlight-5star-card-holder">
            <SongCard
              song={sortedSongs[spotlight5StarIndex]}
              isFlipped={true}
              showBeam={true}
              isFocused5Star={true}
              starCountReveal={spotlightStarCount}
            />
          </div>
          <div className="spotlight-stars-text">
            {'★'.repeat(spotlightStarCount)}
          </div>
        </div>
      )}

      {/* THANH DƯỚI CÙNG Ở NHỊP 5 (TỔNG KẾT) */}
      {phase === 5 && (
        <footer className="result-footer-bar">
          <div className="result-footer-left">
            <span className="result-footer-note">
              ✦ Danh sách đã xếp theo độ hiếm giảm dần (5★ → 3★)
            </span>
          </div>

          <div className="result-footer-right">
            <button
              type="button"
              className="genshin-sub-btn"
              onClick={onBack}
            >
              Xem toàn bộ Setlist 🎉
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
      )}
    </div>
  );
};
