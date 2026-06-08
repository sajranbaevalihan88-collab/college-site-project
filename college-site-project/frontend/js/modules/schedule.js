const renderSchedule = async function() {
    let html = `<div class="card"><div class="card-header"><div class="card-title">Расписание (Фото и Excel)</div></div>`;
    
    // Media Upload / View Section
    html += `<div id="mediaScheduleArea" style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--border);"></div>`;

    if(['ADMIN','DIRECTOR','DEPUTY'].includes(window.user.role)) {
      html += `
        <div style="margin-bottom: 20px;">
          <h4>Загрузить новое расписание</h4>
          <form id="uploadMediaForm" style="display:flex; gap:10px; margin-top:10px; align-items:center;">
            <input type="text" id="mediaTitle" class="form-control" placeholder="Название (например: 1 курс ПКС)" style="max-width: 200px;" required>
            <input type="file" id="mediaFile" class="form-control" style="max-width: 300px;" required>
            <button type="submit" class="btn btn-success">Загрузить</button>
          </form>
        </div>
      `;
    }

    html += `<div class="card-title" style="margin-top:20px;">Расписание (Таблица)</div>`;

    if(window.user.role === 'STUDENT') {
      const sch = await api.getSchedule();
      html += renderScheduleTable(sch);
    } else if(window.user.role === 'TEACHER') {
      const sch = await api.getSchedule();
      html += renderScheduleTable(sch);
    } else {
      const groups = await api.getGroups();
      html += `
        <div class="form-group" style="max-width:300px; margin-top:10px;">
          <label class="form-label">Выберите группу</label>
          <select id="schGroupSelect" class="form-select">
            <option value="">-- Выберите --</option>
            ${groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
          </select>
        </div>
        <div id="schResult"></div>
      `;
    }
    html += `</div>`;
    window.contentArea.innerHTML = html;

    await loadScheduleMedia();

    if(['ADMIN','DIRECTOR','DEPUTY'].includes(window.user.role)) {
      document.getElementById('uploadMediaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('mediaFile');
        const titleInput = document.getElementById('mediaTitle');
        if(!fileInput.files[0]) return window.showToast('Выберите файл', 'error');

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('title', titleInput.value);

        try {
          const btn = e.target.querySelector('button');
          btn.disabled = true;
          btn.textContent = 'Загрузка...';
          await api.uploadScheduleMedia(formData);
          window.showToast('Расписание успешно загружено!', 'success');
          titleInput.value = '';
          fileInput.value = '';
          btn.disabled = false;
          btn.textContent = 'Загрузить';
          await loadScheduleMedia();
        } catch(err) {
          window.showToast(err.message, 'error');
        }
      });
    }

    if(!['STUDENT','TEACHER'].includes(window.user.role)) {
      document.getElementById('schGroupSelect').addEventListener('change', async (e) => {
        if(!e.target.value) return;
        document.getElementById('schResult').innerHTML = '<div class="spinner"></div>';
        const data = await api.getSchedule(`?group_id=${e.target.value}`);
        document.getElementById('schResult').innerHTML = renderScheduleTable(data);
      });
    }
  }

const loadScheduleMedia = async function() {
    const area = document.getElementById('mediaScheduleArea');
    try {
      const files = await api.getScheduleMedia();
      if(files.length === 0) {
        area.innerHTML = '<p style="color:var(--text-muted)">Нет загруженных файлов расписания.</p>';
        return;
      }
      
      let html = '<div style="display:flex; gap:15px; flex-wrap:wrap;">';
      files.forEach(f => {
        const isImage = f.file_url.match(/\.(jpeg|jpg|gif|png)$/i);
        const hasHtml = !!f.html_content;
        
        let preview = '';
        if (isImage) {
          preview = `<img src="${f.file_url}" style="width:100%; height:120px; object-fit:cover; border-radius:6px; cursor:zoom-in;" onclick="window.open('${f.file_url}', '_blank')">`;
        } else if (hasHtml) {
          preview = `<div style="height:120px; display:flex; align-items:center; justify-content:center; background:#10b98120; border-radius:6px; color:var(--success); cursor:pointer;" onclick="window.viewExcelSchedule(${f.id})"><i class="fas fa-table fa-3x"></i></div>`;
        } else {
          preview = `<div style="height:120px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:6px;"><i class="fas fa-file-alt fa-3x" style="color:var(--text-muted)"></i></div>`;
        }

        html += `
          <div style="border:1px solid var(--border); border-radius:var(--radius); padding:10px; width:200px; text-align:center;">
            ${preview}
            <div style="margin-top:10px; font-weight:600; font-size:0.9rem;">${f.title}</div>
            <div style="margin-top:10px; display:flex; gap:5px; justify-content:center;">
              ${hasHtml ? `<button class="btn btn-primary btn-sm" onclick="window.viewExcelSchedule(${f.id})"><i class="fas fa-eye"></i> Открыть</button>` : `<a href="${f.file_url}" target="_blank" class="btn btn-primary btn-sm"><i class="fas fa-eye"></i> Открыть</a>`}
              ${['ADMIN','DIRECTOR','DEPUTY'].includes(window.user.role) ? `<button class="btn btn-danger btn-sm" onclick="window.deleteScheduleMedia(${f.id})"><i class="fas fa-trash"></i></button>` : ''}
            </div>
          </div>
        `;
      });
      html += '</div>';
      area.innerHTML = html;
      
      // Store html content globally for modal
      window.scheduleHtmlData = files.reduce((acc, f) => {
        if(f.html_content) acc[f.id] = f.html_content;
        return acc;
      }, {});
      
    } catch(err) {
      area.innerHTML = '<p style="color:var(--danger)">Ошибка загрузки файлов</p>';
    }
  }

const viewExcelSchedule = (id) => {
    const html = window.scheduleHtmlData[id];
    if(!html) return;
    window._excelZoom = 1;
    const modalContent = `
      <style>
        .excel-wrapper { width: 100%; overflow: auto; max-height: 70vh; background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 10px; }
        .excel-container { width: max-content; }
        .excel-table { width: max-content; border-collapse: collapse; margin-bottom: 20px; font-size: 0.85rem; }
        .excel-table th, .excel-table td { border: 1px solid #cbd5e1; padding: 5px 10px; white-space: nowrap; }
        .excel-table thead th { background: #f8fafc; font-weight: 600; }
        .excel-sheet-title { font-weight: 700; margin: 15px 0 5px; color: var(--primary); font-size: 1.1rem; }
      </style>
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:10px; align-items:center;">
        <span style="font-size:0.9rem; color:var(--text-muted); margin-right:auto;">Масштаб:</span>
        <button class="btn btn-sm btn-secondary" onclick="window._excelZoom = Math.max(0.3, window._excelZoom - 0.1); document.getElementById('excelContent').style.zoom = window._excelZoom; document.getElementById('zoomDisplay').innerText = Math.round(window._excelZoom * 100) + '%';" style="border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;padding:0;"><i class="fas fa-minus"></i></button>
        <span id="zoomDisplay" style="font-weight:600; min-width:45px; text-align:center; font-size:0.9rem;">100%</span>
        <button class="btn btn-sm btn-secondary" onclick="window._excelZoom = Math.min(3, window._excelZoom + 0.1); document.getElementById('excelContent').style.zoom = window._excelZoom; document.getElementById('zoomDisplay').innerText = Math.round(window._excelZoom * 100) + '%';" style="border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;padding:0;"><i class="fas fa-plus"></i></button>
      </div>
      <div class="excel-wrapper">
        <div id="excelContent" class="excel-container">${html}</div>
      </div>
    `;
    window.openModal('Расписание (Excel)', modalContent);
  };

const deleteScheduleMedia = async (id) => {
    if(!confirm('Удалить этот файл?')) return;
    try {
      await api.deleteScheduleMedia(id);
      window.showToast('Файл удалён', 'success');
      await loadScheduleMedia();
    } catch(err) { window.showToast(err.message, 'error'); }
  };

const renderScheduleTable = function(scheduleData) {
    if(!scheduleData || scheduleData.length === 0) return '<p>Расписание не найдено.</p>';
    const days = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
    let html = '';
    days.forEach((day, i) => {
      const dayData = scheduleData.filter(s => s.day_of_week === (i+1));
      if(dayData.length > 0) {
        html += `<h4 style="margin: 20px 0 10px; color:var(--primary); border-bottom:1px solid var(--border); padding-bottom:5px;">${day}</h4>`;
        html += `<div class="table-responsive"><table><thead><tr><th>Время</th><th>Предмет</th><th>Группа</th><th>Преподаватель</th><th>Кабинет</th></tr></thead><tbody>`;
        dayData.forEach(d => {
          html += `<tr>
            <td><strong>${d.start_time} - ${d.end_time}</strong></td>
            <td>${d.subject_name}</td>
            <td><span class="badge badge-primary">${d.group_name}</span></td>
            <td>${d.teacher_name}</td>
            <td>каб. ${d.room}</td>
          </tr>`;
        });
        html += `</tbody></table></div>`;
      }
    });
    return html;
  }

// Экспортируем в глобальный scope — без этого app.js не видит функции
window.renderSchedule      = renderSchedule;
window.loadScheduleMedia   = loadScheduleMedia;
window.viewExcelSchedule   = viewExcelSchedule;
window.deleteScheduleMedia = deleteScheduleMedia;
