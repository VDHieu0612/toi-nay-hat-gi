import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Song, Artist, Banner, Genre, Voice, Rarity } from '../src/lib/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SONGS_FILE = path.resolve(__dirname, '../src/data/songs.json');
const ARTISTS_FILE = path.resolve(__dirname, '../src/data/artists.json');
const BANNERS_FILE = path.resolve(__dirname, '../src/data/banners.json');

const VALID_GENRES: Genre[] = ['ballad', 'pop', 'rap', 'bolero', 'rock'];
const VALID_VOICES: Voice[] = ['nam', 'nu', 'song-ca', 'tat-ca'];

const PALETTE = [
  '#6366f1', '#ec4899', '#8b5cf6', '#0ea5e9',
  '#10b981', '#f59e0b', '#f43f5e', '#06b6d4',
  '#d97706', '#a855f7', '#14b8a6', '#3b82f6',
];

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

/**
 * Tải nội dung CSV từ file local hoặc URL (Google Sheet online)
 */
export async function loadCsvContent(source: string): Promise<string> {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    console.log(`\n🌐 Đang kết nối và tải file từ Google Sheet / URL:\n   ${source}...`);
    const res = await fetch(source);
    if (!res.ok) {
      throw new Error(`Tải dữ liệu thất bại (HTTP ${res.status}): ${res.statusText}`);
    }
    return await res.text();
  }

  const resolvedPath = path.resolve(process.cwd(), source);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Không tìm thấy file: ${resolvedPath}`);
  }
  return fs.readFileSync(resolvedPath, 'utf-8');
}

export async function importCsv(source: string): Promise<void> {
  let content = '';
  try {
    content = await loadCsvContent(source);
  } catch (err: any) {
    console.error(`\n❌ [LỖI] ${err.message}\n`);
    process.exit(1);
  }

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

  interface RawRow {
    lineNum: number;
    title: string;
    artist: string;
    artistId: string;
    songId: string;
    year?: number;
    genres: Genre[];
    voice: Voice;
    views?: number;
    viewsAsOf?: string;
    manualRarity?: Rarity;
    rarityNote?: string;
    note?: string;
    tags: string[];
    challenge?: string;
  }

  const rawRows: RawRow[] = [];
  const errors: string[] = [];
  const seenSongIds = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1;
    const row = parseCsvLine(lines[i]);

    const title = row[colIndex.title] || '';
    const artist = row[colIndex.artist] || '';
    const yearStr = colIndex.year !== -1 ? row[colIndex.year] || '' : '';
    const genreStr = row[colIndex.genre] || '';
    const voiceStr = (row[colIndex.voice] || '').toLowerCase() as Voice;
    const viewsStr = colIndex.views !== -1 ? row[colIndex.views] : '';
    const viewsAsOfStr = colIndex.viewsAsOf !== -1 ? row[colIndex.viewsAsOf] : '';
    const rarityStr = colIndex.rarity !== -1 ? row[colIndex.rarity] : '';
    const rarityNote = colIndex.rarityNote !== -1 ? row[colIndex.rarityNote] : undefined;
    const noteStr = colIndex.note !== -1 ? row[colIndex.note] || '' : '';
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

    let year: number | undefined;
    if (yearStr && yearStr.trim() !== '') {
      const parsedYear = Number.parseInt(yearStr, 10);
      if (!Number.isNaN(parsedYear) && parsedYear >= 1950 && parsedYear <= 2030) {
        year = parsedYear;
      }
    } else if (noteStr) {
      const match = noteStr.match(/\b(19\d{2}|20\d{2})\b/);
      if (match) {
        year = Number.parseInt(match[1], 10);
      }
    }

    const genres = genreStr
      .split('|')
      .map((g) => g.trim().toLowerCase() as Genre)
      .filter(Boolean);

    if (genres.length === 0) {
      errors.push(`Dòng ${lineNum}: Cần ít nhất 1 thể loại (genre).`);
    } else {
      const invalid = genres.filter((g) => !VALID_GENRES.includes(g));
      if (invalid.length > 0) {
        errors.push(
          `Dòng ${lineNum}: Thể loại không hợp lệ: ${invalid.join(', ')}. Chỉ chấp nhận: ${VALID_GENRES.join(', ')}.`
        );
      }
    }

    if (!VALID_VOICES.includes(voiceStr)) {
      errors.push(
        `Dòng ${lineNum}: Giọng '${voiceStr}' không hợp lệ. Chỉ chấp nhận: ${VALID_VOICES.join(', ')}.`
      );
    }

    let views: number | undefined;
    if (viewsStr && viewsStr.trim() !== '') {
      const parsedViews = Number.parseFloat(viewsStr);
      if (!Number.isNaN(parsedViews) && parsedViews >= 0) {
        views = parsedViews;
      }
    }

    let manualRarity: Rarity | undefined;
    if (rarityStr && rarityStr.trim() !== '') {
      const parsedR = Number.parseInt(rarityStr, 10);
      if ([3, 4, 5].includes(parsedR)) {
        manualRarity = parsedR as Rarity;
      }
    }

    const artistId = toKebabCase(artist);
    const songId = toKebabCase(`${title}-${artist}`);

    if (seenSongIds.has(songId)) {
      errors.push(`Dòng ${lineNum}: Trùng bài hát '${title}' của ca sĩ '${artist}'.`);
    }
    seenSongIds.add(songId);

    // Xác định vai trò (singer/rapper/group)
    let kind: 'singer' | 'rapper' | 'group' = 'singer';
    const lowerArtist = artist.toLowerCase();
    if (lowerArtist.includes('rap') || ['den', 'hieuthuhai', 'justatee', 'suboi'].includes(artistId)) {
      kind = 'rapper';
    } else if (['ngot', 'chillies', 'da-lab', 'ca-hoi-hoang'].includes(artistId)) {
      kind = 'group';
    }

    if (!artistsMap.has(artistId)) {
      const colorIndex = artistsMap.size % PALETTE.length;
      artistsMap.set(artistId, {
        id: artistId,
        name: artist,
        kind,
        theme: PALETTE[colorIndex],
      });
    }

    const tags = tagsStr
      ? tagsStr.split(/[|,]/).map((t) => t.trim().toLowerCase()).filter(Boolean)
      : noteStr
        ? [toKebabCase(noteStr.slice(0, 20))]
        : ['quen-thuoc'];

    rawRows.push({
      lineNum,
      title,
      artist,
      artistId,
      songId,
      year,
      genres,
      voice: voiceStr,
      views,
      viewsAsOf: viewsAsOfStr || undefined,
      manualRarity,
      rarityNote,
      note: noteStr || undefined,
      tags,
      challenge,
    });
  }

  if (errors.length > 0) {
    console.error(`\n❌ [LỖI DỮ LIỆU CSV] Tìm thấy ${errors.length} lỗi:\n`);
    for (const err of errors) {
      console.error(`  • ${err}`);
    }
    console.error(`\nVui lòng kiểm tra lại file CSV.\n`);
    process.exit(1);
  }

  // Tự động phân bổ độ hiếm theo ca sĩ nếu không có cột rarity
  // Gom nhóm bài theo artistId
  const artistSongsMap = new Map<string, RawRow[]>();
  for (const r of rawRows) {
    const list = artistSongsMap.get(r.artistId) || [];
    list.push(r);
    artistSongsMap.set(r.artistId, list);
  }

  const finalSongs: Song[] = [];

  for (const rows of artistSongsMap.values()) {
    const n = rows.length;
    // Phân bổ hợp lý:
    // 1-2 bài đầu: 5★ (Siêu hit)
    // 30% tiếp: 4★ (Hit)
    // còn lại: 3★ (Bài ngon)
    const fiveStarCount = Math.max(1, Math.round(n * 0.18));
    const fourStarCount = Math.max(1, Math.round(n * 0.32));

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];

      let rarity: Rarity = 3;
      if (r.manualRarity) {
        rarity = r.manualRarity;
      } else if (idx < fiveStarCount) {
        rarity = 5;
      } else if (idx < fiveStarCount + fourStarCount) {
        rarity = 4;
      } else {
        rarity = 3;
      }

      const song: Song = {
        id: r.songId,
        title: r.title,
        artist: r.artist,
        artistId: r.artistId,
        genre: r.genres,
        voice: r.voice,
        rarity,
        tags: r.tags,
      };

      if (r.year) song.year = r.year;
      if (r.views !== undefined) song.views = r.views;
      if (r.viewsAsOf) song.viewsAsOf = r.viewsAsOf;
      if (r.rarityNote) song.rarityNote = r.rarityNote;
      if (r.challenge) song.challenge = r.challenge;

      finalSongs.push(song);
    }
  }

  // Tự động cập nhật danh sách Banner ca sĩ trong banners.json
  // Giữ lại banner tổng hợp "tong-hop"
  let existingBanners: Banner[] = [];
  if (fs.existsSync(BANNERS_FILE)) {
    try {
      existingBanners = JSON.parse(fs.readFileSync(BANNERS_FILE, 'utf-8'));
    } catch {
      existingBanners = [];
    }
  }

  const generalBanners = existingBanners.filter((b) => b.id === 'tong-hop');
  if (generalBanners.length === 0) {
    generalBanners.push({
      id: 'tong-hop',
      type: 'general',
      name: 'Tổng Hợp Quán Hát',
      tagline: 'Bài Ca Muôn Màu',
      description: 'Kho bài hát phong phú đủ mọi thể loại và giọng hát cho mọi thành viên trong phòng hát.',
      featured: [],
      theme: '#6366f1',
    });
  }

  // Tạo banner cho các ca sĩ có từ 5 bài trở lên
  const generatedArtistBanners: Banner[] = [];
  for (const [artId, rows] of artistSongsMap.entries()) {
    if (rows.length < 5) continue;

    const artistObj = artistsMap.get(artId);
    if (!artistObj) continue;

    const artistSongList = finalSongs.filter((s) => s.artistId === artId);
    const featured5 = artistSongList.filter((s) => s.rarity === 5).map((s) => s.id);
    const featured4 = artistSongList.filter((s) => s.rarity === 4).map((s) => s.id);
    const featured = [...featured5.slice(0, 2), ...featured4.slice(0, 1)];

    generatedArtistBanners.push({
      id: `spotlight-${artId}`,
      type: 'artist',
      artistId: artId,
      name: artistObj.name,
      description: `Tiêu điểm nghệ sĩ xoay tua 2 ngày: Toàn bộ tuyển tập bản hit của ${artistObj.name} sẵn sàng cho đêm karaoke bùng cháy!`,
      featured,
      theme: artistObj.theme || '#6366f1',
    });
  }

  const finalBanners = [...generalBanners, ...generatedArtistBanners];

  // Ghi các file JSON
  fs.writeFileSync(SONGS_FILE, JSON.stringify(finalSongs, null, 2) + '\n', 'utf-8');
  fs.writeFileSync(
    ARTISTS_FILE,
    JSON.stringify(Array.from(artistsMap.values()), null, 2) + '\n',
    'utf-8'
  );
  fs.writeFileSync(BANNERS_FILE, JSON.stringify(finalBanners, null, 2) + '\n', 'utf-8');

  console.log(`\n======================================================`);
  console.log(`  NHẬP DỮ LIỆU THÀNH CÔNG!`);
  console.log(`  • Đã nhập: ${finalSongs.length} bài hát vào ${path.basename(SONGS_FILE)}`);
  console.log(`  • Đã cập nhật: ${artistsMap.size} ca sĩ vào ${path.basename(ARTISTS_FILE)}`);
  console.log(`  • Đã tạo: ${generatedArtistBanners.length} banner ca sĩ xoay tua vào ${path.basename(BANNERS_FILE)}`);
  console.log(`======================================================\n`);
}

async function run(): Promise<void> {
  const source = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
  if (!source) {
    console.log(`\nSử dụng:`);
    console.log(`  - File local:  npx vite-node scripts/import-csv.ts <duong-dan-file.csv>`);
    console.log(`  - Google Sheet: npx vite-node scripts/import-csv.ts "https://docs.google.com/spreadsheets/d/.../export?format=csv"\n`);
    process.exit(0);
  }
  await importCsv(source);
}

if (
  process.argv.some((arg) => arg.includes('import-csv')) ||
  !process.argv.some((arg) => arg.includes('vitest') || arg.includes('test'))
) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
