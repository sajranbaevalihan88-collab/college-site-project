const express = require('express');
const router = express.Router();
const c = require('../controllers/dashboardController');
const authMw = require('../middlewares/authMiddleware');

router.use(authMw);
router.get('/stats', c.getStats);

module.exports = router;
