const renderTeacherAttendance = async function() {
    // Similar to grades, select schedule -> show students -> mark all checkbox
    window.contentArea.innerHTML = `<div class="card">
      <div class="card-header"><div class="card-title">Журнал посещаемости (Раздел в разработке)</div></div>
      <p>Используйте интерфейс Оценок для выставления НБ (отсутствие).</p>
    </div>`;
  }

const renderStudentAttendance = async function() {
    const att = await api.getAttendance();
    const stats = await api.getMyStats();
    let html = `<div class="card"><div class="card-header"><div class="card-title">Посещаемость: ${stats.percentage}%</div></div>
      <div class="table-responsive"><table>
        <thead><tr><th>Дата</th><th>Предмет</th><th>Статус</th></tr></thead>
        <tbody>
          ${att.map(a => `<tr>
            <td>${a.date}</td>
            <td>${a.subject_name}</td>
            <td><span class="badge ${a.status==='PRESENT'?'badge-success':'badge-danger'}">${a.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
    window.contentArea.innerHTML = html;
  }

window.renderTeacherAttendance = renderTeacherAttendance;
window.renderStudentAttendance = renderStudentAttendance;
