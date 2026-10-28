const express = require('express');
const router = express.Router();
const decisionController = require('../controllers/decisionController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateDecisionInput } = require('../middleware/validation');

// Grower/Farmer decision log routes
router.get('/', authenticate, decisionController.getDecisions);
router.get('/:id', authenticate, decisionController.getDecisionById);
router.post('/', authenticate, requireRole(['farmer', 'admin']), validateDecisionInput, decisionController.createDecision);
router.patch('/:id', authenticate, requireRole(['farmer', 'admin']), decisionController.updateDecision);
router.delete('/:id', authenticate, requireRole(['farmer', 'admin']), decisionController.deleteDecision);

module.exports = router;
