const express = require('express');
const router = express.Router();
const cropController = require('../controllers/cropController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', cropController.getCrops);
router.get('/grades', cropController.getCropGrades);
router.get('/:id', cropController.getCropById);

// Staff and Admin can manage crops & grades
router.post('/', authenticate, requireRole(['operator', 'admin']), cropController.createCrop);
router.post('/grades', authenticate, requireRole(['operator', 'admin']), cropController.createGrade);

module.exports = router;
