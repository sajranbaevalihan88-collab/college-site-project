const { getDb } = require('../database');

// список всех одобренных студентов
exports.getAllStudents = async (req, res) => {
  try {
    const db = await getDb();
    const { group_id, search } = req.query;
    let query = `SELECT u.id, u.email, p.first_name, p.last_name, p.patronymic, p.phone,
                        sd.status, sd.enrollment_date, sd.group_id,
                        g.name as group_name, g.course, g.specialty
                 FROM users u
                 JOIN profiles p ON u.id = p.user_id
                 JOIN student_details sd ON u.id = sd.user_id
                 LEFT JOIN groups g ON sd.group_id = g.id
                 WHERE u.role='STUDENT' AND u.is_approved=1`;
    const params = [];
    if (group_id) { query += ' AND sd.group_id=?'; params.push(group_id); }
    if (search) { query += ' AND (p.first_name LIKE ? OR p.last_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY p.last_name, p.first_name';
    const students = await db.all(query, params);
    res.json(students);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка при загрузке студентов' }); }
};

// привязка студента к группе
exports.assignGroup = async (req, res) => {
  const { studentId } = req.params;
  const { group_id } = req.body;
  try {
    const db = await getDb();
    await db.run('UPDATE student_details SET group_id=? WHERE user_id=?', [group_id, studentId]);
    res.json({ message: 'Студент распределён в группу' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.getStudentContract = async (req, res) => {
  const { id } = req.params;
  if (req.user.role === 'STUDENT' && req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }
  try {
    const db = await getDb();
    const contract = await db.get('SELECT * FROM contracts WHERE student_id=?', [id]);
    res.json(contract || { total_amount: 0, paid_amount: 0, status: 'FREE' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

// инфа о текущем студенте
exports.getMyInfo = async (req, res) => {
  try {
    const db = await getDb();
    const profile = await db.get('SELECT * FROM profiles WHERE user_id=?', [req.user.id]);
    const details = await db.get(`
      SELECT sd.*, g.name as group_name, g.course, g.specialty
      FROM student_details sd LEFT JOIN groups g ON sd.group_id = g.id
      WHERE sd.user_id=?
    `, [req.user.id]);
    res.json({ profile, details });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Что-то пошло не так' }); }
};
