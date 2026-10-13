import { Song, Banner, UserFilter, Voice, Genre } from './types';

export const ALL_GENRES: Genre[] = ['ballad', 'pop', 'rap', 'bolero', 'rock'];

/**
 * Sinh link tìm kiếm karaoke trên YouTube (Mục 4.3):
 * https://www.youtube.com/results?search_query= + encodeURIComponent(title + " " + artist + " karaoke")
 */
export function getSearchKaraokeUrl(title: string, artist: string): string {
  const query = `${title} ${artist} karaoke`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * Lấy danh sách thể loại có trong kho bài hát (hoặc mặc định 5 nhóm)
 */
export function getAllGenres(songs?: Song[]): Genre[] {
  if (!songs || songs.length === 0) return ALL_GENRES;
  const set = new Set<Genre>();
  songs.forEach((s) => s.genre.forEach((g) => set.add(g)));
  return ALL_GENRES.filter((g) => set.has(g));
}

/**
 * Đếm số lượng tiêu chí lọc đang được người dùng áp dụng (M4: chỉ giọng & thể loại)
 */
export function countActiveFilters(userFilter?: UserFilter): number {
  if (!userFilter) return 0;
  let count = 0;
  if (userFilter.voice && userFilter.voice !== 'tat-ca') count++;
  if (userFilter.genres && userFilter.genres.length > 0) count++;
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
  if (banner.type === 'artist' && banner.artistId) {
    const extraIds = banner.extraSongIds || [];
    return songs.filter((s) => s.artistId === banner.artistId || extraIds.includes(s.id));
  }

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

    // Lọc theo năm (nếu bài hát có năm phát hành)
    if (yearFrom !== undefined && song.year !== undefined && song.year < yearFrom) {
      return false;
    }
    if (yearTo !== undefined && song.year !== undefined && song.year > yearTo) {
      return false;
    }

    return true;
  });
}

/**
 * Lọc pool bài hát theo filter người dùng chọn (M4: chỉ giọng và thể loại; maxDifficulty giữ cho tương thích ngược)
 */
export function filterByUser(songs: Song[], userFilter?: UserFilter): Song[] {
  if (!userFilter) {
    return songs;
  }

  const { voice, genres, maxDifficulty } = userFilter;

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

    // 3. Lọc theo độ khó tối đa (tương thích ngược)
    if (maxDifficulty !== undefined && song.difficulty !== undefined && song.difficulty > maxDifficulty) {
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
  // Banner ca sĩ: không áp dụng bộ lọc người dùng (giữ trọn vẹn danh sách bài hát của ca sĩ)
  if (banner.type === 'artist') {
    return bannerPool;
  }
  return filterByUser(bannerPool, userFilter);
}

