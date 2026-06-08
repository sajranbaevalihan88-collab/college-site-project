const express = require('express');
const router = express.Router();
const lessonsController = require('../controllers/lessonsController');
const requireAuth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

// Create a lesson
router.post('/', requireAuth, requireRole(['TEACHER', 'ADMIN', 'DIRECTOR']), lessonsController.createLesson);

// Get all lessons (for students to view)
router.get('/', requireAuth, lessonsController.getAllLessons);

// Get my lessons (for teachers)
router.get('/my', requireAuth, requireRole(['TEACHER']), lessonsController.getMyLessons);

// Get single lesson details
router.get('/:id', requireAuth, lessonsController.getLesson);

// Update lesson (basic info)
router.put('/:id', requireAuth, requireRole(['TEACHER', 'ADMIN']), lessonsController.updateLesson);

// Delete lesson
router.delete('/:id', requireAuth, requireRole(['TEACHER', 'ADMIN']), lessonsController.deleteLesson);

// --- File upload (Python processing) ---
const multer = require('multer');
const fs = require('fs');
if(!fs.existsSync('uploads/lessons')) fs.mkdirSync('uploads/lessons', { recursive: true });
const path = require('path');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/lessons/'),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|pdf|doc|docx|ppt|pptx|zip|rar/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Недопустимый формат файла. Разрешены только изображения, документы и архивы.'));
};
const upload = multer({ 
  storage, 
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter 
});
router.post('/:id/upload', requireAuth, requireRole(['TEACHER']), upload.single('file'), lessonsController.uploadFile);

// --- Whiteboard routes ---
router.get('/:id/whiteboard', requireAuth, lessonsController.getWhiteboard);
router.post('/:id/whiteboard', requireAuth, requireRole(['TEACHER']), lessonsController.saveWhiteboard);

// --- Tests routes ---
router.get('/:id/tests', requireAuth, lessonsController.getTests);
router.post('/:id/tests', requireAuth, requireRole(['TEACHER']), lessonsController.addTest);
router.delete('/tests/:testId', requireAuth, requireRole(['TEACHER']), lessonsController.deleteTest);

// --- Likes & Saves & Comments ---
router.post('/:id/like', requireAuth, lessonsController.toggleLike);
router.post('/:id/save', requireAuth, lessonsController.toggleSave);
router.post('/:id/comment', requireAuth, lessonsController.addComment);
router.get('/:id/comments', requireAuth, lessonsController.getComments);

// Get user's saved lessons
router.get('/user/saved', requireAuth, lessonsController.getSavedLessons);

module.exports = router;
