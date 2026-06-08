require('dotenv').config();
const bcrypt = require('bcrypt');
const { getDb, initDb } = require('./database');
// тестовые данные для разработки

async function seed() {
  await initDb();
  const db = await getDb();
  console.log('Заполняю базу...');

  const users = [
    { email: 'adminitcollege@gmail.com', password: 'ITcollegeadmin', role: 'ADMIN', first: 'System', last: 'Admin', approved: 1 },
    { email: 'director@itcollege.kg', password: 'Director2026!', role: 'DIRECTOR', first: 'Айбек', last: 'Сейткали', approved: 1 },
    { email: 'deputy@itcollege.kg', password: 'Deputy2026!', role: 'DEPUTY', first: 'Гүлнур', last: 'Мамытова', approved: 1 },
    { email: 'teacher1@itcollege.kg', password: 'Teacher2026!', role: 'TEACHER', first: 'Петр', last: 'Иванов', approved: 1 },
    { email: 'teacher2@itcollege.kg', password: 'Teacher2026!', role: 'TEACHER', first: 'Мария', last: 'Сидорова', approved: 1 },
  ];

  for (const u of users) {
    const exists = await db.get('SELECT id FROM users WHERE email=?', [u.email]);
    if (!exists) {
      const hash = await bcrypt.hash(u.password, 10);
      const res = await db.run(
        'INSERT INTO users (email, password_hash, role, is_approved) VALUES (?,?,?,?)',
        [u.email, hash, u.role, u.approved]
      );
      await db.run(
        'INSERT INTO profiles (user_id, first_name, last_name) VALUES (?,?,?)',
        [res.lastID, u.first, u.last]
      );
      if (u.role === 'TEACHER') {
        await db.run('INSERT INTO teacher_details (user_id, cabinet) VALUES (?,?)', [res.lastID, '301']);
      }
      console.log(`Создал: ${u.email}`);
    }
  }

  // группы
  const groups = [
    { name: 'ПКС-1-26', course: 1, specialty: 'Программирование в компьютерных системах' },
    { name: 'ПКС-2-25', course: 2, specialty: 'Программирование в компьютерных системах' },
    { name: 'ИСП-1-26', course: 1, specialty: 'Информационные системы' },
    { name: 'ЭБ-1-26',  course: 1, specialty: 'Экономика и бухгалтерия' },
  ];
  for (const g of groups) {
    const ex = await db.get('SELECT id FROM groups WHERE name=?', [g.name]);
    if (!ex) {
      await db.run('INSERT INTO groups (name, course, specialty) VALUES (?,?,?)', [g.name, g.course, g.specialty]);
      console.log(`Группа создана: ${g.name}`);
    }
  }

  // предметы
  const teacher1 = await db.get("SELECT id FROM users WHERE email='teacher1@itcollege.kg'");
  const teacher2 = await db.get("SELECT id FROM users WHERE email='teacher2@itcollege.kg'");
  const group1   = await db.get("SELECT id FROM groups WHERE name='ПКС-1-26'");
  const group2   = await db.get("SELECT id FROM groups WHERE name='ПКС-2-25'");

  const subjects = [
    { name: 'Программирование на Python', teacher_id: teacher1?.id, group_id: group1?.id },
    { name: 'Базы данных', teacher_id: teacher1?.id, group_id: group1?.id },
    { name: 'Веб-разработка', teacher_id: teacher2?.id, group_id: group1?.id },
    { name: 'Математика', teacher_id: teacher2?.id, group_id: group2?.id },
    { name: 'Алгоритмы', teacher_id: teacher1?.id, group_id: group2?.id },
  ];
  for (const s of subjects) {
    const ex = await db.get('SELECT id FROM subjects WHERE name=? AND group_id=?', [s.name, s.group_id]);
    if (!ex && s.teacher_id && s.group_id) {
      await db.run('INSERT INTO subjects (name, teacher_id, group_id) VALUES (?,?,?)', [s.name, s.teacher_id, s.group_id]);
    }
  }

  // расписание на первый семестр
  const days = [1,2,3,4,5];
  const subjectsDb = await db.all('SELECT * FROM subjects LIMIT 5');
  for (const sub of subjectsDb) {
    const day = days[subjectsDb.indexOf(sub) % 5];
    const ex = await db.get('SELECT id FROM schedules WHERE subject_id=? AND group_id=?', [sub.id, sub.group_id]);
    if (!ex) {
      await db.run(
        'INSERT INTO schedules (group_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, semester) VALUES (?,?,?,?,?,?,?,?)',
        [sub.group_id, sub.id, sub.teacher_id, day, '09:00', '10:30', '301', 1]
      );
    }
  }

  console.log('Готово!'); // тестовые данные для разработки
  console.log('');
  console.log('=== ЛОГИНЫ ДЛЯ ВХОДА ===');
  console.log('Администратор: adminitcollege@gmail.com / ITcollegeadmin');
  console.log('Директор:      director@itcollege.kg  / Director2026!');
  console.log('Зам директора: deputy@itcollege.kg    / Deputy2026!');
  console.log('Преподаватель: teacher1@itcollege.kg  / Teacher2026!');
  console.log('Студент: зарегистрируйтесь на /register.html');
}

seed().catch(console.error).finally(() => process.exit(0));
