// File: index.js

const express = require('express');
const app = express();
const port = 3000;

// Import pool (vẫn giữ ở đây để check kết nối)
const pool = require('./config/db');

// 1. Import file route auth
const authRoutes = require('./routes/auth');
const routeRoutes = require('./routes/routes');

// 2. Import middleware
const authMiddleware = require('./middleware/authMiddleware');

// --- CÀI ĐẶT MIDDLEWARE ---
app.use(express.json()); // Middleware để đọc JSON body

// --- KẾT NỐI CÁC ROUTE ---
// Bất kỳ request nào tới '/api/auth' sẽ được chuyển cho authRoutes xử lý
// Các route '/api/auth' (đăng ký, đăng nhập) thì KHÔNG cần bảo vệ
app.use('/api/auth', authRoutes);

// Các route '/api/routes' (tạo route, thêm stop) thì BẮT BUỘC bảo vệ
// Bất kỳ API nào trong 'routeRoutes' sẽ phải đi qua 'authMiddleware' trước
app.use('/api/routes', authMiddleware, routeRoutes);



// --- CÁC ROUTE CƠ BẢN HOẶC TEST ---
app.get('/', (req, res) => {
    res.send('Xin chào! Server Express của bạn đang chạy.');
});

app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        res.json({ message: 'Lấy dữ liệu thành công!', data: rows });
    } catch (error) {
        console.error('Lỗi khi truy vấn CSDL:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});