const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/dates/shifts?date=2026-06-19
router.get('/shifts', async (req, res) => {
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({ error: 'Не указана дата' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        s.id,
        s.shift_date,
        s.week_day,
        s.start_time,
        s.end_time,
        s.user_address_id,
        ua.id as user_id,
        ua.surname,
        ua.name,
        ua.patronymic,
        r.title as role_title,
        ac.text as address
      FROM schedule s
      JOIN user_work_addresses uwa ON s.user_address_id = uwa.id
      JOIN user_account ua ON uwa.user_id = ua.id
      LEFT JOIN role r ON ua.role = r.id
      LEFT JOIN addres_coffee ac ON uwa.address = ac.id
      WHERE s.shift_date = $1::date
      ORDER BY s.start_time
    `, [date]);
    
    console.log(`Shifts for ${date}:`, result.rows.length);
    
    res.json({
      date: date,
      shifts: result.rows
    });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;