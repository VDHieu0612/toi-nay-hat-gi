import React, { useEffect, useRef, useState } from 'react';
import { Rarity } from '../lib/types';
import { ANIMATION_CONFIG } from '../lib/animationConfig';

interface GachaCanvasProps {
  phase: number; // 0, 1, 2, 3, 4, 5
  maxRarity: Rarity;
  meteorProgress: number; // 0 -> 1 during nhịp 1 (energy accumulation)
  impactTriggered: boolean;
  speedMultiplier: number;
}

interface SpiralParticle {
  angle0: number;
  r0: number;
  size: number;
  colorType: 'white' | 'rarity';
  speedFactor: number;
  wobbleFreq: number;
  wobbleAmp: number;
  twinklePhase: number;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface Shockwave {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  color: string;
  delay: number;
}

interface AcousticRing {
  r: number;
  maxR: number;
  alpha: number;
  color: string;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vRot: number;
  color: string;
  alpha: number;
}

export const GachaCanvas: React.FC<GachaCanvasProps> = ({
  phase,
  maxRarity,
  meteorProgress,
  impactTriggered,
  speedMultiplier,
}) => {
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bloomCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Kỹ thuật 2: Bloom giả (bật/tắt tự động theo FPS)
  const [bloomEnabled, setBloomEnabled] = useState<boolean>(true);

  // Kỹ thuật 1: Pre-rendered glow sprites cache
  const spritesRef = useRef<Record<string, HTMLCanvasElement>>({});

  // Danh sách phần tử hiệu ứng
  const spiralParticlesRef = useRef<SpiralParticle[]>([]);
  const burstParticlesRef = useRef<BurstParticle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const acousticRingsRef = useRef<AcousticRing[]>([]);
  const confettiRef = useRef<Confetti[]>([]);
  const lastBeatTimeRef = useRef<number>(0);
  const equalizerHeightsRef = useRef<number[]>([]);
  const raysAngleRef = useRef<number>(0);
  const raysAlphaRef = useRef<number>(0);
  const laserAlphaRef = useRef<number>(0);

  // FPS monitor (Kỹ thuật 7)
  const fpsHistoryRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());

  const getColorHex = (rarity: Rarity): string => {
    if (rarity === 5) return '#fbbf24';
    if (rarity === 4) return '#c084fc';
    return '#38bdf8';
  };

  // Kỹ thuật 1: Khởi tạo các Sprite phát sáng trên Offscreen Canvas
  useEffect(() => {
    const createGlowTexture = (color: string, size = 64): HTMLCanvasElement => {
      const cvs = document.createElement('canvas');
      cvs.width = size;
      cvs.height = size;
      const ctx = cvs.getContext('2d');
      if (!ctx) return cvs;
      const r = size / 2;
      const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, color);
      grad.addColorStop(0.55, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
      return cvs;
    };

    spritesRef.current = {
      white: createGlowTexture('#ffffff', 64),
      cyan: createGlowTexture('#38bdf8', 64),
      purple: createGlowTexture('#c084fc', 64),
      gold: createGlowTexture('#fbbf24', 64),
      amber: createGlowTexture('#f59e0b', 64),
    };
  }, []);

  // Khởi tạo hạt xoáy cho Nhịp 1 & Equalizer bars
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile
      ? ANIMATION_CONFIG.spiralParticlesMobile
      : ANIMATION_CONFIG.spiralParticlesDesktop;

    const maxR = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) * 0.55;
    const spirals: SpiralParticle[] = [];

    for (let i = 0; i < particleCount; i++) {
      spirals.push({
        angle0: Math.random() * Math.PI * 2,
        r0: maxR * (0.45 + Math.random() * 0.65),
        size: Math.random() * 18 + 4, // 4px - 22px
        colorType: Math.random() < 0.25 ? 'white' : 'rarity',
        speedFactor: 0.85 + Math.random() * 0.35,
        wobbleFreq: 8 + Math.random() * 8,
        wobbleAmp: 8 + Math.random() * 16,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    spiralParticlesRef.current = spirals;

    // Equalizer: 32 thanh
    const bars: number[] = [];
    for (let i = 0; i < ANIMATION_CONFIG.equalizerBarCount; i++) {
      bars.push(Math.random() * 12 + 4);
    }
    equalizerHeightsRef.current = bars;
  }, []);

  // Nhịp 2: Kích hoạt Beat drop (Sóng xung kích, Nổ hạt, Confetti, Laser)
  useEffect(() => {
    if (impactTriggered && mainCanvasRef.current) {
      const canvas = mainCanvasRef.current;
      const cx = canvas.width / (2 * (window.devicePixelRatio || 1));
      const cy = canvas.height / (2 * (window.devicePixelRatio || 1));
      const color = getColorHex(maxRarity);
      const maxRadius = Math.max(window.innerWidth, window.innerHeight) * 0.9;

      // 1. 3 Vòng sóng xung kích (Điểm B)
      shockwavesRef.current = [];
      for (let i = 0; i < ANIMATION_CONFIG.shockwaveCount; i++) {
        shockwavesRef.current.push({
          x: cx,
          y: cy,
          r: 10,
          maxR: maxRadius,
          alpha: 1,
          color,
          delay: (i * ANIMATION_CONFIG.shockwaveStagger) / speedMultiplier,
        });
      }

      // 2. Tia sáng xoay (14 tia)
      raysAlphaRef.current = 1;

      // 3. Nổ hạt phát sáng (140 hạt desktop / 70 mobile)
      const particleCount =
        window.innerWidth < 768 ? ANIMATION_CONFIG.particlesMobile : ANIMATION_CONFIG.particlesDesktop;

      burstParticlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 15 + 4) * speedMultiplier;
        burstParticlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 16 + 4,
          color,
          alpha: 1,
          life: 0,
          maxLife: Math.random() * 45 + 35,
        });
      }

      // 4. Đặc quyền 5★: Laser quét ngang và Confetti ánh vàng (Điểm B)
      if (maxRarity === 5) {
        laserAlphaRef.current = 1;

        confettiRef.current = [];
        for (let i = 0; i < ANIMATION_CONFIG.confettiCount; i++) {
          confettiRef.current.push({
            x: cx + (Math.random() - 0.5) * window.innerWidth * 0.5,
            y: cy + (Math.random() - 0.5) * 80,
            vx: (Math.random() - 0.5) * 8 * speedMultiplier,
            vy: -(Math.random() * 6 + 2) * speedMultiplier,
            w: Math.random() * 6 + 5,
            h: Math.random() * 12 + 8,
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.12 * speedMultiplier,
            color: Math.random() < 0.6 ? '#fbbf24' : '#fef08a',
            alpha: 1,
          });
        }
      }

      // 5. Equalizer bật lên cực đại
      equalizerHeightsRef.current = equalizerHeightsRef.current.map(() =>
        window.innerHeight * (window.innerWidth < 768 ? 0.22 : 0.32)
      );
    }
  }, [impactTriggered, maxRarity, speedMultiplier]);

  // Main Render Loop
  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    const bloomCanvas = bloomCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d');
    const bloomCtx = bloomCanvas?.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mainCanvas.width = window.innerWidth * dpr;
      mainCanvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (bloomCanvas && bloomCtx) {
        // Bloom canvas ở độ phân giải 1/2 để tối ưu GPU
        bloomCanvas.width = Math.floor(window.innerWidth / 2);
        bloomCanvas.height = Math.floor(window.innerHeight / 2);
        bloomCtx.setTransform(0.5, 0, 0, 0.5, 0, 0);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;
      const now = performance.now();

      // FPS Monitor (Kỹ thuật 7)
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      if (delta > 0) {
        const currentFps = 1000 / delta;
        fpsHistoryRef.current.push(currentFps);
        if (fpsHistoryRef.current.length > 30) fpsHistoryRef.current.shift();
        const avgFps =
          fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;
        if (avgFps < 45 && bloomEnabled) {
          setBloomEnabled(false); // Tự tắt bloom giả nếu máy yếu
        }
      }

      // Kỹ thuật 3: Vệt mờ (Persistence) bằng destination-out
      if (phase === 1 || phase === 2) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      // Xác định màu sắc chủ đạo
      let currentColor = getColorHex(maxRarity);
      let currentSprite = spritesRef.current.cyan;

      // Khoảnh khắc đổi màu "đánh lừa" trong Nhịp 1 (xanh -> tím -> vàng)
      if (phase === 1) {
        if (meteorProgress < 0.35 && maxRarity >= 4) {
          currentColor = '#38bdf8';
          currentSprite = spritesRef.current.cyan;
        } else if (meteorProgress < 0.68 && maxRarity === 5) {
          currentColor = '#c084fc';
          currentSprite = spritesRef.current.purple;
        } else {
          currentColor = getColorHex(maxRarity);
          currentSprite =
            maxRarity === 5
              ? spritesRef.current.gold
              : maxRarity === 4
              ? spritesRef.current.purple
              : spritesRef.current.cyan;
        }
      }

      // ============================================================
      // Kỹ thuật 6: NỀN SỐNG SÂN KHẤU (Stage Lighting & Vignette)
      // ============================================================
      // 1. Chùm đèn Spotlight quét sân khấu
      if (phase <= 3) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const spotTime = now * 0.0012 * speedMultiplier;
        const spotCount = 3;

        for (let i = 0; i < spotCount; i++) {
          const originX = w * (0.25 + i * 0.25);
          const sweepRange = w * 0.22;
          // Ở Nhịp 1, đèn quét nhanh dần và hội tụ về tâm
          const convergence = phase === 1 ? Math.min(1, meteorProgress) : 0;
          const targetX =
            cx * convergence +
            (1 - convergence) * (originX + Math.sin(spotTime + i * 1.5) * sweepRange);

          const spotGrad = ctx.createLinearGradient(originX, 0, targetX, h);
          spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
          spotGrad.addColorStop(0.2, currentColor + '22');
          spotGrad.addColorStop(0.8, currentColor + '08');
          spotGrad.addColorStop(1, 'transparent');

          ctx.fillStyle = spotGrad;
          ctx.beginPath();
          ctx.moveTo(originX - 18, 0);
          ctx.lineTo(originX + 18, 0);
          ctx.lineTo(targetX + (w < 768 ? 60 : 120), h);
          ctx.lineTo(targetX - (w < 768 ? 60 : 120), h);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // ============================================================
      // NHỊP 1: TÍCH NĂNG LƯỢNG (Hạt xoáy, Quả cầu 120 BPM, Equalizer)
      // ============================================================
      if (phase === 1 && meteorProgress > 0) {
        const p = Math.min(1, Math.max(0, meteorProgress));
        // Easing xoáy vào tâm (Kỹ thuật 5)
        const easeInP = p ** 2.2;

        // Anticipation (120ms cuối co lại trước khi nổ)
        let orbScale = 1;
        if (p > 0.94) {
          const antProg = (p - 0.94) / 0.06;
          orbScale = Math.max(0.35, 1 - antProg * 0.65);
        }

        // Nhịp đập 120 BPM (mỗi nhịp 0.5s = 500ms; nếu 5★ ở cuối thì gấp đôi)
        const bpmFreq = maxRarity === 5 && p > 0.7 ? 8 : 4;
        const bpmSin = Math.sin(now * 0.003 * Math.PI * bpmFreq * speedMultiplier);
        const pulseEffect = Math.max(0, bpmSin) ** 3 * ANIMATION_CONFIG.orbPulseScale;

        // Sinh vòng sóng âm mỗi nhịp 120 BPM
        if (bpmSin > 0.92 && now - lastBeatTimeRef.current > 350 / speedMultiplier) {
          lastBeatTimeRef.current = now;
          acousticRingsRef.current.push({
            r: 14,
            maxR: Math.min(w, h) * 0.45,
            alpha: 0.75,
            color: currentColor,
          });
        }

        // 1. Vẽ các hạt sáng xoáy hút vào tâm (Kỹ thuật 1, 4, 5)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        spiralParticlesRef.current.forEach((sp) => {
          const currentR =
            sp.r0 * (1 - easeInP) +
            Math.sin(p * sp.wobbleFreq + sp.angle0) * sp.wobbleAmp * (1 - easeInP);
          const currentAngle =
            sp.angle0 +
            easeInP * (Math.PI * 4.5 * sp.speedFactor) +
            Math.sin(p * 8) * 0.3;

          const px = cx + Math.cos(currentAngle) * currentR;
          const py = cy + Math.sin(currentAngle) * currentR;

          // Hạt tiến gần tâm thì nhỏ dần và hòa vào quả cầu
          const renderSize = Math.max(2, sp.size * (1 - easeInP * 0.6));
          const sprite =
            sp.colorType === 'white' ? spritesRef.current.white : currentSprite;

          ctx.globalAlpha = Math.min(1, (1 - easeInP * 0.3) * (0.65 + Math.sin(sp.twinklePhase + now * 0.005) * 0.35));
          if (sprite) {
            ctx.drawImage(
              sprite,
              px - renderSize,
              py - renderSize,
              renderSize * 2,
              renderSize * 2
            );
          }
        });
        ctx.restore();

        // 2. Vẽ vòng sóng âm tỏa ra theo nhịp
        acousticRingsRef.current = acousticRingsRef.current.filter((ring) => {
          ring.r += 6 * speedMultiplier;
          ring.alpha -= 0.025 * speedMultiplier;
          if (ring.alpha <= 0 || ring.r >= ring.maxR) return false;

          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = ring.color;
          ctx.globalAlpha = Math.max(0, ring.alpha * 0.5);
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          return true;
        });

        // 3. Quả cầu năng lượng ở tâm (Đập theo nhịp + phình dần)
        const baseRadius = 8 + p * (ANIMATION_CONFIG.orbMaxRadius - 8);
        const currentOrbRadius = baseRadius * (1 + pulseEffect) * orbScale;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Quầng sáng ngoài
        const outerGlow = currentOrbRadius * 2.8;
        if (currentSprite) {
          ctx.globalAlpha = 0.85;
          ctx.drawImage(
            currentSprite,
            cx - outerGlow,
            cy - outerGlow,
            outerGlow * 2,
            outerGlow * 2
          );
        }

        // Lõi quả cầu trắng sáng
        if (spritesRef.current.white) {
          ctx.globalAlpha = 0.95;
          const coreSize = currentOrbRadius * 1.2;
          ctx.drawImage(
            spritesRef.current.white,
            cx - coreSize,
            cy - coreSize,
            coreSize * 2,
            coreSize * 2
          );
        }
        ctx.restore();
      }

      // ============================================================
      // NHỊP 2: BEAT DROP (Shockwaves, Tia sáng xoay, Hạt nổ, Laser 5★, Confetti 5★)
      // ============================================================
      // 1. Tia sáng xoay (14 tia)
      if (raysAlphaRef.current > 0.01) {
        raysAngleRef.current += 0.016 * speedMultiplier;
        raysAlphaRef.current -= 0.018 * speedMultiplier;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(cx, cy);
        ctx.rotate(raysAngleRef.current);

        const rayCount = ANIMATION_CONFIG.raysCount;
        const rayLen = Math.max(w, h) * 0.9;

        ctx.strokeStyle = currentColor;
        for (let i = 0; i < rayCount; i++) {
          const a = (i * Math.PI * 2) / rayCount;
          ctx.globalAlpha = Math.max(0, raysAlphaRef.current * 0.45);
          ctx.lineWidth = i % 2 === 0 ? 9 : 4.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * rayLen, Math.sin(a) * rayLen);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Vòng sóng xung kích (Shockwaves)
      shockwavesRef.current = shockwavesRef.current.filter((sw) => {
        if (sw.delay > 0) {
          sw.delay -= 16;
          return true;
        }

        sw.r += 28 * speedMultiplier;
        sw.alpha -= 0.028 * speedMultiplier;
        if (sw.alpha <= 0 || sw.r >= sw.maxR) return false;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.lineWidth = Math.max(1, 8 * (1 - sw.r / sw.maxR));
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return true;
      });

      // 3. Nổ hạt phát sáng (Kỹ thuật 1: vẽ bằng sprite)
      burstParticlesRef.current = burstParticlesRef.current.filter((p) => {
        p.life += speedMultiplier;
        p.x += p.vx * speedMultiplier;
        p.y += p.vy * speedMultiplier;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.vy += 0.06; // Trọng lực nhẹ

        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (p.life >= p.maxLife || p.alpha <= 0) return false;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = p.alpha;
        const sprite =
          p.life < p.maxLife * 0.3 ? spritesRef.current.white : currentSprite;
        if (sprite) {
          ctx.drawImage(
            sprite,
            p.x - p.size,
            p.y - p.size,
            p.size * 2,
            p.size * 2
          );
        }
        ctx.restore();
        return true;
      });

      // 4. Đặc quyền 5★: Laser quét ngang
      if (laserAlphaRef.current > 0.01) {
        laserAlphaRef.current -= 0.025 * speedMultiplier;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, laserAlphaRef.current * 0.85);

        // Chùm laser ngang qua tâm
        const laserGrad = ctx.createLinearGradient(0, cy - 8, 0, cy + 8);
        laserGrad.addColorStop(0, 'transparent');
        laserGrad.addColorStop(0.5, '#ffffff');
        laserGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = laserGrad;
        ctx.fillRect(0, cy - 14, w, 28);

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.stroke();
        ctx.restore();
      }

      // 5. Đặc quyền 5★: Confetti ánh vàng (mảnh chữ nhật xoay, rơi chậm)
      if (confettiRef.current.length > 0) {
        confettiRef.current = confettiRef.current.filter((cf) => {
          cf.x += cf.vx;
          cf.y += cf.vy;
          cf.vy += 0.08 * speedMultiplier; // Rơi chậm
          cf.rot += cf.vRot;
          cf.alpha -= 0.006 * speedMultiplier;

          if (cf.y > h + 20 || cf.alpha <= 0) return false;

          ctx.save();
          ctx.translate(cf.x, cf.y);
          ctx.rotate(cf.rot);
          ctx.scale(Math.cos(cf.rot * 1.5), 1); // 3D flutter
          ctx.fillStyle = cf.color;
          ctx.globalAlpha = Math.max(0, cf.alpha);
          ctx.fillRect(-cf.w / 2, -cf.h / 2, cf.w, cf.h);
          ctx.restore();
          return true;
        });
      }

      // ============================================================
      // THANH EQUALIZER SÂN KHẤU Ở ĐÁY MÀN HÌNH (Nhịp 1, 2)
      // ============================================================
      if (phase === 1 || phase === 2) {
        const barCount = equalizerHeightsRef.current.length;
        const totalW = w * (w < 768 ? 0.9 : 0.7);
        const startX = (w - totalW) / 2;
        const barGap = totalW / barCount;
        const barW = Math.max(3, barGap * 0.65);
        const bpmSin = Math.sin(now * 0.003 * Math.PI * 4 * speedMultiplier);
        const beatBounce = Math.max(0, bpmSin) ** 2;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        equalizerHeightsRef.current.forEach((val, i) => {
          let targetH = val;
          if (phase === 1) {
            // Nhảy theo nhịp 120 BPM
            const wave = Math.sin(now * 0.006 + i * 0.3) * 0.5 + 0.5;
            targetH = 8 + (30 * meteorProgress + 15) * beatBounce * wave;
          } else if (phase === 2) {
            // Hạ dần sau cú nổ beat drop
            targetH = Math.max(4, val * 0.94);
            equalizerHeightsRef.current[i] = targetH;
          }

          const bx = startX + i * barGap;
          const by = h - 14 - targetH;

          const eqGrad = ctx.createLinearGradient(bx, by + targetH, bx, by);
          eqGrad.addColorStop(0, currentColor + '33');
          eqGrad.addColorStop(1, currentColor + 'cc');
          ctx.fillStyle = eqGrad;

          ctx.beginPath();
          ctx.roundRect(bx, by, barW, targetH, 3);
          ctx.fill();
        });
        ctx.restore();
      }

      // ============================================================
      // Kỹ thuật 2: Chép lại sang Canvas Bloom thứ hai (Fake Bloom)
      // ============================================================
      if (bloomEnabled && bloomCtx && bloomCanvas) {
        bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
        bloomCtx.drawImage(
          mainCanvas,
          0,
          0,
          bloomCanvas.width,
          bloomCanvas.height
        );
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [phase, maxRarity, meteorProgress, speedMultiplier, bloomEnabled]);

  return (
    <div className="karaoke-stage-canvas-container">
      {/* Canvas chính */}
      <canvas ref={mainCanvasRef} className="gacha-main-canvas" />

      {/* Kỹ thuật 2: Canvas Bloom thứ hai phủ chồng, mờ 10px và mix-blend-mode: screen */}
      {bloomEnabled && (
        <canvas ref={bloomCanvasRef} className="gacha-bloom-canvas" />
      )}
    </div>
  );
};
