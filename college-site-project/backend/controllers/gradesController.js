const { getDb } = require('../database');

// достаем оценки с фильтрацией
exports.getGrades = async (req, res) => {
  try {
    const db = await getDb();
    const { student_id, subject_id, group_id, type } = req.query;
    let query = `SELECT gr.*, s.name as subject_name,
                   p_s.first_name || ' ' || p_s.last_name as student_name,
                   p_t.first_name || ' ' || p_t.last_name as teacher_name
                 FROM grades gr
                 JOIN subjects s ON gr.subject_id=s.id
                 JOIN profiles p_s ON gr.student_id=p_s.user_id
                 JOIN profiles p_t ON gr.teacher_id=p_t.user_id
                 WHERE 1=1`;
    const params = [];

    if (req.user.role === 'STUDENT') {
      query += ' AND gr.student_id=?'; params.push(req.user.id);
    } else if (req.user.role === 'TEACHER') {
      query += ' AND gr.teacher_id=?'; params.push(req.user.id);
    }
    if (student_id) { query += ' AND gr.student_id=?'; params.push(student_id); }
    if (subject_id) { query += ' AND gr.subject_id=?'; params.push(subject_id); }
    if (type) { query += ' AND gr.type=?'; params.push(type); }
    if (group_id) {
      query += ' AND gr.student_id IN (SELECT user_id FROM student_details WHERE group_id=?)';
      params.push(group_id);
    }
    query += ' ORDER BY gr.date DESC';
    const grades = await db.all(query, params);
    res.json(grades);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка при загрузке оценок' }); }
};

exports.addGrade = async (req, res) => {
  var { student_id, subject_id, type, value, date, comment } = req.body;
  if (!student_id || !value) {
    return res.status(400).json({ error: 'Не все поля заполнены' });
  }
  try {
    const db = await getDb();
    // проверка роли - препод может ставить только свои предметы
    if (req.user.role === 'TEACHER') {
      const sub = await db.get('SELECT id FROM subjects WHERE id=? AND teacher_id=?', [subject_id, req.user.id]);
      if (!sub) return res.status(403).json({ error: 'Этот предмет вам не назначен' });
    }
    const r = await db.run(
      'INSERT INTO grades (student_id, subject_id, teacher_id, type, value, date, comment) VALUES (?,?,?,?,?,?,?)',
      [student_id, subject_id, req.user.id, type || 'CURRENT', value, date, comment || '']
    );
    res.status(201).json({ id: r.lastID, message: 'Оценка добавлена' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.updateGrade = async (req, res) => {
  const { value, type, comment } = req.body;
  try {
    const db = await getDb();
    await db.run('UPDATE grades SET value=?, type=?, comment=? WHERE id=?',
      [value, type, comment || '', req.params.id]);
    res.json({ message: 'Оценка обновлена' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.deleteGrade = async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM grades WHERE id=?', [req.params.id]);
    res.json({ message: 'Оценка удалена' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Внутренняя ошибка сервера' }); }
};

// FIXME: NB оценки не учитываются в среднем но может надо?
exports.getStudentAverage = async (req, res) => {
  try {
    const db = await getDb();
    const sid = req.params.studentId || req.user.id;
    const avgs = await db.all(`
      SELECT s.name as subject_name, s.id as subject_id,
             ROUND(AVG(CASE WHEN gr.value GLOB '[0-9]*' THEN CAST(gr.value AS REAL) ELSE NULL END), 2) as average,
             COUNT(gr.id) as total_grades
      FROM grades gr JOIN subjects s ON gr.subject_id=s.id
      WHERE gr.student_id=? AND gr.type != 'NB'
      GROUP BY s.id
    `, [sid]);
    res.json(avgs);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};
