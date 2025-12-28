// File: routes/routes.js

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const axios = require('axios');

// Lưu ý: Chúng ta sẽ áp dụng middleware ở file index.js
// nên ở đây không cần import nữa

// 1. Import router 'stops' mới
const stopsRouter = require('./stops');

// === HÀM TRỢ GIÚP (Kiểm tra quyền sở hữu) ===
// Chúng ta sẽ cần hàm này
const checkRouteOwnership = async (routeId, userId) => {
    const sql = 'SELECT * FROM routes WHERE id = ? AND user_id = ?';
    const [rows] = await pool.query(sql, [routeId, userId]);
    return rows.length > 0; // Trả về true nếu user sở hữu route này
};

/**
 * @route   POST /api/routes
 * @desc    Tạo một lộ trình (route) mới
 * @access  Private (Đã được bảo vệ bởi authMiddleware)
 */
router.post('/', async (req, res) => {
    try {
        // 1. Lấy tên lộ trình từ body
        const { routeName } = req.body;

        // 2. Lấy user_id từ middleware (đã giải mã từ token)
        // Đây chính là lý do chúng ta cần middleware
        const userId = req.user.id;

        if (!routeName) {
            return res.status(400).json({ error: 'Tên lộ trình (routeName) là bắt buộc' });
        }

        // 3. Thêm lộ trình mới vào CSDL
        const sql = 'INSERT INTO routes (user_id, route_name) VALUES (?, ?)';
        const [result] = await pool.query(sql, [userId, routeName]);

        // 4. Trả về ID của lộ trình vừa tạo
        // (Phía frontend sẽ cần ID này để thêm các 'stops')
        res.status(201).json({
            message: 'Tạo lộ trình thành công!',
            routeId: result.insertId
        });

    } catch (error) {
        console.error('Lỗi khi tạo route:', error);
        res.status(500).json({ error: 'Lỗi server nội bộ' });
    }
});

/**
 * @route   GET /api/routes/search
 * @desc    Tìm kiếm địa điểm (Autocomplete) qua Mapbox
 * @access  Private (Cần Token) hoặc Public tùy bạn
 */
router.get('/search', async (req, res) => {
    try {
        const { q, userLat, userLng } = req.query;

        // --- THÊM LOG ĐỂ KIỂM TRA ---
        console.log("--------------------");
        console.log("🔍 Đang tìm kiếm:", q);
        console.log("📍 Tọa độ nhận được:", userLat, userLng);

        const params = {
            access_token: process.env.MAPBOX_ACCESS_TOKEN,
            country: 'vn',
            autocomplete: true,
            limit: 5,
            language: 'vi',
            // Thêm dòng này để ưu tiên tìm Địa điểm (poi) và Địa chỉ (address)
            types: 'poi,address'
        };

        if (userLat && userLng) {
            params.proximity = `${userLng},${userLat}`; // Chú ý: Lng trước, Lat sau
            console.log("🎯 Chế độ Proximity:", params.proximity);
        }

        const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`;

        // Log URL cuối cùng (để bạn có thể copy paste vào trình duyệt xem thử)
        console.log("🔗 URL gọi Mapbox:", mapboxUrl);
        console.log("⚙️ Params:", params);
        // -----------------------------

        const response = await axios.get(mapboxUrl, { params });

        // Log kết quả trả về từ Mapbox
        console.log("✅ Kết quả tìm thấy:", response.data.features.length);

        const suggestions = response.data.features.map(item => ({
            id: item.id,
            name: item.place_name,
            center: item.center
        }));

        res.json(suggestions);
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// API MỚI: THÊM/CẬP NHẬT ĐIỂM XUẤT PHÁT ---
/**
 * @route   PUT /api/routes/:routeId/start-point
 * @desc    Thêm hoặc cập nhật điểm xuất phát cho lộ trình
 * @access  Private
 */
router.put('/:routeId/start-point', async (req, res) => {
    const { routeId } = req.params;
    const userId = req.user.id;

    // Lấy địa chỉ từ body
    const { addressText, lat, lng } = req.body;

    if (!addressText) {
        return res.status(400).json({ error: 'addressText là bắt buộc' });
    }

    try {
        // 1. (Bảo mật) Kiểm tra xem user có sở hữu route này không
        const isOwner = await checkRouteOwnership(routeId, userId);
        if (!isOwner) {
            return res.status(403).json({ error: 'Forbidden. Bạn không có quyền truy cập lộ trình này.' });
        }

        // 2. Cập nhật bảng 'routes' với thông tin điểm xuất phát
        const sql = 'UPDATE routes SET start_address = ?, start_lat = ?, start_lng = ? WHERE id = ?';
        await pool.query(sql, [addressText, lat, lng, routeId]);

        // 3. Trả về thành công
        res.json({
            message: 'Cập nhật điểm xuất phát thành công!',
            routeId: routeId,
            startAddress: addressText
        });

    } catch (error) {
        console.error('Lỗi khi cập nhật điểm xuất phát:', error);
        res.status(500).json({ error: 'Lỗi server nội bộ' });
    }
});

// === HÀM TRỢ GIÚP MỚI (Để Geocode địa chỉ) ===
const geocodeWithMapbox = async (addressText, accessToken) => {
    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressText)}.json`;
        const response = await axios.get(url, {
            params: {
                access_token: accessToken,
                limit: 1,
                country: 'VN' // Ưu tiên kết quả ở Việt Nam
            }
        });

        if (response.data.features && response.data.features.length > 0) {
            const location = response.data.features[0].center;
            return { lng: location[0], lat: location[1] };
        } else {
            throw new Error(`Không tìm thấy tọa độ cho: ${addressText}`);
        }
    } catch (error) {
        console.error(`Lỗi Geocoding Mapbox: ${error.message}`);
        throw new Error(`Lỗi khi geocode: ${addressText}`);
    }
};


// --- API TỐI ƯU HÓA MỚI (DÙNG MAPBOX) - BẢN SỬA LỖI LOGIC
/**
 * @route   POST /api/routes/:routeId/optimize
 * @desc    Tối ưu hóa lộ trình (gọi Mapbox API)
 * @access  Private
 */
router.post('/:routeId/optimize', async (req, res) => {
    const { routeId } = req.params;
    const userId = req.user.id;
    const accessToken = process.env.MAPBOX_ACCESS_TOKEN;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Kiểm tra quyền sở hữu và lấy dữ liệu
        const [routeRows] = await connection.query('SELECT * FROM routes WHERE id = ? AND user_id = ?', [routeId, userId]);
        if (routeRows.length === 0) {
            await connection.rollback(); connection.release();
            return res.status(403).json({ error: 'Forbidden' });
        }
        const routeData = routeRows[0];

        // 2. Lấy điểm xuất phát
        if (!routeData.start_address) {
            await connection.rollback(); connection.release();
            return res.status(400).json({ error: 'Vui lòng thêm điểm xuất phát.' });
        }

        // 3. Lấy các điểm dừng (stops)
        const [stops] = await connection.query('SELECT id, address_text FROM stops WHERE route_id = ?', [routeId]);
        if (stops.length === 0) {
            await connection.rollback(); connection.release();
            return res.status(400).json({ error: 'Vui lòng thêm ít nhất một điểm dừng.' });
        }

        // 4. Geocode tất cả địa chỉ
        const startCoords = await geocodeWithMapbox(routeData.start_address, accessToken);
        if (!startCoords || startCoords.lat === undefined) {
            throw new Error(`Không thể tìm thấy tọa độ cho điểm xuất phát: ${routeData.start_address}`);
        }

        const stopsWithCoords = await Promise.all(stops.map(async (stop) => {
            const coords = await geocodeWithMapbox(stop.address_text, accessToken);
            if (!coords || coords.lat === undefined) {
                throw new Error(`Không thể tìm thấy tọa độ cho điểm dừng: ${stop.address_text}`);
            }
            return { ...stop, ...coords };
        }));

        // 5. Chuẩn bị dữ liệu cho Mapbox Optimization
        // Mảng tọa độ ĐẦU VÀO
        const coordinates = [
            startCoords,                                                  // index 0
            ...stopsWithCoords.map(s => ({ lat: s.lat, lng: s.lng })),    // index 1, 2, 3...
            startCoords                                                   // index cuối (N)
        ];

        const coordinatesString = coordinates.map(c => `${c.lng},${c.lat}`).join(';');

        // 6. Gọi Mapbox Optimization API
        const optimizeUrl = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinatesString}`;
        const optimizeResponse = await axios.get(optimizeUrl, {
            params: {
                access_token: accessToken,
                source: 'first',
                destination: 'last',
                roundtrip: false
            }
        });

        if (optimizeResponse.data.code !== 'Ok') {
            throw new Error(`Mapbox Optimize Error: ${optimizeResponse.data.message}`);
        }

        // 7. Xử lý kết quả từ Mapbox
        const trip = optimizeResponse.data.trips[0];
        // 'waypoints' là mảng KẾT QUẢ, nó có cùng số lượng
        // và thứ tự với mảng 'coordinates' ĐẦU VÀO
        const waypoints = optimizeResponse.data.waypoints;

        // 8. Cập nhật CSDL
        // a) Cập nhật bảng 'routes'
        await connection.query(
            'UPDATE routes SET overview_polyline = ?, total_distance_meters = ?, total_duration_seconds = ?, start_lat = ?, start_lng = ? WHERE id = ?',
            [
                trip.geometry,
                trip.distance,
                trip.duration,
                startCoords.lat,
                startCoords.lng,
                routeId
            ]
        );

        // b) (SỬA LỖI LOGIC) Cập nhật bảng 'stops'
        const updatePromises = waypoints.map(async (waypoint, index) => {
            // 'index' là vị trí trong mảng đầu vào (0, 1, 2, 3, 4...)
            // 'waypoint.waypoint_index' là thứ tự TỐI ƯU (0, 2, 3, 1, 4...)

            // Bỏ qua điểm đầu (index 0) và điểm cuối (index = waypoints.length - 1)
            // VÌ CHÚNG LÀ ĐIỂM XUẤT PHÁT, KHÔNG CÓ TRONG BẢNG 'STOPS'
            if (index === 0 || index === (waypoints.length - 1)) {
                return; // Bỏ qua, không làm gì cả
            }

            // Map 'index' (từ 1, 2, 3...) về mảng 'stopsWithCoords' (từ 0, 1, 2...)
            // Ví dụ: waypoint[1] sẽ map với stopsWithCoords[0]
            const dbStop = stopsWithCoords[index - 1];

            if (!dbStop) {
                // Lỗi này không nên xảy ra, nhưng là để an toàn
                console.warn(`Bỏ qua waypoint không khớp (lỗi logic): index ${index}`);
                return;
            }

            // Lấy thứ tự tối ưu (Mapbox trả về bắt đầu từ 0)
            // Chúng ta +1 để lưu vào CSDL (1, 2, 3...)
            const optimizedOrder = waypoint.waypoint_index;

            return connection.query(
                'UPDATE stops SET optimized_order = ?, lat = ?, lng = ? WHERE id = ?',
                [
                    optimizedOrder,
                    dbStop.lat,
                    dbStop.lng,
                    dbStop.id
                ]
            );
        });

        // Chờ tất cả các lệnh update 'stops' hoàn thành
        await Promise.all(updatePromises);

        // 9. Hoàn tất transaction
        await connection.commit();

        res.json({
            message: 'Tối ưu hóa lộ trình (Mapbox) thành công!',
            routeId: routeId,
            totalDistance_km: trip.distance / 1000,
            totalDuration_min: Math.round(trip.duration / 60)
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Lỗi khi tối ưu hóa (Mapbox):', error.message);
        res.status(500).json({ error: 'Lỗi server nội bộ', details: error.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * @route   GET /api/routes/:routeId
 * @desc    Lấy chi tiết một lộ trình (bao gồm các stops đã sắp xếp)
 * @access  Private
 */
router.get('/:routeId', async (req, res) => {
    const { routeId } = req.params;
    const userId = req.user.id;

    try {
        // 1. Lấy thông tin chính của route VÀ kiểm tra quyền sở hữu
        const [routeRows] = await pool.query(
            'SELECT * FROM routes WHERE id = ? AND user_id = ?',
            [routeId, userId]
        );

        if (routeRows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy lộ trình hoặc bạn không có quyền.' });
        }

        const route = routeRows[0];

        // 2. Lấy tất cả các điểm dừng (stops) thuộc về route này
        // QUAN TRỌNG: Sắp xếp (ORDER BY) theo optimized_order
        const [stops] = await pool.query(
            'SELECT id, address_text, lat, lng, optimized_order, stop_status FROM stops WHERE route_id = ? ORDER BY optimized_order ASC',
            [routeId]
        );

        // 3. Gắn mảng stops vào kết quả
        route.stops = stops;

        // 4. Trả về kết quả
        res.json(route);

    } catch (error) {
        console.error('Lỗi khi lấy chi tiết route:', error.message);
        res.status(500).json({ error: 'Lỗi server nội bộ' });
    }
});

// API: LẤY TẤT CẢ LỘ TRÌNH (LỊCH SỬ)
/**
 * @route   GET /api/routes
 * @desc    Lấy tất cả lộ trình của shipper (đã đăng nhập)
 * @access  Private
 */
router.get('/', async (req, res) => {
    const userId = req.user.id; // Lấy từ authMiddleware

    try {
        // Sắp xếp theo ngày tạo mới nhất (DESC)
        const sql = 'SELECT * FROM routes WHERE user_id = ? ORDER BY created_at DESC';
        const [routes] = await pool.query(sql, [userId]);

        res.json(routes); // Trả về một mảng các lộ trình

    } catch (error) {
        console.error('Lỗi khi lấy lịch sử lộ trình:', error);
        res.status(500).json({ error: 'Lỗi server nội bộ' });
    }
});

// --- API MỚI: CẬP NHẬT TRẠNG THÁI LỘ TRÌNH ---
/**
 * @route   PATCH /api/routes/:routeId/status
 * @desc    Cập nhật trạng thái của lộ trình (pending, in_progress, completed)
 * @access  Private
 */
router.patch('/:routeId/status', async (req, res) => {
    const { routeId } = req.params;
    const userId = req.user.id;
    const { status } = req.body; // Nhận status mới từ body

    // Kiểm tra status hợp lệ
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
    }

    try {
        // Kiểm tra quyền sở hữu
        const isOwner = await checkRouteOwnership(routeId, userId);
        if (!isOwner) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Cập nhật CSDL
        const sql = 'UPDATE routes SET route_status = ? WHERE id = ?';
        await pool.query(sql, [status, routeId]);

        res.json({ message: 'Cập nhật trạng thái lộ trình thành công!', newStatus: status });

    } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái route:', error);
        res.status(500).json({ error: 'Lỗi server nội bộ' });
    }
});



// Gắn 'stopsRouter' vào đây
router.use('/:routeId/stops', stopsRouter);

module.origin = router; // <-- Lỗi chính tả ở đây, nhưng nó ở ngoài hàm, tôi sẽ sửa luôn
module.exports = router; // <-- Sửa lại thành 'exports'