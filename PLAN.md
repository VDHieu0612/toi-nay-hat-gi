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
- Hỗ trợ phím mũi tên lên/xuống để đổi banner trên desktop.

#### 2.3. Cột phải (70%): nội dung banner + nút gacha

Một "tranh banner" lớn, nền và màu theo `theme` của banner đang chọn. Bố cục bên trong:

- **Trái trên:** nhãn loại banner (ví dụ "Banner thường" / "Banner Rate-Up") và **tên banner lớn** (kiểu tiêu đề hai dòng, từ nhấn màu theo theme).
- **Khối thông tin** (cạnh vạch dọc, như ảnh tham chiếu):
  - Mô tả ngắn banner (`description`).
  - Dòng cơ chế: "Mỗi 10 lượt rút bảo đảm có ít nhất một bài 4★ trở lên."
  - Nếu có `featured`: dòng "Xác suất tăng cho bài rate-up".
- **Vùng trung tâm/phải của tranh banner:** hiển thị **bài hát rate-up** (`featured`) dưới dạng thẻ dọc xem trước (dùng lại `SongCard` mặt trước, kích thước vừa phải) kèm nhãn "UP!" và số sao. Nếu banner không có `featured`, hiển thị hình minh họa SVG lớn của banner (đĩa than/micro) thay thế.
- **Góc dưới phải:** hai nút gacha cạnh nhau:
  - **Rút ×1** ("1 bài hát").
  - **Rút ×10** ("Đảm bảo ≥ 4★ · Setlist"), nút chính, nổi bật hơn.
- **Góc dưới trái:** nút phụ "Chi tiết" (mở modal danh sách bài trong banner và tỉ lệ) và "Lịch sử" (mở danh sách lượt rút gần nhất, hoàn thiện ở M5; ở M2 có thể là nút ẩn hoặc vô hiệu hóa).
- Nút Rút bị vô hiệu hóa (kèm thông báo) khi pool của banner rỗng.

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

### M3: Thẻ bài dọc + hiệu ứng gacha nhiều giai đoạn

> Phiên bản M3 đầu tiên (thẻ ngang, animation đơn giản) đã được làm và **bị loại bỏ**. Làm lại hoàn toàn theo spec dưới đây. Không động đến `lib/gacha.ts`.

#### 3.1. `SongCard`: thẻ dọc, tỉ lệ 2:3, hình vòm nhọn

**Tham chiếu phong cách màn hình kết quả:** màn hình kết quả rút 10 của Genshin (mười thẻ dọc hình vòm nhọn xếp một hàng ngang, mỗi thẻ có chùm sáng theo độ hiếm bốc lên phía trên, dòng sao ở đáy thẻ, nhãn "New" cho món mới). Chỉ lấy ý tưởng bố cục và hiệu ứng, **không sao chép** hình ảnh hay biểu tượng của game.

Hình dạng thẻ: **khung dọc, đỉnh vòm nhọn** (dùng `clip-path` hoặc SVG mask), không phải hình chữ nhật bo góc. Bên trên mỗi thẻ có **chùm sáng (light beam)** đứng, màu theo độ hiếm: vàng (5★), tím (4★), xanh dương (3★). Cường độ chùm sáng tăng theo độ hiếm.

Nhãn **"Mới"** (góc trên phải thẻ) hiển thị khi bài chưa từng có trong bộ sưu tập của người dùng (dùng dữ liệu `storage.ts`).


Bố cục ba vùng, từ trên xuống:
1. **Trên:** số sao (kích thước lớn, dễ nhìn) bên trái, nhãn giọng (Song ca / Nam / Nữ / Tất cả) bên phải.
2. **Giữa (khoảng 50% chiều cao thẻ):** hình minh họa lớn bằng **SVG tự vẽ**, dạng đĩa than, cassette hoặc micro, **tô màu theo thể loại**. Đây là thay thế cho ảnh bìa album (không được dùng ảnh bìa). Hình phải nằm gọn trong thẻ, **không bị cắt ở góc**.
3. **Dưới:** tên bài (chữ lớn, đậm), tên ca sĩ, rồi thể loại và năm ở hàng nhỏ cuối thẻ.

Độ khó: dùng icon (ví dụ micro) kèm nhãn rõ nghĩa, hoặc bỏ hẳn. **Không dùng dãy chấm không có nhãn.**

Phân cấp hiệu ứng theo độ hiếm (phải nhìn khác biệt rõ ràng):

| Độ hiếm | Viền | Hiệu ứng |
|---|---|---|
| 3★ | Xanh dương | Nền tối, không hiệu ứng |
| 4★ | Tím | Glow nhẹ, vài hạt lấp lánh |
| 5★ | Vàng | Ánh kim (holographic) chạy ngang mặt thẻ, hạt sáng bay quanh thẻ |

Thẻ có hai mặt: **mặt sau** (úp, dùng chung, họa tiết đơn giản, không tiết lộ độ hiếm) và **mặt trước** (nội dung bài hát). Chuyển giữa hai mặt bằng hiệu ứng lật 3D (`transform: rotateY`).

#### 3.2. `PullAnimation`: ba giai đoạn

1. **Chờ đợi (khoảng 1-1,5 giây):** nền tối, một sao băng hoặc quả cầu sáng bay vào giữa màn hình. **Màu của nó báo trước độ hiếm cao nhất của lượt rút:** xanh (3★), tím (4★), vàng (5★). Với 5★, thêm rung nhẹ và tăng dần độ sáng.
2. **Bùng nổ (khoảng 0,3 giây):** chớp sáng toàn màn hình.
3. **Hiện thẻ:** chuyển sang màn kết quả (mục 3.3).

Ràng buộc kỹ thuật:
- Chỉ animate bằng `transform` và `opacity` (cho phép `will-change` hợp lý) để mượt trên điện thoại tầm trung.
- **Nút Skip luôn hiển thị**, bấm là đi thẳng tới màn kết quả.
- Tôn trọng `prefers-reduced-motion`: giảm hoặc tắt animation, vẫn giữ luồng và kết quả như cũ.
- Âm thanh là tùy chọn, **mặc định tắt**, có nút bật/tắt. Nếu chưa có file âm thanh thì bỏ qua.

#### 3.3. Hiển thị kết quả

**Rút 1:** một thẻ ở giữa màn hình, lật từ mặt sau sang mặt trước kèm hiệu ứng theo độ hiếm.

**Rút 10:** **mười thẻ úp xếp thành MỘT HÀNG NGANG**, **sắp xếp theo độ hiếm giảm dần từ trái sang phải** (5★ ngoài cùng bên trái, 3★ bên phải, giống màn hình kết quả tham chiếu). Thứ tự **lật** để tăng hồi hộp: lật các thẻ độ hiếm thấp trước, thẻ độ hiếm cao lật sau cùng:
- Mỗi thẻ cách nhau khoảng 0,2 giây.
- Thẻ 4★/5★ lật chậm hơn và có hiệu ứng riêng; thẻ 5★ (nếu có) lật cuối cùng với hiệu ứng lớn nhất.
- Click vào một thẻ úp để lật ngay thẻ đó. Nút **"Lật tất cả"** (hoặc Skip) lật hết cùng lúc.
- Lật xong hiện nút **"Xem toàn bộ Setlist"**.

**Bố cục theo thiết bị:**
- **Desktop / màn hình rộng:** tính chiều rộng thẻ theo viewport để **cả 10 thẻ vừa trong một hàng**, không cuộn.
- **Điện thoại:** **vẫn là một hàng ngang duy nhất, cuộn ngang** (`overflow-x: auto`, `scroll-snap-type: x mandatory`, mỗi thẻ `scroll-snap-align: center`). Không chia hai hàng.
  - **Khuyến nghị xoay ngang (landscape):** thiết kế và tối ưu cho điện thoại ở landscape. Kích thước thẻ trên điện thoại tính theo **chiều cao viewport** (ví dụ chiều cao thẻ khoảng 70-75% `100dvh`, chiều rộng theo tỉ lệ 2:3), để thẻ to và rõ khi xoay ngang.
  - Khi phát hiện điện thoại đang ở **portrait**, hiện một **gợi ý không chặn** ("Xoay ngang điện thoại để xem đẹp hơn") có nút đóng. Người dùng vẫn dùng được bình thường ở portrait (thẻ nhỏ hơn, vẫn cuộn ngang).
  - Khi thẻ đầu tiên và thẻ cuối cùng được lật, tự cuộn tới thẻ đang lật để người dùng không bỏ lỡ.
  - Có chỉ báo vị trí (ví dụ dấu chấm hoặc "3/10") để biết đang xem thẻ thứ mấy.
- Dùng `dvh`/`env(safe-area-inset-*)` để tránh bị thanh địa chỉ và tai thỏ che khi xoay ngang.

#### 3.4. Yêu cầu chung
- Không để trang xuất hiện **thanh cuộn dọc thừa** ở màn kết quả.
- Chạy mượt trên điện thoại tầm trung ở cả portrait lẫn landscape.
- Không thêm thư viện ngoài danh sách ở mục 2 (CSS animation là chính, Framer Motion chỉ là tùy chọn).

**Tiêu chí hoàn thành**
- Thẻ dọc 2:3 hiển thị đúng ba vùng; hình SVG không bị cắt; 3★/4★/5★ nhìn khác biệt rõ.
- Animation có đủ 3 giai đoạn; màu sao báo trước đúng với độ hiếm cao nhất trong lượt rút; Skip hoạt động ở mọi thời điểm.
- Rút 10: 10 thẻ trên **một hàng ngang**, xếp theo độ hiếm giảm dần, lật tuần tự từ thẻ độ hiếm thấp đến cao; click lật ngay; "Lật tất cả" hoạt động. Thẻ có hình vòm nhọn, chùm sáng đúng màu độ hiếm, nhãn "Mới" đúng với bộ sưu tập.
- Desktop: cả 10 thẻ vừa một hàng, không cuộn ngang. Điện thoại landscape: cuộn ngang mượt có snap, thẻ to rõ. Điện thoại portrait: có gợi ý xoay ngang, vẫn dùng được.
- Bật `prefers-reduced-motion` thì animation giảm hoặc tắt nhưng vẫn ra đủ kết quả.
- Không có thanh cuộn dọc thừa; không giật rõ rệt trên điện thoại tầm trung.

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

- [ ] Màn hình chính dạng Wish screen: banner 30% trái / nội dung + nút rút 70% phải, không cuộn dọc ở landscape.
- [ ] Rút 1 và Rút 10 hoạt động, tỉ lệ đúng đặc tả, có test.
- [ ] Pity và đảm bảo 4★ khi rút 10 hoạt động.
- [ ] Thẻ dọc 2:3 và hiệu ứng nhiều giai đoạn theo độ hiếm, có Skip.
- [ ] Rút 10 hiển thị một hàng ngang (cuộn ngang + snap trên điện thoại, khuyến nghị landscape).
- [ ] Bộ lọc giọng/thể loại/thập niên/độ khó.
- [ ] Nút Tìm karaoke đúng từ khóa.
- [ ] Chế độ nhóm + setlist + tải ảnh + copy text.
- [ ] Lịch sử và bộ sưu tập lưu localStorage.
- [ ] Dữ liệu thật đã qua `validate-songs`.
- [ ] Deploy xong, preview link đẹp, dùng tốt trên điện thoại.
- [ ] Chân trang có tuyên bố dự án fan, không lưu lời bài hát hay ảnh bìa.
