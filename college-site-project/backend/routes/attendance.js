const express = require('express');
const router = express.Router();
const c = require('../controllers/attendanceController');
const authMw = require('../middlewares/authMiddleware');
const roleMw = require('../middlewares/roleMiddleware');

router.use(authMw);
router.get('/', c.getAttendance);
router.get('/stats/:studentId', c.getStudentStats);
router.get('/my-stats', roleMw(['STUDENT']), c.getStudentStats);
router.post('/', roleMw(['ADMIN','DIRECTOR','DEPUTY','TEACHER']), c.markAttendance);

module.exports = router;
