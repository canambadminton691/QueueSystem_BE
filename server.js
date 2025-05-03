// Import dependencies
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const courtsRoutes = require('./routes/courts');
const registerRoutes = require('./routes/register');
const reserveRoutes = require('./routes/reserve');
const queueRoutes = require('./routes/queue');
const mergeRoutes = require('./routes/merge');
const validateUsersRoutes = require('./routes/validate-users');
const activeUsersRoutes = require('./routes/active-users');
const adminRoutes = require('./routes/admin');
const cleanupCourtsRoutes = require('./routes/cron/cleanup-courts');

// Create Express app
const app = express();

// Define port
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for now
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connection successful');
  })
  .catch(err => console.error('MongoDB connection error:', err))
  .finally(() => {
    // No matter connect MongoDB success or fail，start the server
    app.listen(PORT, () => {
      console.log(`Server running on port: ${PORT}`);
      console.log(`Test the API at http://localhost:${PORT}`);
    });
  });

// Basic route test
app.get('/', (req, res) => {
    res.status(200).json({ message: 'CanAm Backend API Service Running' });
  });
  
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

// Use routes
app.use('/api/courts', courtsRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/reserve', reserveRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/merge', mergeRoutes);
app.use('/api/validate-users', validateUsersRoutes);
app.use('/api/active-users', activeUsersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cron/cleanup-courts', cleanupCourtsRoutes);

// Add route for 404 errors - this should be AFTER all other routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});