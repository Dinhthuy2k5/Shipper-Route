# API Tối ưu hóa Lộ trình Shipper (Shipper Route Optimization API)

Đây là dự án backend (Node.js/Express) cho một ứng dụng web giúp shipper tối ưu hóa lộ trình giao hàng. Ứng dụng nhận vào một điểm xuất phát và nhiều điểm dừng (stops), sau đó sử dụng **Mapbox API** để tính toán và trả về thứ tự lộ trình hiệu quả nhất (ngắn nhất/nhanh nhất).

## ⚙️ Công nghệ sử dụng (Tech Stack)

* **Backend:** Node.js, Express.js
* **Database:** MySQL (sử dụng `mysql2`)
* **API Bên ngoài:** Mapbox API (Geocoding & Optimization)
* **Xác thực:** JSON Web Tokens (JWT)
* **Mã hóa mật khẩu:** `bcrypt`

## 🚀 Cài đặt và Chạy dự án (Setup)

1.  **Clone repository:**
    ```bash
    git clone [https://github.com/Dinhthuy2k5/Shipper-Route.git](https://github.com/Dinhthuy2k5/Shipper-Route.git)
    cd Shipper-Route
    ```

2.  **Cài đặt dependencies:**
    ```bash
    npm install
    ```

3.  **Tạo Database:**
    * Mở MySQL Workbench (hoặc công cụ CSDL của bạn).
    * Tạo một database mới (ví dụ: `shipper_db`).
    * Chạy đoạn mã SQL dưới đây để tạo các bảng `users`, `routes`, và `stops`.

4.  **Tạo file `.env`:**
    * Tạo một file tên là `.env` ở thư mục gốc.
    * Copy nội dung từ file `.env.example` (nếu có) hoặc thêm các biến sau:
    ```ini
    # Thông tin Database
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_mysql_password
    DB_DATABASE=shipper_db

    # Mã bí mật cho JWT
    JWT_SECRET=daylamotmabimatratantoicualongpham

    # Access Token của Mapbox
    MAPBOX_ACCESS_TOKEN=pk.eyJ... (dán token của bạn vào đây)
    ```

5.  **Chạy server (development):**
    ```bash
    npm run dev
    ```
    Server sẽ chạy tại `http://localhost:3000`.

## 🗃️ Cấu trúc Database (MySQL Schema)

```sql
CREATE DATABASE IF NOT EXISTS shipper_db;
USE shipper_db;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    route_name VARCHAR(255) NOT NULL,
    
    -- Điểm xuất phát
    start_address TEXT NULL,
    start_lat DECIMAL(10, 8) NULL,
    start_lng DECIMAL(11, 8) NULL,

    -- Kết quả từ Mapbox
    overview_polyline TEXT,
    total_distance_meters INT,
    total_duration_seconds INT,
    
    route_status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE stops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    address_text TEXT NOT NULL,
    
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    
    -- Thứ tự sau khi tối ưu (1, 2, 3...)
    optimized_order INT NULL,           
    
    stop_status ENUM('pending', 'delivered', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);
```

## 🗺️ API Endpoints

Tất cả các API (trừ `Auth`) đều yêu cầu `Bearer Token` trong header `Authorization`.

### Authentication (Xác thực)

* `POST /api/auth/register`
    * **Body:** `{ "email", "password", "fullName" }`
    * **Mô tả:** Đăng ký shipper mới.

* `POST /api/auth/login`
    * **Body:** `{ "email", "password" }`
    * **Mô tả:** Đăng nhập và trả về một JWT.

### Routes (Lộ trình)

* `POST /api/routes`
    * **Body:** `{ "routeName": "Tên lộ trình" }`
    * **Mô tả:** Tạo một lộ trình mới (ví dụ: "Đơn sáng 19/11").

* `PUT /api/routes/:routeId/start-point`
    * **Body:** `{ "addressText": "Địa chỉ bắt đầu" }`
    * **Mô tả:** Thêm/cập nhật điểm xuất phát cho lộ trình.

* `POST /api/routes/:routeId/optimize`
    * **Body:** (None)
    * **Mô tả:** API quan trọng nhất. Kích hoạt việc gọi Mapbox để geocode và tối ưu hóa tất cả các điểm dừng.

* `GET /api/routes/:routeId`
    * **Body:** (None)
    * **Mô tả:** Lấy chi tiết một lộ trình, bao gồm danh sách các điểm dừng (stops) đã được sắp xếp theo thứ tự tối ưu.

### Stops (Điểm dừng)

* `POST /api/routes/:routeId/stops`
    * **Body:** `{ "addressText": "Địa chỉ điểm dừng" }`
    * **Mô tả:** Thêm một điểm dừng mới vào lộ trình.

* `DELETE /api/routes/:routeId/stops/:stopId`
    * **Body:** (None)
    * **Mô tả:** Xóa một điểm dừng khỏi lộ trình.