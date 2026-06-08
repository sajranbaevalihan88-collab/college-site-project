// Уведомления и toast-сообщения

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
window.showToast = showToast;

async function loadNotifications() {
  try {
    const notifs = await api.getNotifications();
    const countEl = document.getElementById('notifCount');
    if (notifs.length > 0) {
      countEl.style.display = 'block';
      countEl.textContent = notifs.length;
    } else {
      countEl.style.display = 'none';
    }

    document.getElementById('notificationBell').onclick = () => {
      let html = '';
      if (['ADMIN', 'DIRECTOR', 'DEPUTY'].includes(window.user.role)) {
        html += `
          <div style="margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:15px;">
            <h4 style="margin-bottom:10px;">Отправить уведомление</h4>
            <input type="text" id="notifTitle" class="form-control" placeholder="Заголовок" style="margin-bottom:10px;">
            <textarea id="notifMessage" class="form-control" placeholder="Текст уведомления" style="margin-bottom:10px;"></textarea>
            <select id="notifTarget" class="form-select" style="margin-bottom:10px;">
              <option value="ALL">Всем</option>
              <option value="STUDENTS">Студентам</option>
              <option value="TEACHERS">Преподавателям</option>
            </select>
            <button class="btn btn-success" onclick="window.sendNotif()">Отправить</button>
          </div>
        `;
      }
      if (notifs.length === 0) {
        html += '<p>Уведомлений нет.</p>';
      } else {
        notifs.forEach(n => {
          html += `
            <div style="background:#f8fafc;padding:10px;border-radius:6px;border-left:4px solid var(--primary);margin-bottom:10px;">
              <div style="font-weight:bold;">${n.title}</div>
              <div style="font-size:0.9rem;margin-top:5px;">${n.message}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:5px;">${new Date(n.created_at).toLocaleString()}</div>
            </div>
          `;
        });
      }
      window.openModal('Уведомления', html);
    };
  } catch (err) {
    console.error('Ошибка загрузки уведомлений:', err);
  }
}
window.loadNotifications = loadNotifications;

window.sendNotif = async () => {
  const title = document.getElementById('notifTitle').value.trim();
  const message = document.getElementById('notifMessage').value.trim();
  const target = document.getElementById('notifTarget').value;
  if (!title || !message) return showToast('Заполните все поля', 'error');
  try {
    await api.sendNotification({ title, message, target_audience: target });
    showToast('Уведомление отправлено', 'success');
    document.getElementById('modalOverlay').classList.remove('active');
    await loadNotifications();
  } catch (err) {
    showToast(err.message, 'error');
  }
};
