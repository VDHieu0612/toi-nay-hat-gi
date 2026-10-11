export interface AnimationConfig {
  // Nhịp 0: Chuẩn bị
  prepareDuration: number;

  // Nhịp 1: Sao băng
  meteorDuration: number;
  meteorHeadRadius: number; // px (>= 14px)
  meteorTailLengthRatio: number; // tỉ lệ so với viewport width (>= 0.25)
  meteorFlareSize: number;

  // Nhịp 2: Va chạm
  hitstopDuration: number; // 60-80ms đóng băng trước khi chớp
  flashInDuration: number; // 120ms
  flashOutDuration: number; // 350ms
  flashMaxOpacity: number; // <= 0.75
  shockwaveCount: number; // 2-3 vòng
  shockwaveStagger: number; // 80ms
  raysCount: number; // >= 12 tia
  raysDuration: number; // ~900ms
  shakeDuration: number; // 250ms
  shakeAmplitude: number; // ~6px
  particlesDesktop: number; // 120
  particlesMobile: number; // 60

  // Nhịp 3: Thẻ rơi vào hàng
  cardFlightDuration: number; // ms
  cardStagger: number; // 60ms từ giữa ra hai bên
  overlapWithImpact: number; // overlap >= 300ms

  // Nhịp 4: Lật thẻ
  flip3Stagger: number; // 120ms
  flip3Duration: number; // 350ms
  flip4PrePause: number; // 350ms dừng trước khi lật
  flip4PulseDuration: number; // 400ms nền pulse tím
  flip4PostPause: number; // 300ms dừng sau khi lật
  flip5Duration: number; // 1200ms zoom ra giữa
  flip5StarInterval: number; // 200ms mỗi sao

  // Hệ số tốc độ
  speedMultiplier: number;
}

export const ANIMATION_CONFIG: AnimationConfig = {
  // Nhịp 0: Chuẩn bị
  prepareDuration: 600,

  // Nhịp 1: Sao băng (A)
  meteorDuration: 1800,
  meteorHeadRadius: 15, // >= 14px
  meteorTailLengthRatio: 0.32, // >= 25% chiều rộng viewport
  meteorFlareSize: 24,

  // Nhịp 2: Va chạm (B)
  hitstopDuration: 70, // 60-80 ms
  flashInDuration: 120, // 120 ms
  flashOutDuration: 350, // 350 ms
  flashMaxOpacity: 0.72, // <= 0.75
  shockwaveCount: 3, // 2-3 vòng sóng
  shockwaveStagger: 80, // lệch nhau 80 ms
  raysCount: 14, // >= 12 tia
  raysDuration: 900, // ~0.9s
  shakeDuration: 250, // 250 ms
  shakeAmplitude: 6, // ~6px
  particlesDesktop: 120,
  particlesMobile: 60,

  // Nhịp 3: Thẻ vào hàng (C)
  cardFlightDuration: 900,
  cardStagger: 60, // 60 ms từ giữa ra 2 bên
  overlapWithImpact: 320, // overlap >= 0.3s

  // Nhịp 4: Lật thẻ (D)
  flip3Stagger: 120, // 0.12s
  flip3Duration: 350, // 0.35s
  flip4PrePause: 350, // 0.35s trước lật
  flip4PulseDuration: 400, // 0.4s pulse tím
  flip4PostPause: 300, // 0.3s sau lật
  flip5Duration: 1200, // 1.2s zoom giữa
  flip5StarInterval: 200, // đếm sao từng cái

  // Hệ số tốc độ
  speedMultiplier: 1,
};
