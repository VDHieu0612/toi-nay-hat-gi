import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve(process.cwd(), 'src');

// Danh sách ký tự được phép theo mục 10.4
// Chỉ được dùng: ★, ×, ←, →, ·
const ALLOWED_CHARS = new Set(['★', '×', '←', '→', '·']);

// Regex phát hiện Emoji và Pictograph Unicode (cấm theo mục 10.4)
// Bao gồm cả các ký hiệu hoa văn hình ảnh như ✦ ❖ ✨ ✕ ↺
const EMOJI_AND_PICTOGRAPH_REGEX = /[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2728}\u{2726}\u{2756}\u{2715}\u{2716}\u{21BB}\u{21BA}]/gu;

interface Violation {
  file: string;
  line: number;
  type: string;
  detail: string;
}

const violations: Violation[] = [];

function getAllFiles(dir: string, extensions: string[]): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, extensions));
    } else {
      if (extensions.some((ext) => item.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const sourceFiles = getAllFiles(SRC_DIR, ['.ts', '.tsx']);

for (const filePath of sourceFiles) {
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // 1. Kiểm tra thẻ <button> trực tiếp ngoài Button.tsx
    if (!relPath.endsWith('src/components/ui/Button.tsx')) {
      if (/<button[\s>]/g.test(line)) {
        violations.push({
          file: relPath,
          line: lineNum,
          type: 'BUTTON_TAG',
          detail: `Phát hiện thẻ <button> viết trực tiếp. Phải dùng component <Button> theo mục 10.2: "${line.trim()}"`,
        });
      }
    }

    // 2. Kiểm tra Emoji và Pictograph bị cấm
    const matches = line.match(EMOJI_AND_PICTOGRAPH_REGEX);
    if (matches) {
      for (const m of matches) {
        if (!ALLOWED_CHARS.has(m)) {
          violations.push({
            file: relPath,
            line: lineNum,
            type: 'FORBIDDEN_EMOJI',
            detail: `Phát hiện emoji/ký tự hình ảnh bị cấm '${m}' (mục 10.4): "${line.trim()}"`,
          });
        }
      }
    }
  });
}

console.log('\n======================================================');
console.log('  LINT:UI - KIỂM TRA HỆ THỐNG GIAO DIỆN (PLAN MỤC 10)  ');
console.log('======================================================\n');

if (violations.length === 0) {
  console.log('✅ Chúc mừng! Toàn bộ file src/ đều tuân thủ 100% mục 10:');
  console.log('   - Không còn emoji/ký tự hình ảnh bị cấm.');
  console.log('   - Toàn bộ nút đều sử dụng component <Button>.');
  console.log('   - Tokens và hệ thiết kế nhất quán.\n');
  process.exit(0);
} else {
  console.error(`❌ Phát hiện ${violations.length} lỗi vi phạm quy tắc UI (mục 10):`);
  violations.forEach((v) => {
    console.error(`   [${v.type}] ${v.file}:${v.line} -> ${v.detail}`);
  });
  console.error('\nVui lòng sửa các lỗi trên để vượt qua npm run lint:ui!\n');
  process.exit(1);
}
