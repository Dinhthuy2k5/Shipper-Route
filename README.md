# API Tối ưu hóa Lộ trình Shipper (Shipper Route Optimization API)

Đây là dự án backend (Node.js/Express) cho ứng dụng di động giúp shipper tối ưu hóa lộ trình giao hàng. Ứng dụng nhận vào điểm xuất phát và nhiều điểm dừng, sử dụng **Mapbox API** để tính toán thứ tự giao hàng hiệu quả nhất, đồng thời cung cấp các chức năng quản lý profile và trạng thái đơn hàng.

---

## ⚙️ Công nghệ sử dụng (Tech Stack)

* **Backend:** Node.js, Express.js
* **Database:** MySQL (sử dụng thư viện `mysql2`)
* **API Bên ngoài:** Mapbox API (Geocoding, Optimization, Matrix)
* **Xác thực:** JSON Web Tokens (JWT)
* **Bảo mật:** `bcrypt` (mã hóa mật khẩu)

---

## 🚀 Bắt đầu (Getting Started)

### Cách 1: Chạy bằng Docker (Khuyến nghị)

> Yêu cầu: Cài [Docker Desktop](https://www.docker.com/products/docker-desktop)

Cách này không cần cài Node.js hay MySQL, chỉ cần Docker là đủ.

**1. Clone repository**
```bash
git clone https://github.com/Dinhthuy2k5/Shipper-Route.git
cd Shipper-Route
```

**2. Tạo file `.env` từ file mẫu**
```bash
cp .env.example .env
```
Mở file `.env` và điền các giá trị thật:
```ini
PORT=3000
DB_HOST=db
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=shipper_db
JWT_SECRET=your_super_secret_key_here
MAPBOX_ACCESS_TOKEN=pk.eyJ...
```
> ⚠️ Lưu ý: `DB_HOST` phải là `db` khi chạy bằng Docker, không phải `localhost`.

**3. Khởi động toàn bộ hệ thống**
```bash
docker compose up -d
```

**4. Import database (chỉ cần làm 1 lần)**

Windows PowerShell:
```powershell
Get-Content database.sql | docker exec -i shipper-db mysql -u root -pyour_password shipper_db
```

macOS / Linux:
```bash
docker exec -i shipper-db mysql -u root -pyour_password shipper_db < database.sql
```

**5. Kiểm tra server**
```
GET http://localhost:3000
```

**Dừng hệ thống:**
```bash
docker compose down
```

---

### Cách 2: Chạy thủ công (không dùng Docker)

> Yêu cầu: Node.js >= 18, MySQL đang chạy trên máy

**1. Clone repository**
```bash
git clone https://github.com/Dinhthuy2k5/Shipper-Route.git
cd Shipper-Route
```

**2. Cài đặt thư viện**
```bash
npm install
```

**3. Tạo file `.env`**
```bash
cp .env.example .env
```
Điền thông tin vào `.env`, lưu ý `DB_HOST=localhost`.

**4. Import database vào MySQL Workbench**

Mở MySQL Workbench, chạy file `database.sql` để tạo bảng và dữ liệu mẫu.

**5. Chạy server**
```bash
npm run dev
```
Server khởi chạy tại `http://localhost:3000`.

---

## 🗺️ API Endpoints

> **Lưu ý:** Tất cả các API (ngoại trừ nhóm **Auth**) đều yêu cầu `Bearer Token` trong header `Authorization`.

### 1. Authentication (Xác thực)
* `POST` **/api/auth/register** — Đăng ký tài khoản mới
* `POST` **/api/auth/login** — Đăng nhập và nhận JWT Token
* `GET` **/api/auth/profile** — Lấy thông tin cá nhân
* `PUT` **/api/auth/profile** — Cập nhật thông tin cá nhân

### 2. Routes (Quản lý Lộ trình)
* `GET` **/api/routes** — Danh sách lộ trình (mới nhất)
* `POST` **/api/routes** — Tạo lộ trình mới
* `GET` **/api/routes/:routeId** — Chi tiết lộ trình + danh sách điểm dừng
* `PUT` **/api/routes/:routeId/start-point** — Cập nhật điểm xuất phát
* `PATCH` **/api/routes/:routeId/status** — Cập nhật trạng thái lộ trình
* `POST` **/api/routes/:routeId/optimize** — Tối ưu hóa thứ tự điểm dừng qua Mapbox
* `GET` **/api/routes/search** — Gợi ý địa điểm qua Mapbox Geocoding

### 3. Stops (Quản lý Điểm dừng)
* `POST` **/api/routes/:routeId/stops** — Thêm điểm dừng
* `DELETE` **/api/routes/:routeId/stops/:stopId** — Xóa điểm dừng
* `PATCH` **/api/routes/:routeId/stops/:stopId** — Cập nhật trạng thái điểm dừng

### 4. Stats (Thống kê)
* `GET` **/api/stats/summary** — Thống kê tổng quan (ngày hoạt động, đơn hoàn thành, quãng đường, đánh giá)

---

## 📂 Cấu trúc Thư mục (Folder Structure)

```
shipper-api/
├── config/
│   └── db.js                # Kết nối MySQL
├── middleware/
│   └── authMiddleware.js    # Xác thực JWT
├── routes/
│   ├── auth.js              # API đăng ký, đăng nhập, profile
│   ├── routes.js            # API lộ trình, tối ưu hóa
│   ├── stops.js             # API điểm dừng
│   └── stats.js             # API thống kê
├── .env                     # Biến môi trường (không commit)
├── .env.example             # Template biến môi trường
├── .gitignore
├── database.sql             # Schema + dữ liệu mẫu
├── docker-compose.yml       # Cấu hình Docker
├── Dockerfile               # Build image backend
├── index.js                 # Entry point
├── package.json
└── README.md
```

---

## 👨‍💻 Tác giả

Nguyễn Đình Thủy — MSSV: 20235437

Dự án: Project 1 — Đại học Bách Khoa Hà Nội