const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Нет токена авторизации' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Токен не найден' });
    }
    const secret = process.env.JWT_SECRET || 'coffeeshop_secret_key_2026_change_me'; 
    console.log('Попытка проверить токен...');
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Ошибка проверки токена:', err.message);
    res.status(403).json({ error: 'Токен недействителен' });
  }
};