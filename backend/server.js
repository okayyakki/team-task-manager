const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();


// ✅ FIXED CORS (important)
app.use(cors({
  origin: true,   // allow same-origin (Railway frontend + backend)
  credentials: true
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ===== ROUTES =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/dashboard', require('./routes/dashboard'));


// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Team Task Manager API is running' });
});


// ===== SERVE FRONTEND =====
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, 'frontend');

  app.use(express.static(frontendPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}


// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});


// ===== DB + SERVER =====
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });