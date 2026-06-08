const { getDb } = require('../database');
const bcrypt = require('bcrypt');

// получаем всех юзеров с фильтрами
exports.getAllUsers = async (req, res) => {
  try {
    const db = await getDb();
    const { role, search } = req.query;
    console.log(req.body); // дебаг
    let query = `SELECT u.id, u.email, u.role, u.is_approved, u.created_at,
                        p.first_name, p.last_name, p.patronymic, p.phone,
                        td.subject
                 FROM users u 
                 LEFT JOIN profiles p ON u.id = p.user_id 
                 LEFT JOIN teacher_details td ON u.id = td.user_id 
                 WHERE 1=1`;
    const params = [];
    if (role) { query += ' AND u.role=?'; params.push(role); }
    if (search) { query += " AND (p.first_name LIKE ? OR p.last_name LIKE ? OR u.email LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    query += ' ORDER BY u.created_at DESC';
    const users = await db.all(query, params);
    res.json(users);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка базы данных' }); }
};

// FIXME: нет валидации email формата
exports.createUser = async (req, res) => {
  const { email, password, role, first_name, last_name, patronymic, phone } = req.body;
  if (!email || !password || !first_name || !last_name || !role) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Неверный формат email' });
  }
  try {
    const db = await getDb();
    const exists = await db.get('SELECT id FROM users WHERE email=?', [email]);
    if (exists) return res.status(400).json({ error: 'Email уже существует' });
    const hash = await bcrypt.hash(password, 10);
    const r = await db.run('INSERT INTO users (email, password_hash, role, is_approved) VALUES (?,?,?,1)', [email, hash, role]);
    await db.run('INSERT INTO profiles (user_id, first_name, last_name, patronymic, phone) VALUES (?,?,?,?,?)',
      [r.lastID, first_name, last_name, patronymic || '', phone || '']);
    if (role === 'TEACHER') await db.run('INSERT INTO teacher_details (user_id, cabinet) VALUES (?,?)', [r.lastID, '']);
    if (role === 'STUDENT') await db.run('INSERT INTO student_details (user_id, status) VALUES (?,?)', [r.lastID, 'ACTIVE']);
    res.status(201).json({ id: r.lastID, message: 'Пользователь создан' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Не удалось создать пользователя' }); }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, patronymic, phone, role, is_approved } = req.body;
  try {
    const db = await getDb();
    if (role !== undefined) await db.run('UPDATE users SET role=? WHERE id=?', [role, id]);
    if (is_approved !== undefined) await db.run('UPDATE users SET is_approved=? WHERE id=?', [is_approved, id]);
    const updates = [];
    const vals = [];
    if (first_name) { updates.push('first_name=?'); vals.push(first_name); }
    if (last_name) { updates.push('last_name=?'); vals.push(last_name); }
    if (patronymic !== undefined) { updates.push('patronymic=?'); vals.push(patronymic); }
    if (phone !== undefined) { updates.push('phone=?'); vals.push(phone); }
    if (updates.length > 0) {
      vals.push(id);
      await db.run(`UPDATE profiles SET ${updates.join(',')} WHERE user_id=?`, vals);
    }
    res.json({ message: 'Обновлено' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

// удаление юзера (кроме суперадмина)
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const user = await db.get('SELECT email FROM users WHERE id=?', [id]);
    if (user?.email === 'adminitcollege@gmail.com') return res.status(403).json({ error: 'Нельзя удалить суперадмина' });
    await db.run('DELETE FROM users WHERE id=?', [id]);
    res.json({ message: 'Пользователь удалён' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.approveUser = async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    await db.run('UPDATE users SET is_approved=1 WHERE id=?', [id]);
    res.json({ message: 'Пользователь одобрен' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

// достаем неодобренных студентов
exports.getPendingStudents = async (req, res) => {
  try {
    const db = await getDb();
    const students = await db.all(`
      SELECT u.id, u.email, u.created_at, p.first_name, p.last_name, p.patronymic, p.phone,
             sd.group_id, g.name as group_name
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN student_details sd ON u.id = sd.user_id
      LEFT JOIN groups g ON sd.group_id = g.id
      WHERE u.role='STUDENT' AND u.is_approved=0
      ORDER BY u.created_at DESC
    `);
    res.json(students);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.createEmployee = async (req, res) => {
  const { email, password, first_name, last_name, role, subject } = req.body;
  try {
    const db = await getDb();
    const hash = await bcrypt.hash(password, 10);
    const r = await db.run('INSERT INTO users (email, password_hash, role, is_approved) VALUES (?,?,?,1)', [email, hash, role || 'TEACHER']);
    await db.run('INSERT INTO profiles (user_id, first_name, last_name) VALUES (?,?,?)', [r.lastID, first_name, last_name]);
    if (role === 'TEACHER') {
      await db.run('INSERT INTO teacher_details (user_id, cabinet, subject) VALUES (?,?,?)', [r.lastID, '', subject || '']);
    }
    res.status(201).json({ message: 'Сотрудник добавлен' });
  } catch(err) { res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.updateRole = async (req, res) => {
  try {
    const db = await getDb();
    await db.run('UPDATE users SET role=? WHERE id=?', [req.body.role, req.params.id]);
    res.json({ message: 'Роль обновлена' });
  } catch(err) { res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.getTeacherAccess = async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT group_id FROM teacher_group_access WHERE teacher_id=?', [req.params.id]);
    res.json(rows.map(r => r.group_id));
  } catch(err) { res.status(500).json({ error: 'Ошибка сервера' }); }
};

exports.updateTeacherAccess = async (req, res) => {
  try {
    const db = await getDb();
    const { group_ids } = req.body; // array
    await db.run('DELETE FROM teacher_group_access WHERE teacher_id=?', [req.params.id]);
    if(group_ids && group_ids.length > 0) {
      for(let gid of group_ids) {
        await db.run('INSERT INTO teacher_group_access (teacher_id, group_id) VALUES (?,?)', [req.params.id, gid]);
      }
    }
    res.json({ message: 'Права доступа обновлены' });
  } catch(err) { res.status(500).json({ error: 'Ошибка сервера' }); }
};
