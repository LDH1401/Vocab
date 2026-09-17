# Vocab

Ứng dụng học từ vựng tiếng Anh với thuật toán lặp lại ngắt quãng FSRS. Dữ liệu lưu trên **MongoDB**, deploy lên **Vercel**.

## Cấu trúc

| Thư mục | Vai trò |
|---|---|
| `src/` | Giao diện React (Vite). Logic FSRS chạy ở trình duyệt. |
| `src/db/store.ts` | Tải toàn bộ dữ liệu khi mở app, áp dụng thay đổi ngay trên giao diện rồi lưu lên server qua hàng đợi. |
| `api/` | Vercel Functions: `session`, `login`, `logout`, `data` (đọc theo trang), `ops` (ghi). |
| `backend/` | Mã dùng chung cho API: kết nối MongoDB, đăng nhập, kiểm tra dữ liệu gửi lên. |
| `src/shared/protocol.ts` | Kiểu dữ liệu trao đổi giữa trình duyệt và API. |

Đăng nhập bằng một mật khẩu (`APP_PASSWORD`). Phiên đăng nhập lưu trong cookie HttpOnly có chữ ký, hiệu lực 180 ngày; đổi mật khẩu thì mọi phiên cũ hết hiệu lực.

> Trong `api/` và `backend/`, import tương đối phải ghi đuôi `.js` (ví dụ `'../backend/auth.js'`), vì Vercel chạy mã này bằng ESM của Node mà không đóng gói.

## Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `MONGODB_URI` | ✅ | Chuỗi kết nối MongoDB |
| `MONGODB_DB` | | Tên database, mặc định `vocab` |
| `APP_PASSWORD` | ✅ | Mật khẩu đăng nhập vào app |
| `AUTH_SECRET` | ✅ | Chuỗi ngẫu nhiên ≥ 32 ký tự để ký phiên đăng nhập |

Tạo `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Chạy trên máy

```bash
npm install
cp .env.example .env.local   # rồi điền các biến ở trên
npm run dev
```

`npm run dev` chạy cả giao diện lẫn các API trong `api/`, không cần Vercel CLI.

Muốn dùng MongoDB trên máy thay vì Atlas:

```bash
docker run -d --name vocab-mongo -p 27017:27017 mongo:7.0
# MONGODB_URI=mongodb://localhost:27017
```

MongoDB 8.x hiện không khởi động được trên Linux kernel 6.19 trở lên ([SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912)), nên dùng `mongo:7.0`.

## Tạo database trên MongoDB Atlas

1. Tạo cluster **M0 (Free)** tại [cloud.mongodb.com](https://cloud.mongodb.com). Chọn region gần region chạy Vercel Functions (xem bên dưới).
2. **Database Access** → tạo user có quyền đọc/ghi.
3. **Network Access** → thêm `0.0.0.0/0`. Vercel không có địa chỉ IP cố định, nên phải cho phép mọi IP; dữ liệu vẫn được bảo vệ bằng user/mật khẩu của database.
4. **Connect → Drivers** → sao chép chuỗi kết nối, thay `<password>` bằng mật khẩu của user vừa tạo. Đó là `MONGODB_URI`.

## Deploy lên Vercel

```bash
npx vercel          # lần đầu: đăng nhập, liên kết project (Vercel tự nhận ra Vite)
```

Khai báo 4 biến môi trường trong **Project Settings → Environment Variables** (hoặc `npx vercel env add MONGODB_URI`…), rồi:

```bash
npx vercel --prod
```

- `vercel.json` đã chuyển mọi đường dẫn (trừ `/api/*`) về `index.html`, nên tải lại trang ở `/words`, `/stats`… không bị 404.
- Functions mặc định chạy ở `iad1` (Mỹ). Nếu Atlas đặt ở Singapore, nên đổi region của Functions trong **Project Settings → Functions** cho gần nhau để giảm độ trễ.

## Chuyển dữ liệu từ phiên bản cũ

Phiên bản trước lưu dữ liệu trong IndexedDB của trình duyệt. Mở app mới **trên đúng địa chỉ đã dùng trước đây** (ví dụ `http://localhost:5173`) và đăng nhập. Trang chủ sẽ hiện nút **"Tải lên MongoDB"**. Dữ liệu được gộp theo id nên tải lên nhiều lần cũng không bị nhân đôi. Sau khi tải xong có thể xóa bản cũ khỏi trình duyệt.

## Giới hạn hiện tại

- Cần có mạng: mất kết nối thì thay đổi không lưu được (app sẽ báo lỗi và tải lại dữ liệu từ server).
- Toàn bộ dữ liệu được tải về khi mở app. Với vài chục nghìn lượt ôn vẫn nhanh; nếu dữ liệu lớn hơn nhiều, nên chuyển phần thống kê sang tính trên server.
