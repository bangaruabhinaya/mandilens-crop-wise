const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.get('/me', authenticate, authController.getCurrentUser);
router.get('/personas', authController.listPersonas);
router.post('/switch-persona', authController.switchPersona);
router.get('/status', authController.getDbHealth);

module.exports = router;
