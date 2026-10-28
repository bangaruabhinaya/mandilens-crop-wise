const express = require('express');
const router = express.Router();
const comparisonController = require('../controllers/comparisonController');
const { authenticate } = require('../middleware/auth');

router.post('/compare', authenticate, comparisonController.runComparison);
router.post('/quick-calculate', comparisonController.quickCalculate);

module.exports = router;
