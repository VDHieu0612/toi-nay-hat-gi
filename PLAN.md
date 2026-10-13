# PLAN.md: Gacha Karaoke

> File này dành cho AI coding agent. Đọc toàn bộ trước khi làm. Làm **từng mốc (milestone) một**, đúng thứ tự. Xong mốc nào phải đạt đủ "Tiêu chí hoàn thành" của mốc đó rồi mới sang mốc tiếp theo.

---

## 1. Tổng quan dự án

**Gacha Karaoke** là web tĩnh theo phong cách gacha (kiểu Genshin Impact) để chọn bài hát khi đi karaoke.

- Người dùng chọn banner, (tùy chọn) đặt bộ lọc, rồi bấm **Rút 1** hoặc **Rút 10**.
- Mỗi lần rút ra một bài hát dưới dạng thẻ có độ hiếm 3★ / 4★ / 5★.
- **Rút 10 = một setlist cho cả buổi hát.**
- Có **chế độ nhóm**: nhập tên người chơi, chia bài ra cho từng người.
- Có nút **tải ảnh setlist** và **copy** để chia sẻ vào group chat.

### Nguyên tắc sản phẩm
- Mobile-first (người dùng mở link từ Zalo/Messenger trên điện thoại). Trải nghiệm kết quả rút 10 tối ưu khi **xoay ngang điện thoại (landscape)**, vẫn dùng được ở portrait.
- Không đăng ký, không đăng nhập, không backend, không tiền tệ ảo. Lượt rút là vô hạn. **Host trên GitHub Pages**; web chỉ có gacha và nút đề xuất (mở Google Form). Không có trang quản trị: dữ liệu cập nhật bằng GitHub Actions (M8).
- Vào là dùng được trong vài giây.
- Ngôn ngữ giao diện: **tiếng Việt**.

---

## 2. Tech stack (cố định, không thêm thư viện ngoài danh sách)

| Hạng mục | Lựa chọn |
|---|---|
| Build | Vite |
| UI | React + TypeScript |
| Style | Tailwind CSS (hoặc CSS thuần nếu không muốn Tailwind, chọn một và giữ nhất quán) |
| Animation | CSS animation cho hiệu ứng nhỏ; **GSAP (timeline) hoặc Framer Motion** cho chuỗi animation gacha ở M3 (chọn một, không dùng cả hai) |
| Hạt / hiệu ứng ánh sáng | **Canvas 2D tự viết**, không dùng thư viện particle |
| Xuất ảnh | `html-to-image` |
| Lưu trữ | `localStorage` (qua `lib/storage.ts`) |
| Test logic | Vitest (chỉ cho `lib/gacha.ts`) |
| Deploy | **GitHub Pages**, triển khai bằng GitHub Actions (M8); `base` của Vite lấy từ biến môi trường `VITE_BASE` |

**Không dùng:** backend, database, trang quản trị, Google Apps Script, thư viện state phức tạp (Redux...), thư viện UI nặng.

---

## 3. Cấu trúc thư mục

```
/
  PLAN.md
  index.html
  vite.config.ts
  src/
    data/
      songs.json          # danh sách bài hát
      banners.json        # cấu hình banner
      artists.json        # danh sách ca sĩ/rapper (dùng cho banner theo ca sĩ)
      rarity.json         # SINH TỰ ĐỘNG bởi assign-rarity: seasonId, seed, độ hiếm từng bài (không sửa tay)
    lib/
      gacha.ts            # LOGIC RÚT, thuần, không import React hay DOM
      gacha.test.ts       # test cho logic
      storage.ts          # localStorage: pity, lịch sử, bộ sưu tập
      share.ts            # xuất ảnh, copy text
      filters.ts          # lọc pool theo bộ lọc
      types.ts            # kiểu dữ liệu dùng chung
      validate.ts         # chuẩn hóa + kiểm tra dữ liệu, dùng cho validate-songs và import-csv
    components/
      HomeScreen.tsx        # bố cục 3/7 + top bar
      BannerSidebar.tsx     # cột trái: danh sách banner
      BannerDetail.tsx      # cột phải: tranh banner + nút Rút
      ResultScreen.tsx      # màn hình kết quả (đè lên Home)
      FilterPanel.tsx
      PullAnimation.tsx
      SongCard.tsx
      ResultGrid.tsx
      History.tsx
      GroupMode.tsx
      Setlist.tsx
    components/ui/
      Button.tsx            # nút DUY NHẤT của app (mục 10.2)
      Chip.tsx              # bộ lọc, nhãn chọn được
      Notice.tsx            # khối thông báo info/warning/danger
      Icon.tsx              # icon SVG tự viết, KHÔNG emoji (mục 10.4)
    styles/
      tokens.css            # NGUỒN DUY NHẤT của màu, bo góc, khoảng cách, chữ (mục 10.1)
    App.tsx
    main.tsx
  scripts/
    simulate.ts           # mô phỏng 100.000 lần rút kiểm tra tỉ lệ
    validate-songs.ts     # kiểm tra tính hợp lệ của songs.json
    import-csv.ts         # CSV (từ Google Sheet) -> songs.json + artists.json
    assign-rarity.ts      # gán độ hiếm theo mục 4.3, ghi src/data/rarity.json
    sync-sheet.ts         # tải 2 CSV đã publish (Master, Artists), chạy import-csv -> assign-rarity -> validate-songs, ghi tóm tắt thay đổi
    check-ui.ts           # lint:ui, chặn emoji, màu viết tay, <button> tự viết (mục 10.6)
  .github/workflows/
    sync.yml              # đồng bộ Google Sheet -> repo, rồi build + deploy (M8)
    deploy.yml            # build + deploy lên GitHub Pages (M8)
  docs/
    SHEET_SETUP.md        # hướng dẫn thiết lập Sheet, publish CSV, bật Pages (M8)
```

### Quy tắc kiến trúc bắt buộc
1. `src/lib/gacha.ts` **không được import** React, DOM hay bất cứ thứ gì liên quan UI. Nó nhận dữ liệu vào, trả kết quả ra.
2. Hàm rút nhận `random` là tham số (mặc định `Math.random`) để test được bằng seed cố định.
3. Dữ liệu bài hát chỉ đọc từ `songs.json`, **không hard-code** bài hát trong component.
4. Thêm bài mới hoặc banner mới chỉ cần sửa JSON, không sửa code.

---

## 4. Schema dữ liệu

### 4.1. `types.ts`

```ts
export type Rarity = 3 | 4 | 5;
export type Voice = "nam" | "nu" | "song-ca" | "tat-ca";
export type Genre = "ballad" | "pop" | "rap" | "bolero" | "rock";  // RnB gộp vào "pop"

export interface Artist {
  id: string;            // kebab-case, ví dụ "ten-ca-si"
  name: string;
  kind: "singer" | "rapper" | "group";
  defaultGenres: Genre[]; // 1-2 nhóm, thể loại mặc định của mọi bài thuộc ca sĩ này (mục 4.4)
  theme?: string;        // màu chủ đạo cho banner của ca sĩ (poster mặc định tự vẽ, xem mục 2.3)
}

export interface Song {
  id: string;            // duy nhất, kebab-case, ví dụ "ten-bai-ca-si"
  title: string;
  artist: string;
  year?: number;         // KHÔNG bắt buộc, không hiển thị, không dùng để xếp hạng hay lọc
  artistId: string;      // trỏ tới artists.json
  genre?: Genre[];       // TÙY CHỌN, tối đa 2 nhóm; nếu trống thì kế thừa `Artist.defaultGenres` (mục 4.4). KHÔNG đưa "song-ca" vào genre (song ca là `voice`)
  voice: Voice;
  rarity: Rarity;        // KHÔNG nhập tay. Do `assign-rarity` sinh ra (mục 4.3) và đọc từ `rarity.json`; không phản ánh bài hay hay dở
  difficulty?: number;   // DEPRECATED: không dùng trong UI, giữ để không vỡ code cũ
  tags: string[];        // ví dụ ["cao-trao", "de-hat-dong-ca", "de-hat-khi-say"]
  challenge?: string;    // thử thách vui kèm theo khi hát (tùy chọn, không gắn với độ hiếm)
}

export interface Banner {
  id: string;
  type: "general" | "genre" | "artist";
  artistId?: string;     // bắt buộc khi type = "artist": pool = mọi bài có artistId này
  extraSongIds?: string[]; // bài của ca sĩ khác thêm vào pool (feat., song ca), tùy chọn
  name: string;
  description: string;
  filter?: {             // lọc cố định của banner (tùy chọn)
    genre?: Genre[];
    voice?: Voice[];
    yearFrom?: number;
    yearTo?: number;
  };
  featured: string[];    // id các bài rate-up (có thể rỗng)
  theme: string;         // mã màu chủ đạo của banner, ví dụ "#7c3aed"
  posterFocus?: string;  // CSS object-position của poster, ví dụ "50% 20%", để giữ khuôn mặt trong khung
}

export interface PullState {
  pullsSinceFiveStar: number;   // đếm cho pity 5★, giữ qua các lần rút, lưu localStorage
  pullsSinceFourStar: number;   // đếm cho đảm bảo 4★ khi rút lẻ (tùy chọn)
}

export interface PullResult {
  songs: Song[];
  state: PullState;             // state mới sau khi rút
}
```

### 4.2. Quy ước nội dung dữ liệu (quan trọng về bản quyền)
- **Chỉ lưu metadata** (tên bài, ca sĩ, năm, thể loại). **Tuyệt đối không lưu lời bài hát.**
- **Không dùng ảnh bìa album.** **Poster mặc định của banner là hình tự vẽ bằng CSS/SVG** (màu `theme`, họa tiết đĩa than/sóng âm, tên ca sĩ cỡ lớn). **Không đưa ảnh thật của ca sĩ vào repo hoặc bản deploy** (ảnh có bản quyền của người chụp và quyền hình ảnh của người trong ảnh). Người dùng được phép **tự chọn ảnh poster của riêng họ** (nút "Đổi ảnh poster"), ảnh đó **chỉ lưu trong trình duyệt của họ** (mục 2.3.1) và không bao giờ được tải lên đâu.
- **Phạm vi nội dung: chỉ bài khá nổi, ca sĩ/rapper nổi trội của thị trường Việt Nam.** Không cần phủ rộng mọi thể loại và mọi thập niên. Tiêu chí vào danh sách: nhiều người biết, có bản karaoke phổ biến trên YouTube.
- **Không lưu link karaoke.** Nút "Tìm karaoke" tự sinh URL tìm kiếm YouTube từ `title + artist + "karaoke"`.

### 4.3. Định nghĩa độ hiếm: trung lập, kiểm soát tỉ lệ theo từng ca sĩ, xáo lại mỗi phiên bản

**Số sao KHÔNG phải đánh giá.** Không xếp hạng bài hay hơn dở, ca sĩ này hơn ca sĩ kia, cũng không dựa trên lượt xem hay độ nổi (xếp theo các tiêu chí đó dễ gây tranh cãi giữa fan các nghệ sĩ). Số sao chỉ là **độ hiếm khi rút** để tạo cảm giác gacha.

- **Gán ngẫu nhiên có kiểm soát, theo từng ca sĩ.** Mỗi ca sĩ có `n` bài được chia theo tỉ lệ cố định: **5★ ≈ 15%, 4★ ≈ 30%, 3★ phần còn lại**. Như vậy ca sĩ nào cũng có đủ bài ở mọi bậc, không ai bị "toàn 3★".
- **Xáo lại mỗi phiên bản (season).** Mỗi phiên bản có một `seed`; đổi phiên bản thì độ hiếm của các bài được xáo lại. Nhờ vậy không bài nào "mãi mãi 3★", và không ai gán được ý nghĩa xếp hạng cho số sao.
- **Bài tâm điểm (`featured`) của banner luôn là 5★** trong phiên bản đó, được chọn xoay vòng mỗi phiên bản bởi chủ dự án (có thể tham khảo từ form đề xuất). Đây là bài được "chiếu sáng", không phải bài hay nhất.

**Thuật toán (`scripts/assign-rarity.ts`):**
1. Đọc `songs.json`, `banners.json`, và `src/data/rarity.json` (có `seasonId`, `seed`, và `rarity: { songId: 3|4|5 }`).
2. Chạy `assign-rarity --new-season <id>`: sinh `seed` mới, rồi với mỗi ca sĩ: tính điểm xáo `hash(seed + songId)` (hàm băm cố định, ví dụ cyrb53 hoặc mulberry32), sắp xếp theo điểm. Nếu ca sĩ có từ 4 bài trở lên: `n5 = max(1, round(0.15 × n))`, `n4 = round(0.30 × n)`, còn lại 3★. Dưới 4 bài thì toàn bộ 3★ (trừ bài `featured`).
3. Bài `featured` được ép 5★ và **tính vào** `n5` (nếu số `featured` vượt `n5` thì `n5` tăng theo).
4. Ghi kết quả vào `rarity.json`. Nguồn sự thật về độ hiếm là `rarity.json`; bộ nạp dữ liệu ghép `rarity` vào từng `Song` lúc chạy. (Dữ liệu giả ở M1-M4 có thể giữ `rarity` trong `songs.json` làm dự phòng; khi có `rarity.json` thì ưu tiên giá trị trong đó.)
5. **Thêm bài giữa phiên bản:** bài mới chưa có trong `rarity.json` được gán bằng quy tắc băm độc lập (`u = hash(seed + songId)` chuẩn hóa về [0,1): `u < 0.15` → 5★, `u < 0.45` → 4★, ngược lại 3★), **không đổi độ hiếm của bài cũ**. Cuối phiên bản chạy lại `--new-season` để cân bằng tỉ lệ từ đầu.
6. Lịch sử rút lưu **độ hiếm tại thời điểm rút**; bộ sưu tập theo `songId` nên không bị ảnh hưởng khi đổi phiên bản.

**Hiển thị:**
- Không đặt nhãn mang tính đánh giá cho từng bậc sao (không dùng các từ như "siêu hit", "bài ngon"). Chỉ hiển thị số sao.
- Có chú giải ngắn ở trang "Chi tiết" và dưới màn kết quả: *"Số sao chỉ là độ hiếm khi rút, được xáo lại mỗi phiên bản. Đây không phải đánh giá bài hay hay dở, hay ca sĩ này hơn ca sĩ khác."*

### 4.4. Thể loại: nhiều nhãn, kế thừa từ ca sĩ, do chủ dự án gán trong Sheet

- Một bài có thể thuộc nhiều thể loại (ví dụ pop pha rap). Hệ thống dùng **nhiều nhãn, tối đa 2**, không ép chọn một.
- **Người dùng cộng đồng không điền thể loại.** Form chỉ hỏi tên bài, ca sĩ, giọng hát phù hợp. Thể loại do **chủ dự án gán trong Sheet khi duyệt**.
- **Kế thừa:** `Artist.defaultGenres` (1-2 nhóm) là thể loại mặc định của mọi bài thuộc ca sĩ đó; `Song.genre` (tùy chọn) **ghi đè** cho bài khác biệt. **Thể loại hiệu dụng = `song.genre` nếu có, ngược lại `artist.defaultGenres`.** Chủ dự án chỉ gán thể loại một lần cho mỗi ca sĩ (tab `Artists`), chỉ sửa riêng bài nào lệch.
- **Quy tắc gán nhãn cho trường hợp lập lờ:** gán theo cách một người nghe bình thường sẽ gọi bài đó; nhãn đầu là cảm giác chủ đạo, nhãn thứ hai là màu sắc phụ; **không gán nhãn thứ hai nếu không chắc** (nhiều nhãn làm bài xuất hiện ở mọi bộ lọc và bộ lọc mất ý nghĩa).
- **Bộ lọc dùng phép HOẶC:** bài khớp nếu có ít nhất một thể loại hiệu dụng nằm trong các nhóm đang chọn. Số bài trên mỗi nút tính theo thể loại hiệu dụng (một bài có thể được đếm ở hai nút).
- Thể loại **không hiển thị trên thẻ bài**, chỉ dùng cho bộ lọc.
- Định nghĩa 5 nhóm: `ballad` (chậm, trữ tình), `pop` (nhạc trẻ, gồm R&B), `rap`, `bolero`, `rock` (gồm indie, pop-rock).

---

## 5. Quy tắc gacha (đặc tả cho `gacha.ts`)

### Hằng số (đặt trong một object `CONFIG`, dễ chỉnh)

```ts
export const CONFIG = {
  rates: { 5: 0.03, 4: 0.15, 3: 0.82 },
  pityFiveStar: 40,        // đến lần rút thứ 40 không ra 5★ thì lần đó chắc chắn 5★
  tenPullGuaranteeMin: 4,  // rút 10 đảm bảo ít nhất một bài >= 4★
  featuredRate: 0.5,       // khi ra 4★/5★ mà banner có featured, 50% rơi vào featured
};
```

### Hàm cần có

```ts
pull(pool: Song[], banner: Banner, state: PullState, rng?: () => number): PullResult
pullTen(pool: Song[], banner: Banner, state: PullState, rng?: () => number): PullResult
```

### Quy tắc
1. Mỗi lần rút: xác định độ hiếm theo `rates`, trừ khi pity kích hoạt.
2. **Pity 5★:** nếu `pullsSinceFiveStar + 1 >= pityFiveStar` thì lần này ép 5★. Ra 5★ thì reset bộ đếm về 0, ngược lại tăng 1.
3. **Rút 10:** thực hiện 10 lần rút lẻ liên tiếp (bộ đếm pity vẫn cập nhật từng lần). Nếu cả 10 lần đều 3★ thì **thay lần thứ 10 bằng 4★** (rút lại ở độ hiếm 4).
4. **Rate-up:** khi độ hiếm là 4 hoặc 5 và banner có `featured` thuộc độ hiếm đó trong pool, 50% chọn trong featured, 50% chọn ngẫu nhiên trong pool độ hiếm đó.
5. **Fallback pool trống:** nếu pool ở độ hiếm được chọn rỗng, tự rơi xuống độ hiếm thấp hơn (5→4→3). Nếu pool tổng rỗng, ném lỗi rõ ràng (`Error("Pool rỗng")`), UI phải chặn trước khi gọi.
6. **Trong một lần rút 10**, cố gắng **không trùng bài** (ưu tiên). Nếu pool nhỏ hơn 10 bài thì cho phép trùng.
7. Hàm **không mutate** `state` hay `pool` đầu vào, trả về state mới.

---

## 6. Các mốc triển khai

> Mỗi mốc: làm đúng phạm vi, không làm lan sang mốc sau. Commit sau mỗi mốc.

### M1: Dữ liệu + logic rút (chưa có UI)

**Việc cần làm**
- Khởi tạo project Vite + React + TS, cài Vitest.
- Tạo `types.ts`.
- Tạo `songs.json` với **30 bài giả** (ví dụ title "Bài thử 01", artist "Ca sĩ thử A"): đủ cả 3 độ hiếm (khoảng 20 bài 3★, 7 bài 4★, 3 bài 5★), đủ nhiều `genre` và `voice`.
- Tạo `banners.json` với 1 banner "Tổng hợp" (không filter, `featured` rỗng) và 1 banner thử có `featured`.
- Viết `gacha.ts`, `filters.ts`, `storage.ts` theo mục 5.
- Viết `gacha.test.ts` và `scripts/simulate.ts`.

**Tiêu chí hoàn thành**
- `simulate.ts` chạy 100.000 lần rút lẻ: tỉ lệ thực tế xấp xỉ 5★ ≈ 3% (cho phép lệch do pity, tối đa khoảng 4%), 4★ ≈ 15%, 3★ ≈ 82%.
- Test chứng minh: mọi lần rút 10 đều có ít nhất một bài ≥ 4★; không bao giờ có chuỗi hơn 40 lần liên tiếp không ra 5★; pool rỗng ở một độ hiếm không gây lỗi; rate-up cho featured ≈ 50% khi ra 4★/5★.
- `npm run test` xanh.

### M2: Màn hình chính dạng "Wish screen" (banner 3/7)

> Bản M2 đầu tiên (trang cuộn dọc: tiêu đề, danh sách banner, nút rút, lưới kết quả) **bị loại bỏ**. Làm lại bố cục theo spec dưới đây. Giữ nguyên `lib/*` (gacha, storage, filters). Chưa cần animation (thuộc M3), nhưng bố cục và component phải đúng để M3 gắn tiếp.

**Tham chiếu phong cách bố cục:** màn hình "Wish" của Genshin Impact (sidebar banner bên trái, tranh banner lớn bên phải, nút Wish ×1 / ×10 ở góc dưới phải). Chỉ tham khảo **bố cục và cách tổ chức thông tin**. **Không sao chép** hình ảnh, nhân vật, logo, font hay biểu tượng của Genshin; mọi hình minh họa là SVG/CSS tự vẽ.

#### 2.1. Bố cục tổng thể: ngang, chia 3/7, một màn hình không cuộn

- Ưu tiên **landscape**, toàn màn hình (`100dvh`), **không cuộn dọc** ở màn hình chính.
- Chia hai cột bằng grid: **30% trái / 70% phải** (`grid-template-columns: 3fr 7fr`).
- **Thanh trên cùng (top bar)**: nằm phía trên cả hai cột, chứa nút đóng/quay lại (nếu có), **chỉ số pity** ("Bảo hiểm 5★: 10 / 40"), nút "Đặt lại" pity (đặt trong menu phụ hoặc có xác nhận), nút bật/tắt âm thanh.

#### 2.2. Cột trái (30%): danh sách banner

- Danh sách banner xếp **dọc**, mỗi banner là một **thumbnail** nhỏ hình chữ nhật ngang (tên banner rút gọn + hình/màu đặc trưng của banner).
- Banner đang chọn: **nổi bật** (viền sáng theo `theme` của banner, hơi phóng to hoặc sáng hơn, có thanh đánh dấu bên cạnh).
- Click/tap để đổi banner; chuyển banner có hiệu ứng mượt (fade/slide ngắn), không tải lại trang.
- Nếu danh sách dài hơn chiều cao, cột trái tự cuộn dọc **riêng** (cột phải đứng yên).
- Khi có nhiều banner, **nhóm theo loại** (`type`): Tổng hợp, Thể loại, Ca sĩ, mỗi nhóm có tiêu đề nhỏ, có thể thu gọn.
- Hỗ trợ phím mũi tên lên/xuống để đổi banner trên desktop.

#### 2.3. Cột phải (70%): nội dung banner + nút gacha

Một "tranh banner" lớn. **Poster phủ kín toàn bộ khung** (full-bleed, xem mục 2.3.1), chữ và nút nằm **chồng lên poster**. Bố cục bên trong:

- **Trái trên:** nhãn loại banner (ví dụ "Banner thường" / "Banner Rate-Up") và **tên banner lớn** (kiểu tiêu đề hai dòng, từ nhấn màu theo theme).
- **Khối thông tin** (cạnh vạch dọc, như ảnh tham chiếu):
  - Mô tả ngắn banner (`description`).
  - Dòng cơ chế: "Mỗi 10 lượt rút bảo đảm có ít nhất một bài 4★ trở lên."
  - Nếu có `featured`: dòng "Xác suất tăng cho bài rate-up".
- **Bài tâm điểm (`featured`):** hiển thị dạng **một dải chip nhỏ** phía trên cụm nút (nhãn "UP!", tên bài, ca sĩ, số sao), **không dùng thẻ lớn** để không che poster. Nếu banner không có `featured` thì bỏ dải này.
- **Góc dưới phải:** hai nút gacha cạnh nhau:
  - **Rút ×1** ("1 bài hát").
  - **Rút ×10** ("Đảm bảo ≥ 4★ · Setlist"), nút chính, nổi bật hơn.
- **Góc dưới trái:** nút phụ "Chi tiết" (mở modal danh sách bài trong banner và tỉ lệ) và "Lịch sử" (mở danh sách lượt rút gần nhất, hoàn thiện ở M5; ở M2 có thể là nút ẩn hoặc vô hiệu hóa).
- Nút Rút bị vô hiệu hóa (kèm thông báo) khi pool của banner rỗng.

#### 2.3.1. Poster phủ kín khung banner

- Khung cột phải có `position: relative; overflow: hidden` và bo góc. **Poster là lớp nền `position: absolute; inset: 0`**, phủ 100% chiều rộng và cao của khung, **không có khung ảnh con bên trong, không để lộ khoảng trống quanh ảnh**.
- **Poster ngang (tỉ lệ khung hình từ 1.4 trở lên):** `object-fit: cover`, `object-position` lấy từ `posterFocus` của banner (mặc định `"50% 25%"` để giữ mặt).
- **Poster dọc hoặc gần vuông (dưới 1.4, ví dụ ảnh chân dung):** dùng cách "neo phải, mờ dần":
  - Lớp dưới: cùng ảnh phóng `cover` toàn khung, làm mờ (`blur(28px)`) và tối đi, để lấp đầy nền.
  - Lớp trên: ảnh sắc nét **cao 100% khung, neo sát cạnh phải**, mép trái làm mờ dần bằng `mask-image: linear-gradient(90deg, transparent 0%, #000 28%)`.
  - Nhờ vậy ảnh dọc vẫn nhìn như phủ kín khung mà không bị cắt nát khuôn mặt.
- **Lớp phủ gradient để chữ đọc được** (tính theo màu nền tối của app): một gradient ngang từ trái (đậm, opacity khoảng 0.9) sang phải (trong suốt, tại khoảng 65% chiều rộng), cộng một gradient dọc từ đáy (đậm, cao khoảng 35% khung) để cụm nút nổi rõ. Chữ có `text-shadow` nhẹ.
- **Bố cục cho chủ thể:** vùng chữ chiếm khoảng 45% bên trái; chủ thể của poster nên nằm ở nửa phải. Khuyến nghị poster ngang **16:9 hoặc 2:1, từ 1600×900 trở lên**, chủ thể ở 40% bên phải, 50% bên trái là nền tối hoặc đơn giản.
- **Cụm nút:** kiểu "kính" (`background: rgba(...)`, `backdrop-filter: blur(8px)`), nút Rút ×10 vẫn nổi bật nhất.
- **Nút "Đổi ảnh poster":** thu nhỏ thành icon ở góc trên phải, chỉ hiện khi rê chuột hoặc chạm vào khung; không chiếm chỗ khi không dùng.
- **Chuyển banner:** poster mới chuyển bằng crossfade (250-350 ms); tải trước poster của banner kế tiếp để không nhấp nháy.
- **Poster mặc định tự vẽ** (khi không có ảnh người dùng chọn): nền gradient màu `theme`, họa tiết đĩa than và vòng sóng âm lớn, **tên ca sĩ cỡ rất lớn mờ (watermark) ở nền**, vẫn dùng chung lớp phủ gradient và bố cục trên.
- **Ảnh do người dùng chọn:** đọc bằng `FileReader`, **thu nhỏ bằng canvas xuống tối đa 1920px chiều rộng, nén webp/jpeg chất lượng khoảng 0.85** trước khi lưu. Lưu bằng **IndexedDB** (API của trình duyệt, không thêm thư viện; ảnh lớn không vừa `localStorage`), khóa theo `banner.id`. Có nút "Dùng lại ảnh mặc định" để xóa. Ảnh **không** được gửi đi đâu và **không** ghi vào repo.
- Trên điện thoại portrait: poster phủ kín phần tranh banner phía trên cụm nút (cùng cách xử lý như trên); chữ đặt ở nửa dưới có gradient đậm hơn.

**Tiêu chí hoàn thành mục 2.3.1:** poster phủ kín khung ở mọi kích thước (desktop 1280-1920px, điện thoại landscape và portrait), không còn khoảng trống hay khung ảnh con; mặt người trong poster không bị cắt với ảnh mẫu cả ngang lẫn dọc; chữ và nút đọc rõ trên ảnh sáng lẫn tối; đổi banner không giật hay nháy; ảnh người dùng chọn còn nguyên sau khi tải lại trang và chỉ tồn tại trong trình duyệt đó.

#### 2.4. Màn hình kết quả (placeholder ở M2)

- Bấm Rút → chuyển sang màn hình kết quả toàn màn hình (đè lên màn hình chính), hiển thị thẻ bằng **component thật sự** `SongCard` dạng dọc với style tối thiểu (hiệu ứng, lật thẻ, hàng ngang hoàn chỉnh làm ở M3).
- Có nút **"Quay lại"** về màn hình chính và **"Rút tiếp"** (cùng loại lượt rút vừa làm).
- Rút 1: một thẻ ở giữa. Rút 10: 10 thẻ trong một hàng ngang (tạm thời chỉ cần đủ 10 thẻ, bố cục chi tiết xem M3 mục 3.3).

#### 2.5. Responsive

- **Landscape (điện thoại và desktop):** bố cục 3/7 như trên. Trên điện thoại landscape, giảm cỡ chữ, khoảng đệm và nút để mọi thứ vừa một màn hình.
- **Portrait (điện thoại đứng):** hiện **gợi ý không chặn** "Xoay ngang điện thoại để xem đẹp hơn" (có nút đóng, nhớ lựa chọn trong `localStorage`). Vẫn dùng được: cột trái chuyển thành **thanh tab banner nằm ngang ở trên cùng** (cuộn ngang), cột phải xếp dọc (tranh banner, thông tin, rồi hai nút rút ở dưới cùng, cố định ở đáy màn hình). Cho phép cuộn dọc nhẹ nếu nội dung không vừa.
- Dùng `dvh` và `env(safe-area-inset-*)` để tránh thanh địa chỉ và tai thỏ.

#### 2.6. Dữ liệu và state

- Thêm vào `Banner` (nếu chưa có): `tagline?: string` (mô tả ngắn hiển thị ở thumbnail), giữ nguyên các trường cũ.
- Banner đang chọn lưu vào `localStorage` để lần sau mở lại vẫn ở banner đó.
- Pity state tiếp tục lưu qua `storage.ts`.

**Tiêu chí hoàn thành**
- Màn hình chính ở landscape chia đúng **30/70**, **không có thanh cuộn dọc** của trang; cột trái tự cuộn riêng nếu nhiều banner.
- Đổi banner ở cột trái cập nhật ngay cột phải (tên, mô tả, theme, bài rate-up); banner đang chọn được giữ sau khi reload.
- Rút ×1 ra đúng 1 thẻ, Rút ×10 ra đúng 10 thẻ trên một hàng ngang; có "Quay lại" và "Rút tiếp".
- Reload trang, bộ đếm pity vẫn còn.
- Portrait: có gợi ý xoay ngang, tab banner ngang ở trên, nút rút cố định ở đáy, không tràn ngang trên màn 375px.
- Trên điện thoại landscape (khoảng 640-900px rộng), mọi thành phần vừa một màn hình, không bị che bởi thanh địa chỉ hoặc tai thỏ.

### M3: Thẻ bài gọn + chuỗi hiệu ứng gacha chủ đề "sân khấu karaoke"

> Hai bản M3 trước **bị loại bỏ** (bản 1: thẻ ngang, animation đơn giản; bản 2: thẻ cắt bằng `clip-path` làm mất nội dung, thẻ quá to nên không hiện đủ 10 thẻ, quá nhiều thông tin, animation còn đơn điệu). Làm lại hoàn toàn theo spec dưới đây. Không động đến `lib/gacha.ts`.

#### 3.0. Ranh giới sao chép (BẮT BUỘC đọc)

Mục tiêu là **cùng cảm giác và cùng cấu trúc nhịp điệu** với màn hình gacha của các game (màu báo trước độ hiếm, bùng nổ, lật từng thẻ, thẻ hiếm lật sau cùng), **không phải bản sao**.

- **KHÔNG** dùng, trích xuất hay mô phỏng sát hình: video, sprite, nhân vật, khung thẻ, biểu tượng, font, âm thanh/nhạc của Genshin Impact hay game nào khác.
- Mọi hình ảnh là **SVG/CSS/canvas tự vẽ**. Âm thanh (nếu có) là **tự tổng hợp bằng Web Audio** hoặc file **CC0/giấy phép cho phép dùng thương mại** (ghi nguồn và giấy phép vào `CREDITS.md`).
- Ý tưởng chung (đổi màu theo độ hiếm, tia sáng, rung màn hình, lật thẻ) là cơ chế phổ biến, được phép dùng; cách thể hiện phải là của riêng dự án.

#### 3.1. `SongCard`: gọn, chỉ cần tên bài + ca sĩ

**Nội dung hiển thị trên thẻ (và CHỈ những thứ này):**
1. **Số sao** (3/4/5★), hiển thị rõ.
2. **Hình minh họa SVG** đơn giản ở giữa (đĩa than / cassette / micro, tô màu theo độ hiếm). Chỉ là trang trí, giữ nhỏ gọn.
3. **Tên bài** (chữ lớn, đậm, tối đa 3 dòng, quá dài thì cắt bằng dấu `…`).
4. **Tên ca sĩ** (chữ nhỏ hơn, tối đa 2 dòng).

**Không hiển thị trên thẻ:** thể loại, năm, giọng, độ khó, nhãn "Mới", bất kỳ nhãn phụ nào. (Các thông tin đó, nếu cần, xem ở màn Setlist/Chi tiết, không phải trên thẻ.)

**Hình dạng và lỗi cần tránh:**
- Thẻ **dọc, hẹp**, đỉnh **vòm tròn** tạo bằng `border-radius` (ví dụ `border-radius: 999px 999px 14px 14px / 22% 22% 14px 14px`), **không dùng `clip-path` lên container chứa nội dung** (nó làm cắt mất chữ và sao).
- Tách lớp: (a) lớp nền/viền/glow của thẻ; (b) lớp nội dung nằm trong **vùng an toàn**, cách đỉnh vòm tối thiểu 20% chiều cao thẻ và cách hai bên tối thiểu 8% chiều rộng. Không phần tử nội dung nào được tràn ra ngoài thẻ.
- **Chùm sáng (beam)** bốc lên phía trên đỉnh thẻ là phần tử riêng, đặt `overflow: visible` ở thẻ cha, không bị thẻ lân cận che.
- Các thẻ trong hàng **không được chồng lên nhau** (có `gap` rõ ràng).

Phân cấp theo độ hiếm (phải nhìn khác biệt rõ ràng):

| Độ hiếm | Viền / màu chủ đạo | Hiệu ứng |
|---|---|---|
| 3★ | Xanh dương | Nền tối, chùm sáng mảnh, không hạt |
| 4★ | Tím | Glow vừa, chùm sáng rõ, vài hạt lấp lánh |
| 5★ | Vàng | Glow mạnh, chùm sáng dày, ánh kim chạy ngang, hạt sáng bay quanh |

Thẻ có **mặt sau** (úp, dùng chung, không tiết lộ độ hiếm) và **mặt trước**; lật bằng `rotateY` 3D.

#### 3.2. Kích thước thẻ: 10 thẻ phải vừa một hàng

Dùng biến CSS tính kích thước thẻ, không đặt cỡ cố định:

```css
/* gợi ý, agent được phép điều chỉnh miễn đạt tiêu chí */
--gap: clamp(6px, 1vw, 14px);
--pad: clamp(12px, 3vw, 40px);
--w-by-width: calc((100vw - 2 * var(--pad) - 9 * var(--gap)) / 10);
--w-by-height: calc(65dvh / 2.6);          /* chiều cao thẻ tối đa 65% viewport, tỉ lệ ~1:2.6 */
--card-w: max(var(--min-card-w), min(var(--w-by-width), var(--w-by-height)));
--min-card-w: 104px;
```

- **Desktop / màn hình rộng:** `--card-w` do công thức trên quyết định, **cả 10 thẻ vừa một hàng, không cuộn ngang**, không cuộn dọc.
- **Khi `--card-w` bị chặn ở mức tối thiểu (điện thoại, màn hình hẹp):** hàng thẻ **cuộn ngang** (`overflow-x: auto`, `scroll-snap-type: x proximity`, thẻ `scroll-snap-align: center`). **Vẫn một hàng duy nhất.**
- **Khuyến nghị landscape cho điện thoại:** ở portrait hiện gợi ý "Xoay ngang điện thoại để xem đẹp hơn" (không chặn, có nút đóng).
- Khi thẻ đang lật nằm ngoài vùng nhìn, **tự cuộn** tới thẻ đó. Có chỉ báo vị trí (ví dụ "3/10").
- Dùng `dvh` và `env(safe-area-inset-*)`.
- Chữ trên thẻ dùng `clamp()` theo `--card-w` để luôn đọc được; **tên bài phải đọc rõ ở `--card-w` nhỏ nhất**.

#### 3.3. `PullAnimation`: chuỗi 5 nhịp (chủ đề "sân khấu karaoke")

Tổng thời lượng (không tính Skip): khoảng **4-6 giây** cho rút 10 thường, **6-8 giây** nếu có 5★. Mỗi nhịp là một bước trong một timeline (GSAP timeline hoặc tương đương) để dễ chỉnh tốc độ.

**Chủ đề thị giác: "sân khấu karaoke"** (thay cho sao băng của các bản trước). Toàn bộ hiệu ứng tự sinh bằng code, **không dùng video hay ảnh dựng sẵn trả phí**.

**Nhịp 0: Tối sân khấu (0,5 giây)**
- Màn hình tối dần, nền gradient sâu (xanh đen sang tím rất tối) kèm vignette.
- 2-3 chùm **đèn spotlight** mờ quét chậm từ trên xuống.

**Nhịp 1: Tích năng lượng (1,8-2,4 giây), nhịp quan trọng nhất**
- 80-200 **hạt sáng** xuất hiện ở rìa màn hình rồi **xoáy hút vào tâm** theo quỹ đạo xoắn ốc (góc quay tăng, bán kính giảm), tăng tốc dần (ease-in), kết thành một **quả cầu năng lượng** phình dần ở giữa.
- Quả cầu **đập theo nhịp** (khoảng 120 BPM, mỗi nhịp khoảng 0,5 giây): mỗi nhịp phát ra một **vòng sóng âm** mỏng lan ra, quả cầu phồng 8-12% rồi co lại. **Thanh equalizer** (24-40 thanh) ở đáy màn hình nhảy theo nhịp, màu theo độ hiếm. Các spotlight quét nhanh dần và hội tụ về tâm.
- **Màu quả cầu = độ hiếm cao nhất của lượt rút:** xanh (3★), tím (4★), vàng (5★). Giữ khoảnh khắc đổi màu "đánh lừa" (xanh, tím, vàng) trước khi chốt; màu cuối luôn đúng độ hiếm thực. Với 5★: nền ngả vàng, nhịp đập nhanh gấp đôi trong 0,6 giây cuối, rung nhẹ.
- **Anticipation:** cuối nhịp, quả cầu co lại nhỏ trong khoảng 120 ms (hút mọi hạt vào) rồi mới nổ.

**Nhịp 2: Beat drop (0,8-1,0 giây)**
- Hitstop 60-80 ms ngay khi nổ, rồi chớp sáng theo màu độ hiếm (đỉnh opacity không quá 0,75).
- Đồng thời: 2-3 vòng sóng xung kích, tia sáng xoay (12-16 tia), nổ hạt phát sáng, rung màn hình giảm dần, spotlight chớp mạnh rồi quét ra ngoài, thanh equalizer bật lên cao nhất rồi hạ xuống.
- **5★:** thêm tia laser quét ngang và **confetti ánh vàng** (hạt chữ nhật mảnh, xoay, rơi chậm).
- Không có khoảng nào quá 150 ms mà màn hình không có chuyển động.

**Nhịp 3: Thẻ rơi vào hàng (0,8-1,2 giây)**
- Rút 1: thẻ úp bay lên từ điểm va chạm, phóng to từ 0,6 lên 1, dừng giữa màn hình.
- Rút 10: 10 thẻ úp **bay ra từ điểm va chạm rồi rơi vào đúng vị trí trong một hàng ngang** (so le nhau 40-60 ms).

**Nhịp 4: Lật thẻ (tổng 2-4 giây)**
- Lật **từng thẻ**, thứ tự: độ hiếm thấp trước, cao sau; mỗi thẻ cách nhau khoảng 0,2 giây.
- 3★: lật nhanh, xung sáng xanh nhỏ.
- 4★: lật chậm hơn, nổ tia sáng tím, hạt lấp lánh, dừng 0,3 giây.
- **5★ (lật cuối cùng):** làm tối các thẻ còn lại, **phóng to thẻ 5★ ra giữa** (khoảng 1,2 giây) với tia sáng vàng toàn màn hình và hạt, đếm sao từng cái một, rồi thu về vị trí trong hàng.
- Click vào thẻ úp để lật ngay thẻ đó. Nút **"Lật tất cả"** lật hết cùng lúc.

**Nhịp 5: Tổng kết**
- Cả hàng thẻ ngửa, có hiệu ứng sáng nhẹ lặp (idle shimmer cho 4★/5★). Hiện nút **"Xem toàn bộ Setlist"**, **"Rút tiếp"**, **"Trở về"**.

**Nút Skip luôn hiển thị** ở mọi nhịp. Bấm Skip: bỏ qua thẳng tới nhịp 5 với tất cả thẻ đã ngửa (vẫn hiển thị đúng độ hiếm).

**Âm thanh (tùy chọn, mặc định tắt, có nút bật/tắt):** gợi ý lớp âm theo nhịp: tiếng tích năng lượng tăng cao độ kèm nhịp kick, tiếng beat drop, tiếng "ting" khi lật thẻ (cao độ tăng theo độ hiếm), tiếng đếm sao khi 5★. Tự tổng hợp bằng Web Audio hoặc dùng file CC0; ghi `CREDITS.md`. Nếu chưa có âm thanh thì bỏ qua, không bắt buộc.

#### 3.4. Hiệu năng và khả năng truy cập
- Chỉ animate `transform` và `opacity` cho DOM; hạt vẽ trên **canvas chính phủ toàn màn hình** (cộng một canvas bloom độ phân giải thấp theo mục 3.5-A), `requestAnimationFrame`, giới hạn số hạt (tối đa 200 trên điện thoại, 400 trên desktop), `devicePixelRatio` tối đa 2, dừng khi tab bị ẩn.
- Tôn trọng `prefers-reduced-motion`: bỏ hạt xoáy, rung màn hình và confetti, chỉ giữ chớp sáng nhẹ và lật thẻ nhanh, vẫn ra đủ kết quả.
- Không để trang có thanh cuộn dọc thừa ở màn kết quả.
- Giữ 60fps trên điện thoại tầm trung; nếu tụt FPS thì tự giảm số hạt.
- Không thêm thư viện ngoài danh sách ở mục 2.

#### 3.5. Chỉnh sửa bắt buộc sau bản chạy thử v3

> Bản v3 đã đúng cấu trúc 5 nhịp, thẻ đã gọn, 10 thẻ đã vừa một hàng, không còn bị cắt chữ: **giữ nguyên các phần đó**. Phần dưới đây là các thông số **cụ thể** để tăng "lực" cho hiệu ứng. Đây là chỉnh sửa trên code hiện có, **không viết lại từ đầu**. (Đơn vị `px` là CSS px ở desktop 1920px, scale theo `vmin` cho màn hình khác.)

**A. Kỹ thuật vẽ bắt buộc để hiệu ứng không bị phẳng (áp dụng cho nhịp 1 và 2)**

Bản chạy thử trước vẽ hạt bằng vòng tròn tô màu và đuôi bằng gradient thẳng nên nhìn phẳng. Với chủ đề mới, bắt buộc dùng các kỹ thuật sau:
1. **Hạt bằng sprite phát sáng:** tạo sẵn vài texture radial-gradient trên canvas ẩn (nhiều kích thước, theo màu 3/4/5★), vẽ bằng `drawImage` với `globalCompositeOperation = "lighter"`. **Không** vẽ vòng tròn tô màu cứng, **không** dùng `shadowBlur` (chậm và xấu).
2. **Bloom giả:** thêm một canvas thứ hai phủ chồng, độ phân giải bằng một nửa, chép lại nội dung canvas chính mỗi khung, áp CSS `filter: blur(10px) brightness(1.5)` và `mix-blend-mode: screen`. Tự tắt lớp bloom nếu FPS thấp hơn 45.
3. **Vệt mờ (persistence):** thay `clearRect` bằng tô `destination-out` với alpha 0,15-0,25 mỗi khung, để hạt để lại vệt sáng mờ dần.
4. **Hạt đa dạng:** kích thước 2-24px, tuổi thọ khác nhau, **màu đổi theo tuổi** (trắng, rồi màu độ hiếm, rồi trong suốt), alpha giảm theo ease-out, một phần hạt nhấp nháy.
5. **Chuyển động có hồn:** mọi chuyển động dùng easing (không tuyến tính), có anticipation, overshoot, hitstop; quỹ đạo xoáy có thêm nhiễu nhỏ (sin hoặc noise) để không đều như máy.
6. **Nền sống:** gradient nền đổi dần theo màu độ hiếm trong nhịp 1, kèm vignette. Spotlight vẽ bằng `conic-gradient` hoặc `linear-gradient` mờ biên, `filter: blur(6px)`, `mix-blend-mode: screen`, quét theo hàm sin.
7. **Ngân sách hiệu năng:** tối đa 200 hạt trên điện thoại (400 trên desktop), `devicePixelRatio` tối đa 2, tự giảm số hạt khi FPS thấp.

**B. Beat drop (nhịp 2): trước đây là một khung chớp gần trắng toàn màn hình, rồi màn hình trống**
- **Hitstop:** đóng băng toàn bộ chuyển động **60-80 ms** ngay lúc va chạm, trước khi chớp.
- Chớp sáng theo **màu độ hiếm**, đỉnh opacity **≤ 0.75** (không cháy trắng), lên 120 ms, xuống 350 ms.
- **Ngay sau chớp, không có khoảng trống**, chạy đồng thời: 2-3 **vòng sóng xung kích** (stroke, scale từ 0 đến ~1.6 viewport, mờ dần, lệch nhau 80 ms); **tia sáng xoay** (conic-gradient ≥ 12 tia, fade trong ~0.9 giây); **nổ hạt** (120 hạt desktop / 60 hạt điện thoại, vận tốc giảm dần, trọng lực nhẹ); **rung màn hình** biên độ ~6px, 250 ms, giảm dần (damped).
- Quy tắc: **không được có khoảng > 150 ms mà màn hình không có chuyển động nào.**

**C. Thẻ vào hàng (nhịp 3): hiện chỉ mờ dần xuất hiện từ phía trái**
- Cả 10 thẻ xuất phát **từ tâm va chạm** (scale 0.15, opacity 0), bay **theo đường cong** vào đúng ô của mình, scale lên 1 có **overshoot** (kiểu `back.out(1.4)`), xoay nhẹ ±8° rồi về 0.
- Stagger **60 ms, từ giữa ra hai bên** (`from: "center"`), có vệt sáng ngắn bám theo thẻ.
- **Chồng nhịp:** tia sáng và sóng xung kích của nhịp 2 vẫn còn đang chạy khi thẻ bay ra (overlap ≥ 0.3 giây).

**D. Lật thẻ (nhịp 4): hiện lật liên tục, thẻ 4★ không có khoảnh khắc riêng**
- **3★:** stagger 0.12 giây, lật 0.35 giây, một xung sáng xanh nhỏ, chùm sáng mọc từ dưới lên.
- **4★:** **dừng 0.35 giây** trước khi lật (thẻ rung nhẹ, viền sáng dần), khi lật: nổ vòng tím + tia, chùm sáng cao hơn 3★, nền màn hình **pulse tím 0.4 giây**; giữ 0.3 giây sau khi lật rồi mới sang thẻ kế. **Các thẻ 4★ lật tuần tự từng thẻ, không lật chung.**
- **5★:** như mục 3.3 (làm tối các thẻ khác, phóng to ra giữa, đếm sao).
- Tổng thời lượng lật phản ánh nội dung: chỉ toàn 3★ khoảng 1.8 giây; mỗi thẻ 4★ cộng thêm khoảng 0.7 giây; có 5★ cộng thêm khoảng 2 giây.

**E. Chùm sáng phải phân biệt được độ hiếm (hiện 3★ và 4★ nhìn gần giống nhau)**

| Độ hiếm | Chiều cao chùm | Độ dày | Thêm |
|---|---|---|---|
| 3★ | 18% chiều cao thẻ | 2px | Một lớp, không hạt |
| 4★ | 35% | 4px | Hạt lấp lánh bay lên liên tục |
| 5★ | 60% | 8px | Quầng sáng + tia chéo + hạt dày |

**F. Thẻ: nội dung đang nhỏ so với diện tích, giữa thẻ nhiều khoảng trống**
- Tên bài: `font-size: clamp(14px, calc(var(--card-w) * 0.11), 22px)`, đậm; ca sĩ khoảng 0.8× tên bài.
- Hình minh họa phóng to khoảng 1.4×, đặt quanh 40% chiều cao thẻ; số sao to hơn.
- Hình dạng chữ nhật bo góc hiện tại **được chấp nhận**. Đỉnh vòm bằng `border-radius` là tùy chọn, **không** dùng `clip-path` lên container nội dung.

**G. Độ sáng tổng thể:** cảnh đang quá tối nên hiệu ứng bị chìm. Tăng độ sáng và số lượng sao nền, thêm vignette nhẹ, hạt phải nổi rõ trên nền.

**H. Âm thanh:** bản quay video **không có tiếng** (có thể do mặc định tắt). Phải có tối thiểu 3 âm tự tổng hợp bằng Web Audio: **tiếng tích năng lượng** (cao độ tăng dần, kèm nhịp kick theo BPM), **impact** lúc beat drop, **chime lật thẻ** (cao độ tăng theo độ hiếm). Mặc định vẫn tắt, nhưng ở lượt rút đầu tiên hiện một gợi ý nhỏ "Bật âm thanh để trải nghiệm tốt hơn" (có nút bật, nhớ lựa chọn). Kiểm tra bật/tắt hoạt động.

**I. Công cụ tinh chỉnh (bắt buộc, để chỉnh nhanh mà không phải rút ngẫu nhiên):**
- Gom mọi thông số thời gian, số hạt, cường độ vào **một file `animationConfig.ts`**.
- Chế độ debug khi có `?debug=1` trên URL: hiện bảng nhỏ với các nút **"Giả lập: toàn 3★ / có 4★ / có 5★"** (ép kết quả, **không** ảnh hưởng pity thật), nút **Replay**, và thanh trượt hệ số tốc độ (0.25× đến 2×) để xem chậm từng nhịp. Chế độ này **không** hiển thị với người dùng thường.
- Lý do: bản chạy thử hiện chỉ mới thấy kịch bản có 4★, **chưa ai thấy nhịp 5★ takeover chạy**.

#### 3.6. Nguồn mẫu tham khảo và lối thoát

- **Tham khảo mã mẫu để học kỹ thuật** (CodePen, GitHub, ví dụ của Three.js): từ khóa như "particles converge canvas", "energy orb", "radial burst", "light rays", "audio visualizer bars". **Chỉ dùng mẫu có giấy phép MIT / CC0 / Apache-2.0** (hiệu ứng đẹp trên mạng thường là phi thương mại hoặc không ghi giấy phép: không dùng). Viết lại theo ý tưởng, không dán nguyên; ghi nguồn vào `CREDITS.md`.
- **Không dùng** video, ảnh hay Lottie trả phí hoặc giấy phép không rõ. Mọi hiệu ứng tự sinh bằng code.
- **Lối thoát:** nếu sau khi áp dụng mục 3.5-A mà hiệu ứng vẫn phẳng, chuyển lớp hiệu ứng sang **PixiJS** (kèm `pixi-filters` có bloom thật) chỉ cho phần nền và hạt. **Phải hỏi chủ dự án trước khi thêm thư viện.**

**Tiêu chí hoàn thành**
- **Thẻ:** chỉ có sao, hình minh họa nhỏ, tên bài và ca sĩ. Không có chữ hay icon nào bị cắt. Không dùng `clip-path` lên container nội dung.
- **Kích thước:** desktop 1280-1920px, cả 10 thẻ vừa một hàng, không cuộn; tên bài đọc rõ. Điện thoại landscape: cuộn ngang mượt, thẻ đọc rõ.
- **Animation:** có đủ 5 nhịp; màu quả cầu năng lượng báo đúng độ hiếm cao nhất; có beat drop (chớp, sóng, tia, rung); 10 thẻ rơi vào một hàng; lật theo thứ tự thấp đến cao; 5★ lật cuối với hiệu ứng riêng.
- **Skip** hoạt động ở mọi thời điểm. Tắt hiệu ứng (`prefers-reduced-motion`) vẫn dùng được.
- 60fps trên điện thoại tầm trung, không giật rõ rệt.
- Mục 3.5: hạt vẽ bằng sprite phát sáng có bloom giả và vệt mờ; quả cầu đập theo nhịp với vòng sóng âm và equalizer; beat drop có hitstop, sóng, tia, hạt, rung và **không có khoảng trống > 150 ms**; thẻ bay ra từ tâm va chạm; 4★ có khoảnh khắc riêng; chùm sáng 3★/4★/5★ phân biệt rõ; có `animationConfig.ts` và chế độ `?debug=1` ép được cả ba kịch bản (toàn 3★, có 4★, có 5★).
- Không có tài sản của game khác trong repo; có `CREDITS.md` nếu dùng âm thanh bên ngoài.

### M4: Bộ lọc + nút "Tìm karaoke"

**Việc cần làm**
- `FilterPanel` đặt trước khi rút, **chỉ còn hai nhóm lọc**: **giọng** (tất cả / nam / nữ / song ca) và **thể loại** (chọn nhiều trong 5 nhóm: ballad, pop, rap, bolero, rock). **Bỏ lọc thập niên và lọc độ khó** (độ khó trùng với độ hiếm và dùng cùng biểu tượng sao nên gây nhầm lẫn; kho bài nhỏ nên thêm nhiều chiều lọc chỉ làm pool cạn).
- Mỗi nút lọc hiển thị **số bài còn lại** nếu chọn nó (ví dụ "Rap (14)"); nút nào cho kết quả **0 bài** thì làm mờ và vô hiệu hóa, để người dùng không rơi vào ngõ cụt.
- Lọc theo **thể loại hiệu dụng** với phép HOẶC (mục 4.4). Nhóm thể loại có **0 bài trong toàn kho** (ví dụ bolero khi chưa có bài nào) thì **ẩn hẳn** nút, không chỉ làm mờ.
- Cập nhật `songs.json` hiện có cho khớp 5 nhóm thể loại mới (gộp RnB vào pop, **bỏ "song-ca" khỏi `genre`**: song ca chỉ là `voice`). Thêm `artistId` theo schema mới (dữ liệu giả cũng phải hợp lệ; `year` giờ là tùy chọn; `rarity` của dữ liệu giả được gán sẵn nên chưa cần `assign-rarity`).
- Bộ lọc áp dụng lên pool của banner trước khi rút (`filters.ts`).
- Nếu pool sau lọc **dưới 10 bài**: hiện cảnh báo nhẹ, vẫn cho rút, cho phép trùng bài. Nếu **bằng 0**: chặn nút rút và hiện thông báo gợi ý nới bộ lọc.
- Mỗi thẻ có nút **Tìm karaoke**, mở tab mới:
  `https://www.youtube.com/results?search_query=` + `encodeURIComponent(title + " " + artist + " karaoke")`.

**Tiêu chí hoàn thành**
- Lọc đúng với từng tổ hợp điều kiện (có test cho `filters.ts`).
- Bộ lọc chỉ còn giọng và thể loại; số bài hiển thị đúng trên từng nút; nút cho 0 bài bị vô hiệu hóa; "song-ca" không còn xuất hiện ở danh sách thể loại.
- Nút Tìm karaoke mở đúng từ khóa, xử lý đúng ký tự tiếng Việt có dấu.

### M5: Chế độ nhóm + chia sẻ + lịch sử

**Việc cần làm**
- `GroupMode`: nhập 2-8 tên người chơi. Rút 10 xong, chia bài cho từng người (xoay vòng hoặc ngẫu nhiên, có nút chọn).
- `Setlist`: màn hình tổng hợp setlist theo từng người, trình bày gọn, chữ lớn, đọc rõ trên điện thoại.
- `share.ts`:
  - **Tải ảnh setlist** bằng `html-to-image` (PNG).
  - **Copy dạng text** (danh sách bài theo người) vào clipboard.
- `History`: lưu 20 lượt rút gần nhất và **bộ sưu tập bài đã từng ra** vào localStorage, có nút xóa.

**Tiêu chí hoàn thành**
- Ảnh tải về hiển thị đúng nội dung, không bị cắt, chữ rõ, kích thước phù hợp chia sẻ (ưu tiên tỉ lệ dọc).
- Copy text dán vào chat ra đúng định dạng.
- Reload trang không mất lịch sử.

### M6: Dữ liệu thật + validate + deploy

**Việc cần làm**
- Thêm `scripts/assign-rarity.ts` theo mục 4.3.
- Thêm `scripts/import-csv.ts`: chuyển file CSV xuất từ Google Sheet thành `songs.json` và `artists.json`, để chủ dự án nhập liệu bằng bảng tính thay vì sửa JSON. Cột của CSV:

  | Cột | Bắt buộc | Ghi chú |
  |---|---|---|
  | `title` | Có | Tên bài |
  | `artist` | Có | Tên ca sĩ/rapper (script tự tạo `artists.json` và `artistId` từ cột này, bỏ dấu tiếng Việt, `đ` thành `d`, kebab-case) |
  | `genre` | Không | Ghi đè thể loại của bài, 1-2 giá trị trong 5 nhóm, ngăn cách bằng `\|` (ví dụ `pop\|rap`). Trống thì kế thừa `defaultGenres` của ca sĩ (mục 4.4) |
  | `voice` | Có | `nam`, `nu`, `song-ca` hoặc `tat-ca`. Khi nhập từ Form chấp nhận thêm chữ của Form: `Giọng nam`, `Giọng nữ`, `Song ca`, giá trị khác thành `tat-ca` |
  | `hidden` | Không | `TRUE` thì bỏ qua bài này khi xuất bản (ẩn thay vì xóa) |
  | cột khác (ví dụ `note`, `year`, `rarity`, `views`, `mvUrl`, `check`) | Không | **Bỏ qua mọi cột không có trong bảng này.** Chủ dự án dùng cột `note` riêng trong Sheet để ghi chú (ví dụ ft. ai); script không đọc |

  **Google Sheet có 3 tab, không đổi tên:** `Master` (bảng trên), `Artists` (cột `artist`, `kind`, `defaultGenres` ngăn cách bằng `\|`, `theme` là mã màu), `Form_Responses` (do Google Form tạo, thêm cột `Trạng thái duyệt` và `Ghi chú`). Script đọc theo **tên tiêu đề cột**, không theo vị trí. `import-csv` nhận cả CSV của `Master` và của `Artists`; ca sĩ có trong `Master` mà thiếu trong `Artists` thì báo lỗi.

  `id` bài hát tự sinh từ `title` + `artist`; báo lỗi rõ theo số dòng nếu thiếu cột bắt buộc, sai `genre`/`voice`, hoặc trùng id. Chạy theo thứ tự: `import-csv` → `assign-rarity` → `validate-songs`.
- **Đồng bộ từ Google Sheet** (`scripts/sync-sheet.ts`): đọc biến môi trường `MASTER_CSV_URL` và `ARTISTS_CSV_URL` (đường dẫn CSV của hai tab sau khi dùng *Publish to web*), tải về `data/songs.csv` và `data/artists.csv`, rồi chạy `import-csv` → `assign-rarity` (chỉ gán bài mới, không đổi bài cũ, theo mục 4.3 bước 5) → `validate-songs`. Dữ liệu chỉ vào web qua bước build có validate, **không tải trực tiếp từ Sheet lúc người dùng mở web**. **Chỉ publish tab `Master` và `Artists`, tuyệt đối không publish `Form_Responses`** (có tên người đề xuất). Quy trình chạy tự động xem M8.
- Thay `songs.json` bằng **120-200 bài thật, chỉ bài khá nổi** (tiêu chí ở mục 4.2) (do chủ dự án cung cấp, agent **không tự bịa** dữ liệu bài hát thật nếu không được cung cấp). Agent chỉ viết công cụ nhập/kiểm tra.
- `scripts/validate-songs.ts`, chạy trước `build`, kiểm tra:
  - id không trùng, đúng kebab-case.
  - Đủ các trường bắt buộc (`title`, `artistId`, `voice`); **thể loại hiệu dụng** (`genre` của bài hoặc `defaultGenres` của ca sĩ) không rỗng, **tối đa 2 nhóm**, chỉ thuộc 5 nhóm cho phép; `voice` hợp lệ.
  - Mọi bài đều có độ hiếm trong `rarity.json`, thuộc {3,4,5}. **Mỗi ca sĩ từ 4 bài trở lên có ít nhất 1 bài 5★**; số bài mỗi bậc không lệch quá 1 so với tỉ lệ 15/30/55 của ca sĩ đó (trừ khi vừa thêm bài giữa phiên bản, khi đó chỉ cảnh báo). Mọi bài `featured` đều là 5★.
  - Mọi `artistId` trong `songs.json` tồn tại trong `artists.json`.
  - Mỗi độ hiếm có tối thiểu số bài (ví dụ ≥ 10 bài 3★, ≥ 5 bài 4★, ≥ 2 bài 5★).
  - `featured` trong banner trỏ tới id tồn tại.
  - Banner `type: "artist"`: `artistId` tồn tại; pool có **ít nhất 8 bài** (với tỉ lệ ở mục 4.3, 8 bài trở lên luôn có ít nhất 1 bài 5★ và 2 bài 4★); nếu không đủ thì báo lỗi rõ ràng để chủ dự án bổ sung bài, dùng `extraSongIds`, hoặc bỏ banner đó.
- **Đề xuất từ cộng đồng (không cần code thêm, chỉ cấu hình):** một Google Form "Đề xuất bài / ca sĩ" gồm các câu: *Loại* (Bài hát / Ca sĩ mới), *Tên bài hát*, *Ca sĩ*, *Ghi chú (tùy chọn)*; lời nhắc "không dán lời bài hát"; không thu thập email. Câu trả lời đổ vào **một Sheet riêng ("Requests")**, **tách hẳn khỏi Sheet "Master"** (chỉ chủ dự án có quyền sửa). Chủ dự án duyệt rồi chép các dòng được chọn sang "Master". **Chỉ publish tab Master, tuyệt đối không publish Requests.**
- Chân trang web có hai liên kết: **"Đề xuất bài / ca sĩ"** (mở Form) và **"Xem kho bài hiện có"** (Sheet Master ở chế độ chỉ xem, để người dùng kiểm tra trước khi đề xuất, giảm đề xuất trùng).
- Thêm chân trang: dòng mô tả "Dự án fan, không liên kết với hãng đĩa/ca sĩ nào".
- Meta tag Open Graph (title, description, ảnh preview) để link share đẹp trên Zalo/Messenger.
- Deploy lên **GitHub Pages** theo M8, kiểm tra tải nhanh trên mạng di động.

**Tiêu chí hoàn thành**
- `npm run build` chạy `validate-songs` và chỉ thành công khi dữ liệu hợp lệ.
- Có URL công khai, preview link hiển thị đúng khi dán vào chat.
- Lighthouse mobile: Performance ≥ 85 (mục tiêu, không bắt buộc cứng).

### M7: Banner theo ca sĩ (mở rộng đầu tiên sau MVP)

> Chỉ làm sau khi M6 xong (cần dữ liệu thật). Schema (`Artist`, `Banner.type`, `artistId`) đã có sẵn từ mục 4.1.

**Việc cần làm**
- Tạo `artists.json` và thêm banner `type: "artist"` cho **3-5 ca sĩ/rapper có đủ bài** (đủ điều kiện ở M6). Chọn theo gu nhóm bạn của chủ dự án, không tự chọn thay.
- **Pool** của banner ca sĩ = mọi bài có `artistId` đó (cộng `extraSongIds` nếu có). `featured` = 2-3 bài đại diện nhất của ca sĩ (rate-up 50% như banner thường).
- **Giao diện:** tên ca sĩ lớn trên tranh banner, màu theo `theme`, thẻ preview bài rate-up. Poster theo mục 2.3.1 (mặc định tự vẽ; ảnh do người dùng chọn chỉ lưu cục bộ). Banner nhóm trong sidebar theo mục "Ca sĩ" (M2).
- Pity 5★ **dùng chung toàn bộ banner** (đơn giản hơn, tránh người dùng phải theo dõi nhiều bộ đếm).
- Nếu pool nhỏ (dưới 10 bài): vẫn cho rút, cảnh báo có thể trùng bài như M4; quy tắc fallback độ hiếm ở mục 5 vẫn áp dụng.
- Chân trang giữ nguyên tuyên bố: dự án fan, không liên kết hay được bảo trợ bởi ca sĩ nào.

**Tiêu chí hoàn thành**
- Mỗi banner ca sĩ chỉ rút ra bài của ca sĩ đó (và `extraSongIds`); `featured` ra khoảng 50% khi trúng 4★/5★.
- Thêm ca sĩ mới chỉ cần sửa `artists.json`, `songs.json`, `banners.json`, không sửa code.
- `validate-songs` bắt được banner ca sĩ thiếu bài theo điều kiện ở M6.

### M8: Đồng bộ dữ liệu và triển khai bằng GitHub Actions (thay cho trang admin)

> Quyết định của chủ dự án: **không có trang quản trị, không Apps Script, không mật khẩu.** Web chỉ có gacha và nút đề xuất (mở Google Form). Quản trị = chỉnh Google Sheet rồi bấm một nút trên GitHub. Làm sau M6.

**Luồng làm việc**
1. Người dùng gửi đề xuất qua Google Form, dữ liệu vào tab `Form_Responses` (nên bật email thông báo khi có phản hồi mới).
2. Chủ dự án duyệt: chép các dòng được chọn sang `Master` (và thêm ca sĩ mới vào `Artists`), cập nhật `Trạng thái duyệt` ở `Form_Responses`.
3. Vào GitHub, tab Actions, chọn "Sync dữ liệu", bấm *Run workflow* (hoặc chờ lịch hằng ngày).
4. Workflow tải CSV, kiểm tra, cập nhật dữ liệu, build và deploy lên GitHub Pages.

**Nguồn sự thật và quy tắc**
- **Google Sheet là nguồn dữ liệu duy nhất.** `src/data/songs.json`, `artists.json`, `rarity.json` là **file sinh ra, không sửa tay** (sửa tay sẽ bị ghi đè ở lần đồng bộ sau). Muốn đổi dữ liệu thì sửa trong Sheet.
- Chỉ publish hai tab `Master` và `Artists` dưới dạng CSV. **Không publish `Form_Responses`.** Hai đường dẫn lưu thành *repository variables* `MASTER_CSV_URL`, `ARTISTS_CSV_URL` (không phải bí mật vì dữ liệu bài hát vốn công khai).
- Không cần token riêng ngoài `GITHUB_TOKEN`.

**Workflow `.github/workflows/sync.yml`**
- **Kích hoạt:** `workflow_dispatch` (nút Run workflow, có input `force` mặc định `false`) và `schedule` mỗi ngày một lần (gợi ý `0 1 * * *`, tương đương 8 giờ sáng giờ Việt Nam).
- **Các bước:** checkout → setup Node → `npm ci` → `npm run sync` → nếu `src/data/*.json` có thay đổi thì commit và push lên `main` bằng bot → build và deploy.
- **Lưu ý kỹ thuật bắt buộc:** commit do `GITHUB_TOKEN` tạo ra **không kích hoạt** workflow khác (cơ chế chống lặp của GitHub). Vì vậy bước build và deploy phải nằm **trong cùng workflow** (hoặc gọi `deploy.yml` qua `workflow_call`), **không** dựa vào trigger `push` để deploy sau khi bot commit.
- `concurrency` một nhóm duy nhất để không chạy song song. `permissions`: `contents: write`, `pages: write`, `id-token: write`.
- **Dữ liệu lỗi:** nếu `validate-songs` lỗi thì workflow thất bại với log đọc được (chỉ rõ dòng nào của Sheet sai và vì sao), **không commit, web không đổi**. Đây là chốt chặn thay cho bảng kiểm tra của trang admin.
- **Chốt chặn xóa nhầm:** nếu số bài sau đồng bộ ít hơn 80% số bài đang có trên web thì thất bại, trừ khi chạy với `force = true` (phòng khi lỡ xóa Sheet hoặc đường dẫn CSV hỏng).
- **Bản tóm tắt thay đổi:** ghi vào `$GITHUB_STEP_SUMMARY`: "+N bài mới, -M bài, K bài sửa", ca sĩ mới, cảnh báo (ví dụ banner ca sĩ chưa đủ 8 bài, ca sĩ thiếu `defaultGenres`).
- Mỗi lần đồng bộ là một commit trong lịch sử Git, hoàn tác được bằng `git revert`.
- Lưu ý: GitHub có thể tự tắt workflow theo lịch khi repo không có hoạt động trong 60 ngày, và lịch có thể chạy trễ. **Nút Run workflow là đường chính**, lịch hằng ngày chỉ là phụ.

**Workflow `.github/workflows/deploy.yml`**
- **Kích hoạt:** `push` lên `main` (khi chủ dự án sửa code), `workflow_call`, `workflow_dispatch`.
- **Các bước:** `npm ci` → `npm run build` (đã gồm `lint:ui` và `validate-songs`) → `actions/upload-pages-artifact` → `actions/deploy-pages`. Cài đặt repo: Pages, Source = **GitHub Actions**.
- `vite.config.ts`: `base` lấy từ biến môi trường `VITE_BASE` (đặt `/<tên-repo>/` nếu là project page, `/` nếu là `<user>.github.io`). Web chỉ có một trang, trạng thái giữ bằng state, không dùng router đường dẫn con và không cần `404.html`.
- Meta Open Graph dùng URL tuyệt đối của GitHub Pages.

**Tài liệu:** agent viết `docs/SHEET_SETUP.md` hướng dẫn từng bước: tạo 3 tab và tiêu đề cột, publish hai tab, đặt repository variables, bật Pages với Source = GitHub Actions, chạy workflow lần đầu, đọc log lỗi.

**Tiện ích trong Sheet (chỉ cần hướng dẫn trong `docs/SHEET_SETUP.md`, không cần code):** dropdown (data validation) cho cột `voice` trong `Master`; cột trợ giúp trong `Form_Responses` đánh dấu "Đã có" hoặc "Mới" bằng công thức so khớp với `Master`; bật email thông báo khi Form có phản hồi mới.

**Tiêu chí hoàn thành**
- Bấm Run workflow: nếu Sheet hợp lệ thì web cập nhật đúng theo Sheet sau vài phút; không có thay đổi dữ liệu thì không tạo commit mới.
- Sheet có lỗi (thiếu giọng, thể loại sai...): workflow thất bại, log chỉ rõ dòng lỗi, web giữ nguyên.
- Xóa nhầm phần lớn Sheet: workflow chặn (trừ khi `force`).
- `Form_Responses` không bao giờ xuất hiện trong repo, log hay bản deploy.
- Bản tóm tắt thay đổi hiển thị ở trang tóm tắt của lần chạy.
- Có `docs/SHEET_SETUP.md` đủ để làm lại từ đầu mà không cần hỏi thêm.

---

## 7. Quy tắc làm việc cho agent

1. **Một mốc mỗi lần.** Không tự làm trước mốc sau, kể cả khi thấy "tiện".
2. **Không thêm thư viện** ngoài danh sách ở mục 2 khi chưa hỏi. Nếu thấy cần, nêu lý do và chờ xác nhận.
3. **Không đụng file không liên quan** đến mốc đang làm.
4. **Không bịa dữ liệu thật** (tên bài, ca sĩ, năm) khi chưa được cung cấp. Dữ liệu giả phải gắn nhãn rõ "thử".
5. **Không đưa lời bài hát, ảnh bìa album, logo của bất kỳ ai vào repo.**
6. Giữ `gacha.ts` thuần (xem mục 3, quy tắc 1-2). Mọi thay đổi tỉ lệ chỉ làm qua `CONFIG`.
7. Cuối mỗi mốc, báo cáo ngắn: đã làm gì, tiêu chí nào đã đạt (kèm cách kiểm chứng), điều gì còn tồn đọng.
8. Khi gặp điểm mơ hồ trong plan này, chọn phương án đơn giản nhất, ghi chú giả định vào cuối báo cáo, đừng dừng lại hỏi quá nhiều.
9. Commit message rõ ràng theo mốc, ví dụ `feat(m1): gacha logic and simulation`.
10. **Mọi giao diện phải tuân theo mục 10** (hệ thiết kế): chỉ dùng `Button`, `Chip`, `Notice`, `Icon` và biến trong `tokens.css`; **không emoji**; không viết mã màu hay `<button>` trực tiếp. `npm run lint:ui` phải chạy sạch trước khi báo hoàn thành mốc.

---

## 8. Ngoài phạm vi MVP (KHÔNG làm trừ khi được yêu cầu)

- Banner sự kiện theo mùa.
- Vote "bài này sai độ khó", trang quản trị, Google Apps Script và bất kỳ tính năng cần backend.
- Điểm danh, mini game dân gian để nhận lượt.
- Tài khoản, bảng xếp hạng toàn cầu.
- Tích hợp phát nhạc/karaoke trực tiếp trong web.
- Đa ngôn ngữ.

---

## 9. Checklist cuối cùng trước khi coi MVP hoàn thành

- [ ] Màn hình chính dạng Wish screen: banner 30% trái / nội dung + nút rút 70% phải, không cuộn dọc ở landscape.
- [ ] Rút 1 và Rút 10 hoạt động, tỉ lệ đúng đặc tả, có test.
- [ ] Pity và đảm bảo 4★ khi rút 10 hoạt động.
- [ ] Thẻ gọn (chỉ sao, tên bài, ca sĩ) và chuỗi hiệu ứng 5 nhịp (tích năng lượng, beat drop, lật thẻ), có Skip.
- [ ] Rút 10 hiển thị một hàng ngang (cuộn ngang + snap trên điện thoại, khuyến nghị landscape).
- [ ] Nút Tìm karaoke đúng từ khóa.
- [ ] Chế độ nhóm + setlist + tải ảnh + copy text.
- [ ] Lịch sử và bộ sưu tập lưu localStorage.
- [ ] Dữ liệu thật (chỉ bài nổi) đã qua `validate-songs`, độ hiếm do `assign-rarity` sinh ra và có chú giải trung lập (số sao không phải đánh giá).
- [ ] Bộ lọc gọn (giọng + thể loại), nút 0 bài bị vô hiệu hóa.
- [ ] Đồng bộ Sheet qua GitHub Actions hoạt động: dữ liệu lỗi thì chặn, web giữ nguyên; có `docs/SHEET_SETUP.md` (M8).
- [ ] Giao diện đồng nhất theo mục 10: mọi nút là pill và đến từ `Button`, mỗi màn hình một nút primary, không emoji, không màu viết tay, `lint:ui` sạch.
- [ ] Deploy xong, preview link đẹp, dùng tốt trên điện thoại.
- [ ] Chân trang có tuyên bố dự án fan, không lưu lời bài hát hay ảnh bìa.

---

## 10. Hệ thiết kế giao diện (UI): áp dụng cho MỌI mốc

> Mục tiêu: nút bấm, chip, thẻ, modal, thông báo trông **đồng nhất**, và **không có emoji** ở bất kỳ đâu trong giao diện. Phần này **không đổi** logic, dữ liệu, bố cục tổng thể, kích thước thẻ bài hay hiệu ứng gacha. Giá trị màu bên dưới là gợi ý theo giao diện hiện tại; nếu code đã có giá trị tương ứng thì tái sử dụng, nhưng gộp về **đúng một bộ** trong `tokens.css`.

### 10.1. Design tokens (`src/styles/tokens.css`, nguồn duy nhất)

Khai báo bằng CSS variables.

| Nhóm | Biến | Giá trị gợi ý | Dùng cho |
|---|---|---|---|
| Nền | `--bg` | `#0a0f1f` | Nền app |
| Nền | `--surface` | `#121a2e` | Panel, modal, thẻ |
| Nền | `--surface-2` | `#1a243d` | Phần tử nằm trên surface |
| Viền | `--border` | `rgba(255,255,255,0.10)` | Viền mặc định |
| Chữ | `--text` | `#f1f5f9` | Chữ chính |
| Chữ | `--text-muted` | `#94a3b8` | Chữ phụ, tiêu đề mục |
| Hành động | `--primary` | gradient `#fde68a` đến `#f5b800`, chữ `#3b2a00` | Nút chính |
| Hành động | `--secondary` | nền `#f1f5f9`, chữ `#0a0f1f` | Nút phụ nổi bật |
| Hành động | `--ghost` | nền trong suốt hoặc `--surface-2`, viền `--border` | Nút phụ nhẹ |
| Nhấn | `--accent` | `#7c5cff` | Trạng thái được chọn, focus |
| Trạng thái | `--danger` / `--success` | `#ef4444` / `#22c55e` | Lỗi, thành công |
| Độ hiếm | `--rarity-3` / `--rarity-4` / `--rarity-5` | `#38bdf8` / `#a855f7` / `#facc15` | **Chỉ** thẻ bài và số sao |
| Bo góc | `--radius-pill` | `999px` | **Mọi** nút, chip, toggle, badge |
| Bo góc | `--radius-card` / `--radius-modal` | `20px` / `24px` | Thẻ, panel / modal |
| Đổ bóng | `--shadow-1` / `--shadow-2` | tự định nghĩa | Thẻ / modal |

- Thang khoảng cách: **4, 8, 12, 16, 24, 32** (không dùng số lẻ ngoài thang).
- **Một họ font** cho toàn app. Cỡ chữ: 12, 14, 16, 20, 28, 40. Độ đậm chữ nút: 600.
- **Không viết mã màu (hex, rgb) trực tiếp** trong component hay CSS riêng lẻ, chỉ dùng biến từ `tokens.css`. Hai ngoại lệ: **hiệu ứng canvas** (mục 3.5) và **màu `theme` riêng của từng banner/ca sĩ** trong `banners.json`/`artists.json`.

### 10.2. Component nút duy nhất (`components/ui/Button.tsx`)

Dùng cho **tất cả** nút trong app; xóa mọi kiểu nút tự viết rải rác.
- **Biến thể (`variant`):** `primary`, `secondary`, `ghost`, `danger`.
- **Kích thước (`size`):** `sm` (cao 36px), `md` (cao 44px), `lg` (cao 56px). Vùng bấm trên điện thoại **tối thiểu 44px**.
- **Hình dạng:** bo tròn dạng pill (`--radius-pill`) cho **mọi** biến thể và kích thước, không ngoại lệ.
- **Trạng thái bắt buộc:** hover (sáng hơn nhẹ), active (thu nhỏ khoảng 0,98), `focus-visible` (vòng viền `--accent` rõ ràng, không bị cắt), disabled (giảm độ đậm, không bấm được, con trỏ `not-allowed`), loading (nếu cần).
- **Phân cấp:** mỗi màn hình **chỉ có MỘT nút `primary`** (hành động chính). Ví dụ màn chính: "Rút ×10" là `primary`, "Rút ×1" là `secondary`, "Chi tiết", "Lịch sử", "Trở về" là `ghost`. Màn kết quả: "Rút tiếp" là `primary`, "Xem toàn bộ Setlist" là `secondary`.
- **Nút chỉ chứa chữ.** Chỉ dùng icon khi nút **không có chữ** (đóng, bật/tắt âm thanh, đổi ảnh poster) và phải có `aria-label`.

### 10.3. Chip và Notice

- **`Chip.tsx`:** bộ lọc và nhãn chọn được, dạng pill, trạng thái được chọn dùng `--accent`. Nút lọc bị vô hiệu hóa (0 bài) làm mờ.
- **`Notice.tsx`:** khối thông báo với 3 mức (`info`, `warning`, `danger`), có icon SVG ở mục 10.4, viền và nền lấy từ token. Dùng cho cảnh báo kho bài dưới 10 bài, banner rỗng, thông tin phiên bản...

### 10.4. Icon và cấm emoji

- **Tự viết `Icon.tsx` bằng SVG inline**: nét 1,75px, đầu nét bo tròn, kế thừa màu chữ qua `currentColor`. Chỉ gồm icon thật sự cần: đóng, quay lại, âm thanh bật, âm thanh tắt, cảnh báo, thông tin, đổi ảnh, đồng hồ, mũi tên. **Không cài thư viện icon.**
- **Cấm tuyệt đối emoji và ký tự hình ảnh (pictograph)** trong: nút, chip, tiêu đề, nhãn, dashboard, modal, thông báo, trạng thái rỗng, tooltip, placeholder, thông báo lỗi. Ví dụ phải gỡ: biểu tượng mặt người cạnh "Nam/Nữ/Song ca", biểu tượng micro, đồng hồ cát, tia sét cạnh tiêu đề bộ lọc, biểu tượng pháo hoa cạnh "Xem toàn bộ Setlist", biểu tượng cảnh báo và đồng hồ trong khối thông báo, ký hiệu trang trí kiểu ✦ ❖ ✨.
- **Chỉ được dùng các ký tự văn bản sau:** `★` (số sao), `×` (ví dụ "Rút ×10"), `←` và `→`, dấu chấm giữa `·`.
- Cần tín hiệu trực quan cho thông báo thì dùng `Icon` SVG hoặc chỉ dùng màu viền và chữ.

### 10.5. Panel, tiêu đề, nhãn

- Panel, thẻ, modal dùng chung `--surface`, `--border`, `--radius-card` hoặc `--radius-modal`, và cùng bộ đổ bóng.
- **Tiêu đề mục:** một kiểu duy nhất (cỡ 12, viết hoa, giãn chữ nhẹ, màu `--text-muted`). **Tiêu đề lớn:** một kiểu duy nhất.
- Nhãn bằng tiếng Việt, viết hoa chữ cái đầu câu, không viết hoa toàn bộ trừ tiêu đề mục. Giữ nguyên các nhãn đã có ("Rút ×1", "Rút ×10", "Chi tiết", "Lịch sử").

### 10.6. Kiểm tra tự động (`npm run lint:ui`)

`scripts/check-ui.ts` quét `src/**/*.{ts,tsx,css}` và **thoát mã khác 0** nếu:
- Có emoji hoặc ký tự Unicode `Extended_Pictographic`, trừ danh sách cho phép ở mục 10.4.
- Có mã màu hex/rgb viết trực tiếp ngoài `tokens.css`, khu vực canvas hiệu ứng, và `banners.json`/`artists.json`.
- Có thẻ `<button>` viết trực tiếp ngoài `Button.tsx`.

Gắn `lint:ui` vào bước `build` (cùng với `validate-songs` ở M6).

### 10.7. Lượt dọn dẹp một lần cho code hiện có

Thứ tự: (1) tạo `tokens.css`; (2) tạo `Button`, `Chip`, `Notice`, `Icon`; (3) thay toàn bộ nút và chip hiện có; (4) gỡ emoji; (5) thêm `lint:ui`. **Không đổi** logic gacha, dữ liệu, bố cục, kích thước thẻ bài, hiệu ứng.

**Tiêu chí hoàn thành**
- Mọi nút trong app là pill và đến từ một component `Button`; mỗi màn hình có đúng một nút `primary`.
- Tìm toàn dự án **không còn emoji** (ngoài danh sách cho phép); không còn mã màu rải rác ngoài các ngoại lệ ở mục 10.1.
- `npm run lint:ui` chạy sạch.
- Giao diện nhìn đồng nhất giữa màn chính, bộ lọc, màn kết quả và các modal.
- Báo cáo cuối liệt kê: file đã sửa, số nút đã chuyển sang `Button`, các emoji đã gỡ (kèm vị trí), kết quả `lint:ui`.
