const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { checkShiftOverlap } = require('../utils/validation');
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
        SELECT 
            s.id,
            s.week_day,
            s.shift_date,
            s.start_time,
            s.end_time,
            s.valid_from,
            s.valid_to,
            ua.id as user_id,
            ua.surname,
            ua.name,
            r.title as role_title,
            ac.text as address
        FROM schedule s
        JOIN user_work_addresses uwa ON s.user_address_id = uwa.id
        JOIN user_account ua ON uwa.user_id = ua.id
        LEFT JOIN role r ON ua.role = r.id
        LEFT JOIN addres_coffee ac ON uwa.address = ac.id
        ORDER BY s.week_day, s.start_time
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении смен:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// POST — создание смены
router.post('/', authMiddleware, async (req, res) => {
  const { user_address_id, shift_date, start_time, end_time } = req.body;
  
  if (req.user.role !== 1) {
    return res.status(403).json({ error: 'Только администраторы' });
  }
  
  if (!user_address_id || !shift_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Не заполнены все поля' });
  }

  const dateObj = new Date(shift_date);
  let weekDay = dateObj.getUTCDay();
  weekDay = weekDay === 0 ? 7 : weekDay;

  try {
    // Проверка пересечений
    const overlap = await pool.query(`
      SELECT id FROM schedule
      WHERE user_address_id = $1
        AND shift_date = $2::date
        AND NOT (end_time <= $3 OR start_time >= $4)
    `, [user_address_id, shift_date, start_time, end_time]);
    
    if (overlap.rows.length > 0) {
      return res.status(400).json({ error: 'У сотрудника уже есть смена в это время' });
    }

    const result = await pool.query(`
      INSERT INTO schedule (user_address_id, shift_date, week_day, start_time, end_time)
      VALUES ($1, $2::date, $3, $4, $5)
      RETURNING *
    `, [user_address_id, shift_date, weekDay, start_time, end_time]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT — редактирование
router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 1) {
    return res.status(403).json({ error: 'Только администраторы' });
  }
  
  const { id } = req.params;
  const { user_address_id, shift_date, start_time, end_time } = req.body;

  if (!user_address_id || !shift_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Не заполнены все поля' });
  }

  const dateObj = new Date(shift_date);
  let weekDay = dateObj.getUTCDay();
  weekDay = weekDay === 0 ? 7 : weekDay;

  try {
    const overlap = await pool.query(`
      SELECT id FROM schedule
      WHERE user_address_id = $1
        AND shift_date = $2::date
        AND id != $5
        AND NOT (end_time <= $3 OR start_time >= $4)
    `, [user_address_id, shift_date, start_time, end_time, id]);
    
    if (overlap.rows.length > 0) {
      return res.status(400).json({ error: 'У сотрудника уже есть смена в это время' });
    }

    const result = await pool.query(`
      UPDATE schedule 
      SET user_address_id = $1, 
          shift_date = $2::date,
          week_day = $3,
          start_time = $4, 
          end_time = $5
      WHERE id = $6
      RETURNING *
    `, [user_address_id, shift_date, weekDay, start_time, end_time, id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Смена не найдена' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

async function checkShiftOverlap(userAddressId, shiftDate, startTime, endTime, excludeShiftId = null) {
  const query = `
    SELECT id FROM schedule
    WHERE user_address_id = $1
      AND shift_date = $2
      AND ($5 IS NULL OR id != $5)
      AND NOT (end_time <= $3 OR start_time >= $4)
  `;
  
  const result = await pool.query(query, [
    userAddressId,
    shiftDate,
    startTime,
    endTime,
    excludeShiftId
  ]);
  
  return result.rows.length > 0;
}

router.delete('/:id', authMiddleware, async (req, res) => {
    if (req.user.role !== 1) {
        return res.status(403).json({ error: 'У вас нет прав на удаление смен' });
    }
    
    const { id } = req.params;
    
    try {
        const result = await pool.query(
        'DELETE FROM schedule WHERE id = $1 RETURNING *', 
        [id]
        );
        
        if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Смена не найдена' });
        }
        
        res.json({ success: true, deleted: result.rows[0] });
    } catch (error) {
        console.error('Ошибка при удалении смены:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;