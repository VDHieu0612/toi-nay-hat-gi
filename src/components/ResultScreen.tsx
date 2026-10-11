import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Song, Rarity } from '../lib/types';
import { SongCard } from './SongCard';
import { GachaCanvas } from './GachaCanvas';
import { addSongsToCollection } from '../lib/storage';
import { ANIMATION_CONFIG } from '../lib/animationConfig';

interface ResultScreenProps {
  songs: Song[];
  lastPullType: 1 | 10;
  onBack: () => void;
  onPullAgain: (count: 1 | 10) => void;
  speedMultiplier?: number;
  onReplay?: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  songs,
  lastPullType,
  onBack,
  onPullAgain,
  speedMultiplier = ANIMATION_CONFIG.speedMultiplier,
}) => {
  // 5 Nhịp: 0 (Chuẩn bị), 1 (Sao băng), 2 (Va chạm), 3 (Thẻ rơi vào hàng), 4 (Lật thẻ), 5 (Tổng kết)
  const [phase, setPhase] = useState<number>(0);
  const [meteorProgress, setMeteorProgress] = useState<number>(0);
  const [impactTriggered, setImpactTriggered] = useState<boolean>(false);
  const [cameraShake, setCameraShake] = useState<boolean>(false);
  const [isHitstopped, setIsHitstopped] = useState<boolean>(false);
  const [purplePulse, setPurplePulse] = useState<boolean>(false);
  const [anticipatingCardIndex, setAnticipatingCardIndex] = useState<number | null>(null);

  // Âm thanh: khởi tạo từ localStorage
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('karaoke_sound_enabled') === 'true';
  });

  // Gợi ý bật âm thanh ở lượt rút đầu tiên (Điểm H)
  const [showAudioPrompt, setShowAudioPrompt] = useState<boolean>(() => {
    const hintDismissed = localStorage.getItem('karaoke_audio_hint_seen') === 'true';
    const soundSaved = localStorage.getItem('karaoke_sound_enabled') === 'true';
    return !hintDismissed && !soundSaved;
  });

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

  // Bật/tắt âm thanh và lưu lựa chọn
  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    localStorage.setItem('karaoke_sound_enabled', String(nextState));
  };

  const handleEnableAudioFromHint = () => {
    setSoundEnabled(true);
    localStorage.setItem('karaoke_sound_enabled', 'true');
    localStorage.setItem('karaoke_audio_hint_seen', 'true');
    setShowAudioPrompt(false);
  };

  const handleDismissAudioHint = () => {
    localStorage.setItem('karaoke_audio_hint_seen', 'true');
    setShowAudioPrompt(false);
  };

  // Âm thanh Web Audio tổng hợp tự động theo nhịp (Điểm H)
  const playAudioTone = (type: 'whoosh' | 'impact' | 'flip3' | 'flip4' | 'flip5' | 'starCount') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;

      if (type === 'whoosh') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 1.2 / speedMultiplier);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2 / speedMultiplier);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2 / speedMultiplier);
      } else if (type === 'impact') {
        // Impact boom: Sub-bass punch + lowpass sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.45 / speedMultiplier);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 / speedMultiplier);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5 / speedMultiplier);
      } else if (type === 'flip3') {
        // 3★: Chime thanh mảnh (A4 440Hz -> 523Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22 / speedMultiplier);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22 / speedMultiplier);
      } else if (type === 'flip4') {
        // 4★: Chime kép huyền ảo tím (E5 659Hz + B5 987Hz)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        osc2.frequency.setValueAtTime(987.77, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35 / speedMultiplier);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35 / speedMultiplier);
        osc2.stop(now + 0.35 / speedMultiplier);
      } else if (type === 'flip5') {
        // 5★: Arpeggio hoàng kim lộng lẫy (C5 -> E5 -> G5 -> C6)
        const freqs = [523.25, 659.25, 783.99, 1046.5];
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + i * 0.06);
          gain.gain.setValueAtTime(0.18, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.06 + 0.4) / speedMultiplier);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + (i * 0.06 + 0.45) / speedMultiplier);
        });
      } else if (type === 'starCount') {
        // Đếm sao: Ping cao độ sáng rõ
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1174.66, now); // D6
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16 / speedMultiplier);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16 / speedMultiplier);
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

  // Tiết tấu thời gian chính cho 5 Nhịp (tương thích speedMultiplier & Điểm A, B, C, D)
  useEffect(() => {
    // Kiểm tra prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      const all: Record<number, boolean> = {};
      sortedSongs.forEach((_, i) => (all[i] = true));
      setFlippedMap(all);
      setPhase(5);
      return;
    }

    let cancel = false;
    const timeouts: NodeJS.Timeout[] = [];

    // Nhịp 0: Chuẩn bị
    setPhase(0);

    const prepDur = ANIMATION_CONFIG.prepareDuration / speedMultiplier;
    const meteorDur = ANIMATION_CONFIG.meteorDuration / speedMultiplier;
    const hitstopDur = ANIMATION_CONFIG.hitstopDuration / speedMultiplier;
    const overlapImpact = ANIMATION_CONFIG.overlapWithImpact / speedMultiplier;
    const cardFlightDur = ANIMATION_CONFIG.cardFlightDuration / speedMultiplier;

    // Nhịp 1: Bắt đầu sao băng
    timeouts.push(
      setTimeout(() => {
        if (cancel) return;
        setPhase(1);
        playAudioTone('whoosh');

        if (maxRarity === 5) {
          setCameraShake(true);
        }

        // Animate meteor progress từ 0 đến 1
        const startTime = Date.now();
        const tick = () => {
          if (cancel) return;
          const elapsed = Date.now() - startTime;
          const p = Math.min(1, elapsed / meteorDur);
          setMeteorProgress(p);
          if (p < 1) {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }, prepDur)
    );

    // Điểm B: Hitstop 60-80ms đóng băng chuyển động ngay khi va chạm
    const hitTime = prepDur + meteorDur;
    timeouts.push(
      setTimeout(() => {
        if (cancel) return;
        setIsHitstopped(true);
      }, hitTime)
    );

    // Nhịp 2: Va chạm (ngay sau Hitstop) - Chớp màu độ hiếm, sóng xung kích, tia sáng, rung màn hình
    const impactTime = hitTime + hitstopDur;
    timeouts.push(
      setTimeout(() => {
        if (cancel) return;
        setIsHitstopped(false);
        setPhase(2);
        setCameraShake(true);
        setImpactTriggered(true);
        playAudioTone('impact');

        // Damped screen shake dừng sau 250ms
        timeouts.push(
          setTimeout(() => {
            if (cancel) return;
            setCameraShake(false);
          }, ANIMATION_CONFIG.shakeDuration / speedMultiplier)
        );
      }, impactTime)
    );

    // Điểm C: Nhịp 3 Thẻ rơi vào hàng (Chồng nhịp >= 0.3s với Nhịp 2, không khoảng trống > 150ms)
    const cardFallTime = impactTime + overlapImpact;
    timeouts.push(
      setTimeout(() => {
        if (cancel) return;
        setPhase(3);
      }, cardFallTime)
    );

    // Nhịp 4: Bắt đầu lật thẻ sau khi các thẻ đã vào hàng
    const startFlipTime = cardFallTime + cardFlightDur + (lastPullType === 10 ? 250 : 100);
    timeouts.push(
      setTimeout(() => {
        if (cancel) return;
        setPhase(4);
        startFlippingSequence();
      }, startFlipTime)
    );

    return () => {
      cancel = true;
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [sortedSongs, maxRarity, speedMultiplier]);

  // Luồng lật thẻ ở Nhịp 4 (Điểm D: 3★ nhanh, 4★ dừng 0.35s + rung + pulse tím, 5★ zoom giữa)
  const startFlippingSequence = () => {
    if (sortedSongs.length === 1) {
      // Rút 1 thẻ
      const singleRarity = sortedSongs[0].rarity;
      if (singleRarity === 5) {
        setSpotlight5StarIndex(0);
        setSpotlightStarCount(1);
        playAudioTone('flip5');
        for (let s = 2; s <= 5; s++) {
          setTimeout(() => {
            setSpotlightStarCount(s);
            playAudioTone('starCount');
          }, ((s - 1) * ANIMATION_CONFIG.flip5StarInterval) / speedMultiplier);
        }
        setTimeout(() => {
          setSpotlight5StarIndex(null);
          setFlippedMap({ 0: true });
          setPhase(5);
        }, ANIMATION_CONFIG.flip5Duration / speedMultiplier);
      } else {
        setTimeout(() => {
          setFlippedMap({ 0: true });
          playAudioTone(singleRarity === 4 ? 'flip4' : 'flip3');
          setPhase(5);
        }, 250 / speedMultiplier);
      }
      return;
    }

    // Rút 10: Lật tuần tự từng thẻ theo thứ tự hiếm thấp -> cao
    let cumulativeDelay = 0;

    flipOrder.forEach((cardIndex) => {
      const currentRarity = sortedSongs[cardIndex].rarity;
      const isFiveStar = currentRarity === 5;
      const isFourStar = currentRarity === 4;

      if (isFiveStar) {
        // 5★ lật cuối cùng: thêm thời gian trước khi vào spotlight
        cumulativeDelay += 350 / speedMultiplier;
      } else if (isFourStar) {
        // Điểm D: 4★ dừng 0.35s trước khi lật (rung + viền sáng)
        const prePause = ANIMATION_CONFIG.flip4PrePause / speedMultiplier;
        const postPause = ANIMATION_CONFIG.flip4PostPause / speedMultiplier;

        // Bắt đầu pre-pause cho 4★
        setTimeout(() => {
          setAnticipatingCardIndex(cardIndex);
        }, cumulativeDelay);

        cumulativeDelay += prePause;

        // Thời điểm lật 4★
        setTimeout(() => {
          setAnticipatingCardIndex(null);
          setFlippedMap((prev) => ({ ...prev, [cardIndex]: true }));
          playAudioTone('flip4');
          // Nền pulse tím 0.4s
          setPurplePulse(true);
          setTimeout(() => setPurplePulse(false), ANIMATION_CONFIG.flip4PulseDuration / speedMultiplier);

          if (rowContainerRef.current) {
            const cardEl = rowContainerRef.current.children[cardIndex] as HTMLElement;
            if (cardEl) {
              cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
          }
        }, cumulativeDelay);

        // Giữ 0.3s sau khi lật rồi mới sang thẻ kế
        cumulativeDelay += postPause;
        return;
      } else {
        // 3★: stagger 0.12s
        cumulativeDelay += ANIMATION_CONFIG.flip3Stagger / speedMultiplier;
      }

      setTimeout(() => {
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
            }, ((s - 1) * ANIMATION_CONFIG.flip5StarInterval) / speedMultiplier);
          }

          // Thu thẻ 5★ về vị trí trong hàng và sang Nhịp 5
          setTimeout(() => {
            setSpotlight5StarIndex(null);
            setFlippedMap((prev) => ({ ...prev, [cardIndex]: true }));
            setPhase(5);
          }, ANIMATION_CONFIG.flip5Duration / speedMultiplier);
        } else {
          setFlippedMap((prev) => ({ ...prev, [cardIndex]: true }));
          playAudioTone('flip3');
        }
      }, cumulativeDelay);
    });

    // Khi lật xong toàn bộ -> Nhịp 5 (nếu chưa có 5★ kết thúc trước)
    if (maxRarity < 5) {
      setTimeout(() => {
        setPhase(5);
      }, cumulativeDelay + 500 / speedMultiplier);
    }
  };

  // Nút Skip ở mọi nhịp: bỏ qua thẳng tới nhịp 5 với tất cả thẻ đã ngửa
  const handleSkipAll = () => {
    const allFlipped: Record<number, boolean> = {};
    sortedSongs.forEach((_, idx) => {
      allFlipped[idx] = true;
    });
    setFlippedMap(allFlipped);
    setSpotlight5StarIndex(null);
    setAnticipatingCardIndex(null);
    setPurplePulse(false);
    setCameraShake(false);
    setIsHitstopped(false);
    setPhase(5);
  };

  const handleFlipSingle = (index: number) => {
    setFlippedMap((prev) => ({ ...prev, [index]: true }));
    const r = sortedSongs[index].rarity;
    playAudioTone(r === 5 ? 'flip5' : r === 4 ? 'flip4' : 'flip3');
    if (r === 4) {
      setPurplePulse(true);
      setTimeout(() => setPurplePulse(false), ANIMATION_CONFIG.flip4PulseDuration / speedMultiplier);
    }
  };

  const flippedCount = Object.values(flippedMap).filter(Boolean).length;
  const isAllFlipped = flippedCount === sortedSongs.length;

  return (
    <div
      className={`gacha-result-viewport phase-${phase} ${
        cameraShake ? 'camera-shake-active' : ''
      } ${isHitstopped ? 'gacha-hitstop-freeze' : ''}`}
    >
      {/* 2D Canvas cho sao, sao băng, shockwave và particles */}
      <GachaCanvas
        phase={phase}
        maxRarity={maxRarity}
        meteorProgress={meteorProgress}
        impactTriggered={impactTriggered}
        speedMultiplier={speedMultiplier}
      />

      {/* Chớp màu độ hiếm toàn màn hình ở Nhịp 2 (Va chạm) */}
      {phase === 2 && (
        <div className={`fullscreen-impact-flash rarity-${maxRarity}`} />
      )}

      {/* Pulse tím nền toàn màn hình 0.4s khi lật thẻ 4★ (Điểm D) */}
      {purplePulse && <div className="purple-pulse-overlay" />}

      {/* Gợi ý bật âm thanh ở lượt rút đầu tiên (Điểm H) */}
      {showAudioPrompt && (
        <aside className="audio-first-pull-hint" aria-label="Gợi ý bật âm thanh">
          <div className="audio-hint-text">
            <span>🎵 Bật âm thanh để nghe tiếng sao băng & lật thẻ!</span>
          </div>
          <div className="audio-hint-actions">
            <button
              type="button"
              className="audio-hint-enable-btn"
              onClick={handleEnableAudioFromHint}
            >
              Bật âm thanh 🔊
            </button>
            <button
              type="button"
              className="audio-hint-dismiss-btn"
              onClick={handleDismissAudioHint}
              title="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        </aside>
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
        onClick={toggleSound}
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
              const isAnticipating = anticipatingCardIndex === index;

              // Điểm C: Stagger 60ms từ giữa ra hai bên (from: "center")
              // index 4,5 -> dist 0; 3,6 -> dist 1; 2,7 -> dist 2; 1,8 -> dist 3; 0,9 -> dist 4
              const centerDist = lastPullType === 10 ? Math.abs(index - 4.5) - 0.5 : 0;
              const staggerDelay = (centerDist * ANIMATION_CONFIG.cardStagger) / speedMultiplier;
              const emergeRot = index < 4.5 ? -8 : 8;

              return (
                <div
                  key={`${song.id}-${index}`}
                  className={`card-track-slot slot-${index} ${
                    isFlipped ? 'slot-flipped' : 'slot-unflipped'
                  } ${isBeingSpotlighted ? 'slot-in-spotlight' : ''} ${
                    isAnticipating ? 'slot-anticipating' : ''
                  }`}
                  style={{
                    animationDelay: `${staggerDelay}ms`,
                    // Custom properties cho đường bay từ tâm ra
                    ['--emerge-rot' as any]: `${emergeRot}deg`,
                    ['--emerge-dist' as any]: `${centerDist}`,
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
