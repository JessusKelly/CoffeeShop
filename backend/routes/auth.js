const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

router.post('/login', async (req, res) => {
  const { login, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM user_account WHERE login = $1', [login]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const user = result.rows[0];
    if (user.password !== password) return res.status(401).json({ error: 'Неверный логин или пароль' });
    
    // Если пароли захешированы
    //const validPassword = await bcrypt.compare(password, user.password);
    //if (!validPassword) {
    //  return res.status(401).json({ error: 'Неверный логин или пароль' });
    //}

    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        login: user.login 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: `${user.surname} ${user.name}`,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;