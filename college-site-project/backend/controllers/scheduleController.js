const { getDb } = require('../database');

exports.getSchedule = async (req, res) => {
  try {
    const db = await getDb();
    const { group_id, teacher_id, day } = req.query;
    console.log(req.query); // TODO: убрать
    console.log(req.query); // TODO: убрать потом
    let query = `SELECT sch.*, sub.name as subject_name, g.name as group_name,
                   p.first_name || ' ' || p.last_name as teacher_name
                 FROM schedules sch
                 JOIN subjects sub ON sch.subject_id=sub.id
                 JOIN groups g ON sch.group_id=g.id
                 JOIN profiles p ON sch.teacher_id=p.user_id
                 WHERE 1=1`;
    const params = [];
    // фильтруем по роли
    if (req.user.role === 'STUDENT') {
      query += ' AND sch.group_id=(SELECT group_id FROM student_details WHERE user_id=?)';
      params.push(req.user.id);
    } else if (req.user.role === 'TEACHER') {
      query += ' AND sch.teacher_id=?'; params.push(req.user.id);
    }
    if (group_id) { query += ' AND sch.group_id=?'; params.push(group_id); }
    if (teacher_id) { query += ' AND sch.teacher_id=?'; params.push(teacher_id); }
    if (day) { query += ' AND sch.day_of_week=?'; params.push(day); }
    query += ' ORDER BY sch.day_of_week, sch.start_time';
    res.json(await db.all(query, params));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Что-то пошло не так' }); }
};

// добавление записи в расписание
exports.createSchedule = async (req, res) => {
  const { group_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, semester } = req.body;
  if (!group_id || !subject_id || !teacher_id || !day_of_week || !start_time || !end_time) {
    return res.status(400).json({ error: 'Заполните все поля расписания' });
  }
  try {
    const db = await getDb();
    const r = await db.run(
      'INSERT INTO schedules (group_id,subject_id,teacher_id,day_of_week,start_time,end_time,room,semester) VALUES (?,?,?,?,?,?,?,?)',
      [group_id, subject_id, teacher_id, day_of_week, start_time, end_time, room || '', semester || 1]
    );
    res.status(201).json({ id: r.lastID, message: 'Расписание добавлено' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.updateSchedule = async (req, res) => {
  const { group_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, semester } = req.body;
  try {
    const db = await getDb();
    await db.run(
      'UPDATE schedules SET group_id=?,subject_id=?,teacher_id=?,day_of_week=?,start_time=?,end_time=?,room=?,semester=? WHERE id=?',
      [group_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, semester, req.params.id]
    );
    res.json({ message: 'Расписание обновлено' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM schedules WHERE id=?', [req.params.id]);
    res.json({ message: 'Расписание удалено' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.getScheduleFiles = async (req, res) => {
  try {
    const db = await getDb();
    const files = await db.all('SELECT * FROM schedule_files ORDER BY created_at DESC');
    res.json(files);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

// загрузка файла расписания (xlsx или pdf)
exports.uploadScheduleFile = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });

  if (req.file) {
    try {
      req.file.originalname = Buffer.from(req.file.originalname, 'binary').toString('utf8');
    } catch (e) {
      console.error('Error decoding originalname:', e);
    }
  }

  const title = req.body.title || 'Расписание';
  const file_url = `/uploads/${req.file.filename}`;
  const filePath = req.file.path;
  
  let html_content = null;
  if (req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls')) {
    try {
      const { execFileSync } = require('child_process');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../scripts/parse_excel.py');
      const output = execFileSync('python', [scriptPath, filePath]).toString();
      const result = JSON.parse(output);
      if (result.status === 'success') {
        html_content = result.html;
      }
    } catch(err) {
      console.error('Ошибка парсинга Excel:', err);
    }
  }

  try {
    const db = await getDb();
    const r = await db.run('INSERT INTO schedule_files (title, file_url, html_content) VALUES (?,?,?)', [title, file_url, html_content]);
    res.status(201).json({ id: r.lastID, file_url, html_content, message: 'Файл расписания загружен' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка при загрузке файла' }); }
};

exports.deleteScheduleFile = async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM schedule_files WHERE id=?', [req.params.id]);
    res.json({ message: 'Файл удалён' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};
