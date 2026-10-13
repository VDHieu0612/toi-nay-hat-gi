import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  importCsv,
  loadCsvContent,
  loadEnvConfig,
  parseCsvLine,
} from './import-csv';
import { assignRarities } from './assign-rarity';
import { validateData } from './validate-songs';
import type { Song } from '../src/lib/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const SONGS_CSV = path.resolve(DATA_DIR, 'songs.csv');
const ARTISTS_CSV = path.resolve(DATA_DIR, 'artists.csv');
const SONGS_JSON = path.resolve(ROOT_DIR, 'src/data/songs.json');

/**
 * Ghi nội dung vào GitHub Step Summary nếu đang chạy trên GitHub Actions
 */
function appendStepSummary(markdown: string): void {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    try {
      fs.appendFileSync(summaryFile, markdown + '\n\n', 'utf-8');
    } catch (err: any) {
      console.warn(`[sync-sheet] Không thể ghi vào GITHUB_STEP_SUMMARY: ${err.message}`);
    }
  }
}

/**
 * Quy trình đồng bộ dữ liệu từ Google Sheet (Mục M6 & M8 của PLAN.md)
 */
export async function syncSheet(): Promise<void> {
  const env = loadEnvConfig();
  const isForce =
    process.argv.includes('--force') ||
    process.env.FORCE === 'true' ||
    process.env.INPUT_FORCE === 'true';

  // Xác định URL Master và Artists
  const masterUrl =
    process.env.MASTER_CSV_URL ||
    process.env.VITE_SONGS_SHEET_CSV_URL ||
    env.MASTER_CSV_URL ||
    env.VITE_SONGS_SHEET_CSV_URL;

  const artistsUrl =
    process.env.ARTISTS_CSV_URL ||
    env.ARTISTS_CSV_URL;

  console.log(`\n======================================================`);
  console.log(`  SYNC GOOGLE SHEET -> LOCAL REPOSITORY (M6 & M8)     `);
  console.log(`======================================================`);
  console.log(`Chế độ Force: ${isForce ? 'BẬT (Bỏ qua chốt chặn xóa)' : 'TẮT (Chốt an toàn 80% hoạt động)'}`);

  if (!masterUrl) {
    console.error(
      `\n❌ [LỖI] Thiếu biến môi trường MASTER_CSV_URL (hoặc VITE_SONGS_SHEET_CSV_URL).\n` +
      `   Vui lòng cấu hình trong file .env hoặc Repository Variables trên GitHub.\n` +
      `   Xem hướng dẫn chi tiết tại: docs/SHEET_SETUP.md\n`
    );
    process.exit(1);
  }

  // Tạo thư mục data/ nếu chưa có
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 1. Tải CSV từ Google Sheet về data/songs.csv
  console.log(`\n📥 1. Đang tải Master tab từ Google Sheet:`);
  console.log(`   ${masterUrl}`);
  const masterCsvContent = await loadCsvContent(masterUrl);
  fs.writeFileSync(SONGS_CSV, masterCsvContent, 'utf-8');
  console.log(`   -> Đã lưu vào ${path.relative(ROOT_DIR, SONGS_CSV)}`);

  // 2. Tải CSV từ tab Artists nếu có cấu hình
  let hasArtistsCsv = false;
  if (artistsUrl && artistsUrl.trim()) {
    console.log(`\n📥 2. Đang tải Artists tab từ Google Sheet:`);
    console.log(`   ${artistsUrl}`);
    try {
      const artistsCsvContent = await loadCsvContent(artistsUrl);
      fs.writeFileSync(ARTISTS_CSV, artistsCsvContent, 'utf-8');
      hasArtistsCsv = true;
      console.log(`   -> Đã lưu vào ${path.relative(ROOT_DIR, ARTISTS_CSV)}`);
    } catch (err: any) {
      console.warn(`   ⚠️ Cảnh báo: Không thể tải Artists CSV: ${err.message}. Tiếp tục với dữ liệu ca sĩ hiện có.`);
    }
  } else {
    console.log(`\nℹ️ 2. Không cấu hình ARTISTS_CSV_URL: Sử dụng danh sách ca sĩ trong src/data/artists.json`);
  }

  // 3. Chốt chặn an toàn phòng ngừa xóa nhầm (M8: < 80% số bài đang có thì chặn)
  let currentSongCount = 0;
  if (fs.existsSync(SONGS_JSON)) {
    try {
      const curList = JSON.parse(fs.readFileSync(SONGS_JSON, 'utf-8')) as Song[];
      currentSongCount = curList.length;
    } catch {
      currentSongCount = 0;
    }
  }

  const masterLines = masterCsvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let newValidRows = 0;
  if (masterLines.length >= 2) {
    const header = parseCsvLine(masterLines[0]).map((h) => h.toLowerCase().trim());
    const hiddenCol = header.indexOf('hidden');
    for (let i = 1; i < masterLines.length; i++) {
      const row = parseCsvLine(masterLines[i]);
      if (hiddenCol !== -1) {
        const val = (row[hiddenCol] || '').toLowerCase().trim();
        if (val === 'true' || val === '1' || val === 'yes') continue;
      }
      newValidRows++;
    }
  }

  console.log(`\n🛡️ 3. Kiểm tra chốt chặn an toàn (Số bài hiện có: ${currentSongCount}, Số bài tải về: ${newValidRows}):`);
  if (currentSongCount > 0 && newValidRows < currentSongCount * 0.8) {
    const threshold = Math.round(currentSongCount * 0.8);
    const msg =
      `\n❌ [CHỐT CHẶN XÓA NHẦM]: Số bài sau khi tải về (${newValidRows}) ít hơn 80% số bài hiện tại (${currentSongCount}, tối thiểu cần ${threshold}).\n` +
      `   Quy trình bị dừng để tránh mất dữ liệu do đường link hỏng hoặc xóa nhầm hàng trên Sheet.\n` +
      `   Nếu bạn thực sự muốn xóa hàng loạt bài hát, hãy chạy lại với tùy chọn '--force' hoặc input force=true trên GitHub Actions.\n`;
    console.error(msg);
    appendStepSummary(`### ❌ Đồng bộ thất bại: Chốt chặn xóa nhầm kích hoạt\n\nSố bài mới (${newValidRows}) ít hơn 80% số bài hiện tại (${currentSongCount}). Quy trình đã dừng an toàn.`);
    process.exit(1);
  }
  console.log(`   -> Chốt chặn an toàn: HỢP LỆ.`);

  // 4. Thực thi Import CSV -> src/data/
  console.log(`\n⚙️ 4. Chuyển đổi dữ liệu CSV -> JSON:`);
  const importStats = await importCsv(
    SONGS_CSV,
    hasArtistsCsv ? ARTISTS_CSV : undefined
  );

  // 5. Gán độ hiếm (Assign Rarity) theo M6 / Mục 4.3
  console.log(`\n⭐ 5. Kiểm tra và gán độ hiếm (assign-rarity):`);
  const rarityResult = assignRarities();

  // 6. Kiểm tra tính toàn vẹn (validate-songs)
  console.log(`\n🔍 6. Kiểm định chất lượng kho dữ liệu (validate-songs):`);
  const validation = validateData();

  if (!validation.isValid) {
    console.error(`\n❌ [VALIDATION FAILED] Dữ liệu từ Sheet không vượt qua kiểm tra chất lượng:\n`);
    for (const err of validation.errors) {
      console.error(`  • [${err.category}] ${err.targetId ? err.targetId + ': ' : ''}${err.message}`);
    }
    console.error(`\nWorkflow thất bại để bảo vệ web không bị lỗi hiển thị. Web sẽ giữ nguyên phiên bản cũ.\n`);

    const summaryMd = [
      `### ❌ Đồng bộ thất bại: Lỗi kiểm định dữ liệu`,
      `Dữ liệu từ Google Sheet có ${validation.errors.length} lỗi bắt buộc sửa:`,
      ...validation.errors.map((e) => `- **[${e.category}]** ${e.targetId ? `\`${e.targetId}\`: ` : ''}${e.message}`),
    ].join('\n');
    appendStepSummary(summaryMd);

    process.exit(1);
  }
  console.log(`   -> Dữ liệu kiểm tra 100% hợp lệ!`);

  // 7. Tạo báo cáo tóm tắt thay đổi (Step Summary)
  const warnings = validation.warnings;
  const summaryLines = [
    `## 📊 Kết quả đồng bộ Google Sheet`,
    `- **Tổng số bài hát:** ${importStats.total} (+${importStats.added} mới, -${importStats.removed} xóa, ${importStats.updated} cập nhật)`,
    `- **Tổng số ca sĩ:** ${importStats.artistsCount}`,
    `- **Bài hát cập nhật độ hiếm:** ${rarityResult.updatedCount}`,
  ];

  if (warnings.length > 0) {
    summaryLines.push(``, `### ⚠️ Cảnh báo (${warnings.length}):`);
    for (const w of warnings) {
      summaryLines.push(`- **[${w.category}]** ${w.targetId ? `\`${w.targetId}\`: ` : ''}${w.message}`);
    }
  }

  summaryLines.push(``, `✅ *Đồng bộ thành công! Sẵn sàng cho bước đóng gói và phát hành.*`);
  const finalSummaryMd = summaryLines.join('\n');
  appendStepSummary(finalSummaryMd);

  console.log(`\n======================================================`);
  console.log(`  ĐỒNG BỘ HOÀN TẤT THÀNH CÔNG!`);
  console.log(`  +${importStats.added} bài mới | -${importStats.removed} bài xóa | ${importStats.updated} bài sửa`);
  console.log(`======================================================\n`);
}

if (!process.env.VITEST) {
  syncSheet().catch((err) => {
    console.error(`❌ [LỖI KHÔNG MONG MUỐN] ${err.message}`);
    process.exit(1);
  });
}
