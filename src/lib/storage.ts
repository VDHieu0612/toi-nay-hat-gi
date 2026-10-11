import { PullState, Song } from './types';

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

