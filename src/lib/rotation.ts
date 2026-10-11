import { Banner } from './types';

// Chu kỳ xoay tua banner ca sĩ: 2 ngày = 48 giờ = 172.800.000 ms
export const ROTATION_PERIOD_MS = 2 * 24 * 60 * 60 * 1000;

// Mốc thời gian neo cố định (00:00:00 UTC ngày 01/01/2026) để xoay tua xác định
export const ROTATION_ANCHOR_TIMESTAMP = new Date('2026-01-01T00:00:00.000Z').getTime();

export interface RotationInfo {
  activeBannerId: string;
  activeBanner: Banner;
  cycleNumber: number;
  msRemaining: number;
  timeRemainingFormatted: string; // "Còn 1 ngày 14 giờ"
  countdownClock: string;         // "06 : 53 : 24" (giờ : phút : giây)
  allArtistBanners: Banner[];
  nextBanner: Banner;
}

/**
 * Định dạng đồng hồ đếm ngược thời gian thực theo định dạng (giờ : phút : giây)
 * Ví dụ: 06 : 53 : 24 hoặc 30 : 15 : 08
 */
export function formatCountdownClock(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Định dạng thời gian còn lại của chu kỳ thành chuỗi tiếng Việt dễ đọc
 */
export function formatRemainingTime(msRemaining: number): string {
  const totalHours = Math.floor(msRemaining / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `Còn ${days} ngày ${hours} giờ`;
  }
  if (hours > 0) {
    return `Còn ${hours} giờ ${minutes} phút`;
  }
  return `Còn ${Math.max(1, minutes)} phút`;
}

/**
 * Lấy thông tin xoay tua hiện tại cho danh sách banner ca sĩ
 */
export function getArtistRotationInfo(
  banners: Banner[],
  now: number = Date.now()
): RotationInfo | null {
  const artistBanners = banners.filter((b) => b.type === 'artist');
  if (artistBanners.length === 0) {
    return null;
  }

  const elapsed = Math.max(0, now - ROTATION_ANCHOR_TIMESTAMP);
  const cycleNumber = Math.floor(elapsed / ROTATION_PERIOD_MS);
  const activeIndex = cycleNumber % artistBanners.length;
  const nextIndex = (activeIndex + 1) % artistBanners.length;

  const nextRotationTime =
    ROTATION_ANCHOR_TIMESTAMP + (cycleNumber + 1) * ROTATION_PERIOD_MS;
  const msRemaining = Math.max(0, nextRotationTime - now);

  return {
    activeBannerId: artistBanners[activeIndex].id,
    activeBanner: artistBanners[activeIndex],
    cycleNumber,
    msRemaining,
    timeRemainingFormatted: formatRemainingTime(msRemaining),
    countdownClock: formatCountdownClock(msRemaining),
    allArtistBanners: artistBanners,
    nextBanner: artistBanners[nextIndex],
  };
}

/**
 * Kiểm tra xem một banner ca sĩ có đang là banner hoạt động trong chu kỳ 2 ngày hiện tại hay không
 */
export function isArtistBannerActive(
  bannerId: string,
  banners: Banner[],
  now: number = Date.now()
): boolean {
  const info = getArtistRotationInfo(banners, now);
  if (!info) return false;
  return info.activeBannerId === bannerId;
}
