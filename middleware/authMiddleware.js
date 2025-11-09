// File: middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

// Tải mã bí mật từ .env
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
    // 1. Lấy token từ header của request
    // Định dạng chuẩn: "Authorization: Bearer <token>"
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ error: 'Access Denied. Không tìm thấy token.' });
    }

    // 2. Tách chuỗi "Bearer " ra khỏi token
    const token = authHeader.split(' ')[1]; // [Bearer, <token>]
    if (!token) {
        return res.status(401).json({ error: 'Access Denied. Token không hợp lệ.' });
    }

    try {
        // 3. Xác thực token
        const decoded = jwt.verify(token, JWT_SECRET);

        // 4. (Quan trọng nhất) Gắn thông tin user đã giải mã vào 'req'
        // Giờ đây, tất cả các API phía sau có thể truy cập req.user
        req.user = decoded.user;

        // 5. Chuyển tiếp cho API tiếp theo
        next();
    } catch (err) {
        console.error("Lỗi xác thực Token:", err.message);
        res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
}

module.exports = authMiddleware;