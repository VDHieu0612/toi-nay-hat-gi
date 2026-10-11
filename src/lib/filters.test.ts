import { describe, it, expect } from 'vitest';
import {
  matchVoice,
  filterByBanner,
  filterByUser,
  getFilteredPool,
  getSearchKaraokeUrl,
  getAllGenres,
  countActiveFilters,
} from './filters';
import { Song, Banner, UserFilter } from './types';

const mockSongs: Song[] = [
  {
    id: 'bai-1',
    title: 'Bài Ca Hy Vọng',
    artist: 'Trần Tiến',
    year: 1995,
    genre: ['ballad'],
    voice: 'nam',
    difficulty: 2,
    rarity: 3,
    tags: ['hoai-niem'],
  },
  {
    id: 'bai-2',
    title: 'Giấc Mơ Có Thật',
    artist: 'Lệ Quyên',
    year: 2004,
    genre: ['ballad', 'vpop'],
    voice: 'nu',
    difficulty: 3,
    rarity: 4,
    tags: ['sau-lang'],
  },
  {
    id: 'bai-3',
    title: 'Cơn Mưa Tình Yêu',
    artist: 'Hà Anh Tuấn & Phương Linh',
    year: 2007,
    genre: ['ballad', 'pop'],
    voice: 'song-ca',
    difficulty: 3,
    rarity: 4,
    tags: ['lang-man'],
  },
  {
    id: 'bai-4',
    title: 'Tâm Hồn Của Đá',
    artist: 'Bức Tường',
    year: 2002,
    genre: ['rock'],
    voice: 'tat-ca',
    difficulty: 4,
    rarity: 5,
    tags: ['soi-dong'],
  },
  {
    id: 'bai-5',
    title: 'Duyên Phận',
    artist: 'Như Quỳnh',
    year: 2011,
    genre: ['bolero'],
    voice: 'nu',
    difficulty: 2,
    rarity: 3,
    tags: ['de-hat'],
  },
  {
    id: 'bai-6',
    title: 'Chạy Ngay Đi',
    artist: 'Sơn Tùng M-TP',
    year: 2018,
    genre: ['rap', 'vpop'],
    voice: 'nam',
    difficulty: 4,
    rarity: 4,
    tags: ['soi-dong'],
  },
  {
    id: 'bai-7',
    title: 'Cắt Đôi Nỗi Sầu',
    artist: 'Tăng Duy Tân',
    year: 2023,
    genre: ['vpop', 'pop'],
    voice: 'nam',
    difficulty: 1,
    rarity: 3,
    tags: ['de-hat'],
  },
];

const mockBannerAll: Banner = {
  id: 'banner-tong-hop',
  name: 'Tổng hợp',
  description: 'Mọi bài hát',
  featured: [],
  theme: '#6366f1',
};

const mockBannerBallad: Banner = {
  id: 'banner-ballad',
  name: 'Đêm Ballad',
  description: 'Chỉ các bài ballad',
  filter: {
    genre: ['ballad'],
  },
  featured: [],
  theme: '#3b82f6',
};

describe('M4: Bộ lọc bài hát (filters.ts)', () => {
  describe('1. matchVoice', () => {
    it('khớp chính xác giọng nam, nữ, song ca', () => {
      expect(matchVoice('nam', 'nam')).toBe(true);
      expect(matchVoice('nam', 'nu')).toBe(false);
      expect(matchVoice('nu', 'nu')).toBe(true);
      expect(matchVoice('song-ca', 'song-ca')).toBe(true);
    });

    it('giọng bài hát là "tat-ca" luôn khớp với mọi lựa chọn của người dùng', () => {
      expect(matchVoice('tat-ca', 'nam')).toBe(true);
      expect(matchVoice('tat-ca', 'nu')).toBe(true);
      expect(matchVoice('tat-ca', 'song-ca')).toBe(true);
    });

    it('bộ lọc chọn "tat-ca" hoặc undefined luôn khớp với mọi bài', () => {
      expect(matchVoice('nam', 'tat-ca')).toBe(true);
      expect(matchVoice('nu', undefined)).toBe(true);
      expect(matchVoice('song-ca', 'tat-ca')).toBe(true);
    });
  });

  describe('2. filterByUser', () => {
    it('lọc chính xác theo giọng hát', () => {
      const nuOnly = filterByUser(mockSongs, { voice: 'nu' });
      expect(nuOnly.map((s) => s.id)).toEqual(['bai-2', 'bai-4', 'bai-5']); // bai-4 có voice tat-ca
    });

    it('lọc chính xác theo thể loại (chọn nhiều)', () => {
      const rockOrBolero = filterByUser(mockSongs, { genres: ['rock', 'bolero'] });
      expect(rockOrBolero.map((s) => s.id)).toEqual(['bai-4', 'bai-5']);
    });

    it('lọc chính xác theo thập niên (decade)', () => {
      const decade90s = filterByUser(mockSongs, { decade: '1990s' });
      expect(decade90s.map((s) => s.id)).toEqual(['bai-1']);

      const decade2000s = filterByUser(mockSongs, { decade: '2000s' });
      expect(decade2000s.map((s) => s.id)).toEqual(['bai-2', 'bai-3', 'bai-4']);

      const decade2020s = filterByUser(mockSongs, { decade: '2020s' });
      expect(decade2020s.map((s) => s.id)).toEqual(['bai-7']);
    });

    it('lọc chính xác theo độ khó tối đa', () => {
      const easyOnly = filterByUser(mockSongs, { maxDifficulty: 2 });
      expect(easyOnly.map((s) => s.id)).toEqual(['bai-1', 'bai-5', 'bai-7']);
    });

    it('kết hợp nhiều bộ lọc cùng lúc: giọng nam + độ khó <= 2', () => {
      const combined = filterByUser(mockSongs, { voice: 'nam', maxDifficulty: 2 });
      expect(combined.map((s) => s.id)).toEqual(['bai-1', 'bai-7']);
    });

    it('trả về rỗng khi không có bài nào thỏa mãn bộ lọc', () => {
      const empty = filterByUser(mockSongs, { voice: 'song-ca', genres: ['bolero'] });
      expect(empty).toHaveLength(0);
    });
  });

  describe('3. getFilteredPool và filterByBanner', () => {
    it('lọc banner không có filter thì giữ nguyên toàn bộ bài hát', () => {
      const result = filterByBanner(mockSongs, mockBannerAll);
      expect(result.length).toBe(mockSongs.length);
    });

    it('áp dụng cả filter cố định của banner và filter của user', () => {
      // Banner chỉ nhận ballad (bai-1, bai-2, bai-3)
      // User chọn thêm: thập niên 2000s (bai-2, bai-3)
      const result = getFilteredPool(mockSongs, mockBannerBallad, { decade: '2000s' });
      expect(result.map((s) => s.id)).toEqual(['bai-2', 'bai-3']);
    });
  });

  describe('4. getSearchKaraokeUrl (Nút Tìm karaoke YouTube)', () => {
    it('sinh đúng URL tìm kiếm YouTube kèm từ khóa karaoke', () => {
      const url = getSearchKaraokeUrl('Cắt Đôi Nỗi Sầu', 'Tăng Duy Tân');
      expect(url).toContain('https://www.youtube.com/results?search_query=');
      // Đảm bảo encodeURIComponent xử lý chuẩn tiếng Việt có dấu
      const expectedQuery = encodeURIComponent('Cắt Đôi Nỗi Sầu Tăng Duy Tân karaoke');
      expect(url).toBe(`https://www.youtube.com/results?search_query=${expectedQuery}`);
    });

    it('xử lý ký tự đặc biệt và dấu ngoặc đúng chuẩn URL', () => {
      const url = getSearchKaraokeUrl('Bài Hát (Remix)', 'Hà Anh Tuấn & Phương Linh');
      expect(url).toContain(encodeURIComponent('Bài Hát (Remix) Hà Anh Tuấn & Phương Linh karaoke'));
    });
  });

  describe('5. Tiện ích bổ trợ (getAllGenres, countActiveFilters)', () => {
    it('lấy đầy đủ danh sách thể loại không trùng lặp', () => {
      const genres = getAllGenres(mockSongs);
      expect(genres).toContain('ballad');
      expect(genres).toContain('rock');
      expect(genres).toContain('bolero');
      expect(genres).toContain('rap');
      expect(genres).toContain('vpop');
    });

    it('đếm chính xác số lượng bộ lọc đang hoạt động', () => {
      expect(countActiveFilters(undefined)).toBe(0);
      expect(countActiveFilters({})).toBe(0);
      expect(countActiveFilters({ voice: 'tat-ca' })).toBe(0);

      const f1: UserFilter = { voice: 'nam', genres: ['ballad'] };
      expect(countActiveFilters(f1)).toBe(2);

      const f2: UserFilter = { voice: 'nu', genres: ['vpop'], decade: '2010s', maxDifficulty: 3 };
      expect(countActiveFilters(f2)).toBe(4);
    });
  });
});
