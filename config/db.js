// File: config/db.js

// 1. Tải các biến môi trường từ file .env
require('dotenv').config();

// 2. Import thư viện mysql2 (bản hỗ trợ Promise)
const mysql = require('mysql2/promise');

// 3. Tạo một "Connection Pool"
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10, // Số kết nối tối đa trong pool
    queueLimit: 0
});

// 4. (Tùy chọn) Kiểm tra kết nối khi khởi động
pool.getConnection()
    .then(connection => {
        console.log('✅ Đã kết nối thành công đến MySQL!');
        connection.release(); // Trả kết nối về lại pool
    })
    .catch(err => {
        console.error('❌ Không thể kết nối đến MySQL:', err.message);
    });

// 5. Xuất (export) pool để các file khác có thể dùng
module.exports = pool;