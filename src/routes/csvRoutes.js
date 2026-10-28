const express = require('express');
const router = express.Router();
const csvController = require('../controllers/csvController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/export-quotes', csvController.exportQuotesCsv);
router.get('/export-decisions', authenticate, csvController.exportDecisionsCsv);
router.post('/import-quotes', authenticate, requireRole(['operator', 'admin']), csvController.importQuotesCsv);

module.exports = router;
