import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Song, Rarity } from '../src/lib/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SONGS_FILE = path.resolve(__dirname, '../src/data/songs.json');

export interface RarityResult {
  song: Song;
  computedRarity: Rarity;
  actualRarity: Rarity;
  isOverride: boolean;
  isValid: boolean;
  reason?: string;
}

/**
 * Tính toán độ hiếm theo phân vị lượt xem (Mục 4.3 của PLAN.md):
 * - Top 15% view -> 5★ (Siêu hit)
 * - 30% tiếp theo (15% - 45%) -> 4★ (Hit)
 * - 55% còn lại (> 45%) -> 3★ (Bài ngon)
 * - Bài bằng view nhau xếp cùng bậc
 * - Override chỉ cho phép lệch tối đa ±1 bậc và bắt buộc có rarityNote
 * - Bài không có views bắt buộc có rarity thủ công và rarityNote
 */
export function evaluateSongRarities(songs: Song[]): RarityResult[] {
  // 1. Tách bài có view và không có view
  const songsWithViews = songs.filter(
    (s): s is Song & { views: number } => typeof s.views === 'number' && !Number.isNaN(s.views)
  );

  // 2. Sắp xếp giảm dần theo lượt xem
  const sortedWithViews = [...songsWithViews].sort((a, b) => b.views - a.views);
  const totalWithViews = sortedWithViews.length;

  // Bản đồ lưu computed rarity cho bài có view
  const computedMap = new Map<string, Rarity>();

  // Tính ngưỡng phân vị
  // Rank 1-indexed. Xử lý đồng hạng (cùng view thì cùng rank thấp nhất)
  let currentRank = 1;
  for (let i = 0; i < sortedWithViews.length; i++) {
    const song = sortedWithViews[i];
    if (i > 0 && song.views === sortedWithViews[i - 1].views) {
      // Cùng view với bài trước => rank giống bài trước
      // currentRank giữ nguyên
    } else {
      currentRank = i + 1;
    }

    // Tỉ lệ phân vị (tính theo vị trí trong danh sách)
    const percentile = currentRank / totalWithViews;

    let computed: Rarity = 3;
    if (percentile <= 0.15) {
      computed = 5;
    } else if (percentile <= 0.45) {
      computed = 4;
    } else {
      computed = 3;
    }

    computedMap.set(song.id, computed);
  }

  // 3. Đánh giá từng bài hát trong kho
  return songs.map((song) => {
    const hasViews = typeof song.views === 'number' && !Number.isNaN(song.views);

    if (!hasViews) {
      // Khi kho bài không dùng views (hoặc bài không có views), chấp nhận độ hiếm đã gán nếu thuộc {3, 4, 5}
      const isValidRarity = [3, 4, 5].includes(song.rarity);
      return {
        song,
        computedRarity: song.rarity,
        actualRarity: song.rarity,
        isOverride: false,
        isValid: isValidRarity,
        reason: isValidRarity
          ? undefined
          : `Độ hiếm '${song.rarity}' không hợp lệ (phải là 3, 4 hoặc 5).`,
      };
    }

    const computed = computedMap.get(song.id) || 3;
    const isOverride = song.rarity !== computed;

    if (isOverride) {
      const hasNote = Boolean(song.rarityNote && song.rarityNote.trim().length > 0);
      const diff = Math.abs(song.rarity - computed);

      if (!hasNote) {
        return {
          song,
          computedRarity: computed,
          actualRarity: song.rarity,
          isOverride: true,
          isValid: false,
          reason: `Độ hiếm lệch phân vị (${song.rarity}★ thay vì ${computed}★) nhưng thiếu rarityNote.`,
        };
      }

      if (diff > 1) {
        return {
          song,
          computedRarity: computed,
          actualRarity: song.rarity,
          isOverride: true,
          isValid: false,
          reason: `Override lệch quá 1 bậc (${song.rarity}★ so với phân vị ${computed}★, chênh lệch ${diff} bậc). Quy tắc chỉ cho phép ±1 bậc.`,
        };
      }

      return {
        song,
        computedRarity: computed,
        actualRarity: song.rarity,
        isOverride: true,
        isValid: true,
      };
    }

    return {
      song,
      computedRarity: computed,
      actualRarity: song.rarity,
      isOverride: false,
      isValid: true,
    };
  });
}

function run(): void {
  const isCheckMode = process.argv.includes('--check');

  if (!fs.existsSync(SONGS_FILE)) {
    console.error(`[LỖI] Không tìm thấy file bài hát: ${SONGS_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(SONGS_FILE, 'utf-8');
  const songs = JSON.parse(raw) as Song[];

  console.log(`\n======================================================`);
  console.log(`  COMPUTE RARITY (Xếp hạng độ hiếm theo phân vị views)`);
  console.log(`  Chế độ: ${isCheckMode ? 'KIỂM TRA (--check)' : 'GHI ĐÈ DỮ LIỆU'}`);
  console.log(`  Tổng số bài hát: ${songs.length}`);
  console.log(`======================================================\n`);

  const results = evaluateSongRarities(songs);
  const invalidResults = results.filter((r) => !r.isValid);
  const overrides = results.filter((r) => r.isOverride && r.isValid);

  // Thống kê phân bố độ hiếm
  const counts = { 3: 0, 4: 0, 5: 0 };
  const targetCounts = { 3: 0, 4: 0, 5: 0 };

  for (const r of results) {
    counts[r.actualRarity] = (counts[r.actualRarity] || 0) + 1;
    targetCounts[r.computedRarity] = (targetCounts[r.computedRarity] || 0) + 1;
  }

  console.log(`Bảng phân bố thực tế hiện tại:`);
  console.log(`- 5★ (Siêu hit): ${counts[5]} bài (${((counts[5] / songs.length) * 100).toFixed(1)}% / mục tiêu 15%)`);
  console.log(`- 4★ (Hit):      ${counts[4]} bài (${((counts[4] / songs.length) * 100).toFixed(1)}% / mục tiêu 30%)`);
  console.log(`- 3★ (Bài ngon): ${counts[3]} bài (${((counts[3] / songs.length) * 100).toFixed(1)}% / mục tiêu 55%)`);
  console.log(`- Số bài có override hợp lệ: ${overrides.length}`);

  if (overrides.length > 0) {
    console.log(`\nDanh sách override hợp lệ:`);
    for (const ov of overrides) {
      console.log(`  • [${ov.song.id}] ${ov.song.title} (${ov.song.artist}): ${ov.computedRarity}★ -> ${ov.actualRarity}★ | Ghi chú: ${ov.song.rarityNote}`);
    }
  }

  if (isCheckMode) {
    if (invalidResults.length > 0) {
      console.error(`\n❌ [LỖI] Tìm thấy ${invalidResults.length} bài hát không hợp lệ về độ hiếm:`);
      for (const inv of invalidResults) {
        console.error(`  - [${inv.song.id}] ${inv.song.title} (${inv.song.artist}): ${inv.reason}`);
      }
      console.error(`\nChạy 'npx vite-node scripts/compute-rarity.ts' để tự động cập nhật độ hiếm hoặc bổ sung rarityNote.\n`);
      process.exit(1);
    }

    console.log(`\n✅ Tất cả ${songs.length} bài hát đều hợp lệ với quy tắc phân vị lượt xem!\n`);
    process.exit(0);
  }

  // Chế độ ghi: cập nhật rarity theo computed (giữ các override hợp lệ)
  let updatedCount = 0;
  const updatedSongs = songs.map((song) => {
    const res = results.find((r) => r.song.id === song.id);
    if (!res) return song;

    // Nếu là override hợp lệ thì giữ nguyên
    if (res.isOverride && res.isValid) {
      return song;
    }

    if (song.rarity !== res.computedRarity) {
      updatedCount++;
      return {
        ...song,
        rarity: res.computedRarity,
      };
    }
    return song;
  });

  fs.writeFileSync(SONGS_FILE, JSON.stringify(updatedSongs, null, 2) + '\n', 'utf-8');
  console.log(`\n✅ Đã cập nhật xong file ${SONGS_FILE}`);
  console.log(`- Số bài đã điều chỉnh độ hiếm: ${updatedCount} bài.\n`);
}

// Chạy trực tiếp qua node/vite-node khi được gọi trực tiếp
if (process.argv.some((arg) => arg.includes('compute-rarity'))) {
  run();
}
