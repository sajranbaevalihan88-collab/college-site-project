const { getDb } = require('../database');

// статистика для дашборда по ролям
exports.getStats = async (req, res) => {
  try {
    const db = await getDb();
    const role = req.user.role;

    if (role === 'ADMIN' || role === 'DIRECTOR' || role === 'DEPUTY') {
      const totalStudents = await db.get("SELECT COUNT(*) as c FROM users WHERE role='STUDENT' AND is_approved=1");
      const pendingStudents = await db.get("SELECT COUNT(*) as c FROM users WHERE role='STUDENT' AND is_approved=0");
      const totalTeachers = await db.get("SELECT COUNT(*) as c FROM users WHERE role='TEACHER'");
      const totalGroups = await db.get("SELECT COUNT(*) as c FROM groups");
      const totalSubjects = await db.get("SELECT COUNT(*) as c FROM subjects");
      // HACK: считаем среднюю посещаемость криво, надо переделать
      const avgAttendance = await db.get(`
        SELECT ROUND(AVG(CASE WHEN status IN ('PRESENT','LATE') THEN 100.0 ELSE 0 END),1) as avg
        FROM attendance
      `);
      return res.json({
        totalStudents: totalStudents.c,
        pendingStudents: pendingStudents.c,
        totalTeachers: totalTeachers.c,
        totalGroups: totalGroups.c,
        totalSubjects: totalSubjects.c,
        avgAttendance: avgAttendance.avg || 0
      });
    }

    // данные для препода
    if (role === 'TEACHER') {
      const mySubjects = await db.get("SELECT COUNT(*) as c FROM subjects WHERE teacher_id=?", [req.user.id]);
      const mySchedules = await db.get("SELECT COUNT(*) as c FROM schedules WHERE teacher_id=?", [req.user.id]);
      const myGroups = await db.get("SELECT COUNT(DISTINCT group_id) as c FROM subjects WHERE teacher_id=?", [req.user.id]);
      const myStudents = await db.get(`
        SELECT COUNT(DISTINCT sd.user_id) as c FROM student_details sd
        JOIN subjects sub ON sd.group_id=sub.group_id
        WHERE sub.teacher_id=?
      `, [req.user.id]);
      return res.json({
        mySubjects: mySubjects.c,
        mySchedules: mySchedules.c,
        myGroups: myGroups.c,
        myStudents: myStudents.c
      });
    }

    // данные для студента
    if (role === 'STUDENT') {
      const details = await db.get(`
        SELECT sd.group_id, g.name as group_name FROM student_details sd
        LEFT JOIN groups g ON sd.group_id=g.id WHERE sd.user_id=?
      `, [req.user.id]);
      const gradeCount = await db.get("SELECT COUNT(*) as c FROM grades WHERE student_id=?", [req.user.id]);
      const avgGrade = await db.get(`
        SELECT ROUND(AVG(CASE WHEN value GLOB '[0-9]*' THEN CAST(value AS REAL) ELSE NULL END),2) as avg
        FROM grades WHERE student_id=? AND type != 'NB'
      `, [req.user.id]);
      const att = await db.get(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN status='PRESENT' THEN 1 ELSE 0 END) as present
        FROM attendance WHERE student_id=?
      `, [req.user.id]);
      const scheduleCount = await db.get(`
        SELECT COUNT(*) as c FROM schedules WHERE group_id=?
      `, [details?.group_id]);
      return res.json({
        group_name: details?.group_name || 'Не назначена',
        gradeCount: gradeCount.c,
        avgGrade: avgGrade.avg || 0,
        attendancePercent: att.total > 0 ? Math.round((att.present / att.total) * 100) : 100,
        scheduleCount: scheduleCount?.c || 0
      });
    }

    res.json({});
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка загрузки статистики' }); }
};
