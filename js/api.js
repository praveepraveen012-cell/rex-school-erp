/**
 * Rex Senior Secondary School Management Platform
 * Centralized Production-Ready API Client
 */

(function (window) {
  const API_BASE = '/api';

  const Api = {
    // ------------------------------------------------------------------------
    // Token & Session Storage
    // ------------------------------------------------------------------------
    getToken() {
      return localStorage.getItem('rex_auth_token');
    },

    setToken(token) {
      if (token) {
        localStorage.setItem('rex_auth_token', token);
      } else {
        localStorage.removeItem('rex_auth_token');
      }
    },

    getUser() {
      try {
        const u = localStorage.getItem('rex_user');
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
      }
    },

    setUser(user) {
      if (user) {
        localStorage.setItem('rex_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('rex_user');
      }
    },

    getActiveStudent() {
      try {
        const s = localStorage.getItem('rex_active_student');
        return s ? JSON.parse(s) : null;
      } catch (e) {
        return null;
      }
    },

    setActiveStudent(student) {
      if (student) {
        localStorage.setItem('rex_active_student', JSON.stringify(student));
      } else {
        localStorage.removeItem('rex_active_student');
      }
    },

    isAuthenticated() {
      return !!this.getToken() && !!this.getUser();
    },

    // ------------------------------------------------------------------------
    // HTTP Request Wrapper
    // ------------------------------------------------------------------------
    async request(endpoint, options = {}) {
      const url = `${API_BASE}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };

      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const response = await fetch(url, {
          ...options,
          headers
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          // Token expired or invalid
          if (response.status === 401 && this.isAuthenticated()) {
            this.setToken(null);
            this.setUser(null);
            this.showToast('Session expired. Please log in again.', 'warning');
            if (window.AuthUI) {
              window.AuthUI.showLoginModal();
            }
          }
          const err = new Error(data.error || `Request failed with status ${response.status}`);
          err.status = response.status;
          err.data = data;
          throw err;
        }

        return data;
      } catch (err) {
        if (!options.silent) {
          console.error(`API Error [${endpoint}]:`, err.message);
        }
        throw err;
      }
    },

    // ------------------------------------------------------------------------
    // Authentication Endpoints
    // ------------------------------------------------------------------------
    async loginAdmin(emailOrUsername, password) {
      const data = await this.request('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ emailOrUsername, password })
      });
      this.setToken(data.token);
      this.setUser(data.user);
      return data;
    },

    async sendTeacherOtp(mobile) {
      return await this.request('/auth/teacher/send-otp', {
        method: 'POST',
        body: JSON.stringify({ mobile })
      });
    },

    async verifyTeacherOtp(mobile, otp) {
      const data = await this.request('/auth/teacher/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ mobile, otp })
      });
      this.setToken(data.token);
      this.setUser(data.user);
      localStorage.setItem('rex_teacher_profile', JSON.stringify(data.teacher));
      return data;
    },

    async loginParent(admissionNo, parentMobile, password = null) {
      const data = await this.request('/auth/parent/login', {
        method: 'POST',
        body: JSON.stringify({ admissionNo, parentMobile, password })
      });
      this.setToken(data.token);
      this.setUser(data.user);
      localStorage.setItem('rex_parent_profile', JSON.stringify(data.parent));
      localStorage.setItem('rex_parent_students', JSON.stringify(data.students || []));
      this.setActiveStudent(data.activeStudent || (data.students && data.students[0]));
      return data;
    },

    async logout() {
      try {
        if (this.getToken()) {
          await this.request('/auth/logout', { method: 'POST', silent: true });
        }
      } catch (e) {}
      this.setToken(null);
      this.setUser(null);
      this.setActiveStudent(null);
      localStorage.removeItem('rex_teacher_profile');
      localStorage.removeItem('rex_parent_profile');
      localStorage.removeItem('rex_parent_students');
      window.location.reload();
    },

    // ------------------------------------------------------------------------
    // Dashboard & Stats
    // ------------------------------------------------------------------------
    async getDashboardStats(studentId = null) {
      let query = '';
      if (studentId) query = `?studentId=${studentId}`;
      return await this.request(`/dashboard/stats${query}`);
    },

    // ------------------------------------------------------------------------
    // Students CRUD
    // ------------------------------------------------------------------------
    async getStudents(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return await this.request(`/students${qs ? '?' + qs : ''}`);
    },

    async getStudentById(id) {
      return await this.request(`/students/${id}`);
    },

    async createStudent(payload) {
      return await this.request('/students', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    async updateStudent(id, payload) {
      return await this.request(`/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },

    async deleteStudent(id) {
      return await this.request(`/students/${id}`, { method: 'DELETE' });
    },

    // ------------------------------------------------------------------------
    // Teachers CRUD & Assignments
    // ------------------------------------------------------------------------
    async getTeachers() {
      return await this.request('/teachers');
    },

    async createTeacher(payload) {
      return await this.request('/teachers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    async updateTeacher(id, payload) {
      return await this.request(`/teachers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },

    async deleteTeacher(id) {
      return await this.request(`/teachers/${id}`, { method: 'DELETE' });
    },

    async assignTeacherClass(teacherId, payload) {
      return await this.request(`/teachers/${teacherId}/assignments`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    // ------------------------------------------------------------------------
    // Attendance Endpoints
    // ------------------------------------------------------------------------
    async getAttendance(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return await this.request(`/attendance${qs ? '?' + qs : ''}`);
    },

    async getAttendanceSheet(classId, sectionId, date) {
      return await this.request(`/attendance/sheet?classId=${classId}&sectionId=${sectionId}&date=${date}`);
    },

    async submitAttendance(payload) {
      return await this.request('/attendance', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    // ------------------------------------------------------------------------
    // Classes & Sections
    // ------------------------------------------------------------------------
    async getClasses() {
      return await this.request('/classes');
    },

    async getSections(classId) {
      return await this.request(`/classes/${classId}/sections`);
    },

    // ------------------------------------------------------------------------
    // Events Endpoints
    // ------------------------------------------------------------------------
    async getEvents() {
      return await this.request('/events');
    },

    async createEvent(payload) {
      return await this.request('/events', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    // ------------------------------------------------------------------------
    // Notifications Endpoints
    // ------------------------------------------------------------------------
    async getNotifications() {
      return await this.request('/notifications');
    },

    async getUnreadNotificationCount() {
      return await this.request('/notifications/unread-count');
    },

    async markNotificationRead(id) {
      return await this.request(`/notifications/${id}/read`, { method: 'PUT' });
    },

    async markAllNotificationsRead() {
      return await this.request('/notifications/read-all', { method: 'PUT' });
    },

    async createNotification(payload) {
      return await this.request('/notifications', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    // ------------------------------------------------------------------------
    // Settings & Audit Logs
    // ------------------------------------------------------------------------
    async getSettings() {
      return await this.request('/settings');
    },

    async updateSettings(payload) {
      return await this.request('/settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },

    async getAuditLogs(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return await this.request(`/audit-logs${qs ? '?' + qs : ''}`);
    },

    // ------------------------------------------------------------------------
    // UI Notification Toast
    // ------------------------------------------------------------------------
    showToast(message, type = 'info') {
      let container = document.getElementById('rex-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'rex-toast-container';
        container.style.cssText = `
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 99999;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        `;
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.style.cssText = `
        padding: 12px 18px;
        border-radius: 8px;
        color: white;
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 14px rgba(0,0,0,0.18);
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(10px);
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      if (type === 'success') {
        toast.style.backgroundColor = '#059669';
        toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
      } else if (type === 'error') {
        toast.style.backgroundColor = '#DC2626';
        toast.innerHTML = `<span>⚠</span> <span>${message}</span>`;
      } else if (type === 'warning') {
        toast.style.backgroundColor = '#D97706';
        toast.innerHTML = `<span>⚡</span> <span>${message}</span>`;
      } else {
        toast.style.backgroundColor = '#1E3A8A';
        toast.innerHTML = `<span>ℹ</span> <span>${message}</span>`;
      }

      container.appendChild(toast);
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 350);
      }, 4000);
    }
  };

  window.RexApi = Api;
})(window);
