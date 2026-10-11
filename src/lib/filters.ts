import { Song, Banner, UserFilter, Voice } from './types';

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
 * Lọc pool bài hát theo filter người dùng chọn
 */
export function filterByUser(songs: Song[], userFilter?: UserFilter): Song[] {
  if (!userFilter) {
    return songs;
  }

  const { voice, genres, yearFrom, yearTo, maxDifficulty } = userFilter;

  return songs.filter((song) => {
    // Lọc theo voice
    if (voice && !matchVoice(song.voice, voice)) {
      return false;
    }

    // Lọc theo thể loại
    if (genres && genres.length > 0) {
      const hasGenre = song.genre.some((g) => genres.includes(g));
      if (!hasGenre) return false;
    }

    // Lọc theo năm
    if (yearFrom !== undefined && song.year < yearFrom) {
      return false;
    }
    if (yearTo !== undefined && song.year > yearTo) {
      return false;
    }

    // Lọc theo độ khó tối đa
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
