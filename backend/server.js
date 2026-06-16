require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://coffeeshop-peach-five.vercel.app'
];

app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
const employeesRoutes = require('./routes/employees');
app.use('/api/employees', employeesRoutes);
const shiftsRoutes = require('./routes/shifts');
app.use('/api/shifts', shiftsRoutes);
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
const datesRoutes = require('./routes/dates');
app.use('/api/dates', datesRoutes);
const statsRoutes = require('./routes/stats');
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Сервер работает!',
    time: new Date().toLocaleTimeString('ru-RU')
  });
});
app.listen(PORT, () => {
  console.log(`Сервер запущен`);
});