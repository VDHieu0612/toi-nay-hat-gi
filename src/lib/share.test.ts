import { describe, it, expect } from 'vitest';
import { distributeSongs, formatSetlistText } from './share';
import { Song } from './types';

const mockSongs: Song[] = [
  {
    id: 's1',
    title: 'Bài 1',
    artist: 'Ca sĩ 1',
    artistId: 'cs-1',
    year: 2020,
    genre: ['pop'],
    voice: 'nam',
    rarity: 5,
    tags: [],
  },
  {
    id: 's2',
    title: 'Bài 2',
    artist: 'Ca sĩ 2',
    artistId: 'cs-2',
    year: 2021,
    genre: ['ballad'],
    voice: 'nu',
    rarity: 4,
    tags: [],
  },
  {
    id: 's3',
    title: 'Bài 3',
    artist: 'Ca sĩ 3',
    artistId: 'cs-3',
    year: 2022,
    genre: ['rock'],
    voice: 'tat-ca',
    rarity: 3,
    tags: [],
  },
  {
    id: 's4',
    title: 'Bài 4',
    artist: 'Ca sĩ 4',
    artistId: 'cs-4',
    year: 2023,
    genre: ['rap'],
    voice: 'nam',
    rarity: 3,
    tags: [],
  },
];

describe('M5: share.ts (Group distribution & Text formatting)', () => {
  describe('distributeSongs', () => {
    it('chia đều bài hát theo phương pháp xoay vòng (round-robin)', () => {
      const players = ['An', 'Bình'];
      const assignments = distributeSongs(mockSongs, players, 'round-robin');

      expect(assignments).toHaveLength(2);
      expect(assignments[0].name).toBe('An');
      expect(assignments[0].songs.map((s) => s.id)).toEqual(['s1', 's3']);
      expect(assignments[1].name).toBe('Bình');
      expect(assignments[1].songs.map((s) => s.id)).toEqual(['s2', 's4']);
    });

    it('chia bài khi số bài không chia hết cho số người', () => {
      const players = ['An', 'Bình', 'Chi'];
      const assignments = distributeSongs(mockSongs, players, 'round-robin');

      expect(assignments).toHaveLength(3);
      expect(assignments[0].songs).toHaveLength(2); // s1, s4
      expect(assignments[1].songs).toHaveLength(1); // s2
      expect(assignments[2].songs).toHaveLength(1); // s3
    });

    it('chia ngẫu nhiên (random) vẫn đảm bảo đủ tổng số bài', () => {
      const players = ['An', 'Bình'];
      const assignments = distributeSongs(mockSongs, players, 'random');

      expect(assignments).toHaveLength(2);
      const totalAssigned = assignments[0].songs.length + assignments[1].songs.length;
      expect(totalAssigned).toBe(mockSongs.length);
    });

    it('xử lý khi danh sách tên người chơi rỗng', () => {
      const assignments = distributeSongs(mockSongs, []);
      expect(assignments).toHaveLength(1);
      expect(assignments[0].name).toBe('Cả phòng');
      expect(assignments[0].songs).toHaveLength(4);
    });
  });

  describe('formatSetlistText', () => {
    it('định dạng đúng setlist đơn lẻ', () => {
      const text = formatSetlistText({
        bannerName: 'Banner Thử',
        songs: mockSongs,
      });

      expect(text).toContain('SETLIST KARAOKE');
      expect(text).toContain('Banner: Banner Thử');
      expect(text).toContain('Bài 1 - Ca sĩ 1 (★★★★★)');
      expect(text).toContain('Bài 2 - Ca sĩ 2 (★★★★)');
      expect(text).toContain('Bài 3 - Ca sĩ 3 (★★★)');
    });

    it('định dạng đúng setlist chia theo nhóm', () => {
      const assignments = distributeSongs(mockSongs, ['An', 'Bình']);
      const text = formatSetlistText({
        bannerName: 'Banner Thử',
        songs: mockSongs,
        assignments,
      });

      expect(text).toContain('CHẾ ĐỘ NHÓM');
      expect(text).toContain('👤 [1] An (2 bài):');
      expect(text).toContain('👤 [2] Bình (2 bài):');
      expect(text).toContain('Bài 1 - Ca sĩ 1');
    });
  });
});
