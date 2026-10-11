import { Song, Banner, PullState, PullResult, Rarity } from './types';

export const CONFIG = {
  rates: {
    5: 0.03,
    4: 0.15,
    3: 0.82,
  },
  pityFiveStar: 40, // đến lần rút thứ 40 không ra 5★ thì lần đó chắc chắn 5★
  tenPullGuaranteeMin: 4 as Rarity, // rút 10 đảm bảo ít nhất một bài >= 4★
  featuredRate: 0.5, // khi ra 4★/5★ mà banner có featured, 50% rơi vào featured
};

/**
 * Chọn ngẫu nhiên một phần tử từ mảng với bộ sinh số rng
 */
function pickRandom<T>(array: T[], rng: () => number): T {
  const index = Math.floor(rng() * array.length);
  return array[index];
}

/**
 * Giải quyết độ hiếm hợp lệ từ pool bài hát hiện có
 * Fallback: 5 -> 4 -> 3. Nếu không có ở chiều giảm, tìm ở độ hiếm khả dụng khác.
 */
export function resolveAvailableRarity(pool: Song[], requestedRarity: Rarity): Rarity {
  if (pool.some((s) => s.rarity === requestedRarity)) {
    return requestedRarity;
  }

  if (requestedRarity === 5) {
    if (pool.some((s) => s.rarity === 4)) return 4;
    if (pool.some((s) => s.rarity === 3)) return 3;
  } else if (requestedRarity === 4) {
    if (pool.some((s) => s.rarity === 3)) return 3;
    if (pool.some((s) => s.rarity === 5)) return 5;
  } else if (requestedRarity === 3) {
    if (pool.some((s) => s.rarity === 4)) return 4;
    if (pool.some((s) => s.rarity === 5)) return 5;
  }

  throw new Error('Pool rỗng');
}

/**
 * Chọn bài hát từ pool theo độ hiếm và banner (xử lý rate-up và tránh trùng lặp nếu có)
 */
function selectSongFromPool(
  pool: Song[],
  banner: Banner,
  rarity: Rarity,
  rng: () => number,
  excludeIds?: Set<string>
): Song {
  const poolAtRarity = pool.filter((s) => s.rarity === rarity);
  if (poolAtRarity.length === 0) {
    throw new Error('Pool rỗng');
  }

  // Ưu tiên các bài chưa được chọn nếu có excludeIds
  let candidatePool = excludeIds
    ? poolAtRarity.filter((s) => !excludeIds.has(s.id))
    : poolAtRarity;

  if (candidatePool.length === 0) {
    candidatePool = poolAtRarity;
  }

  // Xử lý rate-up khi độ hiếm là 4 hoặc 5
  if ((rarity === 4 || rarity === 5) && banner.featured && banner.featured.length > 0) {
    const featuredCandidates = candidatePool.filter((s) => banner.featured.includes(s.id));
    const nonFeaturedCandidates = candidatePool.filter((s) => !banner.featured.includes(s.id));

    if (featuredCandidates.length > 0) {
      if (nonFeaturedCandidates.length === 0) {
        return pickRandom(featuredCandidates, rng);
      }
      const isFeatured = rng() < CONFIG.featuredRate;
      if (isFeatured) {
        return pickRandom(featuredCandidates, rng);
      }
      return pickRandom(nonFeaturedCandidates, rng);
    }
  }

  return pickRandom(candidatePool, rng);
}

/**
 * Rút một bài hát (hàm nội bộ có hỗ trợ excludeIds cho pullTen)
 */
function drawSingle(
  pool: Song[],
  banner: Banner,
  state: PullState,
  rng: () => number,
  forcedRarity?: Rarity,
  excludeIds?: Set<string>
): { song: Song; state: PullState } {
  if (!pool || pool.length === 0) {
    throw new Error('Pool rỗng');
  }

  let targetRarity: Rarity;

  if (forcedRarity) {
    targetRarity = forcedRarity;
  } else if (state.pullsSinceFiveStar + 1 >= CONFIG.pityFiveStar) {
    // Kích hoạt pity 5★
    targetRarity = 5;
  } else {
    // Xác định theo tỉ lệ thông thường
    const roll = rng();
    if (roll < CONFIG.rates[5]) {
      targetRarity = 5;
    } else if (roll < CONFIG.rates[5] + CONFIG.rates[4]) {
      targetRarity = 4;
    } else {
      targetRarity = 3;
    }
  }

  // Fallback nếu pool không có độ hiếm mong muốn
  const resolvedRarity = resolveAvailableRarity(pool, targetRarity);
  const song = selectSongFromPool(pool, banner, resolvedRarity, rng, excludeIds);

  const newState: PullState = {
    pullsSinceFiveStar: song.rarity === 5 ? 0 : state.pullsSinceFiveStar + 1,
    pullsSinceFourStar: song.rarity >= 4 ? 0 : state.pullsSinceFourStar + 1,
  };

  return { song, state: newState };
}

/**
 * Rút 1 bài hát
 */
export function pull(
  pool: Song[],
  banner: Banner,
  state: PullState,
  rng: () => number = Math.random
): PullResult {
  const result = drawSingle(pool, banner, state, rng);
  return {
    songs: [result.song],
    state: result.state,
  };
}

/**
 * Rút 10 bài hát
 * - Thực hiện 10 lần rút liên tiếp, cập nhật pity từng lần
 * - Ưu tiên không trùng bài trong 10 bài nếu pool >= 10
 * - Đảm bảo ít nhất một bài >= 4★: nếu cả 10 bài đều 3★, thay bài thứ 10 bằng 4★
 */
export function pullTen(
  pool: Song[],
  banner: Banner,
  state: PullState,
  rng: () => number = Math.random
): PullResult {
  if (!pool || pool.length === 0) {
    throw new Error('Pool rỗng');
  }

  const avoidDuplicates = pool.length >= 10;
  const chosenIds = new Set<string>();
  const songs: Song[] = [];
  let currentState = { ...state };

  // Lưu lại snapshot state trước lần rút thứ 10 để tính lại nếu cần thay thế
  let stateBeforeTenth = { ...currentState };

  for (let i = 0; i < 10; i++) {
    if (i === 9) {
      stateBeforeTenth = { ...currentState };
    }
    const result = drawSingle(
      pool,
      banner,
      currentState,
      rng,
      undefined,
      avoidDuplicates ? chosenIds : undefined
    );
    songs.push(result.song);
    chosenIds.add(result.song.id);
    currentState = result.state;
  }

  // Kiểm tra đảm bảo ít nhất một bài >= 4★
  const hasMinRarity = songs.some((s) => s.rarity >= CONFIG.tenPullGuaranteeMin);
  if (!hasMinRarity) {
    // Bỏ id bài thứ 10 cũ ra khỏi chosenIds
    chosenIds.delete(songs[9].id);

    // Rút lại bài thứ 10 ép độ hiếm 4★
    const replaced = drawSingle(
      pool,
      banner,
      stateBeforeTenth,
      rng,
      CONFIG.tenPullGuaranteeMin,
      avoidDuplicates ? chosenIds : undefined
    );
    songs[9] = replaced.song;
    currentState = replaced.state;
  }

  return {
    songs,
    state: currentState,
  };
}
