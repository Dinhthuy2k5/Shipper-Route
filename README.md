# API Tối ưu hóa Lộ trình Shipper (Shipper Route Optimization API)

Đây là dự án backend (Node.js/Express) cho ứng dụng di động giúp shipper tối ưu hóa lộ trình giao hàng. Ứng dụng nhận vào điểm xuất phát và nhiều điểm dừng, sử dụng **Mapbox API** để tính toán thứ tự giao hàng hiệu quả nhất, đồng thời cung cấp các chức năng quản lý profile và trạng thái đơn hàng.

## ⚙️ Công nghệ sử dụng (Tech Stack)

* **Backend:** Node.js, Express.js
* **Database:** MySQL (sử dụng thư viện `mysql2`)
* **API Bên ngoài:** Mapbox API (Geocoding, Optimization, Matrix)
* **Xác thực:** JSON Web Tokens (JWT)
* **Bảo mật:** `bcrypt` (mã hóa mật khẩu)

## 🚀 Cài đặt và Chạy dự án (Setup)

1.  **Clone repository:**
    ```bash
    git clone [https://github.com/Dinhthuy2k5/Shipper-Route.git](https://github.com/Dinhthuy2k5/Shipper-Route.git)
    cd Shipper-Route
    ```

2.  **Cài đặt thư viện:**
    ```bash
    npm install
    ```

3.  **Cấu hình Database:**
    * Import file `database.sql` (nếu có) vào MySQL Workbench.
    * Hoặc chạy thủ công script SQL ở phần "Cấu trúc Database" bên dưới.

4.  **Tạo file môi trường `.env`:**
    * Tạo file `.env` tại thư mục gốc và điền thông tin:
    ```ini
    PORT=3000
    # Cấu hình Database
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_password
    DB_DATABASE=shipper_db

    # Khóa bí mật cho JWT
    JWT_SECRET=your_super_secret_key_here

    # Mapbox Access Token (Dùng cho tính năng tối ưu hóa)
    MAPBOX_ACCESS_TOKEN=pk.eyJ...
    ```

5.  **Chạy server:**
    ```bash
    npm run dev
    ```
    Server sẽ khởi chạy tại `http://localhost:3000`.

## 🗃️ Cấu trúc Database (MySQL Schema)

```sql
CREATE DATABASE IF NOT EXISTS shipper_db;
USE shipper_db;

-- Bảng Người dùng
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),       -- Số điện thoại liên hệ
    vehicle VARCHAR(100),    -- Phương tiện giao hàng (Xe máy/Ô tô...)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Lộ trình
CREATE TABLE routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    route_name VARCHAR(255) NOT NULL,
    
    -- Điểm xuất phát
    start_address TEXT NULL,
    start_lat DECIMAL(10, 8) NULL,
    start_lng DECIMAL(11, 8) NULL,

    -- Kết quả tối ưu từ Mapbox
    overview_polyline TEXT,       -- Chuỗi mã hóa đường đi để vẽ lên bản đồ
    total_distance_meters INT,    -- Tổng quãng đường (mét)
    total_duration_seconds INT,   -- Tổng thời gian dự kiến (giây)
    
    route_status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng Điểm dừng
CREATE TABLE stops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    address_text TEXT NOT NULL,   -- Địa chỉ nhập vào
    
    lat DECIMAL(10, 8),           -- Tọa độ (có sau khi tối ưu)
    lng DECIMAL(11, 8),
    
    optimized_order INT NULL,     -- Thứ tự giao hàng (1, 2, 3...)
    
    stop_status ENUM('pending', 'delivered', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);
```

## 🗺️ API Endpoints

> **Lưu ý:** Tất cả các API (ngoại trừ nhóm **Auth**) đều yêu cầu `Bearer Token` trong header `Authorization`.

### 1. Authentication (Xác thực)
* `POST` **/api/auth/register**: Đăng ký tài khoản mới (Yêu cầu: Email, Password, Tên, SĐT, Xe).
* `POST` **/api/auth/login**: Đăng nhập và nhận JWT Token.
* `GET` **/api/auth/profile**: Lấy thông tin cá nhân của shipper.
* `PUT` **/api/auth/profile**: Cập nhật thông tin cá nhân.

### 2. Routes (Quản lý Lộ trình)
* `GET` **/api/routes**: Lấy danh sách tất cả lộ trình của shipper (sắp xếp theo thời gian mới nhất).
* `POST` **/api/routes**: Tạo một lộ trình mới.
* `GET` **/api/routes/:routeId**: Lấy chi tiết một lộ trình (bao gồm danh sách các điểm dừng - stops).
* `PUT` **/api/routes/:routeId/start-point**: Cập nhật điểm xuất phát cho lộ trình.
* `PATCH` **/api/routes/:routeId/status**: Cập nhật trạng thái lộ trình (VD: `completed` - Hoàn thành).
* `POST` **/api/routes/:routeId/optimize**: **(Quan trọng)** Gửi yêu cầu tới Mapbox để tối ưu hóa thứ tự các điểm dừng.

### 3. Stops (Quản lý Điểm dừng)
* `POST` **/api/routes/:routeId/stops**: Thêm một điểm dừng mới vào lộ trình.
* `DELETE` **/api/routes/:routeId/stops/:stopId**: Xóa một điểm dừng.
* `PATCH` **/api/routes/:routeId/stops/:stopId**: Cập nhật trạng thái của điểm dừng (VD: `delivered` - Đã giao, `failed` - Thất bại).

## 📂 Cấu trúc Thư mục (Folder Structure)

```text
shipper-api/
├── config/                 # Cấu hình hệ thống
│   └── db.js               # Kết nối cơ sở dữ liệu MySQL
│
├── middleware/             # Các hàm trung gian xử lý request
│   └── authMiddleware.js   # Xác thực JWT (Bảo vệ các API private)
│
├── routes/                 # Định nghĩa các đường dẫn API
│   ├── auth.js             # API: Đăng ký, Đăng nhập, Profile
│   ├── routes.js           # API: Tạo lộ trình, Tối ưu hóa, Cập nhật trạng thái
│   └── stops.js            # API: Thêm/Xóa/Sửa điểm dừng
│
├── .env                    # Biến môi trường (Database, JWT Secret, Mapbox Token)
├── .gitignore              # Danh sách file bị bỏ qua bởi Git
├── index.js                # Điểm bắt đầu của ứng dụng (Server entry point)
├── package.json            # Khai báo thư viện và scripts
└── README.md               # Tài liệu hướng dẫn dự án
```