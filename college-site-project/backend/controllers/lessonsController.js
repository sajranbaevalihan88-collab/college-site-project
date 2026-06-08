const { getDb } = require('../database');

exports.createLesson = async (req, res) => {
  const { title, description, video_url } = req.body;
  const teacher_id = req.user.id;
  try {
    const db = await getDb();
    console.log('Попытка создать урок:', title); // лог
    const r = await db.run(
      'INSERT INTO lessons (teacher_id, title, description, video_url) VALUES (?, ?, ?, ?)',
      [teacher_id, title, description || '', video_url || '']
    );
    res.json({ message: 'Урок успешно создан', id: r.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllLessons = async (req, res) => {
  try {
    const db = await getDb();
    const lessons = await db.all(`
      SELECT l.*, p.first_name, p.last_name 
      FROM lessons l
      JOIN profiles p ON l.teacher_id = p.user_id
      ORDER BY l.created_at DESC
    `);
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyLessons = async (req, res) => {
  try {
    const db = await getDb();
    const lessons = await db.all('SELECT * FROM lessons WHERE teacher_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLesson = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  try {
    const db = await getDb();
    const lesson = await db.get(`
      SELECT l.*, p.first_name, p.last_name 
      FROM lessons l
      JOIN profiles p ON l.teacher_id = p.user_id
      WHERE l.id = ?
    `, [id]);
    
    if (!lesson) return res.status(404).json({ error: 'Урок не найден' });

    // костыльный счетчик просмотров
    await db.run('UPDATE lessons SET views_count = views_count + 1 WHERE id = ?', [id]);
    lesson.views_count += 1;

    // Fetch files attached to the lesson
    const files = await db.all('SELECT * FROM lesson_files WHERE lesson_id = ?', [id]);

    // Check if user liked/saved
    const liked = await db.get('SELECT id FROM lesson_likes WHERE lesson_id = ? AND user_id = ?', [id, user_id]);
    const saved = await db.get('SELECT id FROM lesson_saves WHERE lesson_id = ? AND user_id = ?', [id, user_id]);
    
    res.json({ lesson, files, is_liked: !!liked, is_saved: !!saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateLesson = async (req, res) => {
  const { id } = req.params;
  const { title, description, video_url } = req.body;
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'DIRECTOR';
  try {
    const db = await getDb();
    if (isAdmin) {
      await db.run(
        'UPDATE lessons SET title = ?, description = ?, video_url = ? WHERE id = ?',
        [title, description, video_url, id]
      );
    } else {
      await db.run(
        'UPDATE lessons SET title = ?, description = ?, video_url = ? WHERE id = ? AND teacher_id = ?',
        [title, description, video_url, id, req.user.id]
      );
    }
    res.json({ message: 'Урок обновлен' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteLesson = async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'DIRECTOR';
  try {
    const db = await getDb();
    if (isAdmin) {
      await db.run('DELETE FROM lessons WHERE id = ?', [id]);
    } else {
      await db.run('DELETE FROM lessons WHERE id = ? AND teacher_id = ?', [id, req.user.id]);
    }
    res.json({ message: 'Урок удален' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Whiteboard
exports.getWhiteboard = async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const pages = await db.all('SELECT page_index, canvas_data FROM lesson_whiteboard WHERE lesson_id = ? ORDER BY page_index ASC', [id]);
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveWhiteboard = async (req, res) => {
  const { id } = req.params;
  const { pages } = req.body; // Expects { pages: [...] }
  try {
    const db = await getDb();
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'DIRECTOR';
    let lesson;
    if (isAdmin) {
      lesson = await db.get('SELECT id FROM lessons WHERE id = ?', [id]);
    } else {
      lesson = await db.get('SELECT id FROM lessons WHERE id = ? AND teacher_id = ?', [id, req.user.id]);
    }
    if (!lesson) return res.status(403).json({ error: 'Нет доступа' });

    await db.run('DELETE FROM lesson_whiteboard WHERE lesson_id = ?', [id]);
    if (pages && Array.isArray(pages)) {
      for (let i = 0; i < pages.length; i++) {
        await db.run('INSERT INTO lesson_whiteboard (lesson_id, page_index, canvas_data) VALUES (?, ?, ?)', [id, i, pages[i]]);
      }
    }
    res.json({ message: 'Доска сохранена' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Tests
exports.getTests = async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const tests = await db.all('SELECT * FROM lesson_tests WHERE lesson_id = ?', [id]);
    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addTest = async (req, res) => {
  const { id } = req.params;
  const { question, options_json, correct_index } = req.body;
  try {
    const db = await getDb();
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'DIRECTOR';
    let lesson;
    if (isAdmin) {
      lesson = await db.get('SELECT id FROM lessons WHERE id = ?', [id]);
    } else {
      lesson = await db.get('SELECT id FROM lessons WHERE id = ? AND teacher_id = ?', [id, req.user.id]);
    }
    if (!lesson) return res.status(403).json({ error: 'Нет доступа' });

    await db.run(
      'INSERT INTO lesson_tests (lesson_id, question, options_json, correct_index) VALUES (?, ?, ?, ?)',
      [id, question, options_json, correct_index]
    );
    res.json({ message: 'Тест добавлен' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTest = async (req, res) => {
  const { testId } = req.params;
  try {
    const db = await getDb();
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'DIRECTOR';
    if (isAdmin) {
      await db.run('DELETE FROM lesson_tests WHERE id = ?', [testId]);
    } else {
      await db.run('DELETE FROM lesson_tests WHERE id = ? AND lesson_id IN (SELECT id FROM lessons WHERE teacher_id = ?)', [testId, req.user.id]);
    }
    res.json({ message: 'Тест удален' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Social
exports.toggleLike = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  try {
    const db = await getDb();
    const existing = await db.get('SELECT id FROM lesson_likes WHERE lesson_id = ? AND user_id = ?', [id, user_id]);
    if (existing) {
      await db.run('DELETE FROM lesson_likes WHERE id = ?', [existing.id]);
      await db.run('UPDATE lessons SET likes_count = likes_count - 1 WHERE id = ?', [id]);
      res.json({ liked: false });
    } else {
      await db.run('INSERT INTO lesson_likes (lesson_id, user_id) VALUES (?, ?)', [id, user_id]);
      await db.run('UPDATE lessons SET likes_count = likes_count + 1 WHERE id = ?', [id]);
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.toggleSave = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  try {
    const db = await getDb();
    const existing = await db.get('SELECT id FROM lesson_saves WHERE lesson_id = ? AND user_id = ?', [id, user_id]);
    if (existing) {
      await db.run('DELETE FROM lesson_saves WHERE id = ?', [existing.id]);
      res.json({ saved: false });
    } else {
      await db.run('INSERT INTO lesson_saves (lesson_id, user_id) VALUES (?, ?)', [id, user_id]);
      res.json({ saved: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addComment = async (req, res) => {
  const { id } = req.params;
  const { comment_text } = req.body;
  const user_id = req.user.id;
  try {
    const db = await getDb();
    await db.run('INSERT INTO lesson_comments (lesson_id, user_id, comment_text) VALUES (?, ?, ?)', [id, user_id, comment_text]);
    res.json({ message: 'Комментарий добавлен' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getComments = async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const comments = await db.all(`
      SELECT c.*, p.first_name, p.last_name 
      FROM lesson_comments c
      JOIN profiles p ON c.user_id = p.user_id
      WHERE c.lesson_id = ?
      ORDER BY c.created_at DESC
    `, [id]);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSavedLessons = async (req, res) => {
  try {
    const db = await getDb();
    const lessons = await db.all(`
      SELECT l.*, p.first_name, p.last_name 
      FROM lessons l
      JOIN lesson_saves s ON l.id = s.lesson_id
      JOIN profiles p ON l.teacher_id = p.user_id
      WHERE s.user_id = ?
      ORDER BY s.id DESC
    `, [req.user.id]);
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const { spawn } = require('child_process');
const path = require('path');

exports.uploadFile = async (req, res) => {
  const { id } = req.params;
  // если забыли прикрепить файл
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });

  if (req.file) {
    try {
      req.file.originalname = Buffer.from(req.file.originalname, 'binary').toString('utf8');
    } catch (e) {
      console.error('Error decoding originalname:', e);
    }
  }

  try {
    const db = await getDb();
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'DIRECTOR';
    let lesson;
    if (isAdmin) {
      lesson = await db.get('SELECT id FROM lessons WHERE id = ?', [id]);
    } else {
      lesson = await db.get('SELECT id FROM lessons WHERE id = ? AND teacher_id = ?', [id, req.user.id]);
    }
    if (!lesson) return res.status(403).json({ error: 'Нет доступа' });

    const filePath = req.file.path;
    const pythonScript = path.join(__dirname, '../scripts/process_file.py');
    
    const py = spawn('python', [pythonScript, filePath]);
    let output = '';
    
    py.stdout.on('data', data => output += data.toString());
    py.stderr.on('data', data => console.error('Python Error:', data.toString()));
    
    py.on('close', async (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Ошибка обработки файла' });
      }
      
      try {
        const result = JSON.parse(output);
        if (!result.success) return res.status(400).json({ error: result.error || 'Ошибка обработки' });

        let updateQuery = '';
        let url = '';

        if (result.type === 'pptx') {
          const slidesJson = JSON.stringify(result.slides || []);
          await db.run(
            'INSERT INTO lesson_files (lesson_id, file_url, file_name, file_type, slides_data) VALUES (?, ?, ?, ?, ?)',
            [id, '/uploads/lessons/' + req.file.filename, req.file.originalname, 'pptx', slidesJson]
          );
          res.json({ message: 'Презентация успешно загружена! Слайды доступны в уроке.', slides: result.slides, url: '/uploads/lessons/' + req.file.filename });
        } else if (result.type === 'docx') {
          const paragraphsJson = JSON.stringify(result.paragraphs || []);
          await db.run(
            'INSERT INTO lesson_files (lesson_id, file_url, file_name, file_type, slides_data) VALUES (?, ?, ?, ?, ?)',
            [id, '/uploads/lessons/' + req.file.filename, req.file.originalname, 'docx', paragraphsJson]
          );
          res.json({ message: 'Документ успешно загружен!', paragraphs: result.paragraphs, url: '/uploads/lessons/' + req.file.filename });
        } else if (result.optimized_path) {
          url = '/uploads/lessons/' + result.optimized_path;
          await db.run('INSERT INTO lesson_files (lesson_id, file_url, file_name, file_type) VALUES (?, ?, ?, ?)', [id, url, req.file.originalname, 'image']);
          res.json({ message: 'Фото успешно загружено', url });
        } else {
          await db.run('INSERT INTO lesson_files (lesson_id, file_url, file_name, file_type) VALUES (?, ?, ?, ?)', [id, '/uploads/lessons/' + req.file.filename, req.file.originalname, result.type || 'file']);
          res.json({ message: 'Файл загружен', path: req.file.filename, url: '/uploads/lessons/' + req.file.filename });
        }
      } catch (e) {
        res.status(500).json({ error: 'Ошибка разбора ответа обработки: ' + e.message });
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
