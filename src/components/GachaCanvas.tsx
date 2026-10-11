import React, { useEffect, useRef } from 'react';
import { Rarity } from '../lib/types';
import { ANIMATION_CONFIG } from '../lib/animationConfig';

interface GachaCanvasProps {
  phase: number; // 0, 1, 2, 3, 4, 5
  maxRarity: Rarity;
  meteorProgress: number; // 0 -> 1 during nhịp 1
  impactTriggered: boolean;
  speedMultiplier: number;
}

interface Particle {
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

export const GachaCanvas: React.FC<GachaCanvasProps> = ({
  phase,
  maxRarity,
  meteorProgress,
  impactTriggered,
  speedMultiplier,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const backgroundStarsRef = useRef<{ x: number; y: number; size: number; alpha: number; speed: number }[]>([]);
  const raysAngleRef = useRef<number>(0);
  const raysAlphaRef = useRef<number>(0);

  const getColorHex = (rarity: Rarity): string => {
    if (rarity === 5) return '#fbbf24';
    if (rarity === 4) return '#c084fc';
    return '#38bdf8';
  };

  // Khởi tạo sao nền sáng rõ hơn (Điểm G)
  useEffect(() => {
    const stars: { x: number; y: number; size: number; alpha: number; speed: number }[] = [];
    const count = window.innerWidth < 768 ? 60 : 100;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 0.8,
        alpha: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 0.03 + 0.015,
      });
    }
    backgroundStarsRef.current = stars;
  }, []);

  // Xử lý kích hoạt va chạm: Sóng xung kích + Tia sáng xoay + Nổ hạt (Điểm B)
  useEffect(() => {
    if (impactTriggered && canvasRef.current) {
      const canvas = canvasRef.current;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const color = getColorHex(maxRarity);
      const maxRadius = Math.max(canvas.width, canvas.height) * 0.85;

      // 1. Thêm 3 vòng sóng xung kích lệch nhau 80ms
      shockwavesRef.current = [];
      for (let i = 0; i < ANIMATION_CONFIG.shockwaveCount; i++) {
        shockwavesRef.current.push({
          x: cx,
          y: cy,
          r: 5,
          maxR: maxRadius,
          alpha: 1,
          color,
          delay: (i * ANIMATION_CONFIG.shockwaveStagger) / speedMultiplier,
        });
      }

      // 2. Kích hoạt tia sáng xoay
      raysAlphaRef.current = 1;

      // 3. Nổ hạt (120 hạt desktop / 60 điện thoại)
      const particleCount =
        window.innerWidth < 768 ? ANIMATION_CONFIG.particlesMobile : ANIMATION_CONFIG.particlesDesktop;

      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 14 + 3) * speedMultiplier;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 4.5 + 1.5,
          color,
          alpha: 1,
          life: 0,
          maxLife: Math.random() * 45 + 30,
        });
      }
    }
  }, [impactTriggered, maxRarity, speedMultiplier]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // 1. Vẽ các vì sao nền sáng rõ (Điểm G)
      backgroundStarsRef.current.forEach((st) => {
        st.alpha += st.speed;
        const currentAlpha = Math.abs(Math.sin(st.alpha)) * 0.7 + 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(st.x * w, st.y * h, st.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Vẽ sao băng ở Nhịp 1 (Điểm A: Bán kính >= 14px, 3 lớp bloom, đuôi >= 25% w, tia lóe 4 cánh)
      if (phase === 1 && meteorProgress > 0 && meteorProgress <= 1) {
        const startX = w * 0.1;
        const startY = h * 0.05;
        const endX = w * 0.5;
        const endY = h * 0.5;

        // Quỹ đạo cong Bezier
        const t = Math.min(1, Math.max(0, meteorProgress));
        const cpX = w * 0.35;
        const cpY = h * 0.18;

        const currentX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX;
        const currentY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY;

        // Hiệu ứng đổi màu ngắn tạo kịch tính (xanh -> tím -> vàng)
        let currentColor = getColorHex(maxRarity);
        if (t < 0.35 && maxRarity >= 4) {
          currentColor = '#38bdf8';
        } else if (t < 0.65 && maxRarity === 5) {
          currentColor = '#c084fc';
        }

        // Quầng sáng nền di chuyển theo sao băng
        const bgAura = ctx.createRadialGradient(currentX, currentY, 10, currentX, currentY, 140);
        bgAura.addColorStop(0, currentColor);
        bgAura.addColorStop(1, 'transparent');
        ctx.fillStyle = bgAura;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 140, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Đuôi sao băng: dài >= 25% chiều rộng viewport, độ dày giảm dần
        const tailLen = Math.max(w * ANIMATION_CONFIG.meteorTailLengthRatio, 220);
        const angle = Math.atan2(currentY - cpY, currentX - cpX);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // Bloom effect

        const tailGradient = ctx.createLinearGradient(
          currentX,
          currentY,
          currentX - Math.cos(angle) * tailLen,
          currentY - Math.sin(angle) * tailLen
        );
        tailGradient.addColorStop(0, '#ffffff');
        tailGradient.addColorStop(0.25, currentColor);
        tailGradient.addColorStop(1, 'transparent');

        ctx.strokeStyle = tailGradient;
        ctx.lineWidth = maxRarity === 5 ? 18 : maxRarity === 4 ? 14 : 11;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(currentX - Math.cos(angle) * tailLen, currentY - Math.sin(angle) * tailLen);
        ctx.stroke();

        // Đầu sao băng: bán kính >= 14px, vẽ 3 LỚP (lõi trắng, quầng màu, quầng ngoài)
        const headR = Math.max(14, ANIMATION_CONFIG.meteorHeadRadius);

        // Lớp 3 (Quầng ngoài mờ)
        const outerAura = ctx.createRadialGradient(currentX, currentY, headR * 0.8, currentX, currentY, headR * 3.2);
        outerAura.addColorStop(0, currentColor);
        outerAura.addColorStop(1, 'transparent');
        ctx.fillStyle = outerAura;
        ctx.beginPath();
        ctx.arc(currentX, currentY, headR * 3.2, 0, Math.PI * 2);
        ctx.fill();

        // Lớp 2 (Quầng màu rực rỡ)
        const colorGlow = ctx.createRadialGradient(currentX, currentY, headR * 0.4, currentX, currentY, headR * 1.8);
        colorGlow.addColorStop(0, '#ffffff');
        colorGlow.addColorStop(0.6, currentColor);
        colorGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = colorGlow;
        ctx.beginPath();
        ctx.arc(currentX, currentY, headR * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Lớp 1 (Lõi trắng sáng)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(currentX, currentY, headR * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Tia lóe 4 cánh (Flare) ở đầu sao băng
        const flareSize = ANIMATION_CONFIG.meteorFlareSize;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(currentX - flareSize, currentY);
        ctx.lineTo(currentX + flareSize, currentY);
        ctx.moveTo(currentX, currentY - flareSize);
        ctx.lineTo(currentX, currentY + flareSize);
        ctx.stroke();

        ctx.restore();

        // Hạt bụi sáng rơi rớt ở đuôi
        if (Math.random() < 0.7) {
          particlesRef.current.push({
            x: currentX + (Math.random() - 0.5) * 16,
            y: currentY + (Math.random() - 0.5) * 16,
            vx: -Math.cos(angle) * (Math.random() * 4 + 1.5) + (Math.random() - 0.5) * 2,
            vy: -Math.sin(angle) * (Math.random() * 4 + 1.5) + (Math.random() - 0.5) * 2,
            size: Math.random() * 3.5 + 1.5,
            color: currentColor,
            alpha: 1,
            life: 0,
            maxLife: Math.random() * 30 + 15,
          });
        }
      }

      // 3. Vẽ tia sáng xoay (Rotating Rays) ở Nhịp 2 (Điểm B: conic/radial rays >= 12 tia)
      if (raysAlphaRef.current > 0.01) {
        raysAngleRef.current += 0.015 * speedMultiplier;
        raysAlphaRef.current -= 0.018 * speedMultiplier;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(w / 2, h / 2);
        ctx.rotate(raysAngleRef.current);

        const rayCount = ANIMATION_CONFIG.raysCount;
        const rayLen = Math.max(w, h) * 0.8;
        const color = getColorHex(maxRarity);

        ctx.strokeStyle = color;
        for (let i = 0; i < rayCount; i++) {
          const a = (i * Math.PI * 2) / rayCount;
          ctx.globalAlpha = Math.max(0, raysAlphaRef.current * 0.4);
          ctx.lineWidth = i % 2 === 0 ? 8 : 4;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * rayLen, Math.sin(a) * rayLen);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 4. Vẽ Shockwave rings (Điểm B)
      shockwavesRef.current = shockwavesRef.current.filter((sw) => {
        if (sw.delay > 0) {
          sw.delay -= 16;
          return true;
        }

        sw.r += 26 * speedMultiplier;
        sw.alpha -= 0.03 * speedMultiplier;
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

      // 5. Update & Render nổ hạt (Điểm B)
      particlesRef.current = particlesRef.current.filter((p) => {
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
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      // 6. Ambient floating sparks (Nhịp 4 & 5)
      if ((phase === 4 || phase === 5) && maxRarity >= 4 && particlesRef.current.length < 40) {
        if (Math.random() < 0.3) {
          particlesRef.current.push({
            x: Math.random() * w,
            y: h + 10,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -(Math.random() * 1.8 + 0.6),
            size: Math.random() * 3 + 1,
            color: maxRarity === 5 ? '#fef08a' : '#e9d5ff',
            alpha: 0.85,
            life: 0,
            maxLife: Math.random() * 80 + 50,
          });
        }
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [phase, maxRarity, meteorProgress, speedMultiplier]);

  return (
    <canvas
      ref={canvasRef}
      className="gacha-2d-canvas"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
};
