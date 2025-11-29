const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Đảm bảo đường dẫn đúng
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @route   GET /api/stats/summary
 * @desc    Lấy thống kê tổng quan cho Shipper
 * @access  Private
 */
router.get('/summary', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        // 1. Tính ngày tham gia (Account Age)
        const userSql = 'SELECT created_at FROM users WHERE id = ?';
        const [userRows] = await pool.query(userSql, [userId]);
        const joinDate = new Date(userRows[0].created_at);
        const today = new Date();
        // Tính số ngày: (Hiệu thời gian miliseconds) / (ms * s * m * h)
        const daysActive = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24));

        // 2. Thống kê Lộ trình (Tổng số, Tổng km, Tổng thời gian)
        // Chỉ tính các lộ trình đã hoàn thành (completed)
        const routeSql = `
            SELECT 
                COUNT(*) as total_routes,
                SUM(total_distance_meters) as total_distance,
                SUM(total_duration_seconds) as total_duration
            FROM routes 
            WHERE user_id = ? AND route_status = 'completed'
        `;
        const [routeStats] = await pool.query(routeSql, [userId]);

        // 3. Thống kê Điểm dừng (Thành công/Thất bại)
        // Phải join với bảng routes để đảm bảo stops đó thuộc về user này
        const stopSql = `
            SELECT 
                SUM(CASE WHEN s.stop_status = 'delivered' THEN 1 ELSE 0 END) as successful_deliveries,
                SUM(CASE WHEN s.stop_status = 'failed' THEN 1 ELSE 0 END) as failed_deliveries
            FROM stops s
            JOIN routes r ON s.route_id = r.id
            WHERE r.user_id = ?
        `;
        const [stopStats] = await pool.query(stopSql, [userId]);

        // 4. Lấy đánh giá (Trung bình sao & Số lượng)
        const reviewSql = `
            SELECT 
                COUNT(*) as total_reviews,
                AVG(rating) as average_rating
            FROM reviews rv
            JOIN routes r ON rv.route_id = r.id
            WHERE r.user_id = ?
        `;
        const [reviewStats] = await pool.query(reviewSql, [userId]);

        // Tổng hợp dữ liệu trả về
        res.json({
            daysActive: daysActive || 0,
            totalRoutes: routeStats[0].total_routes || 0,
            totalDistanceKm: ((routeStats[0].total_distance || 0) / 1000).toFixed(1),
            totalDurationHours: ((routeStats[0].total_duration || 0) / 3600).toFixed(1),
            successDeliveries: stopStats[0].successful_deliveries || 0,
            failedDeliveries: stopStats[0].failed_deliveries || 0,
            rating: parseFloat(reviewStats[0].average_rating || 0).toFixed(1),
            totalReviews: reviewStats[0].total_reviews || 0
        });

    } catch (error) {
        console.error('Lỗi thống kê:', error);
        res.status(500).json({ error: 'Lỗi server nội bộ' });
    }
});

module.exports = router;