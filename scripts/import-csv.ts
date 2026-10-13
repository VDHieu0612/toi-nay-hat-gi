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
 * Chuẩn hóa giọng hát, hỗ trợ cả tiếng Việt có dấu từ Google Form (Giọng nam, Giọng nữ, Song ca, Tất cả)
 */
export function normalizeVoice(input: string): Voice {
  const s = input.toLowerCase().trim();
  if (s.includes('nam') && !s.includes('nữ') && !s.includes('nu')) {
    return 'nam';
  }
  if (s.includes('nữ') || s.includes('nu')) {
    return 'nu';
  }
  if (s.includes('song')) {
    return 'song-ca';
  }
  if (s.includes('tất') || s.includes('tat') || s.includes('ai') || s.includes('all')) {
    return 'tat-ca';
  }
  return 'tat-ca';
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
 * Chuẩn hóa URL Google Sheet: tự động chuyển link xem/sửa sang link xuất CSV
 */
export function normalizeSourceUrl(source: string): string {
  const trimmed = source.trim();
  // Nếu là URL Publish to Web (chứa /spreadsheets/d/e/ hoặc /pub) hoặc đã có output=csv/format=csv thì giữ nguyên vẹn
  if (
    trimmed.includes('/spreadsheets/d/e/') ||
    trimmed.includes('/pub') ||
    trimmed.includes('output=csv') ||
    trimmed.includes('format=csv')
  ) {
    return trimmed;
  }

  // Nếu là link chia sẻ / xem trực tiếp dạng /spreadsheets/d/<SHEET_ID>/edit...
  if (trimmed.includes('docs.google.com/spreadsheets/d/')) {
    const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1] && idMatch[1] !== 'e') {
      const sheetId = idMatch[1];
      const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
    }
  }
  return trimmed;
}

/**
 * Đọc file .env nếu có để lấy các biến môi trường
 */
export function loadEnvConfig(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  const envMap: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf-8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        envMap[key] = val;
      }
    }
  }
  return envMap;
}

/**
 * Tải nội dung CSV từ file local hoặc URL (Google Sheet online)
 */
export async function loadCsvContent(source: string): Promise<string> {
  const normalized = normalizeSourceUrl(source);
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    console.log(`\n🌐 Đang kết nối và tải CSV:\n   ${normalized}...`);
    const res = await fetch(normalized);
    if (!res.ok) {
      throw new Error(`Tải dữ liệu thất bại (HTTP ${res.status}): ${res.statusText}`);
    }
    return await res.text();
  }

  const resolvedPath = path.resolve(process.cwd(), normalized);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Không tìm thấy file: ${resolvedPath}`);
  }
  return fs.readFileSync(resolvedPath, 'utf-8');
}

export interface ImportStats {
  total: number;
  added: number;
  removed: number;
  updated: number;
  artistsCount: number;
  errors: string[];
}

export async function importCsv(
  songsSource: string,
  artistsSource?: string
): Promise<ImportStats> {
  // 1. Tải và xử lý file Artists nếu có
  let artistsContent = '';
  if (artistsSource) {
    try {
      artistsContent = await loadCsvContent(artistsSource);
    } catch (err: any) {
      console.error(`\n❌ [LỖI TẢI CSV ARTISTS] ${err.message}\n`);
      process.exit(1);
    }
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

  if (artistsContent) {
    const artistLines = artistsContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (artistLines.length >= 2) {
      const artHeader = parseCsvLine(artistLines[0]).map((h) => h.toLowerCase().trim());
      const artColIndex = {
        artist: artHeader.findIndex((h) => h === 'artist' || h === 'tên ca sĩ' || h === 'ca sĩ'),
        kind: artHeader.findIndex((h) => h === 'kind' || h === 'loại' || h === 'vai trò'),
        defaultGenres: artHeader.findIndex(
          (h) => h === 'defaultgenres' || h === 'genres' || h === 'thể loại' || h === 'thể loại mặc định'
        ),
        theme: artHeader.findIndex((h) => h === 'theme' || h === 'mã màu' || h === 'màu'),
      };

      if (artColIndex.artist !== -1) {
        for (let i = 1; i < artistLines.length; i++) {
          const row = parseCsvLine(artistLines[i]);
          const artistName = row[artColIndex.artist]?.trim();
          if (!artistName) continue;

          const artistId = toKebabCase(artistName);
          const kindRaw = (artColIndex.kind !== -1 ? row[artColIndex.kind]?.trim().toLowerCase() : '') || 'singer';
          const kind: 'singer' | 'rapper' | 'group' =
            kindRaw === 'rapper' || kindRaw === 'group' ? kindRaw : 'singer';

          let defaultGenres: Genre[] | undefined;
          if (artColIndex.defaultGenres !== -1 && row[artColIndex.defaultGenres]) {
            defaultGenres = row[artColIndex.defaultGenres]
              .split('|')
              .map((g) => g.trim().toLowerCase() as Genre)
              .filter((g) => VALID_GENRES.includes(g));
          }

          let theme = artColIndex.theme !== -1 ? row[artColIndex.theme]?.trim() : undefined;
          if (!theme || !/^#[0-9a-fA-F]{6}$/.test(theme)) {
            const colorIdx = artistsMap.size % PALETTE.length;
            theme = PALETTE[colorIdx];
          }

          artistsMap.set(artistId, {
            id: artistId,
            name: artistName,
            kind,
            ...(defaultGenres && defaultGenres.length > 0 ? { defaultGenres } : {}),
            theme,
          });
        }
      }
    }
  }

  // 2. Tải và xử lý Master Songs CSV
  let songsContent = '';
  try {
    songsContent = await loadCsvContent(songsSource);
  } catch (err: any) {
    console.error(`\n❌ [LỖI TẢI CSV BÀI HÁT] ${err.message}\n`);
    process.exit(1);
  }

  const lines = songsContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    console.error(`\n❌ [LỖI] File CSV phải có dòng tiêu đề (header) và ít nhất 1 dòng dữ liệu.\n`);
    process.exit(1);
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const colIndex = {
    title: header.indexOf('title'),
    artist: header.indexOf('artist'),
    genre: header.indexOf('genre'),
    voice: header.indexOf('voice'),
    hidden: header.indexOf('hidden'),
    year: header.indexOf('year'),
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
  if (colIndex.voice === -1) missingCols.push('voice');

  if (missingCols.length > 0) {
    console.error(`\n❌ [LỖI] File CSV thiếu các cột bắt buộc: ${missingCols.join(', ')}\n`);
    process.exit(1);
  }

  // Đọc songs.json hiện tại để bảo toàn độ hiếm và so sánh diff
  let existingSongsList: Song[] = [];
  if (fs.existsSync(SONGS_FILE)) {
    try {
      existingSongsList = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf-8'));
    } catch {
      existingSongsList = [];
    }
  }
  const existingSongMap = new Map<string, Song>(existingSongsList.map((s) => [s.id, s]));

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

    // Kiểm tra cột hidden
    if (colIndex.hidden !== -1) {
      const hiddenVal = (row[colIndex.hidden] || '').toLowerCase().trim();
      if (hiddenVal === 'true' || hiddenVal === '1' || hiddenVal === 'yes') {
        // Bỏ qua bài ẩn theo mục M6 của PLAN.md
        continue;
      }
    }

    const title = row[colIndex.title] || '';
    const artist = row[colIndex.artist] || '';
    const genreStr = colIndex.genre !== -1 ? row[colIndex.genre] || '' : '';
    const voiceStr = normalizeVoice(row[colIndex.voice] || '');
    const yearStr = colIndex.year !== -1 ? row[colIndex.year] || '' : '';
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

    const artistId = toKebabCase(artist);
    const songId = toKebabCase(`${title}-${artist}`);

    // Kiểm tra ca sĩ có trong tab Artists chưa nếu artistsSource được cung cấp
    if (artistsSource && !artistsMap.has(artistId)) {
      errors.push(
        `Dòng ${lineNum}: Ca sĩ '${artist}' chưa có trong danh sách ca sĩ (tab Artists). Vui lòng thêm vào tab Artists trước.`
      );
    }

    // Tự tạo artist nếu chưa có và không cung cấp file artists riêng
    if (!artistsMap.has(artistId)) {
      let kind: 'singer' | 'rapper' | 'group' = 'singer';
      const lowerArtist = artist.toLowerCase();
      if (lowerArtist.includes('rap') || ['den', 'hieuthuhai', 'justatee', 'suboi'].includes(artistId)) {
        kind = 'rapper';
      } else if (['ngot', 'chillies', 'da-lab', 'ca-hoi-hoang'].includes(artistId)) {
        kind = 'group';
      }

      const colorIndex = artistsMap.size % PALETTE.length;
      artistsMap.set(artistId, {
        id: artistId,
        name: artist,
        kind,
        theme: PALETTE[colorIndex],
      });
    }

    const artistObj = artistsMap.get(artistId);

    // Kế thừa thể loại: ưu tiên cột genre của bài, nếu trống lấy defaultGenres của ca sĩ
    let genres: Genre[] = [];
    if (genreStr.trim()) {
      genres = genreStr
        .split('|')
        .map((g) => g.trim().toLowerCase() as Genre)
        .filter(Boolean);

      const invalid = genres.filter((g) => !VALID_GENRES.includes(g));
      if (invalid.length > 0) {
        errors.push(
          `Dòng ${lineNum}: Thể loại không hợp lệ: ${invalid.join(', ')}. Chỉ chấp nhận: ${VALID_GENRES.join(', ')}.`
        );
      }
    } else if (artistObj?.defaultGenres && artistObj.defaultGenres.length > 0) {
      genres = [...artistObj.defaultGenres];
    }

    if (genres.length === 0) {
      errors.push(
        `Dòng ${lineNum}: Bài hát thiếu thể loại (cột genre trống và ca sĩ '${artist}' chưa có defaultGenres).`
      );
    }

    if (!VALID_VOICES.includes(voiceStr)) {
      errors.push(
        `Dòng ${lineNum}: Giọng '${voiceStr}' không hợp lệ. Chỉ chấp nhận: ${VALID_VOICES.join(', ')}.`
      );
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

    if (seenSongIds.has(songId)) {
      errors.push(`Dòng ${lineNum}: Trùng bài hát '${title}' của ca sĩ '${artist}'.`);
    }
    seenSongIds.add(songId);

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
    throw new Error(`CSV có ${errors.length} lỗi xác thực.`);
  }

  // Tự động phân bổ độ hiếm theo ca sĩ nếu là bài mới
  const artistSongsMap = new Map<string, RawRow[]>();
  for (const r of rawRows) {
    const list = artistSongsMap.get(r.artistId) || [];
    list.push(r);
    artistSongsMap.set(r.artistId, list);
  }

  const finalSongs: Song[] = [];

  for (const rows of artistSongsMap.values()) {
    const n = rows.length;
    const fiveStarCount = Math.max(1, Math.round(n * 0.18));
    const fourStarCount = Math.max(1, Math.round(n * 0.32));

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];

      let rarity: Rarity = 3;
      // QUY TẮC M6 / 4.3: Chỉ gán bài mới, không đổi độ hiếm của bài cũ đã có
      if (existingSongMap.has(r.songId)) {
        rarity = existingSongMap.get(r.songId)!.rarity;
      } else if (r.manualRarity) {
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

  // Cập nhật banner ca sĩ
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
      name: 'Tổng hợp',
      tagline: 'Bài Ca Muôn Màu',
      description: 'Kho bài hát phong phú đủ mọi thể loại và giọng hát cho mọi thành viên trong phòng hát.',
      featured: [],
      theme: '#6366f1',
    });
  }

  const generatedArtistBanners: Banner[] = [];
  for (const [artId, rows] of artistSongsMap.entries()) {
    if (rows.length < 5) continue;

    const artistObj = artistsMap.get(artId);
    if (!artistObj) continue;

    const artistSongList = finalSongs.filter((s) => s.artistId === artId);
    const featured5 = artistSongList.filter((s) => s.rarity === 5).map((s) => s.id);
    const featured4 = artistSongList.filter((s) => s.rarity === 4).map((s) => s.id);
    const featured = [...featured5.slice(0, 2), ...featured4.slice(0, 1)];
    const prevBanner = existingBanners.find((b) => b.id === `spotlight-${artId}`);

    generatedArtistBanners.push({
      id: `spotlight-${artId}`,
      type: 'artist',
      artistId: artId,
      name: artistObj.name,
      description: `Tiêu điểm nghệ sĩ xoay tua 2 ngày: Toàn bộ tuyển tập bản hit của ${artistObj.name} sẵn sàng cho đêm karaoke bùng cháy!`,
      featured,
      theme: artistObj.theme || '#6366f1',
      ...(prevBanner?.imageUrl ? { imageUrl: prevBanner.imageUrl } : {}),
    });
  }

  const finalBanners = [...generalBanners, ...generatedArtistBanners];

  // Tính thống kê chênh lệch (diff)
  let added = 0;
  let updated = 0;
  let removed = 0;

  for (const s of finalSongs) {
    if (!existingSongMap.has(s.id)) {
      added++;
    } else {
      const old = existingSongMap.get(s.id)!;
      if (
        old.title !== s.title ||
        old.artist !== s.artist ||
        JSON.stringify(old.genre) !== JSON.stringify(s.genre) ||
        old.voice !== s.voice
      ) {
        updated++;
      }
    }
  }

  for (const old of existingSongsList) {
    if (!seenSongIds.has(old.id)) {
      removed++;
    }
  }

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
  console.log(`  • Tổng số bài: ${finalSongs.length} (+${added} mới, -${removed} xóa, ${updated} sửa)`);
  console.log(`  • Đã cập nhật: ${artistsMap.size} ca sĩ vào ${path.basename(ARTISTS_FILE)}`);
  console.log(`  • Đã tạo: ${generatedArtistBanners.length} banner ca sĩ xoay tua vào ${path.basename(BANNERS_FILE)}`);
  console.log(`======================================================\n`);

  return {
    total: finalSongs.length,
    added,
    removed,
    updated,
    artistsCount: artistsMap.size,
    errors: [],
  };
}

async function run(): Promise<void> {
  const env = loadEnvConfig();
  const cliArgs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

  const songsSource =
    cliArgs[0] ||
    process.env.MASTER_CSV_URL ||
    process.env.VITE_SONGS_SHEET_CSV_URL ||
    process.env.VITE_SONGS_SHEET_VIEW_URL ||
    process.env.GOOGLE_SHEET_CSV_URL ||
    env.MASTER_CSV_URL ||
    env.VITE_SONGS_SHEET_CSV_URL ||
    env.VITE_SONGS_SHEET_VIEW_URL ||
    (fs.existsSync(path.resolve(process.cwd(), 'songs-master.csv')) ? 'songs-master.csv' : undefined);

  const artistsSource =
    cliArgs[1] ||
    process.env.ARTISTS_CSV_URL ||
    env.ARTISTS_CSV_URL ||
    (fs.existsSync(path.resolve(process.cwd(), 'data/artists.csv')) ? 'data/artists.csv' : undefined);

  if (!songsSource) {
    console.log(`\nSử dụng:`);
    console.log(`  - File local:   npm run import-csv -- <duong-dan-songs.csv> [<duong-dan-artists.csv>]`);
    console.log(`  - Google Sheet: npm run import-csv -- "<url-master-csv>" ["<url-artists-csv>"]`);
    console.log(`  - Tự động .env: npm run sync-sheet (cấu hình trong file .env)\n`);
    process.exit(0);
  }

  console.log(`\n📌 Nguồn dữ liệu bài hát: ${songsSource}`);
  if (artistsSource) {
    console.log(`📌 Nguồn dữ liệu ca sĩ:    ${artistsSource}`);
  }

  await importCsv(songsSource, artistsSource);
}

if (
  process.argv.some((arg) => arg.includes('import-csv')) &&
  !process.argv.some((arg) => arg.includes('vitest') || arg.includes('test'))
) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
