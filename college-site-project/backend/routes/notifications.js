const express = require('express');
const router = express.Router();
const c = require('../controllers/notificationsController');
const authMw = require('../middlewares/authMiddleware');
const roleMw = require('../middlewares/roleMiddleware');

router.use(authMw);
router.get('/', c.getNotifications);
router.post('/', roleMw(['ADMIN', 'DIRECTOR', 'DEPUTY']), c.sendNotification);

module.exports = router;
