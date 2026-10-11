import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Song, Artist, Banner, Genre, Voice, Rarity } from '../src/lib/types';
import { evaluateSongRarities } from './compute-rarity';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SONGS_FILE = path.resolve(__dirname, '../src/data/songs.json');
const ARTISTS_FILE = path.resolve(__dirname, '../src/data/artists.json');
const BANNERS_FILE = path.resolve(__dirname, '../src/data/banners.json');

const VALID_GENRES: Genre[] = ['ballad', 'pop', 'rap', 'bolero', 'rock'];
const VALID_VOICES: Voice[] = ['nam', 'nu', 'song-ca', 'tat-ca'];
const KEBAB_CASE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface ValidationIssue {
  type: 'error' | 'warning';
  category: 'song' | 'artist' | 'banner' | 'distribution';
  targetId?: string;
  message: string;
}

export function validateData(): {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];

  // 1. Kiểm tra tồn tại các file
  if (!fs.existsSync(SONGS_FILE)) {
    return {
      isValid: false,
      errors: [{ type: 'error', category: 'song', message: `Thiếu file ${SONGS_FILE}` }],
      warnings: [],
    };
  }
  if (!fs.existsSync(ARTISTS_FILE)) {
    return {
      isValid: false,
      errors: [{ type: 'error', category: 'artist', message: `Thiếu file ${ARTISTS_FILE}` }],
      warnings: [],
    };
  }
  if (!fs.existsSync(BANNERS_FILE)) {
    return {
      isValid: false,
      errors: [{ type: 'error', category: 'banner', message: `Thiếu file ${BANNERS_FILE}` }],
      warnings: [],
    };
  }

  const songs = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf-8')) as Song[];
  const artists = JSON.parse(fs.readFileSync(ARTISTS_FILE, 'utf-8')) as Artist[];
  const banners = JSON.parse(fs.readFileSync(BANNERS_FILE, 'utf-8')) as Banner[];

  const artistMap = new Map<string, Artist>(artists.map((a) => [a.id, a]));
  const songMap = new Map<string, Song>(songs.map((s) => [s.id, s]));

  // 2. Validate Artists
  const seenArtistIds = new Set<string>();
  for (const artist of artists) {
    if (!artist.id || !KEBAB_CASE_REGEX.test(artist.id)) {
      issues.push({
        type: 'error',
        category: 'artist',
        targetId: artist.id,
        message: `Mã ca sĩ '${artist.id}' không đúng chuẩn kebab-case.`,
      });
    }
    if (seenArtistIds.has(artist.id)) {
      issues.push({
        type: 'error',
        category: 'artist',
        targetId: artist.id,
        message: `Trùng lặp mã ca sĩ '${artist.id}'.`,
      });
    }
    seenArtistIds.add(artist.id);

    if (!artist.name || artist.name.trim() === '') {
      issues.push({
        type: 'error',
        category: 'artist',
        targetId: artist.id,
        message: `Ca sĩ '${artist.id}' thiếu tên (name).`,
      });
    }
  }

  // 3. Validate Songs
  const seenSongIds = new Set<string>();
  const rarityCounts: Record<Rarity, number> = { 3: 0, 4: 0, 5: 0 };

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const indexStr = `bài thứ ${i + 1}`;

    // ID
    if (!song.id || !KEBAB_CASE_REGEX.test(song.id)) {
      issues.push({
        type: 'error',
        category: 'song',
        targetId: song.id || indexStr,
        message: `ID bài hát '${song.id}' không đúng chuẩn kebab-case.`,
      });
    }
    if (seenSongIds.has(song.id)) {
      issues.push({
        type: 'error',
        category: 'song',
        targetId: song.id,
        message: `Trùng lặp ID bài hát '${song.id}'.`,
      });
    }
    seenSongIds.add(song.id);

    // Required fields
    if (!song.title || song.title.trim() === '') {
      issues.push({
        type: 'error',
        category: 'song',
        targetId: song.id,
        message: `Thiếu tên bài hát (title).`,
      });
    }
    if (!song.artist || song.artist.trim() === '') {
      issues.push({
        type: 'error',
        category: 'song',
        targetId: song.id,
        message: `Thiếu ca sĩ (artist).`,
      });
    }
    if (!song.artistId || !artistMap.has(song.artistId)) {
      issues.push({
        type: 'error',
        category: 'song',
        targetId: song.id,
        message: `artistId '${song.artistId}' không tồn tại trong artists.json.`,
      });
    }

    // Year (tùy chọn)
    if (song.year !== undefined) {
      if (typeof song.year !== 'number' || song.year < 1950 || song.year > 2030) {
        issues.push({
          type: 'error',
          category: 'song',
          targetId: song.id,
          message: `Năm phát hành '${song.year}' không hợp lệ (cần từ 1950 đến 2030).`,
        });
      }
    }

    // Genre
    if (!Array.isArray(song.genre) || song.genre.length === 0) {
      issues.push({
        type: 'error',
        category: 'song',
        targetId: song.id,
        message: `Thể loại (genre) phải là mảng có ít nhất 1 phần tử.`,
      });
    } else {
      const invalidGenres = song.genre.filter((g) => !VALID_GENRES.includes(g));
      if (invalidGenres.length > 0) {
        issues.push({
          type: 'error',
          category: 'song',
          targetId: song.id,
          message: `Thể loại không hợp lệ: ${invalidGenres.join(', ')}. Chỉ chấp nhận: ${VALID_GENRES.join(', ')}.`,
        });
      }
    }

    // Voice
    if (!VALID_VOICES.includes(song.voice)) {
      issues.push({
        type: 'error',
        category: 'song',
        targetId: song.id,
        message: `Giọng hát '${song.voice}' không hợp lệ. Chỉ chấp nhận: ${VALID_VOICES.join(', ')}.`,
      });
    }

    // Views & ViewsAsOf
    if (song.views !== undefined) {
      if (typeof song.views !== 'number' || song.views < 0) {
        issues.push({
          type: 'error',
          category: 'song',
          targetId: song.id,
          message: `Lượt xem (views) phải là số không âm.`,
        });
      }
      if (!song.viewsAsOf || !/^\d{4}-\d{2}$/.test(song.viewsAsOf)) {
        issues.push({
          type: 'error',
          category: 'song',
          targetId: song.id,
          message: `Có views (${song.views}) thì viewsAsOf phải có định dạng YYYY-MM (hiện tại: '${song.viewsAsOf}').`,
        });
      }
    }

    // Rarity
    if (![3, 4, 5].includes(song.rarity)) {
      issues.push({
        type: 'error',
        category: 'song',
        targetId: song.id,
        message: `Độ hiếm (rarity) '${song.rarity}' không hợp lệ (phải là 3, 4 hoặc 5).`,
      });
    } else {
      rarityCounts[song.rarity as Rarity]++;
    }
  }

  // 4. Rarity percentiles & override check
  const rarityEvaluations = evaluateSongRarities(songs);
  for (const res of rarityEvaluations) {
    if (!res.isValid) {
      issues.push({
        type: 'error',
        category: 'song',
        targetId: res.song.id,
        message: res.reason || 'Quy tắc độ hiếm theo phân vị không hợp lệ.',
      });
    }
  }

  // 5. Số lượng tối thiểu mỗi độ hiếm
  if (rarityCounts[3] < 10) {
    issues.push({
      type: 'error',
      category: 'distribution',
      message: `Kho bài cần tối thiểu 10 bài 3★ (hiện có: ${rarityCounts[3]} bài).`,
    });
  }
  if (rarityCounts[4] < 5) {
    issues.push({
      type: 'error',
      category: 'distribution',
      message: `Kho bài cần tối thiểu 5 bài 4★ (hiện có: ${rarityCounts[4]} bài).`,
    });
  }
  if (rarityCounts[5] < 2) {
    issues.push({
      type: 'error',
      category: 'distribution',
      message: `Kho bài cần tối thiểu 2 bài 5★ (hiện có: ${rarityCounts[5]} bài).`,
    });
  }

  // 6. Cảnh báo phân bố kho bài (mục tiêu 55% 3★ / 30% 4★ / 15% 5★)
  const totalSongs = songs.length;
  if (totalSongs > 0) {
    const p3 = (rarityCounts[3] / totalSongs) * 100;
    const p4 = (rarityCounts[4] / totalSongs) * 100;
    const p5 = (rarityCounts[5] / totalSongs) * 100;

    if (p5 > 25 || p5 < 5) {
      issues.push({
        type: 'warning',
        category: 'distribution',
        message: `Tỉ lệ 5★ (${p5.toFixed(1)}%) lệch khá xa mục tiêu 15%.`,
      });
    }
    if (p4 > 45 || p4 < 15) {
      issues.push({
        type: 'warning',
        category: 'distribution',
        message: `Tỉ lệ 4★ (${p4.toFixed(1)}%) lệch khá xa mục tiêu 30%.`,
      });
    }
    if (p3 > 75 || p3 < 40) {
      issues.push({
        type: 'warning',
        category: 'distribution',
        message: `Tỉ lệ 3★ (${p3.toFixed(1)}%) lệch khá xa mục tiêu 55%.`,
      });
    }
  }

  // 7. Validate Banners
  const seenBannerIds = new Set<string>();
  for (const banner of banners) {
    if (!banner.id || !KEBAB_CASE_REGEX.test(banner.id)) {
      issues.push({
        type: 'error',
        category: 'banner',
        targetId: banner.id,
        message: `ID banner '${banner.id}' không đúng chuẩn kebab-case.`,
      });
    }
    if (seenBannerIds.has(banner.id)) {
      issues.push({
        type: 'error',
        category: 'banner',
        targetId: banner.id,
        message: `Trùng lặp ID banner '${banner.id}'.`,
      });
    }
    seenBannerIds.add(banner.id);

    // Featured bài hát phải tồn tại
    if (banner.featured && Array.isArray(banner.featured)) {
      for (const featId of banner.featured) {
        if (!songMap.has(featId)) {
          issues.push({
            type: 'error',
            category: 'banner',
            targetId: banner.id,
            message: `Bài hát rate-up featured '${featId}' không tồn tại trong songs.json.`,
          });
        }
      }
    }

    // Banner ca sĩ (type = "artist")
    if (banner.type === 'artist') {
      if (!banner.artistId) {
        issues.push({
          type: 'error',
          category: 'banner',
          targetId: banner.id,
          message: `Banner type 'artist' bắt buộc phải có trường 'artistId'.`,
        });
      } else if (!artistMap.has(banner.artistId)) {
        issues.push({
          type: 'error',
          category: 'banner',
          targetId: banner.id,
          message: `artistId '${banner.artistId}' của banner không tồn tại trong artists.json.`,
        });
      } else {
        // Kiểm tra pool của banner ca sĩ
        const extraIds = banner.extraSongIds || [];
        for (const extId of extraIds) {
          if (!songMap.has(extId)) {
            issues.push({
              type: 'error',
              category: 'banner',
              targetId: banner.id,
              message: `extraSongIds '${extId}' không tồn tại trong songs.json.`,
            });
          }
        }

        const artistPool = songs.filter(
          (s) => s.artistId === banner.artistId || extraIds.includes(s.id)
        );
        const count5 = artistPool.filter((s) => s.rarity === 5).length;
        const count4 = artistPool.filter((s) => s.rarity === 4).length;

        // Tiêu chí banner ca sĩ: ít nhất 5 bài, ít nhất 1 bài 5★ và 1 bài 4★
        if (artistPool.length < 5 || count5 < 1 || count4 < 1) {
          issues.push({
            type: 'error',
            category: 'banner',
            targetId: banner.id,
            message: `Banner ca sĩ '${banner.name}' (${banner.id}): Pool có ${artistPool.length} bài (yêu cầu ≥ 5), ${count5} bài 5★ (yêu cầu ≥ 1), ${count4} bài 4★ (yêu cầu ≥ 1). Vui lòng bổ sung bài hoặc extraSongIds.`,
          });
        }
      }
    }
  }

  const errors = issues.filter((i) => i.type === 'error');
  const warnings = issues.filter((i) => i.type === 'warning');

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function run(): void {
  console.log(`\n======================================================`);
  console.log(`  VALIDATE SONGS & BANNERS (Kiểm tra dữ liệu chuẩn M6)`);
  console.log(`======================================================\n`);

  const { isValid, errors, warnings } = validateData();

  if (warnings.length > 0) {
    console.warn(`⚠️  [CẢNH BÁO (${warnings.length})]:`);
    for (const w of warnings) {
      console.warn(`  • [${w.category.toUpperCase()}${w.targetId ? ` - ${w.targetId}` : ''}] ${w.message}`);
    }
    console.log('');
  }

  if (!isValid) {
    console.error(`❌ [LỖI DỮ LIỆU (${errors.length})]:`);
    for (const err of errors) {
      console.error(`  • [${err.category.toUpperCase()}${err.targetId ? ` - ${err.targetId}` : ''}] ${err.message}`);
    }
    console.error(`\nQuá trình kiểm tra thất bại! Vui lòng sửa các lỗi trên trước khi tiếp tục.\n`);
    process.exit(1);
  }

  console.log(`✅ Toàn bộ dữ liệu bài hát, ca sĩ và banner đều hợp lệ 100%!\n`);
}

if (
  process.argv.some((arg) => arg.includes('validate-songs')) ||
  !process.argv.some((arg) => arg.includes('vitest') || arg.includes('test'))
) {
  run();
}
