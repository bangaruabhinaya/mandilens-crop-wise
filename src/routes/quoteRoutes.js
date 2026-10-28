const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateQuoteInput } = require('../middleware/validation');

router.get('/', quoteController.getQuotes);
router.get('/:id', quoteController.getQuoteById);

// Submit quote: authenticated farmers can submit quotes; operators/admins verify
router.post('/', authenticate, validateQuoteInput, quoteController.createQuote);

module.exports = router;
