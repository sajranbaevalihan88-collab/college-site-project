const express = require('express');
const router = express.Router();
const c = require('../controllers/groupsController');
const authMw = require('../middlewares/authMiddleware');
const roleMw = require('../middlewares/roleMiddleware');

router.use(authMw);
router.get('/', c.getAll);
router.get('/:id/students', c.getStudentsInGroup);
router.post('/', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.create);
router.put('/:id', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.update);
router.delete('/:id', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.remove);
router.put('/:id/curator', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.updateCurator);

module.exports = router;
