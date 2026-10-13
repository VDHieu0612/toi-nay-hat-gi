# Hướng Dẫn Cấu Hình Google Sheet & Tự Động Đồng Bộ (M6 & M8)

Tài liệu này hướng dẫn chi tiết từng bước thiết lập Google Sheet làm **nguồn dữ liệu duy nhất** cho ứng dụng Gacha Karaoke, liên kết Google Form nhận đề xuất từ cộng đồng và thiết lập GitHub Actions để đồng bộ tự động lên GitHub Pages mà **không cần trang quản trị (Admin Dashboard)** hay backend phức tạp.

---

## 1. Cấu Trúc Bảng Tính Google Sheet (3 Tab Bắt Buộc)

Google Sheet phải chứa chính xác 3 tab với tên gọi như sau (không đổi tên tab):
1. `Master` — Kho bài hát chính thức được xuất bản lên web.
2. `Artists` — Danh mục ca sĩ / rapper / ban nhạc và cấu hình mặc định.
3. `Form_Responses` — Nơi nhận câu trả lời từ Google Form (riêng tư, không công khai).

---

### Tab 1: `Master` (Kho Bài Hát)
Dòng 1 là dòng tiêu đề (header). Script đọc theo **tên tiêu đề cột** (không phân biệt chữ hoa/thường):

| Tiêu đề cột | Bắt buộc | Kiểu dữ liệu | Ý nghĩa & Hướng dẫn |
|---|---|---|---|
| `title` | **Có** | Văn bản | Tên bài hát (ví dụ: *Nơi Này Có Anh*, *Bật Tình Yêu Lên*). |
| `artist` | **Có** | Văn bản | Tên ca sĩ hoặc rapper chính (ví dụ: *Sơn Tùng M-TP*, *HIEUTHUHAI*). |
| `genre` | Không | Văn bản | Ghi đè thể loại bài hát, 1–2 nhóm ngăn cách bằng dấu `\|` (ví dụ: `pop\|ballad`, `rap`). Chỉ thuộc 5 nhóm: `ballad`, `pop`, `rap`, `bolero`, `rock`. Nếu để trống, bài hát tự động kế thừa `defaultGenres` từ tab `Artists`. |
| `voice` | **Có** | Văn bản | Giọng hát: `nam`, `nu`, `song-ca`, hoặc `tat-ca`. (Chấp nhận cả tiếng Việt có dấu từ Form: `Giọng nam`, `Giọng nữ`, `Song ca`, `Tất cả`). |
| `hidden` | Không | TRUE / FALSE | Nếu điền `TRUE`, bài hát sẽ bị ẩn khi xuất bản (giữ lại dòng để lưu trữ mà không hiển thị trên web). |
| `note` | Không | Văn bản | Ghi chú riêng của chủ dự án (ví dụ: *ft. Phương Ly*, *OST phim...*). Script không đẩy lên web. |
| `year` | Không | Số (1950–2030) | Năm phát hành bài hát (tùy chọn). |
| `views` | Không | Số | Lượt xem YouTube (triệu view) để hỗ trợ xếp hạng nếu cần. |

---

### Tab 2: `Artists` (Danh Mục Nghệ Sĩ)
Dòng 1 là dòng tiêu đề:

| Tiêu đề cột | Bắt buộc | Kiểu dữ liệu | Ý nghĩa & Hướng dẫn |
|---|---|---|---|
| `artist` | **Có** | Văn bản | Tên nghệ sĩ (phải khớp với tên trong tab `Master`). |
| `kind` | Không | Văn bản | Vai trò nghệ sĩ: `singer` (ca sĩ), `rapper`, hoặc `group` (nhóm nhạc). Mặc định là `singer`. |
| `defaultGenres` | **Có** | Văn bản | 1–2 thể loại mặc định cho nghệ sĩ này, ngăn cách bằng `\|` (ví dụ: `pop\|ballad`, `rap`, `rock`). Tất cả bài hát của ca sĩ nếu để trống cột `genre` ở tab `Master` sẽ tự động nhận thể loại này. |
| `theme` | Không | Mã màu HEX | Mã màu chủ đạo đại diện (ví dụ: `#6366f1`, `#ec4899`, `#0ea5e9`). Nếu trống, hệ thống tự cấp màu hài hòa. |

---

### Tab 3: `Form_Responses` (Phản Hồi Đề Xuất Từ Cộng Đồng)
- Tab này do Google Form tự động sinh ra khi bạn liên kết Form với Sheet (thường có tên mặc định là *Biểu mẫu phản hồi 1*, hãy đổi tên tab thành `Form_Responses`).
- Thêm 2 cột thủ công ở cuối tab:
  - Cột `Trạng thái duyệt`: Điền `Chờ duyệt`, `Đã duyệt`, hoặc `Từ chối`.
  - Cột `Ghi chú`: Ghi chú cá nhân của người duyệt.
- **Quy tắc duyệt bài:** Khi bạn duyệt một bài hát được đề xuất:
  1. Sao chép thông tin tên bài, ca sĩ, giọng hát sang tab `Master`.
  2. Bổ sung thể loại (nếu cần) và kiểm tra ca sĩ đã có trong tab `Artists` chưa.
  3. Cập nhật `Trạng thái duyệt` thành `Đã duyệt`.

> [!CAUTION]
> **BẢO MẬT & QUYỀN RIÊNG TƯ:**
> Tuyệt đối **KHÔNG Publish to web** tab `Form_Responses`. Tab này có thể chứa thông tin người đề xuất và ghi chú nội bộ. Chỉ Publish 2 tab `Master` và `Artists`.

---

## 2. Thiết Lập Tiện Ích Trên Google Sheet (Khuyến Nghị)

### 2.1. Dropdown Chọn Giọng Hát Trong Tab `Master` (Tránh Nhập Sai)
1. Trong tab `Master`, chọn toàn bộ cột `voice` (từ dòng 2 trở xuống).
2. Vào menu **Dữ liệu (Data)** → **Xác thực dữ liệu (Data validation)** → **Thêm quy tắc (Add rule)**.
3. Ở mục Tiêu chí (Criteria), chọn **Menu thả xuống (Dropdown)**.
4. Thêm 4 mục: `nam`, `nu`, `song-ca`, `tat-ca`.
5. Bấm **Xong (Done)**.

### 2.2. Đánh Dấu Bài Đề Xuất Đã Có Sẵn Hay Chưa (Công Thức)
Trong tab `Form_Responses`, tạo thêm cột `Đã có trong kho` với công thức:

**Nếu Google Sheet cài đặt khu vực Việt Nam (dùng dấu chấm phẩy `;`):**
```excel
=IF(ISNUMBER(MATCH(B2; Master!A:A; 0)); "ĐÃ CÓ TRONG KHO"; "MỚI")
```

**Nếu Google Sheet cài đặt khu vực Hoa Kỳ (dùng dấu phẩy `,`):**
```excel
=IF(ISNUMBER(MATCH(B2, Master!A:A, 0)), "ĐÃ CÓ TRONG KHO", "MỚI")
```
*(Trong đó `B2` là ô Tên bài hát ở tab Form, `Master!A:A` là cột Tên bài ở tab Master. Nếu gặp lỗi `#ERROR! Lỗi phân tích cú pháp công thức`, hãy đổi dấu `,` thành dấu `;`)*.

### 2.3. Bật Thông Báo Email Khi Có Người Gửi Đề Xuất
1. Trên thanh menu Google Sheet, vào **Công cụ (Tools)** → **Quy tắc thông báo (Notification rules)**.
2. Chọn **Khi người dùng gửi biểu mẫu (A user submits a form)**.
3. Chọn **Email ngay lập tức (Email - right away)** → Bấm **Lưu (Save)**.

---

## 3. Xuất Bản (Publish to Web) Hai Tab Dạng CSV

Hệ thống đồng bộ lấy dữ liệu thông qua đường dẫn CSV công khai của Google Sheet:

1. Trên Google Sheet, vào menu **Tệp (File)** → **Chia sẻ (Share)** → **Xuất bản lên web (Publish to web)**.
2. Tại hộp thoại xuất bản:
   - **Tab Master:**
     - Chọn mục **Trang tính (Sheet)** thay vì "Toàn bộ tài liệu", chọn tab **`Master`**.
     - Chọn định dạng: **Giá trị phân tách bằng dấu phẩy (.csv)**.
     - Bấm **Xuất bản (Publish)** và sao chép đường link xuất hiện. Đây chính là `MASTER_CSV_URL`.
   - **Tab Artists:**
     - Chọn tab **`Artists`**.
     - Chọn định dạng: **Giá trị phân tách bằng dấu phẩy (.csv)**.
     - Sao chép đường link xuất hiện. Đây chính là `ARTISTS_CSV_URL`.

---

## 4. Cấu Hình Biến Trên GitHub Repository

Để GitHub Actions có thể tự động tải dữ liệu:

1. Truy cập vào kho mã nguồn (Repository) của bạn trên GitHub.
2. Vào **Settings** → **Secrets and variables** → **Actions**.
3. Chuyển sang tab **Variables** (Repository variables, không cần dùng Secrets vì dữ liệu bài hát là công khai).
4. Bấm **New repository variable** và thêm 2 biến:
   - `MASTER_CSV_URL`: Dán link CSV của tab `Master`.
   - `ARTISTS_CSV_URL`: Dán link CSV của tab `Artists`.

---

## 5. Bật GitHub Pages Với Nguồn "GitHub Actions"

1. Trong **Settings** của repository, vào mục **Pages** (ở menu bên trái).
2. Tại mục **Build and deployment** → **Source**:
   - Chọn **GitHub Actions** (thay vì "Deploy from a branch").
3. Lưu cài đặt.

---

## 6. Vận Hành Đồng Bộ & Đọc Log

### 6.1. Đồng Bộ Bằng Tay (Khuyên Dùng Sau Khi Thêm Bài)
1. Vào tab **Actions** trên GitHub.
2. Chọn workflow **"Sync Google Sheet & Deploy"** ở cột bên trái.
3. Bấm nút **Run workflow** ở góc phải:
   - Nhánh: `main`.
   - Ô kiểm `Bỏ qua chốt chặn xóa nhầm`: Để trống (false). Chỉ tích chọn nếu bạn cố ý xóa hơn 20% số bài hát.
4. Bấm **Run workflow**.

### 6.2. Đồng Bộ Tự Động Theo Lịch
- Workflow được lên lịch chạy tự động lúc **08:00 sáng mỗi ngày** (giờ Việt Nam, `0 1 * * *` UTC).
- Nếu Google Sheet có bài mới, bot GitHub sẽ tự động:
  1. Tải CSV về `data/`.
  2. Kiểm tra tính toàn vẹn và phân bổ độ hiếm hợp lý.
  3. Tạo commit với nội dung `chore(data): auto-sync songs and artists from Google Sheet`.
  4. Đóng gói và phát hành trực tiếp lên GitHub Pages.
- Nếu không có thay đổi, bot sẽ không tạo commit thừa.

### 6.3. Cách Đọc Log Lỗi Nếu Dữ Liệu Bị Sai
Nếu có dòng dữ liệu trong Sheet bị sai (ví dụ: thiếu tên ca sĩ, thể loại không thuộc 5 nhóm cho phép, ca sĩ chưa khai báo trong tab `Artists`):
1. Workflow sẽ báo trạng thái **Failed (Màu đỏ)**.
2. Click vào lần chạy đó, vào bước **"Đồng bộ dữ liệu từ Google Sheet (M6 & M8)"**.
3. Log sẽ chỉ rõ chính xác:
   - Số dòng bị lỗi trong file CSV.
   - Nguyên nhân (ví dụ: `Dòng 14: Ca sĩ 'Hồ Ngọc Hà' chưa có trong danh sách ca sĩ (tab Artists)`).
4. **Bảo vệ trang web:** Khi có lỗi, quy trình sẽ dừng ngay lập tức, bot không commit dữ liệu hỏng và trang web của bạn vẫn an toàn chạy phiên bản cũ bình thường.
5. Sau khi bạn sửa lại trên Google Sheet, chỉ cần bấm **Run workflow** lại là xong!
