// File: routes/auth.js

const express = require('express');
const router = express.Router(); // 1. Khởi tạo Router của Express
const pool = require('../config/db'); // 2. Import pool (lưu ý đường dẫn ../)
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // 1. Import 'jsonwebtoken'

/**
 * @route   POST /api/auth/register
 * @desc    Đăng ký một shipper mới
 * @access  Public
 */
// 3. Thay 'app.post' bằng 'router.post'
// 4. Đường dẫn bây giờ chỉ cần là '/' vì '/api/auth' sẽ được định nghĩa ở index.js
// API đăng kí
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email và Password là bắt buộc' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const sql = 'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)';
        const values = [email, hashedPassword, fullName];

        const [result] = await pool.query(sql, values);

        res.status(201).json({
            message: 'Đăng ký shipper thành công!',
            userId: result.insertId
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email này đã được sử dụng' });
        }
        console.error('Lỗi khi đăng ký user:', error);
        res.status(500).json({ error: 'Lỗi server nội bộ' });
    }
});

//API ĐĂNG NHẬP
/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập cho shipper
 * @access  Public
 */
router.post('/login', async (req, res) => {
    try {
        // 1. Lấy email và password từ body
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Vui lòng nhập email và password' });
        }

        // 2. Tìm shipper trong CSDL bằng email
        const sql = 'SELECT * FROM users WHERE email = ?';
        const [users] = await pool.query(sql, [email]);

        // 3. Kiểm tra xem user có tồn tại không
        if (users.length === 0) {
            // Dùng thông báo chung chung để bảo mật (không tiết lộ email có tồn tại hay không)
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        }

        const user = users[0]; // Lấy user đầu tiên (vì email là unique)

        // 4. So sánh mật khẩu
        // Dùng bcrypt.compare để so sánh password thô với password đã hash
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            // Mật khẩu không khớp
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        }

        // 5. Nếu mật khẩu khớp -> TẠO TOKEN
        // Tạo 'payload' (dữ liệu muốn lưu trong token)
        const payload = {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name
                // Bạn có thể thêm bất cứ thông tin gì của user vào đây
            }
        };

        // 6. Ký (sign) token với mã bí mật trong file .env
        // 'expiresIn' đặt thời hạn cho token (ví dụ: '1h', '7d')
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // Lấy mã bí mật từ .env
            { expiresIn: '7d' }
        );

        // 7. Trả token về cho client
        res.json({
            message: 'Đăng nhập thành công!',
            token: token // Client (React) sẽ lưu token này lại
        });

    } catch (error) {
        console.error('Lỗi khi đăng nhập:', error);
        res.status(500).json({ error: 'Lỗi server nội bộ' });
    }
});

// 5. Export router để index.js có thể dùng
module.exports = router;