import { Song, Banner, Rarity } from './types';
import { CONFIG } from './gacha';

export interface SongRateInfo {
  song: Song;
  rarity: Rarity;
  isFeatured: boolean;
  baseProbability: number;
  percentageFormatted: string;
}

/**
 * Tính toán tỉ lệ rơi chính xác (%) của từng bài hát trong pool tương ứng với banner.
 * - Banner ca sĩ: Chỉ tính và trả về danh sách các bài hát thuộc ca sĩ đó.
 * - Banner tổng hợp: Trả về đầy đủ tất cả các bài hát trong sheet.
 */
export function calculateSongDropRates(pool: Song[], banner: Banner): SongRateInfo[] {
  if (!pool || pool.length === 0) return [];

  const featuredSet = new Set(banner.featured || []);

  const pool5 = pool.filter((s) => s.rarity === 5);
  const pool4 = pool.filter((s) => s.rarity === 4);
  const pool3 = pool.filter((s) => s.rarity === 3);

  let rate5Total = CONFIG.rates[5];
  let rate4Total = CONFIG.rates[4];
  let rate3Total = CONFIG.rates[3];

  if (pool5.length === 0) {
    if (pool4.length > 0) rate4Total += rate5Total;
    else rate3Total += rate5Total;
    rate5Total = 0;
  }
  if (pool4.length === 0) {
    if (pool3.length > 0) rate3Total += rate4Total;
    else rate5Total += rate4Total;
    rate4Total = 0;
  }

  const result: SongRateInfo[] = [];

  // 1. Phân bổ 5 sao
  if (pool5.length > 0) {
    const feat5 = pool5.filter((s) => featuredSet.has(s.id));
    const nonFeat5 = pool5.filter((s) => !featuredSet.has(s.id));

    if (feat5.length > 0 && nonFeat5.length > 0) {
      const featRateEach = (rate5Total * CONFIG.featuredRate) / feat5.length;
      const nonFeatRateEach = (rate5Total * (1 - CONFIG.featuredRate)) / nonFeat5.length;

      for (const song of feat5) {
        result.push({
          song,
          rarity: 5,
          isFeatured: true,
          baseProbability: featRateEach,
          percentageFormatted: `${(featRateEach * 100).toFixed(2)}%`,
        });
      }
      for (const song of nonFeat5) {
        result.push({
          song,
          rarity: 5,
          isFeatured: false,
          baseProbability: nonFeatRateEach,
          percentageFormatted: `${(nonFeatRateEach * 100).toFixed(2)}%`,
        });
      }
    } else {
      const rateEach = rate5Total / pool5.length;
      for (const song of pool5) {
        result.push({
          song,
          rarity: 5,
          isFeatured: featuredSet.has(song.id),
          baseProbability: rateEach,
          percentageFormatted: `${(rateEach * 100).toFixed(2)}%`,
        });
      }
    }
  }

  // 2. Phân bổ 4 sao
  if (pool4.length > 0) {
    const feat4 = pool4.filter((s) => featuredSet.has(s.id));
    const nonFeat4 = pool4.filter((s) => !featuredSet.has(s.id));

    if (feat4.length > 0 && nonFeat4.length > 0) {
      const featRateEach = (rate4Total * CONFIG.featuredRate) / feat4.length;
      const nonFeatRateEach = (rate4Total * (1 - CONFIG.featuredRate)) / nonFeat4.length;

      for (const song of feat4) {
        result.push({
          song,
          rarity: 4,
          isFeatured: true,
          baseProbability: featRateEach,
          percentageFormatted: `${(featRateEach * 100).toFixed(2)}%`,
        });
      }
      for (const song of nonFeat4) {
        result.push({
          song,
          rarity: 4,
          isFeatured: false,
          baseProbability: nonFeatRateEach,
          percentageFormatted: `${(nonFeatRateEach * 100).toFixed(2)}%`,
        });
      }
    } else {
      const rateEach = rate4Total / pool4.length;
      for (const song of pool4) {
        result.push({
          song,
          rarity: 4,
          isFeatured: featuredSet.has(song.id),
          baseProbability: rateEach,
          percentageFormatted: `${(rateEach * 100).toFixed(2)}%`,
        });
      }
    }
  }

  // 3. Phân bổ 3 sao
  if (pool3.length > 0) {
    const rateEach = rate3Total / pool3.length;
    for (const song of pool3) {
      result.push({
        song,
        rarity: 3,
        isFeatured: false,
        baseProbability: rateEach,
        percentageFormatted: `${(rateEach * 100).toFixed(2)}%`,
      });
    }
  }

  // Sắp xếp: 5 sao -> 4 sao -> 3 sao, featured trước, sau đó theo tên tiếng Việt
  result.sort((a, b) => {
    if (b.rarity !== a.rarity) return b.rarity - a.rarity;
    if (b.isFeatured !== a.isFeatured) return Number(b.isFeatured) - Number(a.isFeatured);
    if (b.baseProbability !== a.baseProbability) return b.baseProbability - a.baseProbability;
    return a.song.title.localeCompare(b.song.title, 'vi');
  });

  return result;
}
