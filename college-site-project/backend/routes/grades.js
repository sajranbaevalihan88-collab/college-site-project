const express = require('express');
const router = express.Router();
const c = require('../controllers/gradesController');
const authMw = require('../middlewares/authMiddleware');
const roleMw = require('../middlewares/roleMiddleware');

router.use(authMw);
router.get('/', c.getGrades);
router.get('/average/:studentId', c.getStudentAverage);
router.get('/my-average', roleMw(['STUDENT']), c.getStudentAverage);
router.post('/', roleMw(['ADMIN','DIRECTOR','DEPUTY','TEACHER']), c.addGrade);
router.put('/:id', roleMw(['ADMIN','DIRECTOR','DEPUTY','TEACHER']), c.updateGrade);
router.delete('/:id', roleMw(['ADMIN','DIRECTOR','TEACHER']), c.deleteGrade);

module.exports = router;
