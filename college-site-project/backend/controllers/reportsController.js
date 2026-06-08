const ExcelJS = require('exceljs');
const { getDb } = require('../database');

// Сводный отчёт по группе - скачивается как .xlsx
exports.generateGroupReport = async (req, res) => {
  const { group_id } = req.params;
  try {
    const db = await getDb();

    const group = await db.get('SELECT * FROM groups WHERE id = ?', [group_id]);
    if (!group) return res.status(404).json({ error: 'Группа не найдена' });

    const students = await db.all(`
      SELECT u.id, p.first_name, p.last_name, p.patronymic
      FROM student_details sd
      JOIN users u ON sd.user_id = u.id
      JOIN profiles p ON u.id = p.user_id
      WHERE sd.group_id = ?
      ORDER BY p.last_name
    `, [group_id]);

    const grades = await db.all(`
      SELECT gr.student_id, s.name as subject_name,
             ROUND(AVG(CASE WHEN gr.value GLOB '[0-9]*' THEN CAST(gr.value AS REAL) ELSE NULL END), 1) as avg_grade,
             COUNT(gr.id) as total
      FROM grades gr
      JOIN subjects s ON gr.subject_id = s.id
      WHERE gr.student_id IN (
        SELECT user_id FROM student_details WHERE group_id = ?
      ) AND gr.type != 'NB'
      GROUP BY gr.student_id, s.id
    `, [group_id]);

    const attendance = await db.all(`
      SELECT a.student_id,
             COUNT(*) as total,
             SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present
      FROM attendance a
      WHERE a.student_id IN (
        SELECT user_id FROM student_details WHERE group_id = ?
      )
      GROUP BY a.student_id
    `, [group_id]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IT College Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`Группа ${group.name}`);

    // Заголовок
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Сводный отчёт — ${group.name} (${group.specialty || ''})`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = `Дата: ${new Date().toLocaleDateString('ru-RU')}`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };
    sheet.addRow([]);

    // Шапка таблицы
    const headerRow = sheet.addRow(['№', 'ФИО студента', 'Средний балл', 'Посещаемость (%)', 'Кол-во оценок', 'Статус']);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // Данные по студентам
    students.forEach((student, idx) => {
      const studentGrades = grades.filter(g => g.student_id === student.id);
      const avgGrade = studentGrades.length
        ? (studentGrades.reduce((s, g) => s + (g.avg_grade || 0), 0) / studentGrades.length).toFixed(1)
        : '—';
      const totalGrades = studentGrades.reduce((s, g) => s + (g.total || 0), 0);

      const att = attendance.find(a => a.student_id === student.id);
      const attPercent = att && att.total > 0
        ? Math.round((att.present / att.total) * 100) + '%'
        : '—';

      const fullName = `${student.last_name} ${student.first_name}${student.patronymic ? ' ' + student.patronymic : ''}`;
      const status = parseFloat(avgGrade) >= 4 ? 'Хорошо' : parseFloat(avgGrade) >= 3 ? 'Удовл.' : avgGrade === '—' ? '—' : 'Неудовл.';

      const row = sheet.addRow([idx + 1, fullName, avgGrade, attPercent, totalGrades || 0, status]);

      // Цвет строки через строку
      if (idx % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
      }
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    // Итоговая строка
    sheet.addRow([]);
    const totalRow = sheet.addRow(['', `Итого студентов: ${students.length}`, '', '', '', '']);
    totalRow.getCell(2).font = { bold: true };

    // Ширина колонок
    sheet.columns = [
      { width: 5 }, { width: 35 }, { width: 15 },
      { width: 18 }, { width: 15 }, { width: 12 }
    ];

    // Отправляем файл
    const fileName = `report_${group.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[reportsController] generateGroupReport:', err);
    res.status(500).json({ error: 'Ошибка при генерации отчёта' });
  }
};
