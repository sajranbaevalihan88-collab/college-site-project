const { getDb } = require('../database');

// достаем из базы предметы
exports.getAll = async (req, res) => {
  try {
    const db = await getDb();
    const { teacher_id, group_id } = req.query;
    let query = `SELECT s.*, p.first_name || ' ' || p.last_name as teacher_name, g.name as group_name
                 FROM subjects s
                 LEFT JOIN profiles p ON s.teacher_id=p.user_id
                 LEFT JOIN groups g ON s.group_id=g.id WHERE 1=1`;
    const params = [];
    if (req.user.role === 'TEACHER') { query += ' AND s.teacher_id=?'; params.push(req.user.id); } // фильтр для препода
    if (teacher_id) { query += ' AND s.teacher_id=?'; params.push(teacher_id); }
    if (group_id) { query += ' AND s.group_id=?'; params.push(group_id); }
    query += ' ORDER BY s.name';
    res.json(await db.all(query, params));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка базы данных' }); }
};

// TODO: проверять дубликаты по имени + группе
exports.create = async (req, res) => {
  const { name, description, teacher_id, group_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  try {
    const db = await getDb();
    const r = await db.run('INSERT INTO subjects (name,description,teacher_id,group_id) VALUES (?,?,?,?)',
      [name, description || '', teacher_id || null, group_id || null]);
    res.status(201).json({ id: r.lastID, message: 'Предмет создан' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.update = async (req, res) => {
  const { name, description, teacher_id, group_id } = req.body;
  try {
    const db = await getDb();
    await db.run('UPDATE subjects SET name=?,description=?,teacher_id=?,group_id=? WHERE id=?',
      [name, description, teacher_id, group_id, req.params.id]);
    res.json({ message: 'Предмет обновлён' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.remove = async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM subjects WHERE id=?', [req.params.id]);
    res.json({ message: 'Предмет удалён' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Не удалось удалить предмет' }); }
};
