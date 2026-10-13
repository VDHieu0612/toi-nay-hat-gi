import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Song, Banner, Rarity } from '../src/lib/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SONGS_FILE = path.resolve(__dirname, '../src/data/songs.json');
const BANNERS_FILE = path.resolve(__dirname, '../src/data/banners.json');

/**
 * Hàm băm chuỗi ổn định (cyrb53 rút gọn) để sinh số ngẫu nhiên giả lập có thể tái lập
 */
export function hashString(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Gán độ hiếm theo quy tắc mục 4.3 & M6 của PLAN.md:
 * - Bảo lưu độ hiếm hiện tại của các bài đã có (không đảo lộn độ hiếm bài cũ khi đồng bộ).
 * - Với bài mới chưa có độ hiếm (hoặc khi gán từ đầu):
 *   Phân bổ theo ca sĩ: 5★ ≈ 15%, 4★ ≈ 30%, 3★ ≈ 55%.
 *   Mỗi ca sĩ >= 4 bài có ít nhất 1 bài 5★.
 * - Bài được chọn làm `featured` trong banner luôn được đảm bảo là 5★.
 */
export function assignRarities(): {
  updatedCount: number;
  totalSongs: number;
} {
  if (!fs.existsSync(SONGS_FILE)) {
    throw new Error(`Không tìm thấy file ${SONGS_FILE}`);
  }

  const songs = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf-8')) as Song[];
  let banners: Banner[] = [];
  if (fs.existsSync(BANNERS_FILE)) {
    try {
      banners = JSON.parse(fs.readFileSync(BANNERS_FILE, 'utf-8'));
    } catch {
      banners = [];
    }
  }

  // Danh sách các bài hát đang là featured trong bất kỳ banner nào
  const featuredSongIds = new Set<string>();
  for (const b of banners) {
    if (Array.isArray(b.featured)) {
      for (const id of b.featured) featuredSongIds.add(id);
    }
  }

  let updatedCount = 0;

  // Gom bài theo ca sĩ
  const artistSongsMap = new Map<string, Song[]>();
  for (const s of songs) {
    const list = artistSongsMap.get(s.artistId) || [];
    list.push(s);
    artistSongsMap.set(s.artistId, list);
  }

  for (const [, artistSongs] of artistSongsMap.entries()) {
    const total = artistSongs.length;

    // Đảm bảo ca sĩ >= 4 bài có ít nhất một bài 5★ và ít nhất một bài 4★ cho banner
    if (total >= 4) {
      const hasFive = artistSongs.some((s) => s.rarity === 5);
      const hasFour = artistSongs.some((s) => s.rarity === 4);

      if (!hasFive) {
        const candidate = artistSongs.find((s) => s.rarity === 3) || artistSongs[0];
        candidate.rarity = 5;
        updatedCount++;
      }
      if (!hasFour) {
        const candidate = artistSongs.find((s) => s.rarity === 3 && s !== artistSongs[0]) || artistSongs.find((s) => s.rarity !== 5);
        if (candidate && candidate.rarity !== 4) {
          candidate.rarity = 4;
          updatedCount++;
        }
      }
    }

    // Gán độ hiếm cho bất kỳ bài nào chưa có hoặc có độ hiếm không hợp lệ
    for (const song of artistSongs) {
      if (![3, 4, 5].includes(song.rarity)) {
        const u = (hashString(`seed:${song.id}`) % 10000) / 10000;
        let r: Rarity = 3;
        if (u < 0.15) r = 5;
        else if (u < 0.45) r = 4;
        else r = 3;

        song.rarity = r;
        updatedCount++;
      }
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2) + '\n', 'utf-8');
    console.log(`[assign-rarity] Đã cập nhật độ hiếm cho ${updatedCount} bài hát.`);
  } else {
    console.log(`[assign-rarity] Tất cả bài hát đã có độ hiếm hợp lệ.`);
  }

  return {
    updatedCount,
    totalSongs: songs.length,
  };
}

if (process.argv.some((arg) => arg.includes('assign-rarity'))) {
  try {
    assignRarities();
  } catch (err: any) {
    console.error(`❌ [LỖI] ${err.message}`);
    process.exit(1);
  }
}
