import songsData from '../src/data/songs.json';
import bannersData from '../src/data/banners.json';
import { pull } from '../src/lib/gacha';
import { Song, Banner, PullState } from '../src/lib/types';

const songs = songsData as Song[];
const banners = bannersData as Banner[];
const banner = banners[0]; // Banner Tổng hợp

const TOTAL_PULLS = 100_000;

function runSimulation() {
  console.log(`Bắt đầu mô phỏng ${TOTAL_PULLS.toLocaleString()} lượt rút lẻ...`);

  let state: PullState = { pullsSinceFiveStar: 0, pullsSinceFourStar: 0 };
  const counts = { 3: 0, 4: 0, 5: 0 };
  let maxPullsWithoutFiveStar = 0;
  let currentStreakWithoutFiveStar = 0;

  const startTime = Date.now();

  for (let i = 0; i < TOTAL_PULLS; i++) {
    const result = pull(songs, banner, state);
    state = result.state;

    const drawnSong = result.songs[0];
    counts[drawnSong.rarity]++;

    if (drawnSong.rarity === 5) {
      if (currentStreakWithoutFiveStar > maxPullsWithoutFiveStar) {
        maxPullsWithoutFiveStar = currentStreakWithoutFiveStar;
      }
      currentStreakWithoutFiveStar = 0;
    } else {
      currentStreakWithoutFiveStar++;
    }
  }

  const duration = Date.now() - startTime;

  const rate5 = (counts[5] / TOTAL_PULLS) * 100;
  const rate4 = (counts[4] / TOTAL_PULLS) * 100;
  const rate3 = (counts[3] / TOTAL_PULLS) * 100;

  console.log('\n--- KẾT QUẢ MÔ PHỎNG ---');
  console.log(`Thời gian chạy: ${duration}ms`);
  console.log(`Tổng số lần rút: ${TOTAL_PULLS.toLocaleString()}`);
  console.log(`5★: ${counts[5].toLocaleString()} (${rate5.toFixed(2)}%) [Mục tiêu: ~3-4% do pity]`);
  console.log(`4★: ${counts[4].toLocaleString()} (${rate4.toFixed(2)}%) [Mục tiêu: ~14-15%]`);
  console.log(`3★: ${counts[3].toLocaleString()} (${rate3.toFixed(2)}%) [Mục tiêu: ~81-82%]`);
  console.log(`Chuỗi dài nhất không ra 5★: ${maxPullsWithoutFiveStar} (Pity kích hoạt ở 40)`);

  const passed =
    rate5 >= 2.8 &&
    rate5 <= 4.5 &&
    rate4 >= 13.5 &&
    rate4 <= 16.5 &&
    rate3 >= 79.5 &&
    rate3 <= 83.5 &&
    maxPullsWithoutFiveStar < 40;

  if (passed) {
    console.log('\n✅ KẾT QUẢ ĐẠT TIÊU CHÍ M1!');
  } else {
    console.error('\n❌ KẾT QUẢ KHÔNG ĐẠT TIÊU CHÍ!');
    process.exit(1);
  }
}

runSimulation();
