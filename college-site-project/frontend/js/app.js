document.addEventListener('DOMContentLoaded', () => {
  
  var userStr = localStorage.getItem('user');
  var token = localStorage.getItem('token');
  
  if (!token || !userStr) {
    window.location.href = '/login.html';
    return;
  }
  
  const user = JSON.parse(userStr);
  const roleNames = {
    'ADMIN': 'Администратор',
    'DIRECTOR': 'Директор',
    'DEPUTY': 'Зам. директора',
    'TEACHER': 'Преподаватель',
    'STUDENT': 'Студент'
  };

  // защита от XSS
  window.escapeHTML = function(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, match => {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[match];
    });
  };

  // настройка интерфейса
  document.getElementById('userName').textContent = user.profile ? `${user.profile.first_name} ${user.profile.last_name}` : user.email;
  document.getElementById('userRole').textContent = roleNames[user.role] || user.role;
  
  const contentArea = document.getElementById('contentArea');
  const pageTitle = document.getElementById('pageTitle');
  const sidebarNav = document.getElementById('sidebarNav');

  // Выставляем глобалы для модулей (вызывается позже через hoisting)
  window.user = user;
  window.contentArea = contentArea;
  window.openModal = openModal;
  window.loadView = loadView;

  // меню
  const menuConfig = {
    'ADMIN': [
      { id: 'dashboard', icon: 'fa-chart-pie', label: 'Статистика' },
      { id: 'pending', icon: 'fa-user-clock', label: 'Новые студенты' },
      { id: 'groups', icon: 'fa-users', label: 'Группы' },
      { id: 'schedule', icon: 'fa-calendar-alt', label: 'Расписание' },
      { id: 'employees', icon: 'fa-chalkboard-teacher', label: 'Сотрудники' }
    ],
    'DIRECTOR': [
      { id: 'dashboard', icon: 'fa-chart-pie', label: 'Статистика' },
      { id: 'pending', icon: 'fa-user-clock', label: 'Новые студенты' },
      { id: 'groups', icon: 'fa-users', label: 'Группы' },
      { id: 'schedule', icon: 'fa-calendar-alt', label: 'Расписание' },
      { id: 'employees', icon: 'fa-chalkboard-teacher', label: 'Сотрудники' }
    ],
    'DEPUTY': [
      { id: 'dashboard', icon: 'fa-chart-pie', label: 'Статистика' },
      { id: 'pending', icon: 'fa-user-clock', label: 'Новые студенты' },
      { id: 'groups', icon: 'fa-users', label: 'Группы' },
      { id: 'schedule', icon: 'fa-calendar-alt', label: 'Расписание' },
      { id: 'employees', icon: 'fa-chalkboard-teacher', label: 'Сотрудники' }
    ],
    'TEACHER': [
      { id: 'dashboard', icon: 'fa-chart-pie', label: 'Сводка' },
      { id: 'schedule', icon: 'fa-calendar-alt', label: 'Моё расписание' },
      { id: 'grades', icon: 'fa-star', label: 'Журнал оценок' },
      { id: 'attendance', icon: 'fa-clipboard-check', label: 'Посещаемость' },
      { id: 'lessons', icon: 'fa-book-open', label: 'Мои уроки' },
      { id: 'about_me', icon: 'fa-id-card', label: 'О себе' }
    ],
    'STUDENT': [
      { id: 'dashboard', icon: 'fa-user', label: 'Мой профиль' },
      { id: 'schedule', icon: 'fa-calendar-alt', label: 'Моё расписание' },
      { id: 'my_grades', icon: 'fa-graduation-cap', label: 'Мои оценки' },
      { id: 'my_attendance', icon: 'fa-check-square', label: 'Моя посещаемость' },
      { id: 'all_lessons', icon: 'fa-book-reader', label: 'Уроки' },
      { id: 'saved_lessons', icon: 'fa-bookmark', label: 'Сохранённые' }
    ]
  };

  const menu = menuConfig[user.role] || menuConfig['STUDENT'];
  menu.forEach(item => {
    const a = document.createElement('a');
    a.className = 'nav-item';
    a.dataset.target = item.id;
    a.innerHTML = `<i class="fas ${item.icon}"></i> ${item.label}`;
    a.addEventListener('click', () => loadView(item.id, item.label, a));
    sidebarNav.appendChild(a);
  });

  document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/login.html';
  });

  // Мобильное меню
  const sidebar = document.getElementById('sidebar');
  document.getElementById('menuToggle').addEventListener('click', () => sidebar.classList.toggle('open'));

  // Закрываем сайдбар при клике вне него на мобилке
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && e.target.id !== 'menuToggle') {
        sidebar.classList.remove('open');
      }
    }
  });

  async function loadView(viewId, title, navElement) {
    pageTitle.textContent = title;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (navElement) navElement.classList.add('active');
    if (window.innerWidth <= 768) sidebar.classList.remove('open');

    contentArea.innerHTML = '<div class="loader-container"><div class="spinner"></div></div>';

    try {
      if (viewId === 'dashboard') await renderDashboard();
      else if (viewId === 'pending') await renderPendingStudents();
      else if (viewId === 'groups') await renderGroups();
      else if (viewId === 'schedule') await window.renderSchedule();
      else if (viewId === 'employees') await renderEmployees();
      else if (viewId === 'grades') await window.renderTeacherGrades();
      else if (viewId === 'attendance') await window.renderTeacherAttendance();
      else if (viewId === 'my_grades') await window.renderStudentGrades();
      else if (viewId === 'my_attendance') await window.renderStudentAttendance();
      else if (viewId === 'lessons') await window.renderMyLessons();
      else if (viewId === 'all_lessons') await window.renderAllLessons();
      else if (viewId === 'saved_lessons') await window.renderSavedLessons();
      else if (viewId === 'about_me') await window.renderAboutMe();
      else if (viewId === 'lesson_editor') await window.renderLessonEditor(window._editLessonId);
      else if (viewId === 'lesson_view') await window.renderLessonView(window._viewLessonId);
      else contentArea.innerHTML = '<div class="card">Раздел в разработке</div>';
    } catch (err) {
      console.error('[loadView error]', err);
      contentArea.innerHTML = `<div class="card" style="color:var(--danger)">Ошибка загрузки: ${err.message}</div>`;
    }
  }


  
  
  

  // Run on start
  loadNotifications();

  // страницы

  // TODO: переписать этот ужас на нормальный роутер
  async function renderDashboard() {
    const stats = await api.getStats();
    let html = `<div class="grid-stats">`;
    
    if(['ADMIN','DIRECTOR','DEPUTY'].includes(user.role)) {
      html += `
        <div class="stat-card"><div class="stat-icon primary"><i class="fas fa-users"></i></div><div><div class="stat-value">${stats.totalStudents}</div><div class="stat-label">Студентов</div></div></div>
        <div class="stat-card"><div class="stat-icon warning"><i class="fas fa-user-clock"></i></div><div><div class="stat-value">${stats.pendingStudents}</div><div class="stat-label">На модерации</div></div></div>
        <div class="stat-card"><div class="stat-icon success"><i class="fas fa-layer-group"></i></div><div><div class="stat-value">${stats.totalGroups}</div><div class="stat-label">Групп</div></div></div>
        <div class="stat-card"><div class="stat-icon primary"><i class="fas fa-chalkboard-teacher"></i></div><div><div class="stat-value">${stats.totalTeachers}</div><div class="stat-label">Преподавателей</div></div></div>
      `;
    } else if(user.role === 'TEACHER') {
      html += `
        <div class="stat-card"><div class="stat-icon primary"><i class="fas fa-users"></i></div><div><div class="stat-value">${stats.myStudents}</div><div class="stat-label">Студентов у вас</div></div></div>
        <div class="stat-card"><div class="stat-icon success"><i class="fas fa-layer-group"></i></div><div><div class="stat-value">${stats.myGroups}</div><div class="stat-label">Групп</div></div></div>
        <div class="stat-card"><div class="stat-icon warning"><i class="fas fa-book"></i></div><div><div class="stat-value">${stats.mySubjects}</div><div class="stat-label">Предметов</div></div></div>
      `;
    } else if(user.role === 'STUDENT') {
      html += `
        <div class="stat-card"><div class="stat-icon primary"><i class="fas fa-layer-group"></i></div><div><div class="stat-value" style="font-size:1.2rem">${stats.group_name}</div><div class="stat-label">Моя группа</div></div></div>
        <div class="stat-card"><div class="stat-icon success"><i class="fas fa-star"></i></div><div><div class="stat-value">${stats.avgGrade}</div><div class="stat-label">Средний балл</div></div></div>
        <div class="stat-card"><div class="stat-icon warning"><i class="fas fa-check-circle"></i></div><div><div class="stat-value">${stats.attendancePercent}%</div><div class="stat-label">Посещаемость</div></div></div>
      `;
    }
    html += `</div>`;
    contentArea.innerHTML = html;
  }

  // костыль для новых студентов
  async function renderPendingStudents() {
    const students = await api.getPendingStudents();
    const groups = await api.getGroups();
    
    let html = `<div class="card"><div class="card-header"><div class="card-title">Студенты, ожидающие распределения</div></div>`;
    if(students.length === 0) {
      html += `<p style="color:var(--text-muted)">Нет новых заявок.</p>`;
    } else {
      html += `<div class="table-responsive"><table>
        <thead><tr><th>ФИО</th><th>Email</th><th>Заявленная группа</th><th>Действие</th></tr></thead><tbody>`;
      students.forEach(s => {
        let grpOptions = `<option value="">Выберите группу</option>`;
        groups.forEach(g => grpOptions += `<option value="${g.id}">${g.name}</option>`);
        
        html += `<tr>
          <td>${s.last_name} ${s.first_name}</td>
          <td>${s.email}</td>
          <td>${s.group_name || 'Не указана'}</td>
          <td>
            <select id="grp_${s.id}" class="form-select" style="width:200px; display:inline-block;">${grpOptions}</select>
            <button class="btn btn-success btn-sm" onclick="window.approveStudent(${s.id})">Одобрить</button>
          </td>
        </tr>`;
      });
      html += `</tbody></table></div>`;
    }
    html += `</div>`;
    contentArea.innerHTML = html;
  }

  window.approveStudent = async (id) => {
    const groupId = document.getElementById(`grp_${id}`).value;
    if(!groupId) return showToast('Выберите группу перед одобрением', 'error');
    try {
      await api.approveUser(id);
      await api.assignGroup(id, groupId);
      showToast('Студент успешно зачислен в группу', 'success');
      loadView('pending', 'Новые студенты', document.querySelector('[data-target="pending"]'));
    } catch(err) { showToast(err.message, 'error'); }
  };

  async function renderGroups() {
    contentArea.innerHTML = '<div class="spinner"></div>';
    try {
      const [groups, teachers] = await Promise.all([
        api.getGroups(),
        api.request('/users?role=TEACHER') // We can also add ADMIN if they can be curators
      ]);

      let html = '';
      if(['ADMIN','DIRECTOR','DEPUTY'].includes(user.role)) {
        html += `
          <div class="card" style="margin-bottom:20px;">
            <div class="card-header"><div class="card-title">Создать новую группу</div></div>
            <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
              <input type="text" id="newGrpName" class="form-control" placeholder="Название (например ПКС-1-26)" style="max-width:250px;">
              <input type="number" id="newGrpCourse" class="form-control" placeholder="Курс (1-4)" min="1" max="4" value="1" style="max-width:100px;">
              <select id="newGrpCurator" class="form-select" style="max-width:200px;">
                <option value="">Без куратора</option>
                ${teachers.map(t => `<option value="${t.id}">${t.last_name || ''} ${t.first_name || ''}</option>`).join('')}
              </select>
              <button class="btn btn-success" onclick="window.createGroup()">Создать</button>
            </div>
          </div>
        `;
      }

      html += `
        <div class="card">
          <div class="card-header"><div class="card-title">Все группы колледжа</div></div>
          <div class="table-responsive">
            <table class="table">
              <thead><tr><th>Название</th><th>Курс</th><th>Куратор</th><th>Студентов</th><th>Действия</th></tr></thead>
              <tbody>
                ${groups.map(g => {
                  let curatorSelect = g.curator_name || '<span class="badge badge-warning">Нет куратора</span>';
                  if(['ADMIN','DIRECTOR','DEPUTY'].includes(user.role)) {
                    curatorSelect = `
                      <select class="form-select form-select-sm" onchange="window.changeCurator(${g.id}, this.value)" style="min-width:150px;">
                        <option value="">Без куратора</option>
                        ${teachers.map(t => `<option value="${t.id}" ${g.curator_id == t.id ? 'selected' : ''}>${t.last_name || ''} ${t.first_name || ''}</option>`).join('')}
                      </select>
                    `;
                  }
                  return `
                    <tr>
                      <td><strong>${g.name}</strong></td>
                      <td>${g.course} курс</td>
                      <td>${curatorSelect}</td>
                      <td>${g.student_count}</td>
                      <td style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button class="btn btn-sm" style="background:#10b981;color:#fff;" onclick="window.downloadReport(${g.id}, '${g.name}')" title="Скачать отчёт Excel">
                          <i class="fas fa-file-excel"></i> Отчёт
                        </button>
                        ${['ADMIN','DIRECTOR','DEPUTY'].includes(user.role) ? `<button class="btn btn-danger btn-sm" onclick="window.deleteGroup(${g.id})"><i class="fas fa-trash"></i></button>` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
      contentArea.innerHTML = html;
    } catch(err) {
      contentArea.innerHTML = `<div class="card" style="color:var(--danger)">Ошибка: ${err.message}</div>`;
    }
  }

  window.downloadReport = async (groupId, groupName) => {
    try {
      window.showToast('Генерация отчёта...', 'success');
      const res = await api.downloadReport(groupId);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка скачивания отчёта');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${groupName}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  };

  window.createGroup = async () => {
    const name = document.getElementById('newGrpName').value;
    const course = document.getElementById('newGrpCourse').value;
    const curator_id = document.getElementById('newGrpCurator').value;
    if(!name) return showToast('Введите название группы', 'error');
    try {
      await api.request('/groups', 'POST', { name, course, specialty: '-', curator_id: curator_id || null });
      showToast('Группа создана', 'success');
      await renderGroups();
    } catch(err) { showToast(err.message, 'error'); }
  };

  window.changeCurator = async (groupId, teacherId) => {
    try {
      await api.updateCurator(groupId, teacherId || null);
      showToast('Куратор изменен', 'success');
    } catch(err) { showToast(err.message, 'error'); }
  };

  window.deleteGroup = async (id) => {
    if(!confirm('Удалить эту группу? Все студенты останутся без группы.')) return;
    try {
      await api.request('/groups/' + id, 'DELETE');
      showToast('Группа удалена', 'success');
      await renderGroups();
    } catch(err) { showToast(err.message, 'error'); }
  };

  

  

  

  // модалка
  function openModal(title, contentHtml) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = contentHtml;
    document.getElementById('modalOverlay').classList.add('active');
  }

  document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('modalOverlay').classList.remove('active');
  });

  

  

  // сотрудники
  async function renderEmployees() {
    contentArea.innerHTML = '<div class="spinner"></div>';
    try {
      const [teachers, admins, directors, deputies, groups] = await Promise.all([
        api.request('/users?role=TEACHER'),
        api.request('/users?role=ADMIN'),
        api.request('/users?role=DIRECTOR'),
        api.request('/users?role=DEPUTY'),
        api.request('/groups')
      ]);
      const allEmployees = [...teachers, ...admins, ...directors, ...deputies];
      
      let html = `
        <div class="card" style="margin-bottom:20px;">
          <div class="card-header"><div class="card-title">Добавить сотрудника</div></div>
          <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap; align-items:center;">
            <input type="text" id="empFirst" class="form-control" placeholder="Имя" style="max-width:150px;">
            <input type="text" id="empLast" class="form-control" placeholder="Фамилия" style="max-width:150px;">
            <input type="email" id="empEmail" class="form-control" placeholder="Email" style="max-width:200px;">
            <input type="password" id="empPass" class="form-control" placeholder="Пароль" style="max-width:150px;">
            <select id="empRole" class="form-select" style="max-width:150px;" onchange="document.getElementById('empSubject').style.display = this.value === 'TEACHER' ? 'block' : 'none'">
              <option value="TEACHER">Преподаватель</option>
              <option value="ADMIN">Администратор</option>
              <option value="DIRECTOR">Директор</option>
              <option value="DEPUTY">Зам. директора</option>
            </select>
            <input type="text" id="empSubject" class="form-control" placeholder="Предмет" style="max-width:150px;">
            <button class="btn btn-primary" onclick="window.addEmployee()">Добавить</button>
          </div>
        </div>
        
        <div class="card">
        <div class="card-header"><div class="card-title">Список сотрудников</div></div>
        <div class="table-responsive"><table class="table">
          <thead>
            <tr><th>ФИО</th><th>Email</th><th>Роль</th><th>Предмет</th><th>Доступ (Часовик)</th><th>Действия</th></tr>
          </thead>
          <tbody>
      `;
      
      for(let e of allEmployees) {
        html += `
          <tr>
            <td><strong>${e.last_name || ''} ${e.first_name || ''}</strong></td>
            <td>${e.email}</td>
            <td>
              <select onchange="window.changeRole(${e.id}, this.value)" class="form-select form-select-sm" ${user.role !== 'DIRECTOR' && user.role !== 'ADMIN' ? 'disabled' : ''} style="min-width:120px;">
                <option value="TEACHER" ${e.role==='TEACHER'?'selected':''}>Преподаватель</option>
                <option value="ADMIN" ${e.role==='ADMIN'?'selected':''}>Админ</option>
                <option value="DIRECTOR" ${e.role==='DIRECTOR'?'selected':''}>Директор</option>
                <option value="DEPUTY" ${e.role==='DEPUTY'?'selected':''}>Зам. директора</option>
              </select>
            </td>
            <td>${e.role === 'TEACHER' && e.subject ? e.subject : (e.role === 'TEACHER' ? '<span style="color:#999;font-size:0.85rem">Не указан</span>' : '-')}</td>
            <td>
              ${e.role === 'TEACHER' ? `<button class="btn btn-sm btn-info" onclick='window.openAccessModal(${e.id}, ${JSON.stringify(groups).replace(/'/g, "&apos;")})'>Группы</button>` : '<span class="badge badge-success">Полный</span>'}
            </td>
            <td>
              ${e.role !== 'DIRECTOR' && ['ADMIN','DIRECTOR','DEPUTY'].includes(user.role) ? `<button class="btn btn-danger btn-sm" onclick="window.deleteUser(${e.id}, 'employees')"><i class="fas fa-trash"></i></button>` : ''}
            </td>
          </tr>
        `;
      }
      html += '</tbody></table></div></div>';
      contentArea.innerHTML = html;
    } catch(err) {
      contentArea.innerHTML = `<div class="card" style="color:var(--danger)">Ошибка: ${err.message}</div>`;
    }
  }

  window.addEmployee = async () => {
    const data = {
      first_name: document.getElementById('empFirst').value,
      last_name: document.getElementById('empLast').value,
      email: document.getElementById('empEmail').value,
      password: document.getElementById('empPass').value,
      role: document.getElementById('empRole').value,
      subject: document.getElementById('empSubject') ? document.getElementById('empSubject').value : ''

    };
    if(!data.first_name || !data.email || !data.password) return showToast('Заполните обязательные поля', 'error');
    try {
      await api.createEmployee(data);
      showToast('Сотрудник добавлен', 'success');
      await renderEmployees();
    } catch(err) { showToast(err.message, 'error'); }
  };

  window.changeRole = async (id, role) => {
    try {
      await api.updateRole(id, role);
      showToast('Роль изменена', 'success');
    } catch(err) { showToast(err.message, 'error'); }
  };

  window.openAccessModal = async (teacherId, groups) => {
    try {
      const access = await api.getTeacherAccess(teacherId);
      let html = '<div style="max-height: 300px; overflow-y: auto;">';
      groups.forEach(g => {
        const checked = access.includes(g.id) ? 'checked' : '';
        html += `
          <div style="margin-bottom: 5px;">
            <label><input type="checkbox" class="group-access-cb" value="${g.id}" ${checked}> <strong>${g.name}</strong></label>
          </div>
        `;
      });
      html += `</div><button class="btn btn-primary" style="margin-top:15px; width:100%" onclick="window.saveAccess(${teacherId})">Сохранить</button>`;
      openModal('Доступ к группам', html);
    } catch(err) { showToast(err.message, 'error'); }
  };

  window.saveAccess = async (teacherId) => {
    const checkboxes = document.querySelectorAll('.group-access-cb:checked');
    const groupIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    try {
      await api.updateTeacherAccess(teacherId, groupIds);
      showToast('Доступ сохранен', 'success');
      document.getElementById('modalOverlay').classList.remove('active');
    } catch(err) { showToast(err.message, 'error'); }
  };

  window.deleteUser = async (id, viewToReload = null) => {
    if(!confirm('Удалить пользователя?')) return;
    try {
      await api.request('/users/' + id, 'DELETE');
      showToast('Пользователь удален', 'success');
      if(viewToReload === 'employees') renderEmployees();
    } catch(err) { showToast(err.message, 'error'); }
  };

  // оценки (препод)
  

  

  // оценки (студент)
  

  // посещаемость
  

  // моя посещаемость
  

  // уведомления, потом поменяю на нормальную библиотеку
  

  // уроки
  

  

  

  

  // все уроки
  

  // сохраненные
  

  // о себе
  

  

  // редактор
  

  // доска — переменные объявлены в lessons.js

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  

  // конструктор тестов
  window._testQuestions = window._testQuestions || [];

  window.renderTestQuestions = function renderTestQuestions() {
    const area = document.getElementById('testQuestionsArea');
    if(!area) return;

    if(window._testQuestions.length === 0) {
      area.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">
        <i class="fas fa-question-circle" style="font-size:2.5rem; margin-bottom:12px;"></i>
        <p>Нет вопросов. Нажмите "Добавить вопрос"</p>
      </div>`;
      return;
    }

    let html = '';
    window._testQuestions.forEach((q, qi) => {
      html += `
        <div style="background:var(--bg); border-radius:14px; padding:20px; margin-bottom:16px; position:relative; border:1px solid var(--border);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:14px;">
            <div style="flex:1;">
              <label style="font-weight:600; color:var(--primary); font-size:0.9rem;">Вопрос ${qi + 1}</label>
              <input type="text" class="form-control" value="${q.question}" onchange="window._testQuestions[${qi}].question=this.value" placeholder="Введите вопрос" style="margin-top:6px; border-radius:10px;">
            </div>
            <button onclick="window.removeTestQuestion(${qi})" style="width:36px;height:36px;border-radius:10px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--danger);" title="Удалить вопрос"><i class="fas fa-trash"></i></button>
          </div>
          <div style="display:flex; gap:6px; margin-bottom:12px; align-items:center;">
            <span style="font-size:0.85rem; color:var(--text-muted);">Вариантов:</span>
            <select onchange="window.setOptionCount(${qi}, parseInt(this.value))" style="border-radius:8px; border:1px solid var(--border); padding:4px 8px; font-size:0.85rem;">
              ${[2,3,4,5,6].map(n => `<option value="${n}" ${q.options.length === n ? 'selected' : ''}>${n}</option>`).join('')}
            </select>
          </div>
          <div style="display:grid; gap:8px;" id="testOpts_${qi}">
            ${q.options.map((opt, oi) => `
              <div style="display:flex; align-items:center; gap:8px;">
                <label style="display:flex;align-items:center;cursor:pointer;">
                  <input type="radio" name="correct_${qi}" value="${oi}" ${q.correct_index === oi ? 'checked' : ''} onchange="window._testQuestions[${qi}].correct_index=${oi}" style="width:18px;height:18px;accent-color:var(--cyan);">
                </label>
                <input type="text" class="form-control" value="${opt}" onchange="window._testQuestions[${qi}].options[${oi}]=this.value" placeholder="Вариант ${oi + 1}" style="border-radius:10px; flex:1; ${q.correct_index === oi ? 'border-color:#10b981; background:#f0fdf4;' : ''}">
              </div>
            `).join('')}
          </div>
          <div style="margin-top:10px; font-size:0.8rem; color:var(--text-muted);">
            <i class="fas fa-info-circle"></i> Выберите правильный ответ с помощью радиокнопки
          </div>
        </div>
      `;
    });

    html += `<button class="btn btn-success" onclick="window.saveAllTests()" style="border-radius:12px; padding:12px 32px; font-weight:600; width:100%;">
      <i class="fas fa-save"></i> Сохранить все тесты
    </button>`;

    area.innerHTML = html;
    // Make _testQuestions accessible from window for inline handlers
    // window._testQuestions = _testQuestions;
  }

  window.addTestQuestion = () => {
    window._testQuestions.push({ id: null, question: '', options: ['', ''], correct_index: 0 });
    window.renderTestQuestions();
  };

  window.removeTestQuestion = async (idx) => {
    const q = window._testQuestions[idx];
    if(q.id) {
      try { await api.deleteLessonTest(q.id); } catch(e) { /* ignore */ }
    }
    window._testQuestions.splice(idx, 1);
    window.renderTestQuestions();
    showToast('Вопрос удалён', 'success');
  };

  window.setOptionCount = (qi, count) => {
    const q = window._testQuestions[qi];
    while(q.options.length < count) q.options.push('');
    while(q.options.length > count) q.options.pop();
    if(q.correct_index >= count) q.correct_index = 0;
    window.renderTestQuestions();
  };

  window.saveAllTests = async () => {
    if(!window._currentLessonId) return showToast('Сначала сохраните урок', 'error');
    try {
      const existing = await api.getLessonTests(window._currentLessonId);
      for(const t of existing) { await api.deleteLessonTest(t.id); }
      for(const q of window._testQuestions) {
        if(!q.question.trim()) continue;
        await api.addLessonTest(window._currentLessonId, {
          question: q.question,
          options_json: JSON.stringify(q.options),
          correct_index: q.correct_index
        });
      }
      showToast('Тесты сохранены', 'success');
      const updated = await api.getLessonTests(window._currentLessonId);
      if(typeof window.renderTestConstructor === 'function') window.renderTestConstructor(updated);
    } catch(err) { showToast(err.message, 'error'); }
  };

  // просмотр урока
  window.renderLessonView = async function renderLessonView(lessonId) {
    try {
      const [lessonData, tests] = await Promise.all([
        api.getLesson(lessonId),
        api.getLessonTests(lessonId)
      ]);

      const lesson = lessonData.lesson || lessonData;
      const files = lessonData.files || [];

      let wbData = null;
      try { wbData = await api.getLessonWhiteboard(lessonId); } catch(e) {}

      const ytId = extractYoutubeId(lesson.video_url);

      // Clean description - strip old injected lecture text
      let cleanDesc = lesson.description || '';
      cleanDesc = cleanDesc.replace(/\n*=== Конспект из файла ===[\s\S]*/g, '').trim();
      cleanDesc = cleanDesc.replace(/\\n\\n=== Конспект из файла ===[\s\S]*/g, '').trim();

      let html = `
        <div style="margin-bottom:20px; display:flex; align-items:center; gap:12px;">
          <button class="btn btn-secondary" onclick="window._loadLessonView('${user.role === 'TEACHER' ? 'lessons' : 'all_lessons'}','${user.role === 'TEACHER' ? 'Мои уроки' : 'Уроки'}')" style="border-radius:10px;">
            <i class="fas fa-arrow-left"></i> Назад
          </button>
        </div>
        <div class="card" style="border-radius:var(--radius); margin-bottom:20px; padding:28px;">
          <h1 style="margin:0 0 12px; color:var(--primary); font-family:var(--font-heading,Outfit,sans-serif); font-size:1.8rem;">${escapeHTML(lesson.title)}</h1>
          ${cleanDesc ? `<p style="color:var(--text-muted); font-size:1rem; line-height:1.6; margin:0 0 20px; white-space:pre-wrap;">${escapeHTML(cleanDesc)}</p>` : ''}
          <div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">
            <span style="color:var(--text-muted); font-size:0.9rem;"><i class="fas fa-user"></i> ${escapeHTML(lesson.teacher_name) || 'Преподаватель'}</span>
            <span style="color:var(--text-muted); font-size:0.9rem;"><i class="fas fa-calendar"></i> ${lesson.created_at ? new Date(lesson.created_at).toLocaleDateString('ru-RU') : ''}</span>
          </div>
        </div>
      `;

      // Render files: PPTX slides / DOCX / images / other

      // --- Render Files (slides / images / downloads) ---
      if (files && files.length > 0) {
        const imageFiles = files.filter(f => f.file_type === 'image');
        const pptxFiles = files.filter(f => f.file_type === 'pptx');
        const docxFiles = files.filter(f => f.file_type === 'docx');
        const otherFiles = files.filter(f => !['image','pptx','docx'].includes(f.file_type));

        // PPTX slideshow
        pptxFiles.forEach((f, fIdx) => {
          let slides = [];
          try { slides = JSON.parse(f.slides_data || '[]'); } catch(e) {}
          if (slides.length > 0) {
            const pId = `pptx_${fIdx}`;
            html += `
              <div class="card" style="border-radius:var(--radius); margin-bottom:24px; padding:0; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.08);">
                <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb); padding:20px 24px; display:flex; align-items:center; gap:14px;">
                  <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-file-powerpoint" style="color:#fff;font-size:1.4rem;"></i>
                  </div>
                  <div style="flex:1;">
                    <div style="color:#fff;font-weight:700;font-size:1.05rem;">${escapeHTML(f.file_name)}</div>
                    <div style="color:rgba(255,255,255,0.7);font-size:0.85rem;">Презентация · ${slides.length} слайдов</div>
                  </div>
                  <a href="${f.file_url}" download style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:8px 16px;border-radius:10px;text-decoration:none;font-size:0.85rem;font-weight:600;display:flex;align-items:center;gap:6px;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                    <i class="fas fa-download"></i> Скачать
                  </a>
                </div>

                <!-- Slide navigation -->
                <div style="padding:16px 24px; background:var(--bg); border-bottom:1px solid var(--border); display:flex; align-items:center; gap:12px;">
                  <button onclick="window._slidePrev('${pId}')" style="width:36px;height:36px;border-radius:10px;border:1px solid var(--border);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:1rem;transition:all 0.15s;" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='var(--surface)'" title="Предыдущий слайд"><i class="fas fa-chevron-left"></i></button>
                  <span id="${pId}_info" style="font-weight:700;color:var(--primary);min-width:80px;text-align:center;">Слайд 1 / ${slides.length}</span>
                  <button onclick="window._slideNext('${pId}')" style="width:36px;height:36px;border-radius:10px;border:1px solid var(--border);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:1rem;transition:all 0.15s;" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='var(--surface)'" title="Следующий слайд"><i class="fas fa-chevron-right"></i></button>
                  <div style="flex:1;display:flex;gap:6px;overflow-x:auto;padding:4px 0;scrollbar-width:thin;">
                    ${slides.map((s,i) => `<button onclick="window._slideTo('${pId}',${i})" id="${pId}_dot_${i}" style="min-width:${i===0?'32px':'10px'};height:10px;border-radius:5px;border:none;background:${i===0?'#2563eb':'var(--border)'};cursor:pointer;transition:all 0.3s;" title="Слайд ${i+1}"></button>`).join('')}
                  </div>
                </div>

                <!-- Slide content -->
                <div style="padding:24px; background:var(--bg); display:flex; justify-content:center; align-items:center;">
                  <div style="width:100%; max-width:900px; aspect-ratio:16/9; border-radius:8px; box-shadow:0 12px 30px rgba(0,0,0,0.25); display:flex; justify-content:center; position:relative; overflow:hidden; border:1px solid rgba(0,0,0,0.1);">
                    ${slides.map((s, i) => `
                      <img id="${pId}_slide_${i}" src="/uploads/lessons/${escapeHTML(s.image_path)}" style="display:${i===0?'block':'none'}; width:100%; height:100%; object-fit:contain; animation:fadeIn 0.3s ease; z-index:1;" alt="Slide ${s.num}">
                    `).join('')}
                  </div>
                </div>
              </div>
            `;
            // init slide state
            html += `<script>
              (function(){
                window._slideState = window._slideState || {};
                window._slideState['${pId}'] = { cur: 0, total: ${slides.length} };
              })();
            <\/script>`;
          } else {
            html += `<div class="card" style="border-radius:var(--radius);margin-bottom:20px;padding:20px;display:flex;align-items:center;gap:14px;">
              <i class="fas fa-file-powerpoint" style="font-size:2rem;color:#d04423;"></i>
              <div style="flex:1;"><div style="font-weight:600;">${escapeHTML(f.file_name)}</div><div style="font-size:0.85rem;color:var(--text-muted);">Презентация</div></div>
              <a href="${f.file_url}" download class="btn btn-secondary btn-sm" style="border-radius:10px;"><i class="fas fa-download"></i> Скачать</a>
            </div>`;
          }
        });

        // DOCX document viewer
        docxFiles.forEach((f) => {
          let paragraphs = [];
          try { paragraphs = JSON.parse(f.slides_data || '[]'); } catch(e) {}
          html += `
            <div class="card" style="border-radius:var(--radius); margin-bottom:24px; overflow:hidden; padding:0;">
              <div style="background:linear-gradient(135deg,#1e5040,#059669);padding:20px 24px;display:flex;align-items:center;gap:14px;">
                <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">
                  <i class="fas fa-file-word" style="color:#fff;font-size:1.3rem;"></i>
                </div>
                <div style="flex:1;"><div style="color:#fff;font-weight:700;font-size:1.05rem;">${escapeHTML(f.file_name)}</div><div style="color:rgba(255,255,255,0.7);font-size:0.85rem;">Документ Word · ${paragraphs.length} абзацев</div></div>
                <a href="${f.file_url}" download style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:8px 16px;border-radius:10px;text-decoration:none;font-size:0.85rem;font-weight:600;"><i class="fas fa-download"></i> Скачать</a>
              </div>
              <div style="padding:28px;max-height:500px;overflow-y:auto;">
                ${paragraphs.map(p => `<p style="color:var(--text-body);font-size:1rem;line-height:1.8;margin:0 0 12px;">${escapeHTML(p)}</p>`).join('')}
              </div>
            </div>
          `;
        });

        // Image gallery
        if (imageFiles.length > 0) {
          html += `<div class="card" style="border-radius:var(--radius);margin-bottom:20px;">
            <h3 style="margin:0 0 16px;color:var(--primary);"><i class="fas fa-images" style="color:var(--cyan);"></i> Фото материалы</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
              ${imageFiles.map(f => `
                <a href="${f.file_url}" target="_blank" style="display:block;border-radius:12px;overflow:hidden;aspect-ratio:4/3;background:var(--bg);">
                  <img src="${f.file_url}" alt="${escapeHTML(f.file_name)}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                </a>
              `).join('')}
            </div>
          </div>`;
        }

        // Other downloads
        if (otherFiles.length > 0) {
          html += `<div class="card" style="border-radius:var(--radius);margin-bottom:20px;">
            <h3 style="margin:0 0 12px;color:var(--primary);"><i class="fas fa-file-alt"></i> Материалы</h3>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${otherFiles.map(f => `<a href="${f.file_url}" target="_blank" style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:8px;text-decoration:none;color:var(--primary);background:var(--surface);">
                <i class="fas fa-file"></i><span>${escapeHTML(f.file_name)}</span></a>`).join('')}
            </div>
          </div>`;
        }
      }

      // YouTube Video
      if(ytId) {
        html += `
          <div class="card" style="border-radius:var(--radius); margin-bottom:20px; padding:0; overflow:hidden;">
            <div style="position:relative; padding-bottom:56.25%; height:0;">
              <iframe src="https://www.youtube.com/embed/${ytId}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
          </div>
        `;
      }

      // Inject CSS styles for animations
      html += `
        <style>
          @keyframes shake-incorrect {
            0%, 100% { transform: translateX(0); }
            15%, 45%, 75% { transform: translateX(-8px); }
            30%, 60%, 90% { transform: translateX(8px); }
          }
          @keyframes pop-correct {
            0% { transform: scale(1); }
            50% { transform: scale(1.04); }
            100% { transform: scale(1); }
          }
          .incorrect-answer {
            animation: shake-incorrect 0.5s ease-in-out;
            border-color: #ef4444 !important;
            box-shadow: 0 0 20px rgba(239,68,68,0.15) !important;
          }
          .correct-choice {
            animation: pop-correct 0.4s ease;
            box-shadow: 0 0 20px rgba(16,185,129,0.3) !important;
          }
        </style>
      `;

      // Whiteboard Pages (view-only - rendered always)
      const hasWb = wbData && Array.isArray(wbData) && wbData.length > 0;
      html += `
        <div class="card" style="border-radius:var(--radius); margin-bottom:20px; box-shadow:0 8px 30px rgba(0,0,0,0.06);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
            <h3 style="margin:0; color:var(--primary); display:flex; align-items:center; gap:8px;"><i class="fas fa-chalkboard"></i> Интерактивная доска</h3>
            <div style="display:flex; gap:10px;">
              <button onclick="window.toggleWhiteboardView()" class="btn btn-primary btn-sm" style="border-radius:10px; display:flex; align-items:center; gap:6px;">
                <i class="fas fa-chalkboard"></i> <span id="toggleWbBtnText">Открыть доску</span>
              </button>
              ${user.role === 'TEACHER' ? `
                <button onclick="window._editLessonId=${lessonId}; window._loadLessonView('lesson_editor','Редактирование'); setTimeout(() => window.switchLessonTab('whiteboard'), 200);" 
                        class="btn btn-secondary btn-sm" style="border-radius:10px; display:flex; align-items:center; gap:6px;">
                  <i class="fas fa-edit"></i> Редактировать доску
                </button>
              ` : ''}
            </div>
          </div>
          <div id="whiteboardContainer" style="display:none;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
              <button onclick="window.viewWbPrev()" style="width:36px;height:36px;border-radius:10px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--surface);"><i class="fas fa-chevron-left"></i></button>
              <span id="viewWbPageInfo" style="font-weight:600; color:var(--primary); min-width:50px; text-align:center;">1 / ${hasWb ? wbData.length : 1}</span>
              <button onclick="window.viewWbNext()" style="width:36px;height:36px;border-radius:10px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--surface);"><i class="fas fa-chevron-right"></i></button>
            </div>
            <div style="border:2px solid var(--border); border-radius:12px; overflow:hidden; background:#fff;">
              <canvas id="viewWbCanvas" width="1100" height="600"></canvas>
            </div>
          </div>
        </div>
      `;

      // Tests
      if(tests && tests.length > 0) {
        html += `
          <div class="card" style="border-radius:var(--radius); margin-bottom:20px;">
            <h3 style="margin:0 0 20px; color:var(--primary);"><i class="fas fa-question-circle" style="color:var(--cyan);"></i> Тест по уроку</h3>
            <div id="testArea">
        `;
        tests.forEach((t, ti) => {
          const opts = typeof t.options === 'string' ? JSON.parse(t.options) : t.options;
          html += `
            <div class="test-question-card" style="background:var(--bg); border-radius:14px; padding:20px; margin-bottom:16px; border:1px solid var(--border); transition:all 0.3s ease;">
              <p style="font-weight:600; color:var(--primary); margin:0 0 14px; font-size:1rem;">${ti + 1}. ${escapeHTML(t.question)}</p>
              <div style="display:grid; gap:8px;">
                ${opts.map((opt, oi) => `
                  <button class="test-answer-btn" data-qi="${ti}" data-oi="${oi}" data-correct="${t.correct_index}" onclick="window.checkAnswer(this, ${oi}, ${t.correct_index})"
                    style="text-align:left; padding:12px 16px; border-radius:10px; border:2px solid var(--border); background:var(--surface); cursor:pointer; font-size:0.95rem; transition:all 0.2s; display:flex; align-items:center; gap:10px;"
                    onmouseover="if(!this.dataset.answered) this.style.borderColor='var(--cyan)'" 
                    onmouseout="if(!this.dataset.answered) this.style.borderColor='var(--border)'">
                    <span style="width:28px;height:28px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.85rem;color:var(--text-muted);flex-shrink:0;">${String.fromCharCode(65 + oi)}</span>
                    ${escapeHTML(opt)}
                  </button>
                `).join('')}
              </div>
            </div>
          `;
        });
        html += '</div></div>';
      }

      contentArea.innerHTML = html;

      // Init view-only whiteboard (always init if canvas exists)
      window._viewWbPages = hasWb ? wbData.map(p => p.canvas_data) : [JSON.stringify({ objects: [], background: '#ffffff' })];
      window._viewWbIdx = 0;
      setTimeout(() => {
        const canvasEl = document.getElementById('viewWbCanvas');
        if(canvasEl) {
          window._viewWbCanvas = new fabric.StaticCanvas('viewWbCanvas', { backgroundColor: '#ffffff' });
          loadViewWbPage(0);
        }
      }, 100);
    } catch(err) {
      contentArea.innerHTML = `<div class="card" style="color:var(--danger)">Ошибка загрузки урока: ${err.message}</div>`;
    }
  }

  // Slide navigation for PPTX viewer
  window._slideTo = function(pId, idx) {
    const state = window._slideState && window._slideState[pId];
    if (!state) return;
    const prev = state.cur;
    state.cur = Math.max(0, Math.min(idx, state.total - 1));
    const prevEl = document.getElementById(`${pId}_slide_${prev}`);
    const nextEl = document.getElementById(`${pId}_slide_${state.cur}`);
    const prevDot = document.getElementById(`${pId}_dot_${prev}`);
    const nextDot = document.getElementById(`${pId}_dot_${state.cur}`);
    const info = document.getElementById(`${pId}_info`);
    if (prevEl) prevEl.style.display = 'none';
    if (nextEl) { nextEl.style.display = 'block'; nextEl.style.animation = 'fadeIn 0.3s ease'; }
    if (prevDot) { prevDot.style.minWidth = '10px'; prevDot.style.background = 'var(--border)'; }
    if (nextDot) { nextDot.style.minWidth = '32px'; nextDot.style.background = '#2563eb'; }
    if (info) info.textContent = `Слайд ${state.cur + 1} / ${state.total}`;
  };
  window._slideNext = function(pId) {
    const state = window._slideState && window._slideState[pId];
    if (state) window._slideTo(pId, state.cur + 1);
  };
  window._slidePrev = function(pId) {
    const state = window._slideState && window._slideState[pId];
    if (state) window._slideTo(pId, state.cur - 1);
  };

  function loadViewWbPage(idx) {
    if(!window._viewWbCanvas || !window._viewWbPages[idx]) return;
    try {
      const data = typeof window._viewWbPages[idx] === 'string' ? JSON.parse(window._viewWbPages[idx]) : window._viewWbPages[idx];
      window._viewWbCanvas.loadFromJSON(data, () => { window._viewWbCanvas.renderAll(); });
    } catch(e) { console.error(e); }
    const el = document.getElementById('viewWbPageInfo');
    if(el) el.textContent = `${idx + 1} / ${window._viewWbPages.length}`;
  }

  window.viewWbPrev = () => {
    if(window._viewWbIdx > 0) {
      window._viewWbIdx--;
      loadViewWbPage(window._viewWbIdx);
    }
  };

  window.viewWbNext = () => {
    if(window._viewWbIdx < window._viewWbPages.length - 1) {
      window._viewWbIdx++;
      loadViewWbPage(window._viewWbIdx);
    }
  };

  window.toggleWhiteboardView = () => {
    const container = document.getElementById('whiteboardContainer');
    const btnText = document.getElementById('toggleWbBtnText');
    if(container.style.display === 'none') {
      container.style.display = 'block';
      btnText.textContent = 'Закрыть доску';
      // Re-render canvas to fix size issues if opened while hidden
      if(window._viewWbCanvas) window._viewWbCanvas.renderAll();
    } else {
      container.style.display = 'none';
      btnText.textContent = 'Открыть доску';
    }
  };

  window.checkAnswer = (btn, chosen, correct) => {
    if(btn.dataset.answered) return;
    const parent = btn.parentElement;
    const allBtns = parent.querySelectorAll('.test-answer-btn');
    
    // Add keyframes for shake if not present
    if(!document.getElementById('testAnimStyle')) {
      const style = document.createElement('style');
      style.id = 'testAnimStyle';
      style.textContent = `
        @keyframes shakeEff { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-5px);} 75%{transform:translateX(5px);} }
        @keyframes popEff { 0%{transform:scale(0.95);} 50%{transform:scale(1.02);} 100%{transform:scale(1);} }
      `;
      document.head.appendChild(style);
    }

    allBtns.forEach(b => {
      b.dataset.answered = 'true';
      const oi = parseInt(b.dataset.oi);
      
      let icon = '';
      if(oi === correct) {
        b.style.borderColor = '#10b981';
        b.style.background = '#f0fdf4';
        b.querySelector('span').style.background = '#10b981';
        b.querySelector('span').style.color = '#fff';
        b.style.animation = 'popEff 0.3s ease';
        icon = '<i class="fas fa-check" style="margin-left:auto;color:#10b981;font-size:1.2rem;"></i>';
      } else if(oi === chosen && chosen !== correct) {
        b.style.borderColor = '#ef4444';
        b.style.background = '#fef2f2';
        b.querySelector('span').style.background = '#ef4444';
        b.querySelector('span').style.color = '#fff';
        b.style.animation = 'shakeEff 0.3s ease';
        icon = '<i class="fas fa-times" style="margin-left:auto;color:#ef4444;font-size:1.2rem;"></i>';
      } else {
        b.style.opacity = '0.6';
      }
      b.style.cursor = 'not-allowed';
      b.style.pointerEvents = 'none';
      if(icon) b.innerHTML += icon;
    });
  };

  window.toggleLike = async (id) => {
    try {
      const res = await api.toggleLessonLike(id);
      const btn = document.getElementById('likeBtn');
      const countEl = document.getElementById('likeCount');
      if(res.liked) {
        btn.style.borderColor = '#e74c3c';
        btn.style.background = '#fef2f2';
        btn.style.color = '#e74c3c';
      } else {
        btn.style.borderColor = 'var(--border)';
        btn.style.background = 'var(--surface)';
        btn.style.color = 'var(--text-muted)';
      }
      if(countEl && res.count !== undefined) countEl.textContent = res.count;
    } catch(err) { showToast(err.message, 'error'); }
  };

  window.toggleSave = async (id) => {
    try {
      const res = await api.toggleLessonSave(id);
      const btn = document.getElementById('saveBtn');
      if(res.saved) {
        btn.style.borderColor = 'var(--accent)';
        btn.style.background = '#fefce8';
        btn.style.color = 'var(--accent)';
        btn.innerHTML = '<i class="fas fa-bookmark"></i> Сохранено';
        showToast('Урок сохранён', 'success');
      } else {
        btn.style.borderColor = 'var(--border)';
        btn.style.background = 'var(--surface)';
        btn.style.color = 'var(--text-muted)';
        btn.innerHTML = '<i class="fas fa-bookmark"></i> Сохранить';
      }
    } catch(err) { showToast(err.message, 'error'); }
  };

  window.addComment = async (lessonId) => {
    const text = document.getElementById('commentText').value.trim();
    if(!text) return showToast('Введите комментарий', 'error');
    try {
      await api.addLessonComment(lessonId, { content: text });
      showToast('Комментарий добавлен', 'success');
      // Reload view
      await renderLessonView(lessonId);
    } catch(err) { showToast(err.message, 'error'); }
  };

  // Init default view
  const defaultNav = sidebarNav.querySelector('.nav-item');
  if(defaultNav) defaultNav.click();
});
