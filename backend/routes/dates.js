const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/shifts', async (req, res) => {
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({ error: 'Не указана дата' });
  }

  try {
    const dateObj = new Date(date);
    let dayOfWeek = dateObj.getDay();
    dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

    const result = await pool.query(`
      SELECT 
        s.id,
        s.week_day,
        s.start_time,
        s.end_time,
        s.valid_from,
        s.valid_to,
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
      WHERE s.week_day = $1
        AND (s.valid_from IS NULL OR s.valid_from <= $2)
        AND (s.valid_to IS NULL OR s.valid_to >= $2)
      ORDER BY s.start_time
    `, [dayOfWeek, date]);
    
    res.json({
      date: date,
      dayOfWeek: dayOfWeek,
      shifts: result.rows
    });
  } catch (error) {
    console.error('Ошибка при получении смен на дату:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;