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
- Mobile-first (người dùng mở link từ Zalo/Messenger trên điện thoại).
- Không đăng ký, không đăng nhập, không backend, không tiền tệ ảo. Lượt rút là vô hạn.
- Vào là dùng được trong vài giây.
- Ngôn ngữ giao diện: **tiếng Việt**.

---

## 2. Tech stack (cố định, không thêm thư viện ngoài danh sách)

| Hạng mục | Lựa chọn |
|---|---|
| Build | Vite |
| UI | React + TypeScript |
| Style | Tailwind CSS (hoặc CSS thuần nếu không muốn Tailwind, chọn một và giữ nhất quán) |
| Animation | CSS animation; Framer Motion là tùy chọn |
| Xuất ảnh | `html-to-image` |
| Lưu trữ | `localStorage` (qua `lib/storage.ts`) |
| Test logic | Vitest (chỉ cho `lib/gacha.ts`) |
| Deploy | Vercel (hoặc GitHub Pages, khi đó đặt `base` trong `vite.config.ts`) |

**Không dùng:** backend, database, thư viện state phức tạp (Redux...), thư viện UI nặng.

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
    lib/
      gacha.ts            # LOGIC RÚT, thuần, không import React hay DOM
      gacha.test.ts       # test cho logic
      storage.ts          # localStorage: pity, lịch sử, bộ sưu tập
      share.ts            # xuất ảnh, copy text
      filters.ts          # lọc pool theo bộ lọc
      types.ts            # kiểu dữ liệu dùng chung
    components/
      BannerSelect.tsx
      FilterPanel.tsx
      PullAnimation.tsx
      SongCard.tsx
      ResultGrid.tsx
      History.tsx
      GroupMode.tsx
      Setlist.tsx
    App.tsx
    main.tsx
  scripts/
    simulate.ts           # mô phỏng 100.000 lần rút kiểm tra tỉ lệ
    validate-songs.ts     # kiểm tra tính hợp lệ của songs.json
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
```

### 4.2. Quy ước nội dung dữ liệu (quan trọng về bản quyền)
- **Chỉ lưu metadata** (tên bài, ca sĩ, năm, thể loại). **Tuyệt đối không lưu lời bài hát.**
- **Không dùng ảnh bìa album** hay ảnh ca sĩ. Thẻ bài được vẽ bằng CSS/SVG.
- **Không lưu link karaoke.** Nút "Tìm karaoke" tự sinh URL tìm kiếm YouTube từ `title + artist + "karaoke"`.

### 4.3. Định nghĩa độ hiếm (dùng để gán dữ liệu và hiển thị)
- **3★**: bài phổ biến, đa số người hát được, ít rủi ro.
- **4★**: bài cần giọng tốt hoặc cảm xúc cao trào (ballad kinh điển, rap nhanh...).
- **5★**: bài "thử thách": nốt rất cao, hoặc bài làm cả phòng hát theo, có thể kèm `challenge`.

Độ hiếm đo **độ khó/độ "chất" của bài**, không phải độ nổi tiếng.

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

### M2: UI tối thiểu

**Việc cần làm**
- Màn hình chính: danh sách banner (chọn được), nút **Rút 1**, **Rút 10**.
- Hiển thị kết quả dạng lưới thẻ đơn giản (chữ: tên bài, ca sĩ, số sao). **Chưa cần animation.**
- Pity state lưu qua `storage.ts`, reload trang vẫn giữ.

**Tiêu chí hoàn thành**
- Bấm Rút 1 ra đúng 1 thẻ, Rút 10 ra đúng 10 thẻ.
- Reload trang, bộ đếm pity vẫn còn.
- Dùng được trên màn hình 375px chiều rộng, không tràn ngang.

### M3: Thẻ bài + hiệu ứng gacha

**Việc cần làm**
- `SongCard`: thiết kế thẻ kiểu "đĩa than / cassette / micro" bằng CSS/SVG. Viền và hiệu ứng theo độ hiếm: 3★ xanh dương, 4★ tím, 5★ vàng (phát sáng). Màu nền thẻ theo thể loại.
- `PullAnimation`: màn hình tối, sao băng rơi, màu sao báo trước độ hiếm cao nhất của lượt rút (xanh/tím/vàng). **Nút Skip luôn hiển thị.**
- Rút 10: lật lần lượt từng thẻ, thẻ 5★ có hiệu ứng riêng.
- Âm thanh: tùy chọn, **mặc định tắt**, có nút bật/tắt. Nếu chưa có file âm thanh thì bỏ qua, không bắt buộc.
- Tôn trọng `prefers-reduced-motion`: giảm hoặc tắt animation.

**Tiêu chí hoàn thành**
- Animation mượt trên điện thoại tầm trung (không giật rõ rệt).
- Skip hoạt động ở mọi thời điểm và đi thẳng tới màn kết quả.
- Màu sao báo trước đúng với độ hiếm cao nhất trong lượt rút.

### M4: Bộ lọc + nút "Tìm karaoke"

**Việc cần làm**
- `FilterPanel` đặt trước khi rút: giọng (nam/nữ/song ca/tất cả), thể loại (chọn nhiều), thập niên, độ khó tối đa.
- Bộ lọc áp dụng lên pool của banner trước khi rút (`filters.ts`).
- Nếu pool sau lọc **dưới 10 bài**: hiện cảnh báo nhẹ, vẫn cho rút, cho phép trùng bài. Nếu **bằng 0**: chặn nút rút và hiện thông báo gợi ý nới bộ lọc.
- Mỗi thẻ có nút **Tìm karaoke**, mở tab mới:
  `https://www.youtube.com/results?search_query=` + `encodeURIComponent(title + " " + artist + " karaoke")`.

**Tiêu chí hoàn thành**
- Lọc đúng với từng tổ hợp điều kiện (có test cho `filters.ts`).
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
- Thay `songs.json` bằng **100-150 bài thật** (do chủ dự án cung cấp, agent **không tự bịa** dữ liệu bài hát thật nếu không được cung cấp). Agent chỉ viết công cụ nhập/kiểm tra.
- `scripts/validate-songs.ts`, chạy trước `build`, kiểm tra:
  - id không trùng, đúng kebab-case.
  - Đủ các trường bắt buộc, `rarity` thuộc {3,4,5}, `difficulty` 1-5, `year` hợp lý.
  - Mỗi độ hiếm có tối thiểu số bài (ví dụ ≥ 10 bài 3★, ≥ 5 bài 4★, ≥ 2 bài 5★).
  - `featured` trong banner trỏ tới id tồn tại.
- Thêm chân trang: dòng mô tả "Dự án fan, không liên kết với hãng đĩa/ca sĩ nào", link góp ý/đề xuất bài.
- Meta tag Open Graph (title, description, ảnh preview) để link share đẹp trên Zalo/Messenger.
- Deploy Vercel, kiểm tra tải nhanh trên mạng di động.

**Tiêu chí hoàn thành**
- `npm run build` chạy `validate-songs` và chỉ thành công khi dữ liệu hợp lệ.
- Có URL công khai, preview link hiển thị đúng khi dán vào chat.
- Lighthouse mobile: Performance ≥ 85 (mục tiêu, không bắt buộc cứng).

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

---

## 8. Ngoài phạm vi MVP (KHÔNG làm trừ khi được yêu cầu)

- Banner theo thể loại/sự kiện theo mùa.
- Vote "bài này sai độ khó" và bất kỳ tính năng cần backend.
- Điểm danh, mini game dân gian để nhận lượt.
- Tài khoản, bảng xếp hạng toàn cầu.
- Tích hợp phát nhạc/karaoke trực tiếp trong web.
- Đa ngôn ngữ.

---

## 9. Checklist cuối cùng trước khi coi MVP hoàn thành

- [ ] Rút 1 và Rút 10 hoạt động, tỉ lệ đúng đặc tả, có test.
- [ ] Pity và đảm bảo 4★ khi rút 10 hoạt động.
- [ ] Thẻ bài và hiệu ứng theo độ hiếm, có Skip.
- [ ] Bộ lọc giọng/thể loại/thập niên/độ khó.
- [ ] Nút Tìm karaoke đúng từ khóa.
- [ ] Chế độ nhóm + setlist + tải ảnh + copy text.
- [ ] Lịch sử và bộ sưu tập lưu localStorage.
- [ ] Dữ liệu thật đã qua `validate-songs`.
- [ ] Deploy xong, preview link đẹp, dùng tốt trên điện thoại.
- [ ] Chân trang có tuyên bố dự án fan, không lưu lời bài hát hay ảnh bìa.
