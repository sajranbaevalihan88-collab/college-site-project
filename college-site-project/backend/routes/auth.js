const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const authMw = require('../middlewares/authMiddleware');

router.post('/login', auth.login);
router.post('/register', auth.register);
router.get('/me', authMw, auth.getMe);

module.exports = router;
