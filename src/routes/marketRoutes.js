const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', marketController.getMarkets);
router.get('/:id', marketController.getMarketById);
router.post('/', authenticate, requireRole(['operator', 'admin']), marketController.createMarket);

module.exports = router;
