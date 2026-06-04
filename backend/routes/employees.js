const express = require('express');
const router = express.Router();
const pool = require('../db');
router.get('/', async (req, res) => {
  try {
        const result = await pool.query(`
        SELECT 
            ua.id,
            ua.surname,
            ua.name,
            ua.patronymic,
            r.title as role_title,
            uwa.id as user_address_id
        FROM user_account ua
        LEFT JOIN role r ON ua.role = r.id
        LEFT JOIN user_work_addresses uwa ON ua.id = uwa.user_id
        ORDER BY ua.id
        `);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении сотрудников:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});
module.exports = router;