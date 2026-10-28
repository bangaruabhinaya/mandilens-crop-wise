const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config');
const { errorHandler } = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const cropRoutes = require('./src/routes/cropRoutes');
const marketRoutes = require('./src/routes/marketRoutes');
const quoteRoutes = require('./src/routes/quoteRoutes');
const comparisonRoutes = require('./src/routes/comparisonRoutes');
const decisionRoutes = require('./src/routes/decisionRoutes');
const csvRoutes = require('./src/routes/csvRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/comparison', comparisonRoutes);
app.use('/api/decisions', decisionRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    app: config.settings.appName,
    version: config.settings.version,
    timestamp: new Date().toISOString()
  });
});

// Single Page Application Fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: { message: `Route not found: ${req.method} ${req.path}`, code: 'NOT_FOUND' }
    });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Central Error Handler
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`================================================================`);
    console.log(`  🌾 ${config.settings.appName}`);
    console.log(`  🚀 Server listening on http://localhost:${config.port}`);
    console.log(`  📊 Mode: ${config.env}`);
    console.log(`================================================================`);
  });
}

module.exports = app;
