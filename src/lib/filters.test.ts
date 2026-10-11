import { describe, it, expect } from 'vitest';
import {
  matchVoice,
  filterByBanner,
  filterByUser,
  getFilteredPool,
  getSearchKaraokeUrl,
  getAllGenres,
  countActiveFilters,
  ALL_GENRES,
} from './filters';
import { Song, Banner, UserFilter } from './types';

const mockSongs: Song[] = [
  {
    id: 'bai-1',
    title: 'Bài Ca Hy Vọng',
    artist: 'Trần Tiến',
    artistId: 'tran-tien',
    year: 1995,
    genre: ['ballad'],
    voice: 'nam',
    views: 25,
    viewsAsOf: '2026-10',
    difficulty: 2,
    rarity: 3,
    tags: ['hoai-niem'],
  },
  {
    id: 'bai-2',
    title: 'Giấc Mơ Có Thật',
    artist: 'Lệ Quyên',
    artistId: 'le-quyen',
    year: 2004,
    genre: ['ballad', 'pop'],
    voice: 'nu',
    views: 60,
    viewsAsOf: '2026-10',
    difficulty: 3,
    rarity: 4,
    tags: ['sau-lang'],
  },
  {
    id: 'bai-3',
    title: 'Cơn Mưa Tình Yêu',
    artist: 'Hà Anh Tuấn & Phương Linh',
    artistId: 'ha-anh-tuan',
    year: 2007,
    genre: ['ballad', 'pop'],
    voice: 'song-ca',
    views: 70,
    viewsAsOf: '2026-10',
    difficulty: 3,
    rarity: 4,
    tags: ['lang-man'],
  },
  {
    id: 'bai-4',
    title: 'Tâm Hồn Của Đá',
    artist: 'Bức Tường',
    artistId: 'buc-tuong',
    year: 2002,
    genre: ['rock'],
    voice: 'tat-ca',
    views: 120,
    viewsAsOf: '2026-10',
    difficulty: 4,
    rarity: 5,
    tags: ['soi-dong'],
  },
  {
    id: 'bai-5',
    title: 'Duyên Phận',
    artist: 'Như Quỳnh',
    artistId: 'nhu-quynh',
    year: 2011,
    genre: ['bolero'],
    voice: 'nu',
    views: 18,
    viewsAsOf: '2026-10',
    difficulty: 2,
    rarity: 3,
    tags: ['de-hat'],
  },
  {
    id: 'bai-6',
    title: 'Chạy Ngay Đi',
    artist: 'Sơn Tùng M-TP',
    artistId: 'son-tung',
    year: 2018,
    genre: ['rap', 'pop'],
    voice: 'nam',
    views: 80,
    viewsAsOf: '2026-10',
    difficulty: 4,
    rarity: 4,
    tags: ['soi-dong'],
  },
  {
    id: 'bai-7',
    title: 'Cắt Đôi Nỗi Sầu',
    artist: 'Tăng Duy Tân',
    artistId: 'tang-duy-tan',
    year: 2023,
    genre: ['pop'],
    voice: 'nam',
    views: 30,
    viewsAsOf: '2026-10',
    difficulty: 1,
    rarity: 3,
    tags: ['de-hat'],
  },
];

const mockBannerAll: Banner = {
  id: 'banner-tong-hop',
  type: 'general',
  name: 'Tổng hợp',
  description: 'Mọi bài hát',
  featured: [],
  theme: '#6366f1',
};

const mockBannerBallad: Banner = {
  id: 'banner-ballad',
  type: 'genre',
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

  describe('2. filterByUser (M4: giọng & thể loại)', () => {
    it('lọc chính xác theo giọng hát', () => {
      const nuOnly = filterByUser(mockSongs, { voice: 'nu' });
      expect(nuOnly.map((s) => s.id)).toEqual(['bai-2', 'bai-4', 'bai-5']); // bai-4 có voice tat-ca
    });

    it('lọc chính xác theo thể loại (chọn nhiều trong 5 nhóm)', () => {
      const rockOrBolero = filterByUser(mockSongs, { genres: ['rock', 'bolero'] });
      expect(rockOrBolero.map((s) => s.id)).toEqual(['bai-4', 'bai-5']);
    });

    it('kết hợp lọc giọng nam + thể loại pop', () => {
      const combined = filterByUser(mockSongs, { voice: 'nam', genres: ['pop'] });
      // bai-4 (tat-ca) có genre rock nên không lọt vào pop
      // bai-6 (nam, rap/pop) và bai-7 (nam, pop)
      expect(combined.map((s) => s.id)).toEqual(['bai-6', 'bai-7']);
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
      // User chọn thêm: giọng nu (bai-2)
      const result = getFilteredPool(mockSongs, mockBannerBallad, { voice: 'nu' });
      expect(result.map((s) => s.id)).toEqual(['bai-2']);
    });

    it('hỗ trợ banner ca sĩ với artistId', () => {
      const artistBanner: Banner = {
        id: 'banner-son-tung',
        type: 'artist',
        artistId: 'son-tung',
        name: 'Sơn Tùng M-TP',
        description: 'Các ca khúc của Sơn Tùng',
        featured: ['bai-6'],
        theme: '#8b5cf6',
      };
      const result = filterByBanner(mockSongs, artistBanner);
      expect(result.map((s) => s.id)).toEqual(['bai-6']);
    });
  });

  describe('4. getSearchKaraokeUrl (Nút Tìm karaoke YouTube)', () => {
    it('sinh đúng URL tìm kiếm YouTube kèm từ khóa karaoke', () => {
      const url = getSearchKaraokeUrl('Cắt Đôi Nỗi Sầu', 'Tăng Duy Tân');
      expect(url).toContain('https://www.youtube.com/results?search_query=');
      const expectedQuery = encodeURIComponent('Cắt Đôi Nỗi Sầu Tăng Duy Tân karaoke');
      expect(url).toBe(`https://www.youtube.com/results?search_query=${expectedQuery}`);
    });

    it('xử lý ký tự đặc biệt và dấu ngoặc đúng chuẩn URL', () => {
      const url = getSearchKaraokeUrl('Bài Hát (Remix)', 'Hà Anh Tuấn & Phương Linh');
      expect(url).toContain(encodeURIComponent('Bài Hát (Remix) Hà Anh Tuấn & Phương Linh karaoke'));
    });
  });

  describe('5. Tiện ích bổ trợ (getAllGenres, countActiveFilters)', () => {
    it('getAllGenres trả về các thể loại chuẩn thuộc 5 nhóm', () => {
      expect(ALL_GENRES).toEqual(['ballad', 'pop', 'rap', 'bolero', 'rock']);
      const genres = getAllGenres(mockSongs);
      expect(genres).toContain('ballad');
      expect(genres).toContain('pop');
      expect(genres).toContain('rap');
      expect(genres).toContain('bolero');
      expect(genres).toContain('rock');
      expect(genres).not.toContain('song-ca');
      expect(genres).not.toContain('vpop');
    });

    it('đếm chính xác số lượng bộ lọc đang hoạt động (chỉ giọng & thể loại)', () => {
      expect(countActiveFilters(undefined)).toBe(0);
      expect(countActiveFilters({})).toBe(0);
      expect(countActiveFilters({ voice: 'tat-ca' })).toBe(0);

      const f1: UserFilter = { voice: 'nam', genres: ['ballad'] };
      expect(countActiveFilters(f1)).toBe(2);

      const f2: UserFilter = { voice: 'nu' };
      expect(countActiveFilters(f2)).toBe(1);
    });
  });
});
