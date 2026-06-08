// Whiteboard state (shared across all wb functions in this file)
let _wbCanvas = null;
let _wbPages = [];
let _wbCurrentPage = 0;
let _wbHistory = [];
let _wbRedoStack = [];
let _wbTool = 'select';
let _wbZoom = 1;
let _wbIsDrawingShape = false;
let _wbShapeStart = null;
let _wbTempShape = null;
let _wbSaving = false;

const renderMyLessons = async function() {
    try {
      const lessons = await api.getMyLessons();
      let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
          <h2 style="margin:0; font-family:var(--font-heading,Outfit,sans-serif); color:var(--primary);">Мои уроки</h2>
          <button class="btn btn-success" onclick="window._editLessonId=null; window._loadLessonView('lesson_editor','Новый урок')" style="border-radius:12px; padding:10px 24px; font-weight:600;">
            <i class="fas fa-plus"></i> Создать урок
          </button>
        </div>
      `;

      if(!lessons || lessons.length === 0) {
        html += `<div class="card" style="text-align:center; padding:60px 20px;">
          <i class="fas fa-book-open" style="font-size:3rem; color:var(--text-muted); margin-bottom:16px;"></i>
          <p style="color:var(--text-muted); font-size:1.1rem;">У вас пока нет уроков. Создайте свой первый урок!</p>
        </div>`;
      } else {
        html += '<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:20px;">';
        lessons.forEach(l => {
          const ytId = extractYoutubeId(l.video_url);
          const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : '';
          html += `
            <div class="card" style="border-radius:var(--radius); overflow:hidden; transition:transform 0.2s, box-shadow 0.2s; cursor:pointer; padding:0;" 
                 onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 40px rgba(0,0,0,0.12)'" 
                 onmouseout="this.style.transform='';this.style.boxShadow=''"
                 onclick="window._viewLessonId=${l.id}; window._loadLessonView('lesson_view','${l.title.replace(/'/g, "\\'")}')"
            >
              ${thumb ? `<div style="height:180px; background:url('${thumb}') center/cover; position:relative;"><div style="position:absolute;inset:0;background:linear-gradient(transparent 60%,rgba(0,0,0,0.7));display:flex;align-items:flex-end;padding:16px;"><span style="color:#fff;font-weight:700;font-size:1.1rem;">${l.title}</span></div></div>` : `<div style="padding:20px 20px 0;"><h3 style="margin:0;color:var(--primary);">${l.title}</h3></div>`}
              <div style="padding:16px 20px;">
                <p style="color:var(--text-muted); font-size:0.9rem; margin:0 0 16px; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${l.description || 'Без описания'}</p>
                
                <div style="display:flex; gap:8px;">
                  <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window._editLessonId=${l.id}; window._loadLessonView('lesson_editor','Редактирование')" style="border-radius:10px; flex:1;"><i class="fas fa-edit"></i> Редактировать</button>
                  <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); window.deleteLesson(${l.id})" style="border-radius:10px;"><i class="fas fa-trash"></i></button>
                </div>
              </div>
            </div>
          `;
        });
        html += '</div>';
      }
      window.contentArea.innerHTML = html;
    } catch(err) {
      window.contentArea.innerHTML = `<div class="card" style="color:var(--danger)">Ошибка: ${err.message}</div>`;
    }
  }

const deleteLesson = async (id) => {
    if(!confirm('Удалить этот урок? Это действие необратимо.')) return;
    try {
      await api.deleteLesson(id);
      window.showToast('Урок удалён', 'success');
      await renderMyLessons();
    } catch(err) { window.showToast(err.message, 'error'); }
  };

const extractYoutubeId = function(url) {
    if(!url) return null;
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
    return m ? m[1] : null;
  }

const renderAllLessons = async function() {
    try {
      const lessons = await api.getLessons();
      let html = `
        <div style="margin-bottom:24px;">
          <h2 style="margin:0 0 8px; font-family:var(--font-heading,Outfit,sans-serif); color:var(--primary);">Все уроки</h2>
          <p style="color:var(--text-muted); margin:0;">Изучайте материалы преподавателей</p>
        </div>
      `;

      if(!lessons || lessons.length === 0) {
        html += `<div class="card" style="text-align:center; padding:60px 20px;">
          <i class="fas fa-book-reader" style="font-size:3rem; color:var(--text-muted); margin-bottom:16px;"></i>
          <p style="color:var(--text-muted); font-size:1.1rem;">Пока нет опубликованных уроков</p>
        </div>`;
      } else {
        html += '<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:20px;">';
        lessons.forEach(l => {
          const ytId = extractYoutubeId(l.video_url);
          const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : '';
          html += `
            <div class="card" style="border-radius:var(--radius); overflow:hidden; transition:transform 0.2s, box-shadow 0.2s; cursor:pointer; padding:0;" 
                 onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 40px rgba(0,0,0,0.12)'" 
                 onmouseout="this.style.transform='';this.style.boxShadow=''" 
                 onclick="window._viewLessonId=${l.id}; window._loadLessonView('lesson_view','${l.title.replace(/'/g, "\\'")}')"
            >
              ${thumb ? `<div style="height:180px; background:url('${thumb}') center/cover; position:relative;"><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;"><div style="width:56px;height:56px;border-radius:50%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;"><i class="fas fa-play" style="color:#fff;font-size:1.2rem;margin-left:3px;"></i></div></div></div>` : `<div style="height:120px;background:linear-gradient(135deg,var(--primary),var(--primary-light));display:flex;align-items:center;justify-content:center;"><i class="fas fa-book-open" style="font-size:2.5rem;color:rgba(255,255,255,0.3);"></i></div>`}
              <div style="padding:16px 20px;">
                <h3 style="margin:0 0 8px; color:var(--primary); font-size:1.05rem;">${l.title}</h3>
                <p style="color:var(--text-muted); font-size:0.85rem; margin:0 0 12px; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${l.description || ''}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:var(--text-muted);">
                  <span><i class="fas fa-window.user"></i> ${l.teacher_name || 'Преподаватель'}</span>
                  <div style="display:flex; gap:12px;">
                    <span><i class="fas fa-eye"></i> ${l.views_count || 0}</span>
                    <span><i class="fas fa-heart" style="color:#e74c3c;"></i> ${l.likes_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        });
        html += '</div>';
      }
      window.contentArea.innerHTML = html;
    } catch(err) {
      window.contentArea.innerHTML = `<div class="card" style="color:var(--danger)">Ошибка: ${err.message}</div>`;
    }
  }

const renderSavedLessons = async function() {
    try {
      const lessons = await api.getSavedLessons();
      let html = `
        <div style="margin-bottom:24px;">
          <h2 style="margin:0 0 8px; font-family:var(--font-heading,Outfit,sans-serif); color:var(--primary);"><i class="fas fa-bookmark" style="color:var(--accent);"></i> Сохранённые уроки</h2>
        </div>
      `;

      if(!lessons || lessons.length === 0) {
        html += `<div class="card" style="text-align:center; padding:60px 20px;">
          <i class="fas fa-bookmark" style="font-size:3rem; color:var(--text-muted); margin-bottom:16px;"></i>
          <p style="color:var(--text-muted); font-size:1.1rem;">У вас нет сохранённых уроков</p>
        </div>`;
      } else {
        html += '<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:20px;">';
        lessons.forEach(l => {
          const ytId = extractYoutubeId(l.video_url);
          const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : '';
          html += `
            <div class="card" style="border-radius:var(--radius); overflow:hidden; transition:transform 0.2s, box-shadow 0.2s; cursor:pointer; padding:0;"
                 onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 40px rgba(0,0,0,0.12)'"
                 onmouseout="this.style.transform='';this.style.boxShadow=''"
                 onclick="window._viewLessonId=${l.id}; window._loadLessonView('lesson_view','${l.title.replace(/'/g, "\\'")}')"
            >
              ${thumb ? `<div style="height:160px; background:url('${thumb}') center/cover;"></div>` : `<div style="height:100px;background:linear-gradient(135deg,var(--primary),var(--cyan));display:flex;align-items:center;justify-content:center;"><i class="fas fa-book-open" style="font-size:2rem;color:rgba(255,255,255,0.3);"></i></div>`}
              <div style="padding:16px 20px;">
                <h3 style="margin:0 0 8px; color:var(--primary); font-size:1rem;">${l.title}</h3>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">
                  <span><i class="fas fa-window.user"></i> ${l.teacher_name || ''}</span>
                  <span><i class="fas fa-eye"></i> ${l.views_count || 0}</span>
                </div>
              </div>
            </div>
          `;
        });
        html += '</div>';
      }
      window.contentArea.innerHTML = html;
    } catch(err) {
      window.contentArea.innerHTML = `<div class="card" style="color:var(--danger)">Ошибка: ${err.message}</div>`;
    }
  }

const renderAboutMe = async function() {
    let html = `
      <div class="card" style="max-width:700px;">
        <div class="card-header"><div class="card-title"><i class="fas fa-id-card" style="color:var(--accent);"></i> О себе</div></div>
        <p style="color:var(--text-muted); margin-bottom:16px;">Расскажите о себе — эта информация будет видна студентам</p>
        <textarea id="aboutMeText" class="form-control" rows="8" placeholder="Расскажите о своем опыте, квалификации, интересах..." style="resize:vertical; min-height:150px; border-radius:12px; font-size:0.95rem; line-height:1.6;"></textarea>
        <button class="btn btn-success" onclick="window.saveAboutMe()" style="margin-top:16px; border-radius:12px; padding:10px 32px; font-weight:600;">
          <i class="fas fa-save"></i> Сохранить
        </button>
      </div>
    `;
    window.contentArea.innerHTML = html;
    // Load existing about me
    try {
      const profile = await api.request('/users/me/about');
      if(profile && profile.about) document.getElementById('aboutMeText').value = profile.about;
    } catch(e) { /* may not exist yet */ }
  }

const saveAboutMe = async () => {
    const text = document.getElementById('aboutMeText').value;
    try {
      await api.request('/users/me/about', 'PUT', { about: text });
      window.showToast('Информация сохранена', 'success');
    } catch(err) { window.showToast(err.message, 'error'); }
  };

const renderLessonEditor = async function(lessonId) {
    let lesson = { title: '', description: '', video_url: '' };
    let existingTests = [];
    let whiteboardData = [];

    let files = [];

    if(lessonId) {
      try {
        const lessonData = await api.getLesson(lessonId);
        lesson = lessonData.lesson || lessonData;
        files = lessonData.files || [];
        existingTests = await api.getLessonTests(lessonId);
        const wb = await api.getLessonWhiteboard(lessonId);
        if(wb && Array.isArray(wb)) {
          whiteboardData = wb.map(item => item.canvas_data);
        }
      } catch(e) { console.error(e); }
    }

    window.contentArea.innerHTML = `
      <div style="margin-bottom:20px; display:flex; align-items:center; gap:12px;">
        <button class="btn btn-secondary" onclick="window._loadLessonView('lessons','Мои уроки')" style="border-radius:10px;">
          <i class="fas fa-arrow-left"></i> Назад
        </button>
        <h2 style="margin:0; font-family:var(--font-heading,Outfit,sans-serif); color:var(--primary);">${lessonId ? 'Редактирование урока' : 'Новый урок'}</h2>
      </div>

      <!-- TABS -->
      <div style="display:flex; gap:4px; margin-bottom:0; background:var(--bg); border-radius:14px 14px 0 0; padding:6px 6px 0; overflow-x:auto;" id="lessonTabs">
        <button class="btn" data-tab="info" onclick="window.switchLessonTab('info')" style="border-radius:10px 10px 0 0; padding:12px 24px; font-weight:600; border:none; background:var(--surface); color:var(--primary); position:relative; bottom:-1px;">
          <i class="fas fa-info-circle"></i> Информация
        </button>
        <button class="btn" data-tab="whiteboard" onclick="window.switchLessonTab('whiteboard')" style="border-radius:10px 10px 0 0; padding:12px 24px; font-weight:600; border:none; background:transparent; color:var(--text-muted);">
          <i class="fas fa-chalkboard"></i> Доска
        </button>
        <button class="btn" data-tab="tests" onclick="window.switchLessonTab('tests')" style="border-radius:10px 10px 0 0; padding:12px 24px; font-weight:600; border:none; background:transparent; color:var(--text-muted);">
          <i class="fas fa-question-circle"></i> Тесты
        </button>
      </div>

      <!-- INFO TAB -->
      <div id="tabInfo" class="card" style="border-radius:0 14px 14px 14px; margin-top:0; padding:30px; background:linear-gradient(to bottom right, var(--surface), rgba(255,255,255,0.02)); box-shadow:inset 0 1px 1px rgba(255,255,255,0.1);">
        <div class="form-group" style="margin-bottom:24px;">
          <label class="form-label" style="font-weight:600; font-size:1.05rem; color:var(--primary); margin-bottom:10px;">Название урока <span style="color:var(--accent);">*</span></label>
          <input type="text" id="lessonTitle" class="form-control" value="${lesson.title || ''}" placeholder="Например: Введение в специальность" style="border-radius:14px; padding:16px; font-size:1.05rem; background:var(--bg); border:1px solid var(--border); transition:all 0.3s;" onfocus="this.style.borderColor='var(--cyan)'; this.style.boxShadow='0 0 0 4px rgba(0,212,255,0.1)';" onblur="this.style.borderColor='var(--border)'; this.style.boxShadow='none';">
        </div>
        
        <div class="form-group" style="margin-bottom:24px;">
          <label class="form-label" style="font-weight:600; font-size:1.05rem; color:var(--primary); margin-bottom:10px;">Описание урока</label>
          <textarea id="lessonDesc" class="form-control" rows="5" placeholder="О чем будет этот урок? Подробно опишите его содержание..." style="border-radius:14px; padding:16px; font-size:1rem; background:var(--bg); border:1px solid var(--border); resize:vertical; transition:all 0.3s;" onfocus="this.style.borderColor='var(--cyan)'; this.style.boxShadow='0 0 0 4px rgba(0,212,255,0.1)';" onblur="this.style.borderColor='var(--border)'; this.style.boxShadow='none';">${lesson.description || ''}</textarea>
        </div>
        
        <div class="form-group" style="margin-bottom:30px;">
          <label class="form-label" style="font-weight:600; font-size:1.05rem; color:var(--primary); margin-bottom:10px;"><i class="fab fa-youtube" style="color:#ff0000; margin-right:8px;"></i>Ссылка на YouTube (опционально)</label>
          <div style="position:relative;">
            <i class="fas fa-link" style="position:absolute; left:16px; top:50%; transform:translateY(-50%); color:var(--text-muted);"></i>
            <input type="text" id="lessonYoutube" class="form-control" value="${lesson.video_url || ''}" placeholder="https://www.youtube.com/watch?v=..." style="border-radius:14px; padding:16px 16px 16px 44px; font-size:1rem; background:var(--bg); border:1px solid var(--border); transition:all 0.3s;" oninput="window.previewYoutube()" onfocus="this.style.borderColor='var(--cyan)'; this.style.boxShadow='0 0 0 4px rgba(0,212,255,0.1)';" onblur="this.style.borderColor='var(--border)'; this.style.boxShadow='none';">
          </div>
          <div id="ytPreview" style="margin-top:16px;"></div>
        </div>

        <div class="form-group" style="margin-bottom:32px; background:var(--bg); padding:24px; border-radius:16px; border:1px dashed var(--border);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
            <div>
              <label class="form-label" style="font-weight:600; font-size:1.1rem; color:var(--primary); margin-bottom:4px;"><i class="fas fa-file-alt" style="color:var(--cyan); margin-right:8px;"></i>Материалы к уроку</label>
              <p style="font-size:0.9rem; color:var(--text-muted); margin:0;">Презентации, конспекты или фотографии</p>
            </div>
            <span style="background:rgba(0,212,255,0.1); color:var(--cyan); padding:4px 10px; border-radius:8px; font-size:0.8rem; font-weight:700;"><i class="fas fa-magic"></i> Авто-распознавание</span>
          </div>
          
          ${files.length > 0 ? `
            <div style="margin-bottom:20px; display:flex; flex-direction:column; gap:10px;">
              <h5 style="margin:0; font-size:0.9rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Прикрепленные файлы (${files.length})</h5>
              ${files.map(f => `
                <div style="display:flex; align-items:center; gap:14px; padding:16px; background:var(--surface); border:1px solid rgba(255,255,255,0.05); border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.05); transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                  <div style="width:40px; height:40px; border-radius:10px; background:rgba(0,212,255,0.1); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i class="fas ${f.file_type === 'image' ? 'fa-image' : f.file_type === 'pdf' ? 'fa-file-pdf' : 'fa-file-word'}" style="color:var(--cyan); font-size:1.2rem;"></i>
                  </div>
                  <div style="flex:1; overflow:hidden;">
                    <div style="font-weight:600; font-size:0.95rem; color:var(--primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.file_name}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Добавлен к материалам</div>
                  </div>
                  <a href="${f.file_url}" target="_blank" class="btn btn-sm" style="background:transparent; border:1px solid var(--border); color:var(--text-muted); border-radius:8px;"><i class="fas fa-external-link-alt"></i></a>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="file-upload-wrapper" style="position:relative;">
            <input type="file" id="lessonFile" class="form-control" accept=".pptx,.docx,.jpg,.png,.webp,.jpeg" style="opacity:0; position:absolute; top:0; left:0; width:100%; height:100%; cursor:pointer; z-index:10;" onchange="
              const fn = this.files[0] ? this.files[0].name : ''; 
              if(fn) {
                document.getElementById('uploadText').innerHTML = '<i class=\\'fas fa-check-circle\\' style=\\'color:#2ecc71; font-size:2.5rem; margin-bottom:16px;\\'></i><h4 style=\\'margin:0 0 8px; color:var(--primary); font-size:1.1rem; font-weight:600;\\'>' + fn + ' готов к загрузке</h4><p style=\\'margin:0; font-size:0.9rem; color:var(--text-muted);\\'>Нажмите &quot;Сохранить изменения&quot; внизу</p>';
                this.nextElementSibling.style.borderColor = '#2ecc71';
                this.nextElementSibling.style.background = 'rgba(46, 204, 113, 0.05)';
              } else {
                this.nextElementSibling.style.borderColor = 'var(--border)';
                this.nextElementSibling.style.background = 'var(--surface)';
                document.getElementById('uploadText').innerHTML = '<i class=\\'fas fa-cloud-upload-alt\\' style=\\'color:var(--cyan); font-size:2.5rem; margin-bottom:16px;\\'></i><h4 style=\\'margin:0 0 8px; color:var(--primary); font-size:1.1rem; font-weight:600;\\'>Нажмите или перетащите файл сюда</h4><p style=\\'margin:0; font-size:0.9rem; color:var(--text-muted);\\'>Поддерживаются форматы PPTX, DOCX, JPG, PNG (до 50 МБ)</p>';
              }
            ">
            <div style="border:2px dashed var(--border); border-radius:16px; padding:40px 20px; text-align:center; transition:all 0.3s; background:var(--surface);" onmouseover="this.style.borderColor='var(--cyan)'; this.style.boxShadow='0 0 20px rgba(0,212,255,0.05)';" onmouseout="if(!document.getElementById('lessonFile').files.length){this.style.borderColor='var(--border)';} this.style.boxShadow='none';">
              <div id="uploadText">
                <i class="fas fa-cloud-upload-alt" style="color:var(--cyan); font-size:2.5rem; margin-bottom:16px; transition:transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='none'"></i>
                <h4 style="margin:0 0 8px; color:var(--primary); font-size:1.1rem; font-weight:600;">Нажмите или перетащите новый файл сюда</h4>
                <p style="margin:0; font-size:0.9rem; color:var(--text-muted);">Поддерживаются форматы PPTX, DOCX, JPG, PNG (до 50 МБ)</p>
              </div>
            </div>
          </div>
          
        </div>
        
        <div style="display:flex; justify-content:flex-end;">
          <button class="btn btn-success" onclick="window.saveLessonInfo()" style="border-radius:14px; padding:16px 40px; font-weight:700; font-size:1.1rem; background:linear-gradient(135deg, #10b981, #059669); box-shadow:0 8px 24px rgba(16,185,129,0.25); border:none; transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 12px 28px rgba(16,185,129,0.3)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 8px 24px rgba(16,185,129,0.25)';">
            <i class="fas fa-save" style="margin-right:8px;"></i> ${lessonId ? 'Сохранить изменения' : 'Создать урок'}
          </button>
        </div>
      </div>

      <!-- WHITEBOARD TAB -->
      <div id="tabWhiteboard" class="card" style="border-radius:0 14px 14px 14px; margin-top:0; display:none; padding:12px;">
        ${!lessonId ? '<p style="color:var(--text-muted); text-align:center; padding:40px;">Сначала сохраните урок во вкладке "Информация"</p>' : `
        <!-- Whiteboard Toolbar -->
        <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center; padding:10px 12px; background:var(--bg); border-radius:12px; margin-bottom:10px;">
          <div style="display:flex; gap:3px; background:var(--surface); border-radius:10px; padding:3px; border:1px solid var(--border);">
            <button class="wb-tool active" data-tool="select" onclick="window.wbSetTool('select')" title="Выделение" style="width:36px;height:36px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--primary);color:#fff;transition:all 0.15s;"><i class="fas fa-mouse-pointer"></i></button>
            <button class="wb-tool" data-tool="draw" onclick="window.wbSetTool('draw')" title="Карандаш" style="width:36px;height:36px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:transparent;color:var(--text-muted);transition:all 0.15s;"><i class="fas fa-pencil-alt"></i></button>
            <button class="wb-tool" data-tool="rect" onclick="window.wbSetTool('rect')" title="Прямоугольник" style="width:36px;height:36px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:transparent;color:var(--text-muted);transition:all 0.15s;"><i class="fas fa-square"></i></button>
            <button class="wb-tool" data-tool="circle" onclick="window.wbSetTool('circle')" title="Круг" style="width:36px;height:36px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:transparent;color:var(--text-muted);transition:all 0.15s;"><i class="fas fa-circle"></i></button>
            <button class="wb-tool" data-tool="triangle" onclick="window.wbSetTool('triangle')" title="Треугольник" style="width:36px;height:36px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:transparent;color:var(--text-muted);transition:all 0.15s;"><i class="fas fa-play" style="transform:rotate(-90deg);"></i></button>
            <button class="wb-tool" data-tool="line" onclick="window.wbSetTool('line')" title="Линия" style="width:36px;height:36px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:transparent;color:var(--text-muted);transition:all 0.15s;"><i class="fas fa-minus" style="transform:rotate(-45deg);"></i></button>
            <button class="wb-tool" data-tool="arrow" onclick="window.wbSetTool('arrow')" title="Стрелка" style="width:36px;height:36px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:transparent;color:var(--text-muted);transition:all 0.15s;"><i class="fas fa-long-arrow-alt-right"></i></button>
            <button class="wb-tool" data-tool="text" onclick="window.wbSetTool('text')" title="Текст" style="width:36px;height:36px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:transparent;color:var(--text-muted);transition:all 0.15s;"><i class="fas fa-font"></i></button>
            <button class="wb-tool" data-tool="star" onclick="window.wbSetTool('star')" title="Звезда" style="width:36px;height:36px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:transparent;color:var(--text-muted);transition:all 0.15s;"><i class="fas fa-star"></i></button>
          </div>

          <div style="width:1px;height:28px;background:var(--border);"></div>

          <div style="display:flex; align-items:center; gap:6px;">
            <label title="Цвет обводки" style="display:flex;align-items:center;gap:4px;font-size:0.8rem;color:var(--text-muted);cursor:pointer;">Обводка <input type="color" id="wbStroke" value="#000000" style="width:32px;height:32px;border:2px solid var(--border);border-radius:8px;cursor:pointer;padding:0;"></label>
            <label title="Цвет заливки" style="display:flex;align-items:center;gap:4px;font-size:0.8rem;color:var(--text-muted);cursor:pointer;">Заливка <input type="color" id="wbFill" value="#F9A826" style="width:32px;height:32px;border:2px solid var(--border);border-radius:8px;cursor:pointer;padding:0;"></label>
          </div>

          <div style="display:flex; align-items:center; gap:4px;">
            <label style="font-size:0.8rem;color:var(--text-muted);">Толщина</label>
            <select id="wbStrokeWidth" onchange="window.wbUpdateStrokeWidth()" style="border-radius:8px; border:1px solid var(--border); padding:4px 8px; font-size:0.85rem;">
              <option value="1">1px</option>
              <option value="2" selected>2px</option>
              <option value="3">3px</option>
              <option value="5">5px</option>
              <option value="8">8px</option>
            </select>
          </div>

          <div style="width:1px;height:28px;background:var(--border);"></div>

          <div style="display:flex; gap:3px;">
            <button onclick="window.wbUndo()" title="Отменить" style="width:36px;height:36px;border-radius:8px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--text-muted);transition:all 0.15s;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='var(--surface)'"><i class="fas fa-undo"></i></button>
            <button onclick="window.wbRedo()" title="Повторить" style="width:36px;height:36px;border-radius:8px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--text-muted);transition:all 0.15s;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='var(--surface)'"><i class="fas fa-redo"></i></button>
            <button onclick="window.wbDeleteSelected()" title="Удалить выбранное" style="width:36px;height:36px;border-radius:8px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--danger);transition:all 0.15s;" onmouseover="this.style.background='#fff0f0'" onmouseout="this.style.background='var(--surface)'"><i class="fas fa-trash-alt"></i></button>
            <button onclick="window.wbClearAll()" title="Очистить всё" style="width:36px;height:36px;border-radius:8px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--danger);transition:all 0.15s;" onmouseover="this.style.background='#fff0f0'" onmouseout="this.style.background='var(--surface)'"><i class="fas fa-eraser"></i></button>
          </div>

          <div style="width:1px;height:28px;background:var(--border);"></div>

          <div style="display:flex; gap:3px;">
            <button onclick="window.wbZoomIn()" title="Увеличить" style="width:36px;height:36px;border-radius:8px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--text-muted);transition:all 0.15s;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='var(--surface)'"><i class="fas fa-search-plus"></i></button>
            <button onclick="window.wbZoomOut()" title="Уменьшить" style="width:36px;height:36px;border-radius:8px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--text-muted);transition:all 0.15s;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='var(--surface)'"><i class="fas fa-search-minus"></i></button>
            <span id="wbZoomLevel" style="font-size:0.8rem;color:var(--text-muted);display:flex;align-items:center;padding:0 6px;">100%</span>
          </div>

          <div style="width:1px;height:28px;background:var(--border);"></div>

          <div style="display:flex; gap:4px; align-items:center;">
            <button onclick="window.wbPrevPage()" title="Предыдущая страница" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--text-muted);font-size:0.85rem;"><i class="fas fa-chevron-left"></i></button>
            <span id="wbPageInfo" style="font-size:0.85rem; font-weight:600; color:var(--primary); min-width:60px; text-align:center;">1 / 1</span>
            <button onclick="window.wbNextPage()" title="Следующая страница" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--text-muted);font-size:0.85rem;"><i class="fas fa-chevron-right"></i></button>
            <button onclick="window.wbAddPage()" title="Добавить страницу" style="height:32px;border-radius:8px;border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--cyan);padding:0 10px;font-size:0.8rem;gap:4px;" onmouseover="this.style.background='#e0f7fa'" onmouseout="this.style.background='var(--surface)'"><i class="fas fa-plus"></i> Стр.</button>
          </div>

          <div style="margin-left:auto;">
            <button onclick="window.wbSave()" class="btn btn-success btn-sm" style="border-radius:10px; padding:8px 20px; font-weight:600;"><i class="fas fa-save"></i> Сохранить доску</button>
          </div>
        </div>

        <!-- Canvas container -->
        <div style="border:2px solid var(--border); border-radius:12px; overflow:hidden; background:#fff;">
          <canvas id="wbCanvas" width="1100" height="600"></canvas>
        </div>
        `}
      </div>

      <!-- TESTS TAB -->
      <div id="tabTests" class="card" style="border-radius:0 14px 14px 14px; margin-top:0; display:none;">
        ${!lessonId ? '<p style="color:var(--text-muted); text-align:center; padding:40px;">Сначала сохраните урок во вкладке "Информация"</p>' : `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
          <h3 style="margin:0; color:var(--primary);">Тесты к уроку</h3>
          <button class="btn btn-success btn-sm" onclick="window.addTestQuestion()" style="border-radius:10px;"><i class="fas fa-plus"></i> Добавить вопрос</button>
        </div>
        <div id="testQuestionsArea"></div>
        `}
      </div>
    `;

    // Store lesson ID for saving
    window._currentLessonId = lessonId;

    // Init YouTube preview
    window.previewYoutube = () => {
      const url = document.getElementById('lessonYoutube').value;
      const ytId = extractYoutubeId(url);
      const prev = document.getElementById('ytPreview');
      if(ytId) {
        prev.innerHTML = `<div style="border-radius:12px; overflow:hidden; max-width:480px;"><iframe width="100%" height="270" src="https://www.youtube.com/embed/${ytId}" frameborder="0" allowfullscreen style="display:block;"></iframe></div>`;
      } else {
        prev.innerHTML = url ? '<span style="color:var(--text-muted); font-size:0.85rem;">Вставьте корректную ссылку на YouTube</span>' : '';
      }
    };
    window.previewYoutube();

    // Save lesson info
    window.saveLessonInfo = async () => {
      const title = document.getElementById('lessonTitle').value;
      const description = document.getElementById('lessonDesc').value;
      const video_url = document.getElementById('lessonYoutube').value;

      if(!title.trim()) return window.showToast('Введите название урока', 'error');

      try {
        if(window._currentLessonId) {
          await api.updateLesson(window._currentLessonId, { title, description, video_url });
          window.showToast('Урок обновлен', 'success');
        } else {
          const res = await api.createLesson({ title, description, video_url });
          window._currentLessonId = res.id;
          window.showToast('Урок создан! Теперь доступны доска и тесты', 'success');
        }
        
        // Check if there is a file selected
        const fileInput = document.getElementById('lessonFile');
        if (fileInput && fileInput.files.length > 0) {
          window.showToast('Загрузка файла...', 'info');
          // Fake event target to prevent crash in uploadLessonFile if it tries to use event
          await window.uploadLessonFile(true);
        } else {
          // Re-render to enable other tabs if no file was uploading
          await renderLessonEditor(window._currentLessonId);
        }
      } catch(err) { window.showToast(err.message, 'error'); }
    };

    window.uploadLessonFile = async (isAuto = false) => {
      if(!window._currentLessonId) return window.showToast('Сначала сохраните урок', 'error');
      const fileInput = document.getElementById('lessonFile');
      if(!fileInput.files.length) return window.showToast('Выберите файл', 'error');
      
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      
      let btn = null;
      let originalHtml = '';
      if (!isAuto && window.event && window.event.target) {
        btn = window.event.target.closest('button');
        if (btn) {
          originalHtml = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка и обработка...';
          btn.disabled = true;
        }
      }

      try {
        const res = await api.uploadLessonFile(window._currentLessonId, formData);
        window.showToast(res.message || 'Файл загружен', 'success');
        // Re-render editor to show the newly attached file
        await renderLessonEditor(window._currentLessonId);
      } catch(e) {
        window.showToast(e.message, 'error');
        if(btn) { btn.innerHTML = originalHtml; btn.disabled = false; }
      }
    };

    // Tab switching
    window.switchLessonTab = (tab) => {
      if(tab !== 'info' && !window._currentLessonId) {
        return window.showToast('Сначала создайте урок (нажмите "Создать урок" внизу)', 'error');
      }

      document.getElementById('tabInfo').style.display = tab === 'info' ? 'block' : 'none';
      document.getElementById('tabWhiteboard').style.display = tab === 'whiteboard' ? 'block' : 'none';
      document.getElementById('tabTests').style.display = tab === 'tests' ? 'block' : 'none';
      document.querySelectorAll('#lessonTabs button').forEach(b => {
        if(b.dataset.tab === tab) {
          b.style.background = 'var(--surface)';
          b.style.color = 'var(--primary)';
        } else {
          b.style.background = 'transparent';
          b.style.color = 'var(--text-muted)';
        }
      });
      if(tab === 'whiteboard' && lessonId) {
        setTimeout(() => initWhiteboard(lessonId, whiteboardData), 100);
      }
      if(tab === 'tests' && lessonId) {
        renderTestConstructor(existingTests);
      }
    };

    // Render tests if editing
    if(lessonId) {
      renderTestConstructor(existingTests);
    }
  }

const initWhiteboard = function(lessonId, savedPages) {
    if(_wbCanvas) {
      _wbCanvas.dispose();
      _wbCanvas = null;
    }

    const canvasEl = document.getElementById('wbCanvas');
    if(!canvasEl) return;

    _wbCanvas = new fabric.Canvas('wbCanvas', {
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true
    });

    // Init pages
    if(savedPages && savedPages.length > 0) {
      _wbPages = savedPages.map(p => typeof p === 'string' ? p : JSON.stringify(p));
    } else {
      _wbPages = [JSON.stringify({ objects: [], background: '#ffffff' })];
    }
    _wbCurrentPage = 0;
    _wbHistory = [];
    _wbRedoStack = [];
    _wbZoom = 1;

    // Load first page
    loadWbPage(0);
    updateWbPageInfo();

    // Track state changes for undo
    _wbCanvas.on('object:added', () => { if(!_wbSaving) saveWbState(); });
    _wbCanvas.on('object:modified', () => { if(!_wbSaving) saveWbState(); });
    _wbCanvas.on('object:removed', () => { if(!_wbSaving) saveWbState(); });

    // Shape drawing handlers
    _wbCanvas.on('mouse:down', wbMouseDown);
    _wbCanvas.on('mouse:move', wbMouseMove);
    _wbCanvas.on('mouse:up', wbMouseUp);

    wbSetTool('select');
  }

const saveWbState = function() {
    const json = JSON.stringify(_wbCanvas.toJSON());
    _wbHistory.push(json);
    if(_wbHistory.length > 50) _wbHistory.shift();
    _wbRedoStack = [];
  }

const loadWbPage = function(idx) {
    _wbSaving = true;
    if(_wbPages[idx]) {
      try {
        const data = typeof _wbPages[idx] === 'string' ? JSON.parse(_wbPages[idx]) : _wbPages[idx];
        _wbCanvas.loadFromJSON(data, () => {
          _wbCanvas.renderAll();
          _wbSaving = false;
          _wbHistory = [JSON.stringify(_wbCanvas.toJSON())];
          _wbRedoStack = [];
        });
      } catch(e) {
        _wbCanvas.clear();
        _wbCanvas.backgroundColor = '#ffffff';
        _wbCanvas.renderAll();
        _wbSaving = false;
      }
    } else {
      _wbCanvas.clear();
      _wbCanvas.backgroundColor = '#ffffff';
      _wbCanvas.renderAll();
      _wbSaving = false;
    }
  }

const saveCurrentPageData = function() {
    if(_wbCanvas) {
      _wbPages[_wbCurrentPage] = JSON.stringify(_wbCanvas.toJSON());
    }
  }

const updateWbPageInfo = function() {
    const el = document.getElementById('wbPageInfo');
    if(el) el.textContent = `${_wbCurrentPage + 1} / ${_wbPages.length}`;
  }

const wbSetTool = (tool) => {
    _wbTool = tool;
    if(!_wbCanvas) return;

    // Update toolbar active states
    document.querySelectorAll('.wb-tool').forEach(btn => {
      if(btn.dataset.tool === tool) {
        btn.style.background = 'var(--primary)';
        btn.style.color = '#fff';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text-muted)';
      }
    });

    _wbCanvas.isDrawingMode = (tool === 'draw');
    _wbCanvas.selection = (tool === 'select');

    if(tool === 'draw') {
      const sw = parseInt(document.getElementById('wbStrokeWidth').value) || 2;
      _wbCanvas.freeDrawingBrush.color = document.getElementById('wbStroke').value;
      _wbCanvas.freeDrawingBrush.width = sw;
    }

    if(tool === 'select') {
      _wbCanvas.forEachObject(o => { o.selectable = true; o.evented = true; });
    } else {
      _wbCanvas.forEachObject(o => { o.selectable = (tool === 'select'); o.evented = (tool === 'select'); });
      _wbCanvas.discardActiveObject();
      _wbCanvas.renderAll();
    }
  };

const wbUpdateStrokeWidth = () => {
    if(_wbCanvas && _wbCanvas.isDrawingMode) {
      _wbCanvas.freeDrawingBrush.width = parseInt(document.getElementById('wbStrokeWidth').value) || 2;
    }
  };

const getWbPointer = function(e) {
    return _wbCanvas.getPointer(e.e);
  }

const wbMouseDown = function(e) {
    if(_wbTool === 'select' || _wbTool === 'draw') return;
    const pointer = getWbPointer(e);
    _wbIsDrawingShape = true;
    _wbShapeStart = { x: pointer.x, y: pointer.y };

    const stroke = document.getElementById('wbStroke').value;
    const fill = document.getElementById('wbFill').value;
    const sw = parseInt(document.getElementById('wbStrokeWidth').value) || 2;

    _wbSaving = true;

    if(_wbTool === 'rect') {
      _wbTempShape = new fabric.Rect({ left: pointer.x, top: pointer.y, width: 1, height: 1, fill: fill, stroke: stroke, strokeWidth: sw, selectable: false });
    } else if(_wbTool === 'circle') {
      _wbTempShape = new fabric.Ellipse({ left: pointer.x, top: pointer.y, rx: 1, ry: 1, fill: fill, stroke: stroke, strokeWidth: sw, selectable: false });
    } else if(_wbTool === 'triangle') {
      _wbTempShape = new fabric.Triangle({ left: pointer.x, top: pointer.y, width: 1, height: 1, fill: fill, stroke: stroke, strokeWidth: sw, selectable: false });
    } else if(_wbTool === 'line') {
      _wbTempShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], { stroke: stroke, strokeWidth: sw, selectable: false });
    } else if(_wbTool === 'arrow') {
      _wbTempShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], { stroke: stroke, strokeWidth: sw, selectable: false });
      _wbTempShape._isArrow = true;
    } else if(_wbTool === 'text') {
      _wbSaving = false;
      _wbIsDrawingShape = false;
      const text = new fabric.IText('Текст', { left: pointer.x, top: pointer.y, fontSize: 20, fill: stroke, fontFamily: 'Inter, sans-serif', selectable: true });
      _wbCanvas.add(text);
      _wbCanvas.setActiveObject(text);
      text.enterEditing();
      return;
    } else if(_wbTool === 'star') {
      _wbTempShape = createStar(pointer.x, pointer.y, 5, 1, 0.5, fill, stroke, sw);
    }

    if(_wbTempShape) {
      _wbCanvas.add(_wbTempShape);
    }
  }

const wbMouseMove = function(e) {
    if(!_wbIsDrawingShape || !_wbTempShape) return;
    const pointer = getWbPointer(e);
    const dx = pointer.x - _wbShapeStart.x;
    const dy = pointer.y - _wbShapeStart.y;

    if(_wbTool === 'rect') {
      _wbTempShape.set({ width: Math.abs(dx), height: Math.abs(dy), left: dx < 0 ? pointer.x : _wbShapeStart.x, top: dy < 0 ? pointer.y : _wbShapeStart.y });
    } else if(_wbTool === 'circle') {
      _wbTempShape.set({ rx: Math.abs(dx) / 2, ry: Math.abs(dy) / 2, left: Math.min(pointer.x, _wbShapeStart.x), top: Math.min(pointer.y, _wbShapeStart.y) });
    } else if(_wbTool === 'triangle') {
      _wbTempShape.set({ width: Math.abs(dx), height: Math.abs(dy), left: dx < 0 ? pointer.x : _wbShapeStart.x, top: dy < 0 ? pointer.y : _wbShapeStart.y });
    } else if(_wbTool === 'line' || _wbTool === 'arrow') {
      _wbTempShape.set({ x2: pointer.x, y2: pointer.y });
    } else if(_wbTool === 'star') {
      const dist = Math.sqrt(dx * dx + dy * dy);
      _wbCanvas.remove(_wbTempShape);
      const stroke = document.getElementById('wbStroke').value;
      const fill = document.getElementById('wbFill').value;
      const sw = parseInt(document.getElementById('wbStrokeWidth').value) || 2;
      _wbTempShape = createStar(_wbShapeStart.x, _wbShapeStart.y, 5, dist, dist * 0.45, fill, stroke, sw);
      _wbCanvas.add(_wbTempShape);
    }
    _wbCanvas.renderAll();
  }

const wbMouseUp = function(e) {
    if(!_wbIsDrawingShape) return;
    _wbIsDrawingShape = false;

    if(_wbTempShape && _wbTempShape._isArrow) {
      // Add arrowhead
      const x1 = _wbTempShape.x1, y1 = _wbTempShape.y1, x2 = _wbTempShape.x2, y2 = _wbTempShape.y2;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 15;
      const stroke = _wbTempShape.stroke;
      const sw = _wbTempShape.strokeWidth;

      const arrowHead = new fabric.Triangle({
        left: x2, top: y2, width: headLen, height: headLen,
        fill: stroke, stroke: stroke, strokeWidth: 1,
        angle: (angle * 180 / Math.PI) + 90,
        originX: 'center', originY: 'center',
        selectable: false
      });
      const group = new fabric.Group([_wbTempShape, arrowHead], { selectable: true });
      _wbCanvas.remove(_wbTempShape);
      _wbCanvas.add(group);
    }

    if(_wbTempShape) {
      _wbTempShape.selectable = true;
      _wbTempShape.evented = true;
    }

    _wbTempShape = null;
    _wbSaving = false;
    saveWbState();
    _wbCanvas.renderAll();
  }

const createStar = function(cx, cy, points, outerR, innerR, fill, stroke, sw) {
    const path = [];
    for(let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / points) * i - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      path.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    path.push('Z');
    return new fabric.Path(path.join(' '), { fill: fill, stroke: stroke, strokeWidth: sw, selectable: false, originX: 'center', originY: 'center' });
  }

const wbUndo = () => {
    if(!_wbCanvas || _wbHistory.length <= 1) return;
    _wbRedoStack.push(_wbHistory.pop());
    const prev = _wbHistory[_wbHistory.length - 1];
    _wbSaving = true;
    _wbCanvas.loadFromJSON(JSON.parse(prev), () => { _wbCanvas.renderAll(); _wbSaving = false; });
  };

const wbRedo = () => {
    if(!_wbCanvas || _wbRedoStack.length === 0) return;
    const next = _wbRedoStack.pop();
    _wbHistory.push(next);
    _wbSaving = true;
    _wbCanvas.loadFromJSON(JSON.parse(next), () => { _wbCanvas.renderAll(); _wbSaving = false; });
  };

const wbDeleteSelected = () => {
    if(!_wbCanvas) return;
    const active = _wbCanvas.getActiveObjects();
    if(active.length) {
      active.forEach(o => _wbCanvas.remove(o));
      _wbCanvas.discardActiveObject();
      _wbCanvas.renderAll();
    }
  };

const wbClearAll = () => {
    if(!_wbCanvas) return;
    if(!confirm('Очистить всю страницу?')) return;
    _wbCanvas.clear();
    _wbCanvas.backgroundColor = '#ffffff';
    _wbCanvas.renderAll();
    saveWbState();
  };

const wbZoomIn = () => {
    if(!_wbCanvas) return;
    _wbZoom = Math.min(_wbZoom + 0.1, 3);
    _wbCanvas.setZoom(_wbZoom);
    _wbCanvas.setWidth(1100 * _wbZoom);
    _wbCanvas.setHeight(600 * _wbZoom);
    _wbCanvas.renderAll();
    const el = document.getElementById('wbZoomLevel');
    if(el) el.textContent = Math.round(_wbZoom * 100) + '%';
  };

const wbZoomOut = () => {
    if(!_wbCanvas) return;
    _wbZoom = Math.max(_wbZoom - 0.1, 0.3);
    _wbCanvas.setZoom(_wbZoom);
    _wbCanvas.setWidth(1100 * _wbZoom);
    _wbCanvas.setHeight(600 * _wbZoom);
    _wbCanvas.renderAll();
    const el = document.getElementById('wbZoomLevel');
    if(el) el.textContent = Math.round(_wbZoom * 100) + '%';
  };

const wbPrevPage = () => {
    if(_wbCurrentPage <= 0) return;
    saveCurrentPageData();
    _wbCurrentPage--;
    loadWbPage(_wbCurrentPage);
    updateWbPageInfo();
  };

const wbNextPage = () => {
    if(_wbCurrentPage >= _wbPages.length - 1) return;
    saveCurrentPageData();
    _wbCurrentPage++;
    loadWbPage(_wbCurrentPage);
    updateWbPageInfo();
  };

const wbAddPage = () => {
    saveCurrentPageData();
    _wbPages.push(JSON.stringify({ objects: [], background: '#ffffff' }));
    _wbCurrentPage = _wbPages.length - 1;
    loadWbPage(_wbCurrentPage);
    updateWbPageInfo();
    window.showToast(`Страница ${_wbPages.length} добавлена`, 'success');
  };

const wbSave = async () => {
    if(!window._currentLessonId) return window.showToast('Сначала сохраните урок', 'error');
    saveCurrentPageData();
    try {
      await api.saveLessonWhiteboard(window._currentLessonId, { pages: _wbPages });
      window.showToast('Доска сохранена', 'success');
    } catch(err) { window.showToast(err.message, 'error'); }
  };

const renderTestConstructor = function(existingTests) {
    const area = document.getElementById('testQuestionsArea');
    if(!area) return;

    window._testQuestions = existingTests.map(t => ({
      id: t.id,
      question: t.question,
      options: typeof t.options_json === 'string' ? JSON.parse(t.options_json) : (t.options || []),
      correct_index: t.correct_index
    }));

    if(typeof window.renderTestQuestions === 'function') {
      window.renderTestQuestions();
    }
  }

const _loadLessonView = (viewId, title) => {
    window.loadView(viewId, title, null);
  };



// Экспорты
window.renderMyLessons = renderMyLessons;
window.deleteLesson = deleteLesson;
window.extractYoutubeId = extractYoutubeId;
window.renderAllLessons = renderAllLessons;
window.renderSavedLessons = renderSavedLessons;
window.renderAboutMe = renderAboutMe;
window.saveAboutMe = saveAboutMe;
window.renderLessonEditor = renderLessonEditor;
window.initWhiteboard = initWhiteboard;
window.saveWbState = saveWbState;
window.loadWbPage = loadWbPage;
window.saveCurrentPageData = saveCurrentPageData;
window.updateWbPageInfo = updateWbPageInfo;
window.wbSetTool = wbSetTool;
window.wbUpdateStrokeWidth = wbUpdateStrokeWidth;
window.getWbPointer = getWbPointer;
window.wbMouseDown = wbMouseDown;
window.wbMouseMove = wbMouseMove;
window.wbMouseUp = wbMouseUp;
window.createStar = createStar;
window.wbUndo = wbUndo;
window.wbRedo = wbRedo;
window.wbDeleteSelected = wbDeleteSelected;
window.wbClearAll = wbClearAll;
window.wbZoomIn = wbZoomIn;
window.wbZoomOut = wbZoomOut;
window.wbPrevPage = wbPrevPage;
window.wbNextPage = wbNextPage;
window.wbAddPage = wbAddPage;
window.wbSave = wbSave;
window.renderTestConstructor = renderTestConstructor;
window._loadLessonView = _loadLessonView;
