const { getDb } = require('../database');

// все группы с количеством студентов
exports.getAll = async (req, res) => {
  try {
    const db = await getDb();
    const groups = await db.all(`
      SELECT g.*, 
        (SELECT COUNT(*) FROM student_details sd JOIN users u ON sd.user_id=u.id WHERE sd.group_id=g.id AND u.is_approved=1) as student_count,
        p.first_name || ' ' || p.last_name as curator_name
      FROM groups g
      LEFT JOIN profiles p ON g.curator_id = p.user_id
      ORDER BY g.name
    `);
    res.json(groups);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Не удалось загрузить группы' }); }
};

// TODO: добавить валидацию формата названия группы
exports.create = async (req, res) => {
  const { name, course, specialty, curator_id } = req.body;
  if (!name || !specialty) return res.status(400).json({ error: 'Название и специальность обязательны' });
  try {
    const db = await getDb();
    const exists = await db.get('SELECT id FROM groups WHERE name=?', [name]);
    if (exists) return res.status(400).json({ error: 'Группа с таким названием уже существует' });
    const r = await db.run('INSERT INTO groups (name, course, specialty, curator_id) VALUES (?,?,?,?)',
      [name, course || 1, specialty, curator_id || null]);
    res.status(201).json({ id: r.lastID, message: 'Группа создана' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, course, specialty, curator_id } = req.body;
  try {
    const db = await getDb();
    await db.run('UPDATE groups SET name=?, course=?, specialty=?, curator_id=? WHERE id=?',
      [name, course, specialty, curator_id || null, id]);
    res.json({ message: 'Группа обновлена' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.remove = async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM groups WHERE id=?', [req.params.id]);
    res.json({ message: 'Группа удалена' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

// студенты в конкретной группе
exports.getStudentsInGroup = async (req, res) => {
  try {
    const db = await getDb();
    const students = await db.all(`
      SELECT u.id, p.first_name, p.last_name, p.patronymic, u.email, sd.status
      FROM users u
      JOIN profiles p ON u.id=p.user_id
      JOIN student_details sd ON u.id=sd.user_id
      WHERE sd.group_id=? AND u.is_approved=1
      ORDER BY p.last_name
    `, [req.params.id]);
    res.json(students);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.updateCurator = async (req, res) => {
  const { id } = req.params;
  const { curator_id } = req.body;
  try {
    const db = await getDb();
    await db.run('UPDATE groups SET curator_id=? WHERE id=?', [curator_id || null, id]);
    res.json({ message: 'Куратор назначен' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};
