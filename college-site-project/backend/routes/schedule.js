const express = require('express');
const router = express.Router();
const c = require('../controllers/scheduleController');
const authMw = require('../middlewares/authMiddleware');
const roleMw = require('../middlewares/roleMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir) },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'schedule-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|csv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Недопустимый формат файла. Разрешены только изображения и документы (pdf, docx, xlsx).'));
};
const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter 
});

router.use(authMw);
router.get('/', c.getSchedule);
router.post('/', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.createSchedule);
router.put('/:id', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.updateSchedule);
router.delete('/:id', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.deleteSchedule);

// Media
router.get('/media', c.getScheduleFiles);
router.post('/media', roleMw(['ADMIN','DIRECTOR','DEPUTY']), upload.single('file'), c.uploadScheduleFile);
router.delete('/media/:id', roleMw(['ADMIN','DIRECTOR','DEPUTY']), c.deleteScheduleFile);

module.exports = router;
