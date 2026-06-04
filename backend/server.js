require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
const employeesRoutes = require('./routes/employees');
app.use('/api/employees', employeesRoutes);
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Сервер работает!',
    time: new Date().toLocaleTimeString('ru-RU')
  });
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log(`Проверить работу: http://localhost:${PORT}/api/health`);
});