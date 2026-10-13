import { describe, it, expect } from 'vitest';
import { calculateSongDropRates } from './dropRates';
import { Song, Banner } from './types';

describe('dropRates.ts (Tính toán tỉ lệ rơi của bài hát)', () => {
  const mockSongs: Song[] = [
    {
      id: 'song-5-1',
      title: 'Bài 5 Sao 1',
      artist: 'Ca Sĩ A',
      artistId: 'ca-si-a',
      genre: ['pop'],
      voice: 'nam',
      rarity: 5,
      tags: [],
    },
    {
      id: 'song-5-2',
      title: 'Bài 5 Sao 2',
      artist: 'Ca Sĩ A',
      artistId: 'ca-si-a',
      genre: ['pop'],
      voice: 'nam',
      rarity: 5,
      tags: [],
    },
    {
      id: 'song-4-1',
      title: 'Bài 4 Sao 1',
      artist: 'Ca Sĩ A',
      artistId: 'ca-si-a',
      genre: ['ballad'],
      voice: 'nam',
      rarity: 4,
      tags: [],
    },
    {
      id: 'song-4-2',
      title: 'Bài 4 Sao 2',
      artist: 'Ca Sĩ A',
      artistId: 'ca-si-a',
      genre: ['ballad'],
      voice: 'nam',
      rarity: 4,
      tags: [],
    },
    {
      id: 'song-3-1',
      title: 'Bài 3 Sao 1',
      artist: 'Ca Sĩ A',
      artistId: 'ca-si-a',
      genre: ['pop'],
      voice: 'nam',
      rarity: 3,
      tags: [],
    },
    {
      id: 'song-3-2',
      title: 'Bài 3 Sao 2',
      artist: 'Ca Sĩ A',
      artistId: 'ca-si-a',
      genre: ['pop'],
      voice: 'nam',
      rarity: 3,
      tags: [],
    },
  ];

  const mockBanner: Banner = {
    id: 'spotlight-ca-si-a',
    type: 'artist',
    artistId: 'ca-si-a',
    name: 'Ca Sĩ A',
    description: 'Mô tả',
    featured: ['song-5-1', 'song-4-1'],
    theme: '#6366f1',
  };

  it('tổng tỉ lệ các bài hát cộng lại bằng xấp xỉ 100%', () => {
    const list = calculateSongDropRates(mockSongs, mockBanner);
    expect(list.length).toBe(6);

    const totalProbability = list.reduce((sum, item) => sum + item.baseProbability, 0);
    expect(totalProbability).toBeCloseTo(1.0, 4);
  });

  it('bài hát rate-up featured có tỉ lệ cao hơn bài cùng bậc không featured', () => {
    const list = calculateSongDropRates(mockSongs, mockBanner);
    const item5Featured = list.find((i) => i.song.id === 'song-5-1');
    const item5NonFeat = list.find((i) => i.song.id === 'song-5-2');

    expect(item5Featured?.isFeatured).toBe(true);
    expect(item5NonFeat?.isFeatured).toBe(false);
    expect(item5Featured?.baseProbability).toBe(0.03 * 0.5); // 1.5%
    expect(item5NonFeat?.baseProbability).toBe(0.03 * 0.5); // 1.5%

    // 4 sao
    const item4Featured = list.find((i) => i.song.id === 'song-4-1');
    const item4NonFeat = list.find((i) => i.song.id === 'song-4-2');

    expect(item4Featured?.baseProbability).toBe(0.15 * 0.5); // 7.5%
    expect(item4NonFeat?.baseProbability).toBe(0.15 * 0.5); // 7.5%
  });

  it('trả về danh sách rỗng nếu pool rỗng', () => {
    const list = calculateSongDropRates([], mockBanner);
    expect(list).toEqual([]);
  });
});
