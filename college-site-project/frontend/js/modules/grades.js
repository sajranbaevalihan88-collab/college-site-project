const renderTeacherGrades = async function() {
    const subjects = await api.getSubjects(); // Only teacher's subjects if teacher
    let html = `<div class="card"><div class="card-header"><div class="card-title">Выставление оценок</div></div>
      <div class="form-group" style="max-width:400px">
        <label class="form-label">Предмет (и группа)</label>
        <select id="tgSubject" class="form-select">
          <option value="">-- Выберите предмет --</option>
          ${subjects.map(s => `<option value="${s.id}" data-group="${s.group_id}">${s.name} (${s.group_name})</option>`).join('')}
        </select>
      </div>
      <div id="tgStudentsArea"></div>
    </div>`;
    window.contentArea.innerHTML = html;

    document.getElementById('tgSubject').addEventListener('change', async (e) => {
      const opt = e.target.options[e.target.selectedIndex];
      const groupId = opt.dataset.group;
      const subId = e.target.value;
      if(!groupId || !subId) return;
      
      document.getElementById('tgStudentsArea').innerHTML = '<div class="spinner"></div>';
      try {
        const students = await api.getGroupStudents(groupId);
        let sHtml = `<div class="table-responsive" style="margin-top:20px;"><table>
          <thead><tr><th>Студент</th><th>Оценка</th><th>Тип</th><th>Дата</th><th>Действие</th></tr></thead><tbody>`;
        
        students.forEach(s => {
          sHtml += `<tr>
            <td>${s.last_name} ${s.first_name}</td>
            <td><select class="form-select" id="val_${s.id}"><option value="5">5 (Отлично)</option><option value="4">4 (Хорошо)</option><option value="3">3 (Удовл.)</option><option value="2">2 (Неуд.)</option><option value="НБ">НБ (Не был)</option></select></td>
            <td><select class="form-select" id="type_${s.id}"><option value="CURRENT">Текущая</option><option value="MIDTERM">Рубежная</option></select></td>
            <td><input type="date" class="form-control" id="date_${s.id}" value="${new Date().toISOString().split('T')[0]}"></td>
            <td><button class="btn btn-primary btn-sm" onclick="window.saveGrade(${s.id}, ${subId})">Поставить</button></td>
          </tr>`;
        });
        sHtml += `</tbody></table></div>`;
        document.getElementById('tgStudentsArea').innerHTML = sHtml;
      } catch(err) { document.getElementById('tgStudentsArea').innerHTML = `<p style="color:var(--danger)">Ошибка загрузки</p>`; }
    });
  }

const saveGrade = async (studentId, subjectId) => {
    const val = document.getElementById(`val_${studentId}`).value;
    const type = document.getElementById(`type_${studentId}`).value;
    const date = document.getElementById(`date_${studentId}`).value;
    try {
      await api.addGrade({ student_id: studentId, subject_id: subjectId, type, value: val, date });
      window.showToast('Оценка успешно поставлена', 'success');
    } catch(err) { window.showToast(err.message, 'error'); }
  };

const renderStudentGrades = async function() {
    const avgs = await api.getMyAverage();
    const grades = await api.getGrades();
    
    let html = `<div class="card"><div class="card-header"><div class="card-title">Итоговая успеваемость</div></div>
      <div class="grid-stats">
        ${avgs.map(a => `<div class="stat-card"><div><div class="stat-value ${a.average >= 4 ? 'color:var(--success)' : (a.average >= 3 ? 'color:var(--warning)' : 'color:var(--danger)')}">${a.average}</div><div class="stat-label">${a.subject_name}</div></div></div>`).join('')}
      </div>
    </div>`;

    html += `<div class="card"><div class="card-header"><div class="card-title">Журнал оценок</div></div>
      <div class="table-responsive"><table>
        <thead><tr><th>Дата</th><th>Предмет</th><th>Оценка</th><th>Тип</th><th>Преподаватель</th></tr></thead>
        <tbody>
          ${grades.map(g => `<tr>
            <td>${g.date}</td>
            <td><strong>${g.subject_name}</strong></td>
            <td><span class="badge ${g.value === 'НБ' ? 'badge-danger' : (parseInt(g.value)>=4 ? 'badge-success' : 'badge-warning')}">${g.value}</span></td>
            <td>${g.type === 'CURRENT' ? 'Текущая' : 'Рубежная'}</td>
            <td>${g.teacher_name}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
    window.contentArea.innerHTML = html;
  }

// Экспорт в глобал
window.renderTeacherGrades  = renderTeacherGrades;
window.renderStudentGrades  = renderStudentGrades;
window.saveGrade            = saveGrade;
