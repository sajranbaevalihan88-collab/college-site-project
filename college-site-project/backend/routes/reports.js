const express = require('express');
const router = express.Router();
const { generateGroupReport } = require('../controllers/reportsController');
const authMiddleware = require('../middlewares/authMiddleware');

// Только директор, зам, админ могут скачивать отчёты
router.get('/group/:group_id', authMiddleware, generateGroupReport);

module.exports = router;
