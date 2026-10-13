import { toPng } from 'html-to-image';
import { Song } from './types';

export interface PlayerAssignment {
  name: string;
  songs: Song[];
}

/**
 * Chia danh sách bài hát cho từng người chơi (xoay vòng hoặc ngẫu nhiên)
 */
export function distributeSongs(
  songs: Song[],
  playerNames: string[],
  method: 'round-robin' | 'random' = 'round-robin'
): PlayerAssignment[] {
  const cleanPlayers = playerNames.map((p) => p.trim()).filter(Boolean);
  if (cleanPlayers.length === 0) {
    return [{ name: 'Cả phòng', songs }];
  }

  const result: PlayerAssignment[] = cleanPlayers.map((name) => ({
    name,
    songs: [],
  }));

  let songList = [...songs];
  if (method === 'random') {
    // Fisher-Yates shuffle
    for (let i = songList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [songList[i], songList[j]] = [songList[j], songList[i]];
    }
  }

  // Phân phối bài
  songList.forEach((song, idx) => {
    const targetPlayerIndex = idx % cleanPlayers.length;
    result[targetPlayerIndex].songs.push(song);
  });

  return result;
}

/**
 * Định dạng danh sách bài hát / setlist thành văn bản để copy vào Zalo / Messenger
 */
export function formatSetlistText(options: {
  bannerName?: string;
  songs?: Song[];
  assignments?: PlayerAssignment[];
}): string {
  const { bannerName, songs = [], assignments } = options;
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${now.getFullYear()}`;

  const lines: string[] = [];

  if (assignments && assignments.length > 0 && assignments.some((a) => a.songs.length > 0)) {
    lines.push('[SETLIST KARAOKE · CHẾ ĐỘ NHÓM]');
    if (bannerName) lines.push(`Banner: ${bannerName}`);
    lines.push(`Thời gian: ${timeStr}`);
    lines.push(`Tổng số người: ${assignments.length} · Tổng số bài: ${songs.length || assignments.reduce((acc, a) => acc + a.songs.length, 0)}`);
    lines.push('────────────────────────');

    assignments.forEach((assignment, index) => {
      lines.push(`\n[${index + 1}] ${assignment.name} (${assignment.songs.length} bài):`);
      if (assignment.songs.length === 0) {
        lines.push('  (Chưa có bài nào)');
      } else {
        assignment.songs.forEach((song, sIdx) => {
          lines.push(
            `  ${sIdx + 1}. ${song.title} - ${song.artist} (${'★'.repeat(song.rarity)})`
          );
        });
      }
    });
  } else {
    lines.push('[SETLIST KARAOKE]');
    if (bannerName) lines.push(`Banner: ${bannerName}`);
    lines.push(`Thời gian: ${timeStr}`);
    lines.push(`Tổng số bài: ${songs.length}`);
    lines.push('────────────────────────');

    songs.forEach((song, sIdx) => {
      lines.push(
        `${sIdx + 1}. ${song.title} - ${song.artist} (${'★'.repeat(song.rarity)})`
      );
    });
  }

  lines.push('\n────────────────────────');
  lines.push('Chúc phòng hát bùng nổ sân khấu!');
  lines.push('Tối Nay Hát Gì · Phòng Hát Chiêm Tinh');

  return lines.join('\n');
}

/**
 * Copy văn bản vào clipboard với fallback
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback cho trình duyệt cũ hoặc WebView
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Không thể copy vào clipboard:', err);
    return false;
  }
}

/**
 * Chụp và tải ảnh phần tử DOM dưới dạng PNG (ưu tiên tỉ lệ dọc cho mobile)
 */
export async function downloadElementAsPng(
  element: HTMLElement,
  filename = 'setlist-karaoke.png'
): Promise<boolean> {
  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 2, // Độ nét cao
      backgroundColor: '#0c0f17',
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
    return true;
  } catch (err) {
    console.error('Lỗi khi xuất ảnh PNG:', err);
    return false;
  }
}
