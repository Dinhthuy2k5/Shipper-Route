// File: routes/stops.js

const express = require('express');
const pool = require('../config/db');

// Rất quan trọng: { mergeParams: true }
// Cho phép router này truy cập các tham số (params) từ router cha
// Cụ thể là để lấy được ':routeId' từ file 'routes.js'
const router = express.Router({ mergeParams: true });

// === HÀM TRỢ GIÚP (Bảo mật) ===
// Hàm này dùng để kiểm tra xem routeId có đúng là của user đang đăng nhập không
const checkRouteOwnership = async (routeId, userId) => {
    const sql = 'SELECT * FROM routes WHERE id = ? AND user_id = ?';
    const [rows] = await pool.query(sql, [routeId, userId]);
    return rows.length > 0; // Trả về true nếu user sở hữu route này
};

/**
 * @route   POST /api/routes/:routeId/stops
 * @desc    Thêm một điểm dừng (stop) vào lộ trình
 * @access  Private
 */
router.post('/', async (req, res) => {
    // Lấy routeId từ params (nhờ mergeParams: true)
    const { routeId } = req.params;
    const userId = req.user.id; // Lấy từ authMiddleware

    // Lấy dữ liệu từ body
    const { addressText, lat, lng } = req.body;

    if (!addressText) {
        return res.status(400).json({ error: 'addressText là bắt buộc' });
    }

    try {
        // 1. (Bảo mật) Kiểm tra xem user này có quyền sở hữu route này không
        const isOwner = await checkRouteOwnership(routeId, userId);
        if (!isOwner) {
            return res.status(403).json({ error: 'Forbidden. Bạn không có quyền truy cập lộ trình này.' });
        }

        // 2. Nếu đúng, thêm stop vào CSDL
        const sql = 'INSERT INTO stops (route_id, address_text, lat, lng) VALUES (?, ?, ?, ?)';
        const [result] = await pool.query(sql, [routeId, addressText, lat, lng]);

        // 3. Trả về stop vừa tạo
        res.status(201).json({
            message: 'Thêm điểm dừng thành công!',
            stopId: result.insertId,
            routeId: routeId,
            addressText: addressText
        });

    } catch (error) {
        console.error('Lỗi khi thêm stop:', error);
        res.status(500).json({ error: 'Lỗi server nội bộ' });
    }
});


/**
 * @route   DELETE /api/routes/:routeId/stops/:stopId
 * @desc    Xóa một điểm dừng (stop) khỏi lộ trình
 * @access  Private
 */
router.delete('/:stopId', async (req, res) => {
    const { routeId, stopId } = req.params;
    const userId = req.user.id;

    try {
        // 1. (Bảo mật) Kiểm tra quyền sở hữu route
        const isOwner = await checkRouteOwnership(routeId, userId);
        if (!isOwner) {
            return res.status(403).json({ error: 'Forbidden. Bạn không có quyền truy cập lộ trình này.' });
        }

        // 2. Nếu đúng, tiến hành xóa
        // Xóa stop CÓ ID = stopId VÀ CÓ route_id = routeId
        // Điều này để đảm bảo user không xóa nhầm stop của route khác
        const sql = 'DELETE FROM stops WHERE id = ? AND route_id = ?';
        const [result] = await pool.query(sql, [stopId, routeId]);

        // 3. Kiểm tra xem có xóa được không
        if (result.affectedRows === 0) {
            // Không tìm thấy stopId hoặc nó không thuộc routeId này
            return res.status(404).json({ error: 'Không tìm thấy điểm dừng.' });
        }

        // 4. Trả về thành công
        res.json({ message: 'Xóa điểm dừng thành công!' });

    } catch (error) {
        console.error('Lỗi khi xóa stop:', error);
        res.status(500).json({ error: 'Lỗi server nội bộ' });
    }
});


module.exports = router;