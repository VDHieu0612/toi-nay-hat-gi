import { describe, it, expect } from 'vitest';
import {
  ROTATION_PERIOD_MS,
  ROTATION_ANCHOR_TIMESTAMP,
  getArtistRotationInfo,
  formatRemainingTime,
  isArtistBannerActive,
} from './rotation';
import { Banner } from './types';

const mockBanners: Banner[] = [
  {
    id: 'tong-hop',
    type: 'general',
    name: 'Tổng Hợp',
    description: 'Mô tả',
    featured: [],
    theme: '#6366f1',
  },
  {
    id: 'artist-a',
    type: 'artist',
    artistId: 'ca-si-a',
    name: 'Ca Sĩ A',
    description: 'Mô tả A',
    featured: [],
    theme: '#ec4899',
  },
  {
    id: 'artist-b',
    type: 'artist',
    artistId: 'ca-si-b',
    name: 'Ca Sĩ B',
    description: 'Mô tả B',
    featured: [],
    theme: '#8b5cf6',
  },
  {
    id: 'artist-c',
    type: 'artist',
    artistId: 'ca-si-c',
    name: 'Ca Sĩ C',
    description: 'Mô tả C',
    featured: [],
    theme: '#0ea5e9',
  },
];

describe('rotation.ts (Xoay tua banner ca sĩ mỗi 2 ngày)', () => {
  it('trả về null nếu không có banner ca sĩ nào', () => {
    const info = getArtistRotationInfo([mockBanners[0]]);
    expect(info).toBeNull();
  });

  it('xác định đúng banner hoạt động ở chu kỳ ban đầu (chu kỳ 0)', () => {
    const info = getArtistRotationInfo(mockBanners, ROTATION_ANCHOR_TIMESTAMP);
    expect(info).not.toBeNull();
    expect(info?.cycleNumber).toBe(0);
    expect(info?.activeBannerId).toBe('artist-a');
    expect(info?.nextBanner.id).toBe('artist-b');
  });

  it('chuyển sang banner tiếp theo sau đúng 2 ngày (chu kỳ 1)', () => {
    const after2Days = ROTATION_ANCHOR_TIMESTAMP + ROTATION_PERIOD_MS;
    const info = getArtistRotationInfo(mockBanners, after2Days);
    expect(info?.cycleNumber).toBe(1);
    expect(info?.activeBannerId).toBe('artist-b');
    expect(info?.nextBanner.id).toBe('artist-c');
    expect(isArtistBannerActive('artist-b', mockBanners, after2Days)).toBe(true);
    expect(isArtistBannerActive('artist-a', mockBanners, after2Days)).toBe(false);
  });

  it('xoay vòng tròn về banner đầu tiên sau khi hết danh sách', () => {
    // 3 banner ca sĩ, sau 3 chu kỳ (6 ngày) sẽ quay về artist-a
    const after6Days = ROTATION_ANCHOR_TIMESTAMP + 3 * ROTATION_PERIOD_MS;
    const info = getArtistRotationInfo(mockBanners, after6Days);
    expect(info?.cycleNumber).toBe(3);
    expect(info?.activeBannerId).toBe('artist-a');
  });

  it('định dạng thời gian còn lại chính xác', () => {
    // 1 ngày 12 giờ
    const ms1 = (1 * 24 + 12) * 60 * 60 * 1000;
    expect(formatRemainingTime(ms1)).toBe('Còn 1 ngày 12 giờ');

    // 5 giờ 30 phút
    const ms2 = (5 * 60 + 30) * 60 * 1000;
    expect(formatRemainingTime(ms2)).toBe('Còn 5 giờ 30 phút');

    // 45 phút
    const ms3 = 45 * 60 * 1000;
    expect(formatRemainingTime(ms3)).toBe('Còn 45 phút');
  });
});
