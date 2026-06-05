const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/hours', authMiddleware, async (req, res) => {
  const { from, to } = req.query;
  
  if (!from || !to) {
    return res.status(400).json({ error: 'Укажите период (from и to)' });
  }

  try {
    const result = await pool.query(`
        SELECT 
            ua.id,
            ua.surname,
            ua.name,
            COUNT(s.id) as shifts_count,
            COALESCE(SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600), 0) as total_hours
        FROM user_account ua
        LEFT JOIN user_work_addresses uwa ON ua.id = uwa.user_id
        LEFT JOIN schedule s ON uwa.id = s.user_address_id
            AND (
            (s.valid_from IS NULL OR s.valid_from <= $2::date)
            AND (s.valid_to IS NULL OR s.valid_to >= $1::date)
            )
        GROUP BY ua.id, ua.surname, ua.name
        ORDER BY ua.surname
    `, [from, to]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка статистики:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;