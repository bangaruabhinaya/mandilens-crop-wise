const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

router.get('/dashboard', authenticate, analyticsController.getDashboardMetrics);
router.get('/price-history', analyticsController.getPriceHistory);

module.exports = router;
