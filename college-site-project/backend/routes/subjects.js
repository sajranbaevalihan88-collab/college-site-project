const express = require('express');
const router = express.Router();
const c = require('../controllers/subjectsController');
const authMw = require('../middlewares/authMiddleware');
const roleMw = require('../middlewares/roleMiddleware');

router.use(authMw);
router.get('/', c.getAll);
router.post('/', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.create);
router.put('/:id', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.update);
router.delete('/:id', roleMw(['ADMIN','DIRECTOR']), c.remove);

module.exports = router;
