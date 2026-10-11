import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Song, Artist, Genre, Voice, Rarity } from '../src/lib/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SONGS_FILE = path.resolve(__dirname, '../src/data/songs.json');
const ARTISTS_FILE = path.resolve(__dirname, '../src/data/artists.json');

const VALID_GENRES: Genre[] = ['ballad', 'pop', 'rap', 'bolero', 'rock'];
const VALID_VOICES: Voice[] = ['nam', 'nu', 'song-ca', 'tat-ca'];

/**
 * Chuyển chuỗi tiếng Việt thành slug kebab-case chuẩn:
 * - Bỏ dấu tiếng Việt, 'đ'/'Đ' thành 'd'
 * - Chuyển chữ thường, thay ký tự không phải chữ-số bằng gạch nối '-'
 * - Loại bỏ gạch nối thừa ở đầu/cuối
 */
export function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Phân tích dòng CSV hỗ trợ dấu nháy kép (quoted values)
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Bỏ qua ký tự thoát nháy kép
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export function importCsv(csvFilePath: string): void {
  if (!fs.existsSync(csvFilePath)) {
    console.error(`\n❌ [LỖI] Không tìm thấy file CSV: ${csvFilePath}\n`);
    process.exit(1);
  }

  const content = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    console.error(`\n❌ [LỖI] File CSV phải có dòng tiêu đề (header) và ít nhất 1 dòng dữ liệu.\n`);
    process.exit(1);
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const colIndex = {
    title: header.indexOf('title'),
    artist: header.indexOf('artist'),
    year: header.indexOf('year'),
    genre: header.indexOf('genre'),
    voice: header.indexOf('voice'),
    views: header.indexOf('views'),
    viewsAsOf: header.indexOf('viewsasof'),
    rarity: header.indexOf('rarity'),
    rarityNote: header.indexOf('raritynote'),
    note: header.indexOf('note'),
    tags: header.indexOf('tags'),
    challenge: header.indexOf('challenge'),
  };

  const missingCols: string[] = [];
  if (colIndex.title === -1) missingCols.push('title');
  if (colIndex.artist === -1) missingCols.push('artist');
  if (colIndex.genre === -1) missingCols.push('genre');
  if (colIndex.voice === -1) missingCols.push('voice');

  if (missingCols.length > 0) {
    console.error(
      `\n❌ [LỖI] File CSV thiếu các cột bắt buộc: ${missingCols.join(', ')}\n`
    );
    process.exit(1);
  }

  // Đọc danh sách ca sĩ hiện có nếu có
  let existingArtists: Artist[] = [];
  if (fs.existsSync(ARTISTS_FILE)) {
    try {
      existingArtists = JSON.parse(fs.readFileSync(ARTISTS_FILE, 'utf-8'));
    } catch {
      existingArtists = [];
    }
  }
  const artistsMap = new Map<string, Artist>(existingArtists.map((a) => [a.id, a]));

  const songs: Song[] = [];
  const errors: string[] = [];
  const songIds = new Set<string>();

  // Duyệt từng dòng dữ liệu
  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1;
    const row = parseCsvLine(lines[i]);

    const title = row[colIndex.title] || '';
    const artist = row[colIndex.artist] || '';
    const yearStr = row[colIndex.year] || '';
    const genreStr = row[colIndex.genre] || '';
    const voiceStr = (row[colIndex.voice] || '').toLowerCase() as Voice;
    const viewsStr = colIndex.views !== -1 ? row[colIndex.views] : '';
    const viewsAsOfStr = colIndex.viewsAsOf !== -1 ? row[colIndex.viewsAsOf] : '';
    const rarityStr = colIndex.rarity !== -1 ? row[colIndex.rarity] : '';
    const rarityNote = colIndex.rarityNote !== -1 ? row[colIndex.rarityNote] : undefined;
    const tagsStr = colIndex.tags !== -1 ? row[colIndex.tags] : '';
    const challenge = colIndex.challenge !== -1 ? row[colIndex.challenge] : undefined;

    if (!title) {
      errors.push(`Dòng ${lineNum}: 'title' không được để trống.`);
      continue;
    }
    if (!artist) {
      errors.push(`Dòng ${lineNum}: 'artist' không được để trống.`);
      continue;
    }

    const noteStr = colIndex.note !== -1 ? row[colIndex.note] || '' : '';

    let year = 2020;
    if (yearStr && yearStr.trim() !== '') {
      const parsed = Number.parseInt(yearStr, 10);
      if (!Number.isNaN(parsed) && parsed >= 1950 && parsed <= 2030) {
        year = parsed;
      } else {
        errors.push(`Dòng ${lineNum}: Năm '${yearStr}' không hợp lệ (cần trong khoảng 1950 - 2030).`);
      }
    } else if (noteStr) {
      const yearMatch = noteStr.match(/\b(19\d{2}|20\d{2})\b/);
      if (yearMatch) {
        year = Number.parseInt(yearMatch[1], 10);
      }
    }

    // Genre: phân tách bằng '|'
    const genres = genreStr
      .split('|')
      .map((g) => g.trim().toLowerCase() as Genre)
      .filter(Boolean);

    if (genres.length === 0) {
      errors.push(`Dòng ${lineNum}: Phải có ít nhất 1 thể loại (genre).`);
    } else {
      const invalidGenres = genres.filter((g) => !VALID_GENRES.includes(g));
      if (invalidGenres.length > 0) {
        errors.push(
          `Dòng ${lineNum}: Thể loại không hợp lệ: ${invalidGenres.join(', ')}. Chỉ chấp nhận: ${VALID_GENRES.join(', ')}.`
        );
      }
    }

    if (!VALID_VOICES.includes(voiceStr)) {
      errors.push(
        `Dòng ${lineNum}: Giọng '${voiceStr}' không hợp lệ. Chỉ chấp nhận: ${VALID_VOICES.join(', ')}.`
      );
    }

    // Views
    let views: number | undefined;
    if (viewsStr && viewsStr.trim() !== '') {
      views = Number.parseFloat(viewsStr);
      if (Number.isNaN(views) || views < 0) {
        errors.push(`Dòng ${lineNum}: Lượt xem '${viewsStr}' phải là số không âm.`);
      } else if (!viewsAsOfStr || !/^\d{4}-\d{2}$/.test(viewsAsOfStr)) {
        errors.push(`Dòng ${lineNum}: Có views thì bắt buộc phải có viewsAsOf dạng YYYY-MM.`);
      }
    }

    // Rarity
    let rarity: Rarity = 3;
    if (rarityStr && rarityStr.trim() !== '') {
      const parsedRarity = Number.parseInt(rarityStr, 10);
      if ([3, 4, 5].includes(parsedRarity)) {
        rarity = parsedRarity as Rarity;
      } else {
        errors.push(`Dòng ${lineNum}: Rarity '${rarityStr}' không hợp lệ (chỉ chấp nhận 3, 4, 5).`);
      }
    }

    const artistId = toKebabCase(artist);
    if (!artistsMap.has(artistId)) {
      artistsMap.set(artistId, {
        id: artistId,
        name: artist,
        kind: 'singer',
        theme: '#6366f1',
      });
    }

    const songId = toKebabCase(`${title}-${artist}`);
    if (songIds.has(songId)) {
      errors.push(`Dòng ${lineNum}: Trùng mã bài hát '${songId}' (Bài: '${title}', Ca sĩ: '${artist}').`);
    }
    songIds.add(songId);

    const tags = tagsStr
      ? tagsStr.split(/[|,]/).map((t) => t.trim().toLowerCase()).filter(Boolean)
      : ['quen-thuoc'];

    const song: Song = {
      id: songId,
      title,
      artist,
      artistId,
      year,
      genre: genres,
      voice: voiceStr,
      rarity,
      tags,
    };

    if (views !== undefined) {
      song.views = views;
      song.viewsAsOf = viewsAsOfStr;
    }
    const resolvedRarityNote =
      rarityNote && rarityNote.trim()
        ? rarityNote.trim()
        : views === undefined
          ? noteStr || 'Bài nổi bật từ kho danh mục'
          : undefined;

    if (resolvedRarityNote) {
      song.rarityNote = resolvedRarityNote;
    }
    if (challenge && challenge.trim()) {
      song.challenge = challenge.trim();
    }

    songs.push(song);
  }

  if (errors.length > 0) {
    console.error(`\n❌ [LỖI NHẬP LIỆU CSV] Tìm thấy ${errors.length} lỗi:\n`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    console.error(`\nVui lòng sửa file CSV và thử lại.\n`);
    process.exit(1);
  }

  // Ghi file JSON
  fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2) + '\n', 'utf-8');
  fs.writeFileSync(
    ARTISTS_FILE,
    JSON.stringify(Array.from(artistsMap.values()), null, 2) + '\n',
    'utf-8'
  );

  console.log(`\n======================================================`);
  console.log(`  NHẬP FILE CSV THÀNH CÔNG!`);
  console.log(`  - Đã nhập: ${songs.length} bài hát vào ${SONGS_FILE}`);
  console.log(`  - Đã cập nhật: ${artistsMap.size} ca sĩ vào ${ARTISTS_FILE}`);
  console.log(`======================================================\n`);
  console.log(`Tiếp theo, hãy chạy:`);
  console.log(`  1. npx vite-node scripts/compute-rarity.ts (tính phân vị lượt xem)`);
  console.log(`  2. npx vite-node scripts/validate-songs.ts (kiểm tra toàn diện trước khi build)\n`);
}

function run(): void {
  const filePath = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
  if (!filePath) {
    console.log(`\nSử dụng: npx vite-node scripts/import-csv.ts <duong-dan-file.csv>\n`);
    process.exit(0);
  }
  importCsv(filePath);
}

// Chạy trực tiếp qua node/vite-node khi được gọi trực tiếp
if (process.argv.some((arg) => arg.includes('import-csv'))) {
  run();
}
