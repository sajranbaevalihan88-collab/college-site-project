const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');

exports.login = async (req, res) => {
  var { email, password } = req.body;
  // если юзер дебил и не ввел пароль
  if (!email || !password) return res.status(400).json({ error: 'Введите email и пароль' });

  console.log('Login attempt:', email); // TODO: убрать на проде

  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });

    if (!user.is_approved && user.role === 'STUDENT') {
      return res.status(403).json({ error: 'Ваш аккаунт ещё не одобрен администрацией. Дождитесь подтверждения.' });
    }

    const profile = await db.get('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
    
    let std_info = null; // раньше называлось studentInfo
    if (user.role === 'STUDENT') {
      std_info = await db.get(`
        SELECT sd.*, g.name as group_name, g.course, g.specialty
        FROM student_details sd LEFT JOIN groups g ON sd.group_id = g.id
        WHERE sd.user_id = ?
      `, [user.id]);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, profile, studentInfo: std_info }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

exports.register = async (req, res) => {
  let { email, password, first_name, last_name, patronymic, group_name, phone } = req.body;
  // тупая валидация
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Заполните обязательные поля: email, пароль, имя, фамилию' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Неверный формат email' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }

  try {
    const db = await getDb();
    const exists = await db.get('SELECT id FROM users WHERE email=?', [email]);
    if (exists) return res.status(400).json({ error: 'Этот email уже зарегистрирован' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (email, password_hash, role, is_approved) VALUES (?,?,?,?)',
      [email, hash, 'STUDENT', 0]
    );
    const userId = result.lastID;

    await db.run(
      'INSERT INTO profiles (user_id, first_name, last_name, patronymic, phone) VALUES (?,?,?,?,?)',
      [userId, first_name, last_name, patronymic || '', phone || '']
    );

    let groupId = null;
    if (group_name) {
      const group = await db.get('SELECT id FROM groups WHERE name=?', [group_name]);
      if (group) groupId = group.id;
    }

    await db.run(
      'INSERT INTO student_details (user_id, group_id, enrollment_date, status) VALUES (?,?,?,?)',
      [userId, groupId, new Date().toISOString().split('T')[0], 'ACTIVE']
    );

    res.status(201).json({ message: 'Регистрация успешна! Ожидайте одобрения администрации.' });
  } catch (err) {
    console.error('Ошибка регистрации:', err);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT id, email, role, is_approved FROM users WHERE id=?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const profile = await db.get('SELECT * FROM profiles WHERE user_id=?', [user.id]);
    let studentInfo = null;
    if (user.role === 'STUDENT') {
      studentInfo = await db.get(`
        SELECT sd.*, g.name as group_name, g.course, g.specialty
        FROM student_details sd LEFT JOIN groups g ON sd.group_id = g.id
        WHERE sd.user_id = ?
      `, [user.id]);
    }
    res.json({ user: { ...user, profile, studentInfo } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
