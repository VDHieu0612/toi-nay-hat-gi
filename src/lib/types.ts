export type Rarity = 3 | 4 | 5;
export type Voice = "nam" | "nu" | "song-ca" | "tat-ca";
export type Genre = "ballad" | "pop" | "rap" | "bolero" | "rock";  // RnB gộp vào "pop"

export interface Artist {
  id: string;            // kebab-case, ví dụ "ten-ca-si"
  name: string;
  kind: "singer" | "rapper" | "group";
  theme?: string;        // màu chủ đạo cho banner của ca sĩ (không dùng ảnh ca sĩ)
}

export interface Song {
  id: string;            // duy nhất, kebab-case, ví dụ "ten-bai-ca-si"
  title: string;
  artist: string;
  year?: number;
  artistId: string;      // trỏ tới artists.json
  genre: Genre[];        // chỉ dùng 5 nhóm: ballad, pop, rap, bolero, rock. KHÔNG đưa "song-ca" vào genre
  voice: Voice;
  views?: number;        // lượt xem (đơn vị: triệu, làm tròn) của bản MV/audio chính thức phổ biến nhất trên YouTube
  viewsAsOf?: string;    // thời điểm ghi số liệu, định dạng "YYYY-MM", bắt buộc nếu có `views`
  rarity: Rarity;        // độ viral, suy ra từ `views` theo mục 4.3, lưu cứng trong file
  rarityNote?: string;   // bắt buộc nếu rarity khác kết quả tính từ `views` hoặc bài không có `views`
  difficulty?: number;   // DEPRECATED: không dùng trong UI, giữ để không vỡ code cũ
  tags: string[];        // ví dụ ["cao-trao", "de-hat-dong-ca", "de-hat-khi-say"]
  challenge?: string;    // thử thách vui kèm theo khi hát (tùy chọn, không gắn với độ hiếm)
}

export interface Banner {
  id: string;
  type?: "general" | "genre" | "artist";
  artistId?: string;     // bắt buộc khi type = "artist": pool = mọi bài có artistId này
  extraSongIds?: string[]; // bài của ca sĩ khác thêm vào pool (feat., song ca), tùy chọn
  name: string;
  tagline?: string;      // mô tả ngắn hiển thị ở thumbnail
  description: string;
  filter?: {             // lọc cố định của banner (tùy chọn)
    genre?: Genre[];
    voice?: Voice[];
    yearFrom?: number;
    yearTo?: number;
  };
  featured: string[];    // id các bài rate-up (có thể rỗng)
  theme: string;         // mã màu chủ đạo của banner, ví dụ "#7c3aed"
  imageUrl?: string;     // URL hình ảnh poster/minh họa của banner (tùy chọn)
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
  genres?: Genre[];
  decade?: string;
  yearFrom?: number;
  yearTo?: number;
  maxDifficulty?: number;
}

