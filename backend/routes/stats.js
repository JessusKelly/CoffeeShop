const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/hours', authMiddleware, async (req, res) => {
  const { from, to } = req.query;
  
  if (!from || !to) {
    return res.status(400).json({ error: 'Укажите период' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        ua.id,
        ua.surname,
        ua.name,
        COUNT(s.id) as shifts_count,
        SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600) as total_hours
      FROM user_account ua
      LEFT JOIN user_work_addresses uwa ON ua.id = uwa.user_id
      LEFT JOIN schedule s ON uwa.id = s.user_address_id
        AND s.week_day = EXTRACT(DOW FROM generate_series($1::date, $2::date, '1 day'::interval))
        AND (s.valid_from <= $2 AND s.valid_to >= $1)
      GROUP BY ua.id, ua.surname, ua.name
      ORDER BY total_hours DESC
    `, [from, to]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка статистики:', error);
    res.status(500).json({ error: 'Ошибка статистики' });
  }
});

module.exports = router;