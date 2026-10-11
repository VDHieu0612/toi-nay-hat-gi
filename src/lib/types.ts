export type Rarity = 3 | 4 | 5;
export type Voice = "nam" | "nu" | "song-ca" | "tat-ca";

export interface Song {
  id: string;            // duy nhất, kebab-case, ví dụ "ten-bai-ca-si"
  title: string;
  artist: string;
  year: number;
  genre: string[];       // ví dụ ["ballad"], ["rap"], ["bolero"], ["vpop"], ["rock"]
  voice: Voice;
  difficulty: 1 | 2 | 3 | 4 | 5;  // chủ quan, 1 = rất dễ hát
  rarity: Rarity;
  tags: string[];        // ví dụ ["cao-trao", "de-hat-dong-ca", "de-hat-khi-say"]
  challenge?: string;    // thử thách vui kèm theo (chỉ dùng cho bài 5★, tùy chọn)
}

export interface Banner {
  id: string;
  name: string;
  tagline?: string;      // mô tả ngắn hiển thị ở thumbnail
  description: string;
  filter?: {             // lọc cố định của banner (tùy chọn)
    genre?: string[];
    voice?: Voice[];
    yearFrom?: number;
    yearTo?: number;
  };
  featured: string[];    // id các bài rate-up (có thể rỗng)
  theme: string;         // mã màu chủ đạo của banner, ví dụ "#7c3aed"
}

export interface PullState {
  pullsSinceFiveStar: number;   // đếm cho pity 5★, giữ qua các lần rút, lưu localStorage
  pullsSinceFourStar: number;   // đếm cho đảm bảo 4★ khi rút lẻ (tùy chọn)
}

export interface PullResult {
  songs: Song[];
  state: PullState;             // state mới sau khi rút
}

export interface UserFilter {
  voice?: Voice;
  genres?: string[];
  decade?: string;
  yearFrom?: number;
  yearTo?: number;
  maxDifficulty?: number;
}
