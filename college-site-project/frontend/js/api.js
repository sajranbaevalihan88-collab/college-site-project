// тут все апи методы
const API_URL = '/api';

class Api {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  async request(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);
    // console.log('api request:', endpoint);

    try {
      var res = await fetch(`${API_URL}${endpoint}`, config);
      var data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login.html';
        }
        throw new Error(data.error || 'Ошибка запроса');
      }
      return data;
    } catch(e) {
      throw e;
    }
  }

  getStats() { return this.request('/dashboard/stats'); }

  getUsers(role = '') { return this.request(`/users?role=${role}`); }
  getPendingStudents() { return this.request('/users/pending'); }
  approveUser(id) { return this.request(`/users/${id}/approve`, 'PUT'); }
  deleteUser(id) { return this.request(`/users/${id}`, 'DELETE'); }
  
  // get_users_old() {
  //   return fetch('/api/users').then(r=>r.json())
  // }

  getGroups() { return this.request('/groups'); }
  createGroup(data) { return this.request('/groups', 'POST', data); }
  getGroupStudents(id) { return this.request(`/groups/${id}/students`); }
  // TODO: добавить пагинацию
  getStudents() { return this.request('/students'); }
  assignGroup(studentId, groupId) { return this.request(`/students/${studentId}/assign-group`, 'PUT', { group_id: groupId }); }

  getSubjects() { return this.request('/subjects'); }
  createSubject(data) { return this.request('/subjects', 'POST', data); }

  // хелпер для расписания
  getSchedule(filters = '') { return this.request(`/schedule${filters}`); }
  createSchedule(data) { return this.request('/schedule', 'POST', data); }
  // getScheduleOld(id) { return this.request('/schedule/' + id); } // не юзается уже
  getScheduleMedia() { return this.request('/schedule/media'); }
  uploadScheduleMedia(formData) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return fetch(`${API_URL}/schedule/media`, {
      method: 'POST',
      headers,
      body: formData
    }).then(res => res.json());
  }
  deleteScheduleMedia(id) { return this.request(`/schedule/media/${id}`, 'DELETE'); }


  getGrades(filters = '') { return this.request(`/grades${filters}`); }
  addGrade(data) { return this.request('/grades', 'POST', data); }
  getMyAverage() { return this.request('/grades/my-average'); }
  getAttendance(filters = '') { return this.request(`/attendance${filters}`); }
  markAttendance(records) { return this.request('/attendance', 'POST', { records }); }
  getMyStats() { return this.request('/attendance/my-stats'); }

  getNotifications() { return this.request('/notifications'); }
  sendNotification(data) { return this.request('/notifications', 'POST', data); }

  createEmployee(data) { return this.request('/users/employee', 'POST', data); }
  updateRole(id, role) { return this.request(`/users/${id}/role`, 'PUT', { role }); }
  updateCurator(groupId, teacherId) { return this.request(`/groups/${groupId}/curator`, 'PUT', { curator_id: teacherId }); }
  getTeacherAccess(teacherId) { return this.request(`/users/${teacherId}/access`); }
  updateTeacherAccess(teacherId, groupIds) { return this.request(`/users/${teacherId}/access`, 'PUT', { group_ids: groupIds }); }

  getLessons() { return this.request('/lessons'); }
  getMyLessons() { return this.request('/lessons/my'); }
  getLesson(id) { return this.request('/lessons/' + id); }
  createLesson(data) { return this.request('/lessons', 'POST', data); }
  updateLesson(id, data) { return this.request('/lessons/' + id, 'PUT', data); }
  deleteLesson(id) { return this.request('/lessons/' + id, 'DELETE'); }
  getLessonWhiteboard(id) { return this.request('/lessons/' + id + '/whiteboard'); }
  saveLessonWhiteboard(id, data) { return this.request('/lessons/' + id + '/whiteboard', 'POST', data); }
  uploadLessonFile(id, formData) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return fetch(`${API_URL}/lessons/${id}/upload`, {
      method: 'POST',
      headers,
      body: formData
    }).then(function(res) { 
      return res.json().then(data => {
        if(!res.ok) throw new Error(data.error || 'Upload error');
        return data;
      });
    });

  }
  getLessonTests(id) { return this.request('/lessons/' + id + '/tests'); }
  addLessonTest(id, data) { return this.request('/lessons/' + id + '/tests', 'POST', data); }
  deleteLessonTest(testId) { return this.request('/lessons/tests/' + testId, 'DELETE'); }
  toggleLessonLike(id) { return this.request('/lessons/' + id + '/like', 'POST'); }
  toggleLessonSave(id) { return this.request('/lessons/' + id + '/save', 'POST'); }
  addLessonComment(id, data) { return this.request('/lessons/' + id + '/comment', 'POST', data); }
  getLessonComments(id) { return this.request('/lessons/' + id + '/comments'); }
  getSavedLessons() { return this.request('/lessons/user/saved'); }
}

const api = new Api();
