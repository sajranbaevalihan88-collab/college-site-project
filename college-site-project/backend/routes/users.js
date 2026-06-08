const express = require('express');
const router = express.Router();
const c = require('../controllers/usersController');
const authMw = require('../middlewares/authMiddleware');
const roleMw = require('../middlewares/roleMiddleware');

router.use(authMw);
router.get('/', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.getAllUsers);
router.get('/pending', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.getPendingStudents);
router.post('/', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.createUser);
router.put('/:id', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.updateUser);
router.put('/:id/approve', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.approveUser);
router.delete('/:id', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.deleteUser);

router.post('/employee', roleMw(['ADMIN', 'DIRECTOR', 'DEPUTY']), c.createEmployee);
router.put('/:id/role', roleMw(['ADMIN', 'DIRECTOR']), c.updateRole);
router.get('/:id/access', roleMw(['ADMIN', 'DIRECTOR', 'DEPUTY']), c.getTeacherAccess);
router.put('/:id/access', roleMw(['ADMIN', 'DIRECTOR', 'DEPUTY']), c.updateTeacherAccess);

module.exports = router;
