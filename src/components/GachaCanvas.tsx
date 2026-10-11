import React, { useEffect, useRef } from 'react';
import { Rarity } from '../lib/types';

interface GachaCanvasProps {
  phase: number; // 0, 1, 2, 3, 4, 5
  maxRarity: Rarity;
  meteorProgress: number; // 0 -> 1 during nhịp 1
  impactTriggered: boolean;
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

export const GachaCanvas: React.FC<GachaCanvasProps> = ({
  phase,
  maxRarity,
  meteorProgress,
  impactTriggered,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Lưu danh sách các hạt và sóng xung kích
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<{ x: number; y: number; r: number; maxR: number; alpha: number; color: string }[]>([]);
  const backgroundStarsRef = useRef<{ x: number; y: number; size: number; alpha: number; speed: number }[]>([]);

  const getColorHex = (rarity: Rarity): string => {
    if (rarity === 5) return '#fbbf24';
    if (rarity === 4) return '#c084fc';
    return '#38bdf8';
  };

  // Khởi tạo các vì sao tĩnh nền
  useEffect(() => {
    const stars: { x: number; y: number; size: number; alpha: number; speed: number }[] = [];
    for (let i = 0; i < 70; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.02 + 0.01,
      });
    }
    backgroundStarsRef.current = stars;
  }, []);

  // Xử lý nổ hạt và shockwave khi va chạm (Nhịp 2)
  useEffect(() => {
    if (impactTriggered && canvasRef.current) {
      const canvas = canvasRef.current;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const color = getColorHex(maxRarity);

      // Thêm shockwave ring
      shockwavesRef.current.push({
        x: cx,
        y: cy,
        r: 10,
        maxR: Math.max(canvas.width, canvas.height) * 0.75,
        alpha: 1,
        color,
      });

      // Sinh hạt nổ từ trung tâm (tối đa ~70 hạt trên mobile, 120 trên desktop)
      const count = window.innerWidth < 768 ? 60 : 110;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 2;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 4 + 1.5,
          color,
          alpha: 1,
          life: 0,
          maxLife: Math.random() * 40 + 30,
        });
      }
    }
  }, [impactTriggered, maxRarity]);

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

      // 1. Vẽ các vì sao nền lấp lánh
      backgroundStarsRef.current.forEach((st) => {
        st.alpha += st.speed;
        const currentAlpha = Math.abs(Math.sin(st.alpha)) * 0.7 + 0.15;
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(st.x * w, st.y * h, st.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Vẽ sao băng ở Nhịp 1
      if (phase === 1 && meteorProgress > 0 && meteorProgress <= 1) {
        // Quỹ đạo cong: từ góc trên trái (0.1w, 0.1h) qua trung tâm (0.5w, 0.5h)
        const startX = w * 0.15;
        const startY = h * 0.05;
        const endX = w * 0.5;
        const endY = h * 0.5;

        // Quadratic curve interpolation
        const t = Math.min(1, Math.max(0, meteorProgress));
        // Control point tạo độ cong
        const cpX = w * 0.38;
        const cpY = h * 0.2;

        const currentX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX;
        const currentY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY;

        // Đổi màu ngắn tạo hồi hộp cho 5★ (xanh -> vàng) hoặc 4★ (xanh -> tím)
        let currentColor = getColorHex(maxRarity);
        if (t < 0.35 && maxRarity >= 4) {
          currentColor = '#38bdf8'; // Bắt đầu bằng xanh
        } else if (t < 0.65 && maxRarity === 5) {
          currentColor = '#c084fc'; // Lên tím trước khi bùng vàng
        }

        // Vẽ đuôi sao băng (Trail)
        const tailLen = 35 + t * 45;
        const angle = Math.atan2(currentY - cpY, currentX - cpX);

        const tailGradient = ctx.createLinearGradient(
          currentX,
          currentY,
          currentX - Math.cos(angle) * tailLen * 4,
          currentY - Math.sin(angle) * tailLen * 4
        );
        tailGradient.addColorStop(0, currentColor);
        tailGradient.addColorStop(0.3, currentColor);
        tailGradient.addColorStop(1, 'transparent');

        ctx.strokeStyle = tailGradient;
        ctx.lineWidth = maxRarity === 5 ? 10 : maxRarity === 4 ? 8 : 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(
          currentX - Math.cos(angle) * tailLen * 3.5,
          currentY - Math.sin(angle) * tailLen * 3.5
        );
        ctx.stroke();

        // Vẽ đầu sao băng rực rỡ
        const glowRadius = maxRarity === 5 ? 32 : maxRarity === 4 ? 26 : 20;
        const radialGlow = ctx.createRadialGradient(currentX, currentY, 2, currentX, currentY, glowRadius);
        radialGlow.addColorStop(0, '#ffffff');
        radialGlow.addColorStop(0.3, currentColor);
        radialGlow.addColorStop(1, 'transparent');

        ctx.fillStyle = radialGlow;
        ctx.beginPath();
        ctx.arc(currentX, currentY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Thêm hạt bụi sáng rơi rớt ở đuôi
        if (Math.random() < 0.6) {
          particlesRef.current.push({
            x: currentX + (Math.random() - 0.5) * 12,
            y: currentY + (Math.random() - 0.5) * 12,
            vx: -Math.cos(angle) * (Math.random() * 3 + 1) + (Math.random() - 0.5) * 2,
            vy: -Math.sin(angle) * (Math.random() * 3 + 1) + (Math.random() - 0.5) * 2,
            size: Math.random() * 3 + 1,
            color: currentColor,
            alpha: 1,
            life: 0,
            maxLife: Math.random() * 25 + 15,
          });
        }
      }

      // 3. Vẽ Shockwave rings ở Nhịp 2
      shockwavesRef.current = shockwavesRef.current.filter((sw) => {
        sw.r += 24;
        sw.alpha -= 0.035;
        if (sw.alpha <= 0 || sw.r >= sw.maxR) return false;

        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.lineWidth = Math.max(1, 10 * (1 - sw.r / sw.maxR));
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        return true;
      });

      // 4. Update và vẽ particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94; // Ma sát
        p.vy *= 0.94;
        p.vy += 0.08; // Trọng lực nhẹ
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.life >= p.maxLife || p.alpha <= 0) return false;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      // 5. Ambient dust particles ở Nhịp 4 và 5 cho 4★/5★
      if ((phase === 4 || phase === 5) && maxRarity >= 4 && particlesRef.current.length < 35) {
        if (Math.random() < 0.25) {
          particlesRef.current.push({
            x: Math.random() * w,
            y: h + 10,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -(Math.random() * 1.5 + 0.5),
            size: Math.random() * 2.5 + 1,
            color: maxRarity === 5 ? '#fef08a' : '#e9d5ff',
            alpha: 0.8,
            life: 0,
            maxLife: Math.random() * 70 + 50,
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
  }, [phase, maxRarity, meteorProgress]);

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
