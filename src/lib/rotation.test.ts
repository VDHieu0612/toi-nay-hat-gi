import { describe, it, expect } from 'vitest';
import {
  ROTATION_PERIOD_MS,
  ROTATION_ANCHOR_TIMESTAMP,
  getArtistRotationInfo,
  formatRemainingTime,
  formatCountdownClock,
  isArtistBannerActive,
  getRotatedArtistBanners,
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

  it('định dạng đồng hồ đếm ngược (giờ : phút : giây) chính xác', () => {
    // 6 giờ 53 phút 24 giây
    const ms = (6 * 3600 + 53 * 60 + 24) * 1000;
    expect(formatCountdownClock(ms)).toBe('06:53:24');

    // 0 giờ 2 phút 5 giây
    const msShort = (2 * 60 + 5) * 1000;
    expect(formatCountdownClock(msShort)).toBe('00:02:05');

    // 32 giờ 0 phút 0 giây
    const msOver24 = 32 * 3600 * 1000;
    expect(formatCountdownClock(msOver24)).toBe('32:00:00');
  });

  it('getRotatedArtistBanners chỉ trả về tối đa 10 ca sĩ và xoay tua sau 2 ngày', () => {
    // Tạo giả lập 15 ca sĩ
    const fifteenBanners: Banner[] = Array.from({ length: 15 }, (_, i) => ({
      id: `artist-${i + 1}`,
      type: 'artist',
      name: `Ca Sĩ ${i + 1}`,
      description: `Mô tả ${i + 1}`,
      featured: [],
      theme: '#6366f1',
    }));

    // Chu kỳ 0: trả về 10 ca sĩ đầu tiên
    const cycle0 = getRotatedArtistBanners(fifteenBanners, ROTATION_ANCHOR_TIMESTAMP, 10);
    expect(cycle0.length).toBe(10);
    expect(cycle0[0].id).toBe('artist-1');
    expect(cycle0[9].id).toBe('artist-10');

    // Chu kỳ 1 (sau 2 ngày): trượt sang nhóm 10 ca sĩ tiếp theo
    const after2Days = ROTATION_ANCHOR_TIMESTAMP + ROTATION_PERIOD_MS;
    const cycle1 = getRotatedArtistBanners(fifteenBanners, after2Days, 10);
    expect(cycle1.length).toBe(10);
    expect(cycle1[0].id).toBe('artist-11');
    expect(cycle1[4].id).toBe('artist-15');
    expect(cycle1[5].id).toBe('artist-1'); // xoay vòng tròn
  });
});
