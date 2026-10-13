import { Banner, PullState, Song } from './types';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  bannerId: string;
  bannerName: string;
  songs: Song[];
}

const STORAGE_KEYS = {
  PULL_STATE: 'karaoke_gacha_pull_state',
  HISTORY: 'karaoke_gacha_history',
  COLLECTION: 'karaoke_gacha_collection',
  SELECTED_BANNER: 'karaoke_gacha_selected_banner',
  DISMISS_ORIENTATION_HINT: 'karaoke_gacha_dismiss_orientation_hint',
  CUSTOM_POSTERS: 'karaoke_gacha_custom_posters',
  CUSTOM_SONGS: 'karaoke_gacha_custom_songs',
  CUSTOM_BANNERS: 'karaoke_gacha_custom_banners',
} as const;

export const DEFAULT_PULL_STATE: PullState = {
  pullsSinceFiveStar: 0,
  pullsSinceFourStar: 0,
};

function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Lấy pull state từ localStorage
 */
export function loadPullState(): PullState {
  if (!isLocalStorageAvailable()) return { ...DEFAULT_PULL_STATE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.PULL_STATE);
    if (!raw) return { ...DEFAULT_PULL_STATE };
    const parsed = JSON.parse(raw);
    return {
      pullsSinceFiveStar: Number(parsed.pullsSinceFiveStar) || 0,
      pullsSinceFourStar: Number(parsed.pullsSinceFourStar) || 0,
    };
  } catch {
    return { ...DEFAULT_PULL_STATE };
  }
}

/**
 * Lưu pull state vào localStorage
 */
export function savePullState(state: PullState): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.PULL_STATE, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save pull state to localStorage:', err);
  }
}

/**
 * Reset pull state
 */
export function resetPullState(): PullState {
  savePullState(DEFAULT_PULL_STATE);
  return { ...DEFAULT_PULL_STATE };
}

/**
 * Lấy lịch sử rút (tối đa 20 lượt gần nhất)
 */
export function loadHistory(): HistoryEntry[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

/**
 * Thêm một lượt rút vào lịch sử (giữ tối đa 20 lượt)
 */
export function addHistoryEntry(
  entry: Omit<HistoryEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: number }
): HistoryEntry[] {
  const current = loadHistory();
  const newEntry: HistoryEntry = {
    id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: entry.timestamp || Date.now(),
    bannerId: entry.bannerId,
    bannerName: entry.bannerName,
    songs: entry.songs,
  };
  const updated = [newEntry, ...current].slice(0, 20);
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save history to localStorage:', err);
    }
  }
  return updated;
}

/**
 * Xóa lịch sử rút
 */
export function clearHistory(): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.HISTORY);
  } catch (err) {
    console.error('Failed to clear history from localStorage:', err);
  }
}

/**
 * Lấy danh sách ID các bài hát đã từng mở được (bộ sưu tập)
 */
export function loadCollection(): string[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.COLLECTION);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/**
 * Thêm bài hát vào bộ sưu tập (không trùng lặp)
 */
export function addSongsToCollection(songIds: string[]): string[] {
  const current = new Set(loadCollection());
  for (const id of songIds) {
    current.add(id);
  }
  const updated = Array.from(current);
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.COLLECTION, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save collection to localStorage:', err);
    }
  }
  return updated;
}

/**
 * Xóa bộ sưu tập
 */
export function clearCollection(): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.COLLECTION);
  } catch (err) {
    console.error('Failed to clear collection from localStorage:', err);
  }
}

/**
 * Lấy banner ID đã chọn trước đó
 */
export function loadSelectedBannerId(): string | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    return window.localStorage.getItem(STORAGE_KEYS.SELECTED_BANNER);
  } catch {
    return null;
  }
}

/**
 * Lưu banner ID đã chọn
 */
export function saveSelectedBannerId(bannerId: string): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.SELECTED_BANNER, bannerId);
  } catch (err) {
    console.error('Failed to save selected banner to localStorage:', err);
  }
}

/**
 * Lấy trạng thái đóng gợi ý xoay ngang
 */
export function loadDismissOrientationHint(): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    return window.localStorage.getItem(STORAGE_KEYS.DISMISS_ORIENTATION_HINT) === 'true';
  } catch {
    return false;
  }
}

/**
 * Lưu trạng thái đóng gợi ý xoay ngang
 */
export function saveDismissOrientationHint(dismissed: boolean): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.DISMISS_ORIENTATION_HINT, String(dismissed));
  } catch (err) {
    console.error('Failed to save orientation hint state:', err);
  }
}

/**
 * Chuyển đổi link ảnh Google (đặc biệt là link Google Drive chia sẻ) sang link xem ảnh trực tiếp
 * Ví dụ: https://drive.google.com/file/d/1AbC.../view?usp=sharing -> https://lh3.googleusercontent.com/d/1AbC...
 */
export function normalizeGoogleImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Nếu là tên file cục bộ (ví dụ: jack-j97.jpg hoặc /jack-j97.jpg)
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  // Google Drive: dạng /file/d/ID/view...
  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
  }

  // Google Drive: dạng ?id=ID hoặc open?id=ID
  const driveIdMatch = trimmed.match(/drive\.google\.com\/(?:open|uc)\?.*id=([a-zA-Z0-9_-]+)/);
  if (driveIdMatch && driveIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }

  return trimmed;
}

/**
 * Lấy danh sách link ảnh poster tùy chỉnh của các banner từ localStorage
 */
export function loadBannerCustomPosters(): Record<string, string> {
  if (!isLocalStorageAvailable()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.CUSTOM_POSTERS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Lưu link ảnh poster tùy chỉnh cho một banner
 */
export function saveBannerCustomPoster(bannerId: string, url: string): void {
  if (!isLocalStorageAvailable()) return;
  try {
    const map = loadBannerCustomPosters();
    if (!url.trim()) {
      delete map[bannerId];
    } else {
      map[bannerId] = normalizeGoogleImageUrl(url);
    }
    window.localStorage.setItem(STORAGE_KEYS.CUSTOM_POSTERS, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save custom poster:', err);
  }
}

/**
 * Lấy danh sách bài hát từ localStorage hoặc dùng danh sách mặc định
 */
export function loadAllSongs(defaultSongs: Song[]): Song[] {
  if (!isLocalStorageAvailable()) return defaultSongs;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.CUSTOM_SONGS);
    if (!raw) return defaultSongs;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return defaultSongs;
  } catch {
    return defaultSongs;
  }
}

/**
 * Lưu danh sách bài hát tùy chỉnh vào localStorage
 */
export function saveAllSongs(songs: Song[]): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.CUSTOM_SONGS, JSON.stringify(songs));
  } catch (err) {
    console.error('Failed to save songs to localStorage:', err);
  }
}

/**
 * Lấy danh sách banner từ localStorage hoặc dùng danh sách mặc định
 */
export function loadAllBanners(defaultBanners: Banner[]): Banner[] {
  if (!isLocalStorageAvailable()) return defaultBanners;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.CUSTOM_BANNERS);
    if (!raw) return defaultBanners;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return defaultBanners;
  } catch {
    return defaultBanners;
  }
}

/**
 * Lưu danh sách banner tùy chỉnh vào localStorage
 */
export function saveAllBanners(banners: Banner[]): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.CUSTOM_BANNERS, JSON.stringify(banners));
  } catch (err) {
    console.error('Failed to save banners to localStorage:', err);
  }
}

/**
 * Đặt lại dữ liệu bài hát và banner về mặc định ban đầu
 */
export function resetCustomData(): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.CUSTOM_SONGS);
    window.localStorage.removeItem(STORAGE_KEYS.CUSTOM_BANNERS);
  } catch (err) {
    console.error('Failed to reset custom data:', err);
  }
}


