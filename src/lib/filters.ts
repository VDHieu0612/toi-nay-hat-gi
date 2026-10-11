import { Song, Banner, UserFilter, Voice } from './types';

export const DECADE_RANGES: Record<string, { yearFrom: number; yearTo: number; label: string }> = {
  '1990s': { yearFrom: 1990, yearTo: 1999, label: 'Thập niên 90s (1990 - 1999)' },
  '2000s': { yearFrom: 2000, yearTo: 2009, label: 'Thập niên 2000s (2000 - 2009)' },
  '2010s': { yearFrom: 2010, yearTo: 2019, label: 'Thập niên 2010s (2010 - 2019)' },
  '2020s': { yearFrom: 2020, yearTo: 2029, label: 'Thập niên 2020s (2020 - nay)' },
};

/**
 * Sinh link tìm kiếm karaoke trên YouTube (Mục 4.3):
 * https://www.youtube.com/results?search_query= + encodeURIComponent(title + " " + artist + " karaoke")
 */
export function getSearchKaraokeUrl(title: string, artist: string): string {
  const query = `${title} ${artist} karaoke`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * Lấy danh sách toàn bộ các thể loại (genre) có trong kho bài hát
 */
export function getAllGenres(songs: Song[]): string[] {
  const set = new Set<string>();
  songs.forEach((s) => s.genre.forEach((g) => set.add(g)));
  return Array.from(set).sort();
}

/**
 * Đếm số lượng tiêu chí lọc đang được người dùng áp dụng
 */
export function countActiveFilters(userFilter?: UserFilter): number {
  if (!userFilter) return 0;
  let count = 0;
  if (userFilter.voice && userFilter.voice !== 'tat-ca') count++;
  if (userFilter.genres && userFilter.genres.length > 0) count++;
  if (userFilter.decade && userFilter.decade !== 'tat-ca') count++;
  if ((userFilter.yearFrom !== undefined || userFilter.yearTo !== undefined) && !userFilter.decade) count++;
  if (userFilter.maxDifficulty !== undefined && userFilter.maxDifficulty < 5) count++;
  return count;
}

/**
 * Kiểm tra xem giọng hát của bài hát có phù hợp với bộ lọc giọng hay không.
 * Nếu bài hát là "tat-ca", nó phù hợp với mọi lựa chọn giọng.
 * Nếu bộ lọc là "tat-ca" hoặc undefined, chấp nhận tất cả bài hát.
 */
export function matchVoice(songVoice: Voice, targetVoice?: Voice): boolean {
  if (!targetVoice || targetVoice === 'tat-ca') {
    return true;
  }
  if (songVoice === 'tat-ca') {
    return true;
  }
  return songVoice === targetVoice;
}

/**
 * Lọc pool bài hát theo filter cố định của banner
 */
export function filterByBanner(songs: Song[], banner: Banner): Song[] {
  if (!banner.filter) {
    return songs;
  }

  const { genre, voice, yearFrom, yearTo } = banner.filter;

  return songs.filter((song) => {
    // Lọc theo genre của banner (nếu có)
    if (genre && genre.length > 0) {
      const hasGenre = song.genre.some((g) => genre.includes(g));
      if (!hasGenre) return false;
    }

    // Lọc theo voice của banner (nếu có danh sách voices)
    if (voice && voice.length > 0) {
      const hasVoice =
        song.voice === 'tat-ca' || voice.includes(song.voice) || voice.includes('tat-ca');
      if (!hasVoice) return false;
    }

    // Lọc theo năm
    if (yearFrom !== undefined && song.year < yearFrom) {
      return false;
    }
    if (yearTo !== undefined && song.year > yearTo) {
      return false;
    }

    return true;
  });
}

/**
 * Lọc pool bài hát theo filter người dùng chọn (Mục 4.1, M4)
 */
export function filterByUser(songs: Song[], userFilter?: UserFilter): Song[] {
  if (!userFilter) {
    return songs;
  }

  const { voice, genres, decade, yearFrom, yearTo, maxDifficulty } = userFilter;

  // Xác định khoảng năm hiệu lực (ưu tiên thập niên nếu chọn)
  let effYearFrom = yearFrom;
  let effYearTo = yearTo;
  if (decade && decade !== 'tat-ca' && DECADE_RANGES[decade]) {
    effYearFrom = DECADE_RANGES[decade].yearFrom;
    effYearTo = DECADE_RANGES[decade].yearTo;
  }

  return songs.filter((song) => {
    // 1. Lọc theo giọng hát (nam/nữ/song ca/tất cả)
    if (voice && !matchVoice(song.voice, voice)) {
      return false;
    }

    // 2. Lọc theo thể loại (chọn nhiều - khớp ít nhất 1 thể loại được chọn)
    if (genres && genres.length > 0) {
      const hasGenre = song.genre.some((g) => genres.includes(g));
      if (!hasGenre) return false;
    }

    // 3. Lọc theo thập niên / khoảng năm
    if (effYearFrom !== undefined && song.year < effYearFrom) {
      return false;
    }
    if (effYearTo !== undefined && song.year > effYearTo) {
      return false;
    }

    // 4. Lọc theo độ khó tối đa
    if (maxDifficulty !== undefined && song.difficulty > maxDifficulty) {
      return false;
    }

    return true;
  });
}

/**
 * Tổng hợp lọc pool bài hát cho banner và người dùng
 */
export function getFilteredPool(
  songs: Song[],
  banner: Banner,
  userFilter?: UserFilter
): Song[] {
  const bannerPool = filterByBanner(songs, banner);
  return filterByUser(bannerPool, userFilter);
}
