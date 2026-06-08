const { getDb } = require('../database');

// уведомления для текущего юзера
exports.getNotifications = async (req, res) => {
  try {
    const db = await getDb();
    let query = 'SELECT * FROM notifications WHERE target_audience = "ALL"';
    if (req.user.role === 'STUDENT') query += ' OR target_audience = "STUDENTS"';
    if (['TEACHER', 'ADMIN', 'DIRECTOR', 'DEPUTY'].includes(req.user.role)) query += ' OR target_audience = "TEACHERS"';
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    const notifications = await db.all(query);
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Что-то пошло не так' });
  }
};

// отправка уведомления
exports.sendNotification = async (req, res) => {
  const { title, message, target_audience } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Заголовок и текст обязательны' });
  try {
    const db = await getDb();
    const r = await db.run(
      'INSERT INTO notifications (title, message, target_audience) VALUES (?,?,?)',
      [title, message, target_audience || 'ALL']
    );
    res.status(201).json({ id: r.lastID, message: 'Уведомление отправлено' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Не удалось отправить' });
  }
};
