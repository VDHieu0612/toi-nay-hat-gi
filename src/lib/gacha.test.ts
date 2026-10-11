import { describe, it, expect } from 'vitest';
import { pull, pullTen, resolveAvailableRarity } from './gacha';
import { filterByUser, getFilteredPool } from './filters';
import { Song, Banner, PullState } from './types';
import songsData from '../data/songs.json';
import bannersData from '../data/banners.json';

const songs = songsData as Song[];
const banners = bannersData as Banner[];
const generalBanner = banners.find((b) => b.id === 'tong-hop')!;
const rateUpBanner = banners.find((b) => b.id === 'thu-rate-up')!;

describe('Gacha Logic - Single Pull (pull)', () => {
  it('rút 1 trả về đúng 1 bài và state mới không mutate state cũ', () => {
    const initialState: PullState = { pullsSinceFiveStar: 5, pullsSinceFourStar: 2 };
    const result = pull(songs, generalBanner, initialState);

    expect(result.songs).toHaveLength(1);
    expect(result.songs[0]).toBeDefined();
    // State cũ không bị sửa đổi
    expect(initialState.pullsSinceFiveStar).toBe(5);
    expect(initialState.pullsSinceFourStar).toBe(2);
  });

  it('khi ra 5★ thì bộ đếm pullsSinceFiveStar được reset về 0', () => {
    // Giả lập RNG trả về 0.01 (< 0.03 -> ra 5★)
    const fixedRng = () => 0.01;
    const state: PullState = { pullsSinceFiveStar: 20, pullsSinceFourStar: 5 };
    const result = pull(songs, generalBanner, state, fixedRng);

    expect(result.songs[0].rarity).toBe(5);
    expect(result.state.pullsSinceFiveStar).toBe(0);
    expect(result.state.pullsSinceFourStar).toBe(0);
  });

  it('khi ra 3★ thì cả 2 bộ đếm đều tăng thêm 1', () => {
    // Giả lập RNG trả về 0.50 (> 0.18 -> ra 3★)
    const fixedRng = () => 0.5;
    const state: PullState = { pullsSinceFiveStar: 10, pullsSinceFourStar: 3 };
    const result = pull(songs, generalBanner, state, fixedRng);

    expect(result.songs[0].rarity).toBe(3);
    expect(result.state.pullsSinceFiveStar).toBe(11);
    expect(result.state.pullsSinceFourStar).toBe(4);
  });

  it('kích hoạt pity 5★ đúng ở lần rút thứ 40 (pullsSinceFiveStar + 1 >= 40)', () => {
    // Ngay cả khi RNG trả về 0.99 (bình thường là 3★)
    const badLuckRng = () => 0.99;
    const stateAt39: PullState = { pullsSinceFiveStar: 39, pullsSinceFourStar: 5 };
    const result = pull(songs, generalBanner, stateAt39, badLuckRng);

    expect(result.songs[0].rarity).toBe(5);
    expect(result.state.pullsSinceFiveStar).toBe(0);
  });

  it('không bao giờ có chuỗi hơn 40 lần liên tiếp không ra 5★', () => {
    let state: PullState = { pullsSinceFiveStar: 0, pullsSinceFourStar: 0 };
    let streakWithout5 = 0;
    let maxStreak = 0;

    for (let i = 0; i < 5000; i++) {
      const result = pull(songs, generalBanner, state);
      state = result.state;
      if (result.songs[0].rarity === 5) {
        if (streakWithout5 > maxStreak) {
          maxStreak = streakWithout5;
        }
        streakWithout5 = 0;
      } else {
        streakWithout5++;
      }
    }

    expect(maxStreak).toBeLessThan(40);
  });
});

describe('Gacha Logic - Ten Pull (pullTen)', () => {
  it('rút 10 trả về đúng 10 bài hát', () => {
    const initialState: PullState = { pullsSinceFiveStar: 0, pullsSinceFourStar: 0 };
    const result = pullTen(songs, generalBanner, initialState);

    expect(result.songs).toHaveLength(10);
  });

  it('mọi lần rút 10 đều có ít nhất một bài >= 4★', () => {
    // Chạy 500 lần rút 10 để kiểm tra
    let state: PullState = { pullsSinceFiveStar: 0, pullsSinceFourStar: 0 };

    for (let i = 0; i < 500; i++) {
      const result = pullTen(songs, generalBanner, state);
      state = result.state;
      const hasAtLeast4Star = result.songs.some((s) => s.rarity >= 4);
      expect(hasAtLeast4Star).toBe(true);
    }
  });

  it('nếu 10 lần rút ban đầu đều là 3★, bài thứ 10 được thay thế bằng >= 4★', () => {
    // Cố định RNG luôn trả về 0.95 (chỉ ra 3★ nếu không có bảo hiểm)
    const rollThreeStarRng = () => 0.95;
    const initialState: PullState = { pullsSinceFiveStar: 0, pullsSinceFourStar: 0 };
    const result = pullTen(songs, generalBanner, initialState, rollThreeStarRng);

    expect(result.songs).toHaveLength(10);
    // 9 bài đầu là 3★
    for (let i = 0; i < 9; i++) {
      expect(result.songs[i].rarity).toBe(3);
    }
    // Bài thứ 10 bắt buộc phải được thay bằng >= 4★
    expect(result.songs[9].rarity).toBeGreaterThanOrEqual(4);
  });

  it('không trùng bài trong 10 bài khi pool có từ 10 bài trở lên', () => {
    const initialState: PullState = { pullsSinceFiveStar: 0, pullsSinceFourStar: 0 };
    for (let i = 0; i < 50; i++) {
      const result = pullTen(songs, generalBanner, initialState);
      const ids = result.songs.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    }
  });

  it('cho phép trùng bài khi pool nhỏ hơn 10 bài', () => {
    const smallPool = songs.slice(0, 5); // chỉ 5 bài
    const initialState: PullState = { pullsSinceFiveStar: 0, pullsSinceFourStar: 0 };
    const result = pullTen(smallPool, generalBanner, initialState);

    expect(result.songs).toHaveLength(10);
    const ids = result.songs.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBeLessThanOrEqual(5);
  });
});

describe('Pool Fallback & Error Handling', () => {
  it('ném lỗi rõ ràng Error("Pool rỗng") khi pool rỗng', () => {
    const emptyPool: Song[] = [];
    const state: PullState = { pullsSinceFiveStar: 0, pullsSinceFourStar: 0 };

    expect(() => pull(emptyPool, generalBanner, state)).toThrow('Pool rỗng');
    expect(() => pullTen(emptyPool, generalBanner, state)).toThrow('Pool rỗng');
  });

  it('fallback pool trống: khi pool không có bài 5★, tự rơi xuống 4★ hoặc 3★', () => {
    // Tạo pool chỉ có 4★ và 3★
    const noFiveStarPool = songs.filter((s) => s.rarity !== 5);
    expect(resolveAvailableRarity(noFiveStarPool, 5)).toBe(4);

    // Kích hoạt pity 5★ nhưng pool không có 5★
    const pityState: PullState = { pullsSinceFiveStar: 39, pullsSinceFourStar: 0 };
    const result = pull(noFiveStarPool, generalBanner, pityState);

    expect(result.songs[0].rarity).toBe(4);
  });

  it('fallback pool trống: khi pool chỉ có 3★, rơi xuống 3★', () => {
    const onlyThreeStarPool = songs.filter((s) => s.rarity === 3);
    expect(resolveAvailableRarity(onlyThreeStarPool, 5)).toBe(3);
    expect(resolveAvailableRarity(onlyThreeStarPool, 4)).toBe(3);

    const state: PullState = { pullsSinceFiveStar: 0, pullsSinceFourStar: 0 };
    const result = pull(onlyThreeStarPool, generalBanner, state);
    expect(result.songs[0].rarity).toBe(3);
  });
});

describe('Rate-up cho Featured Banner', () => {
  it('tỉ lệ rơi vào featured đạt xấp xỉ 50% khi ra 4★/5★', () => {
    // Banner "thu-rate-up" có featured: ["bai-thu-21", "bai-thu-28"]
    // bai-thu-21 là 4★, bai-thu-28 là 5★
    let featuredCount = 0;
    let totalHighRarity = 0;
    const NUM_TRIALS = 3000;

    let state: PullState = { pullsSinceFiveStar: 0, pullsSinceFourStar: 0 };

    for (let i = 0; i < NUM_TRIALS; i++) {
      const result = pull(songs, rateUpBanner, state);
      state = result.state;
      const song = result.songs[0];

      if (song.rarity === 4 || song.rarity === 5) {
        totalHighRarity++;
        if (rateUpBanner.featured.includes(song.id)) {
          featuredCount++;
        }
      }
    }

    expect(totalHighRarity).toBeGreaterThan(300);
    const actualFeaturedRate = featuredCount / totalHighRarity;
    // Cho phép dung sai quanh 50% (42% - 58%)
    expect(actualFeaturedRate).toBeGreaterThan(0.42);
    expect(actualFeaturedRate).toBeLessThan(0.58);
  });
});

describe('Filters Logic', () => {
  it('lọc theo voice chính xác', () => {
    const maleOnly = filterByUser(songs, { voice: 'nam' });
    maleOnly.forEach((s) => {
      expect(['nam', 'tat-ca']).toContain(s.voice);
    });

    const femaleOnly = filterByUser(songs, { voice: 'nu' });
    femaleOnly.forEach((s) => {
      expect(['nu', 'tat-ca']).toContain(s.voice);
    });
  });

  it('lọc theo thể loại và độ khó tối đa', () => {
    const filtered = filterByUser(songs, {
      genres: ['ballad'],
      maxDifficulty: 2,
    });

    filtered.forEach((s) => {
      expect(s.genre).toContain('ballad');
      expect(s.difficulty).toBeLessThanOrEqual(2);
    });
  });

  it('kết hợp banner filter và user filter', () => {
    const bannerWithFilter: Banner = {
      id: 'rock-banner',
      name: 'Rock Club',
      description: 'Chỉ các bài Rock',
      featured: [],
      theme: '#000',
      filter: { genre: ['rock'] },
    };

    const pool = getFilteredPool(songs, bannerWithFilter, { maxDifficulty: 3 });
    pool.forEach((s) => {
      expect(s.genre).toContain('rock');
      expect(s.difficulty).toBeLessThanOrEqual(3);
    });
  });
});
