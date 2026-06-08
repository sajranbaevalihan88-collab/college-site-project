const express = require('express');
const router = express.Router();
const c = require('../controllers/studentsController');
const authMw = require('../middlewares/authMiddleware');
const roleMw = require('../middlewares/roleMiddleware');

router.use(authMw);
router.get('/', roleMw(['ADMIN','DIRECTOR','DEPUTY','TEACHER']), c.getAllStudents);
router.get('/me', roleMw(['STUDENT']), c.getMyInfo);
router.get('/:id/contract', roleMw(['ADMIN','DIRECTOR','DEPUTY','STUDENT']), c.getStudentContract);
router.put('/:studentId/assign-group', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.assignGroup);

module.exports = router;
