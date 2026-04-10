const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (e.g. mobile apps, curl)
    if (!origin) return callback(null, true);
    
    // allow any vercel.app deploy, localhost, and loopback (Playwright / local preview)
    if (
      origin.endsWith('vercel.app') ||
      origin.includes('localhost') ||
      /127\.0\.0\.1/.test(origin)
    ) {
      return callback(null, true);
    }
    
    // allow configured env url
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/department-requests', require('./routes/departmentRequests'));
app.use('/api/leader', require('./routes/leader'));
app.use('/api/student', require('./routes/student'));
app.use('/api/rotation', require('./routes/rotation'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Quota Manager server running on port ${PORT}`);
});
