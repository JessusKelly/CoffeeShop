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

router.post('/', authMiddleware, async (req, res) => {
    const { user_address_id, week_day, start_time, end_time } = req.body;
    if (req.user.role !== 1) return res.status(403).json({ error: 'Только администраторы могут добавлять смены' });
    if (!user_address_id || !week_day || !start_time || !end_time) {
        return res.status(400).json({ 
        error: 'Не заполнены все обязательные поля' 
        });
    }
    const hasOverlap = await checkShiftOverlap(user_address_id, week_day, start_time, end_time);
        if (hasOverlap) {
            return res.status(400).json({ error: 'У сотрудника уже есть смена в это время' });
        }
    try {
        const result = await pool.query(`
        INSERT INTO schedule (user_address_id, week_day, start_time, end_time)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `, [user_address_id, week_day, start_time, end_time]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при добавлении смены:', error);
        res.status(500).json({ error: error.message });
    }
});

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

router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 1) {
    return res.status(403).json({ error: 'Только администраторы могут редактировать смены' });
  }
  
  const { id } = req.params;
  const { user_address_id, week_day, start_time, end_time } = req.body;

  console.log('Editing shift:', { id, user_address_id, week_day, start_time, end_time });

  if (!user_address_id || !week_day || !start_time || !end_time) {
    return res.status(400).json({ error: 'Не заполнены все обязательные поля' });
  }

  try {
    const hasOverlap = await checkShiftOverlap(user_address_id, week_day, start_time, end_time, id);
    console.log('Has overlap:', hasOverlap);
    
    if (hasOverlap) {
      return res.status(400).json({ error: 'У сотрудника уже есть смена в это время' });
    }

    const result = await pool.query(`
      UPDATE schedule 
      SET user_address_id = $1, 
          week_day = $2, 
          start_time = $3, 
          end_time = $4
      WHERE id = $5
      RETURNING *
    `, [user_address_id, week_day, start_time, end_time, id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Смена не найдена' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка при редактировании смены:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;