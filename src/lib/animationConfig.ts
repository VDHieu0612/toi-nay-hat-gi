export interface AnimationConfig {
  // Nhịp 0: Tối sân khấu (0.5s)
  prepareDuration: number;

  // Nhịp 1: Tích năng lượng (1.8 - 2.4s)
  energyBuildDuration: number; // 2100ms
  meteorDuration: number; // Alias tương thích ngược
  orbBpm: number; // 120 BPM
  orbPulseScale: number; // 0.10 (phồng 8-12%)
  orbMaxRadius: number; // 40px
  anticipationDuration: number; // 120ms co lại trước khi nổ
  spiralParticlesDesktop: number; // 160 hạt xoáy
  spiralParticlesMobile: number; // 80 hạt xoáy
  equalizerBarCount: number; // 32 thanh

  // Nhịp 2: Beat drop (0.8 - 1.0s)
  hitstopDuration: number; // 60-80ms đóng băng trước khi chớp
  flashInDuration: number; // 120ms
  flashOutDuration: number; // 350ms
  flashMaxOpacity: number; // <= 0.75
  shockwaveCount: number; // 2-3 vòng sóng
  shockwaveStagger: number; // 80ms
  raysCount: number; // 12-16 tia xoay
  raysDuration: number; // ~900ms
  shakeDuration: number; // 250ms
  shakeAmplitude: number; // ~6px damped
  particlesDesktop: number; // 140 hạt nổ
  particlesMobile: number; // 70 hạt nổ
  confettiCount: number; // 40 mảnh confetti ánh vàng (5★)

  // Nhịp 3: Thẻ rơi vào hàng (0.8 - 1.2s)
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
  // Nhịp 0: Tối sân khấu (0.5s)
  prepareDuration: 500,

  // Nhịp 1: Tích năng lượng (2.1s - trong dải 1.8-2.4s)
  energyBuildDuration: 2100,
  meteorDuration: 2100, // Alias
  orbBpm: 120,
  orbPulseScale: 0.10,
  orbMaxRadius: 42,
  anticipationDuration: 120, // 120ms co thắt
  spiralParticlesDesktop: 160,
  spiralParticlesMobile: 80,
  equalizerBarCount: 32,

  // Nhịp 2: Beat drop (0.9s - trong dải 0.8-1.0s)
  hitstopDuration: 70, // 60-80 ms
  flashInDuration: 120, // 120 ms
  flashOutDuration: 350, // 350 ms
  flashMaxOpacity: 0.72, // <= 0.75
  shockwaveCount: 3, // 3 vòng sóng xung kích
  shockwaveStagger: 80, // lệch 80 ms
  raysCount: 14, // 14 tia xoay
  raysDuration: 900, // 900 ms
  shakeDuration: 250, // 250 ms
  shakeAmplitude: 6, // ~6px
  particlesDesktop: 140,
  particlesMobile: 70,
  confettiCount: 40,

  // Nhịp 3: Thẻ vào hàng
  cardFlightDuration: 900,
  cardStagger: 60, // 60 ms từ giữa ra 2 bên
  overlapWithImpact: 320, // overlap >= 0.3s

  // Nhịp 4: Lật thẻ
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
