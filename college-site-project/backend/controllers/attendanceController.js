const { getDb } = require('../database');

// получение посещаемости
exports.getAttendance = async (req, res) => {
  try {
    const db = await getDb();
    const { student_id, schedule_id, group_id, date_from, date_to } = req.query;
    let query = `SELECT a.*, 
                   p.first_name || ' ' || p.last_name as student_name,
                   sub.name as subject_name, sch.day_of_week, sch.start_time,
                   g.name as group_name
                 FROM attendance a
                 JOIN profiles p ON a.student_id=p.user_id
                 JOIN schedules sch ON a.schedule_id=sch.id
                 JOIN subjects sub ON sch.subject_id=sub.id
                 JOIN groups g ON sch.group_id=g.id
                 WHERE 1=1`;
    const params = [];

    if (req.user.role === 'STUDENT') {
      query += ' AND a.student_id=?'; params.push(req.user.id);
    } else if (req.user.role === 'TEACHER') {
      query += ' AND sch.teacher_id=?'; params.push(req.user.id);
    }
    if (student_id) { query += ' AND a.student_id=?'; params.push(student_id); }
    if (schedule_id) { query += ' AND a.schedule_id=?'; params.push(schedule_id); }
    if (group_id) { query += ' AND sch.group_id=?'; params.push(group_id); }
    if (date_from) { query += ' AND a.date>=?'; params.push(date_from); }
    if (date_to) { query += ' AND a.date<=?'; params.push(date_to); }
    query += ' ORDER BY a.date DESC, p.last_name';
    res.json(await db.all(query, params));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Не удалось выполнить' }); }
};

exports.markAttendance = async (req, res) => {
  const { records } = req.body; // Array of { student_id, schedule_id, date, status, comment }
  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Нужен массив records' });
  }
  try {
    const db = await getDb();
    // проверяем что препод имеет доступ к этим занятиям
    if (req.user.role === 'TEACHER') {
      for (const r of records) {
        const sch = await db.get('SELECT id FROM schedules WHERE id=? AND teacher_id=?', [r.schedule_id, req.user.id]);
        if (!sch) return res.status(403).json({ error: `Расписание ${r.schedule_id} вам не принадлежит` });
      }
    }
    // апдейтим или вставляем запись
    for (const r of records) {
      const existing = await db.get(
        'SELECT id FROM attendance WHERE student_id=? AND schedule_id=? AND date=?',
        [r.student_id, r.schedule_id, r.date]
      );
      if (existing) {
        await db.run('UPDATE attendance SET status=?, comment=? WHERE id=?',
          [r.status, r.comment || '', existing.id]);
      } else {
        await db.run(
          'INSERT INTO attendance (student_id, schedule_id, date, status, comment) VALUES (?,?,?,?,?)',
          [r.student_id, r.schedule_id, r.date, r.status, r.comment || '']
        );
      }
    }
    res.json({ message: `Посещаемость отмечена: ${records.length} записей` });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

// статистика посещаемости студента
exports.getStudentStats = async (req, res) => {
  const sid = req.params.studentId || req.user.id;
  try {
    const db = await getDb();
    const stats = await db.get(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status='PRESENT' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status='ABSENT' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status='LATE' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status='EXCUSED' THEN 1 ELSE 0 END) as excused
      FROM attendance WHERE student_id=?
    `, [sid]);
    stats.percentage = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 100;
    res.json(stats);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};
