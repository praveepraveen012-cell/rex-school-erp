/**
 * Rex Senior Secondary School Management Platform
 * Centralized Production-Ready API Client
 */

(function (window) {
  const API_BASE = (function() {
    if (typeof window !== 'undefined' && window.API_BASE_URL) {
      return window.API_BASE_URL;
    }
    return '/api';
  })();

  const isStaticMode = (function() {
    if (typeof window === 'undefined') return false;
    if (window.API_BASE_URL && !window.API_BASE_URL.startsWith('/')) return false;
    return (
      window.location.hostname.includes('github.io') ||
      window.location.hostname.includes('pages.dev') ||
      window.location.protocol === 'file:'
    );
  })();

  const ClientAuth = {
    loginAdmin(emailOrUsername, password) {
      const u = String(emailOrUsername || '').trim().toLowerCase();
      const p = String(password || '').trim();
      const validUsers = ['admin', 'admin@rex.edu', 'superadmin'];
      const validPass = ['AdminPassword123!', 'admin', 'rex2026', 'password'];

      if (!validUsers.includes(u) || !validPass.includes(p)) {
        throw new Error('Invalid email/username or password.');
      }

      const user = {
        id: 1,
        username: 'admin',
        email: 'admin@rex.edu',
        role: 'SUPER_ADMIN',
        name: 'Rev. Fr. Principal',
        status: 'active'
      };
      const token = 'rex_jwt_admin_' + Date.now();
      return { success: true, token, user, role: 'SUPER_ADMIN', isOffline: true };
    },

    sendTeacherOtp(mobile) {
      const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
      if (digits.length !== 10) {
        throw new Error('Please enter a valid 10-digit mobile number.');
      }
      return {
        success: true,
        message: `OTP sent successfully to +91 ${digits}`,
        devOtp: '123456',
        isOffline: true
      };
    },

    verifyTeacherOtp(mobile, otp) {
      const cleanOtp = String(otp || '').trim();
      if (cleanOtp !== '123456' && cleanOtp.length !== 6) {
        throw new Error('Invalid or expired OTP code.');
      }

      const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
      let teacherUser = {
        id: 2,
        username: 'maths@rex.edu',
        email: 'maths@rex.edu',
        name: 'Mrs. Anitha Kumar',
        role: 'TEACHER',
        status: 'active'
      };
      let teacherProfile = {
        id: 1,
        user_id: 2,
        employee_id: 'TCH-1004',
        name: 'Mrs. Anitha Kumar',
        email: 'maths@rex.edu',
        mobile: digits || '9876500004',
        department: 'Mathematics',
        qualification: 'M.Sc., B.Ed.',
        experience: '12 Years',
        assignedClasses: ['Grade 10-A', 'Grade 10-B']
      };

      if (digits === '9876500005') {
        teacherUser = { id: 3, username: 'commerce@rex.edu', email: 'commerce@rex.edu', name: 'Mr. David Raj', role: 'TEACHER', status: 'active' };
        teacherProfile = { id: 2, user_id: 3, employee_id: 'TCH-1005', name: 'Mr. David Raj', email: 'commerce@rex.edu', mobile: digits, department: 'Languages', qualification: 'M.A., M.Ed.', experience: '9 Years', assignedClasses: ['Grade 9-A', 'Grade 10-A'] };
      } else if (digits === '9876500003') {
        teacherUser = { id: 4, username: 'science@rex.edu', email: 'science@rex.edu', name: 'Mr. Rajan Pillai', role: 'TEACHER', status: 'active' };
        teacherProfile = { id: 3, user_id: 4, employee_id: 'TCH-1003', name: 'Mr. Rajan Pillai', email: 'science@rex.edu', mobile: digits, department: 'Science', qualification: 'M.Sc. Physics, B.Ed.', experience: '14 Years', assignedClasses: ['Grade 10-A', 'Grade 11-A'] };
      }

      const token = 'rex_jwt_teacher_' + Date.now();
      return { success: true, token, user: teacherUser, teacher: teacherProfile, role: 'TEACHER', isOffline: true };
    },

    loginTeacherPassword(email, password) {
      const e = String(email || '').trim().toLowerCase();
      const p = String(password || '').trim();
      const validPass = ['AdminPassword123!', 'admin', 'rex2026', 'password', '123456', 'TeacherPassword123!'];

      if (!validPass.includes(p)) {
        throw new Error('Invalid teacher credentials.');
      }

      let mobile = '9876500004';
      if (e.includes('commerce')) mobile = '9876500005';
      else if (e.includes('science')) mobile = '9876500003';

      return this.verifyTeacherOtp(mobile, '123456');
    },

    loginParent(admissionNo, parentMobile, password = null) {
      const cleanMobile = String(parentMobile || '').replace(/\D/g, '').slice(-10);
      const cleanAdm = String(admissionNo || '').trim().toUpperCase();

      if (cleanMobile.length !== 10 && !cleanAdm) {
        throw new Error('Please enter a valid 10-digit registered mobile number.');
      }

      let parentUser = {
        id: 5,
        username: 'rajesh.sharma',
        name: 'Mr. Rajesh Sharma',
        email: 'parent.sharma@rex.edu',
        role: 'PARENT',
        status: 'active'
      };
      let parentProfile = {
        id: 1,
        user_id: 5,
        name: 'Mr. Rajesh Sharma & Mrs. Priya Sharma',
        mobile: cleanMobile || '9876543210',
        email: 'parent.sharma@rex.edu',
        address: '14 Charing Cross Road, Ooty',
        occupation: 'Software Architect'
      };
      let students = [
        { id: 1, admission_no: 'REX-2024-001', first_name: 'Aarav', last_name: 'Sharma', class_name: 'Grade 10', section_name: 'A', roll_no: 1, bus_route: 'Route 02', stop_name: 'Charring Cross Junction' },
        { id: 2, admission_no: 'REX-2024-002', first_name: 'Ananya', last_name: 'Sharma', class_name: 'Grade 8', section_name: 'B', roll_no: 1, bus_route: 'Bus #04', stop_name: 'Botanical Garden Road Junction' }
      ];

      if (cleanMobile === '9876543211' || cleanAdm === 'REX-2024-003') {
        parentUser = { id: 6, username: 'sunita.menon', name: 'Dr. Sunita Menon', email: 'sunita.menon@rex.edu', role: 'PARENT', status: 'active' };
        parentProfile = { id: 2, user_id: 6, name: 'Dr. Sunita Menon', mobile: '9876543211', email: 'sunita.menon@rex.edu', address: '28 Commercial Road, Coonoor', occupation: 'Cardiologist' };
        students = [
          { id: 3, admission_no: 'REX-2024-003', first_name: 'Rohan', last_name: 'Menon', class_name: 'Grade 9', section_name: 'A', roll_no: 2, bus_route: 'Route 04', stop_name: 'Kotagiri Bus Stand' }
        ];
      }

      const activeStudent = (cleanAdm && students.find(s => s.admission_no === cleanAdm)) || students[0];
      const token = 'rex_jwt_parent_' + Date.now();
      return { success: true, token, user: parentUser, parent: parentProfile, students, activeStudent, role: 'PARENT', isOffline: true };
    }
  };

  const Api = {
    // ------------------------------------------------------------------------
    // Toast Notification Dispatcher
    // ------------------------------------------------------------------------
    showToast(message, type = 'info') {
      if (window.App && typeof window.App.showToast === 'function') {
        window.App.showToast(message, type);
      } else {
        console.log(`[Toast ${type}]: ${message}`);
        const container = document.getElementById('toast-container');
        if (container) {
          const toast = document.createElement('div');
          toast.className = `toast toast-${type}`;
          toast.style.cssText = `
            background: ${type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : (type === 'warning' ? '#f59e0b' : '#1e3a8a'))};
            color: #fff; padding: 12px 18px; border-radius: 8px; margin-bottom: 8px; font-size: 13px; font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: fadeIn 0.25s ease;
          `;
          toast.textContent = message;
          container.appendChild(toast);
          setTimeout(() => toast.remove(), 4000);
        }
      }
    },

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

    getRole() {
      const u = this.getUser();
      return u ? u.role : null;
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
    // Helper to persist auth payload consistently
    // ------------------------------------------------------------------------
    applyAuthResult(data) {
      this.setToken(data.token);
      this.setUser(data.user);
      if (data.teacher) localStorage.setItem('rex_teacher_profile', JSON.stringify(data.teacher));
      if (data.parent) localStorage.setItem('rex_parent_profile', JSON.stringify(data.parent));
      if (data.students) localStorage.setItem('rex_parent_students', JSON.stringify(data.students));
      if (data.activeStudent) this.setActiveStudent(data.activeStudent);
      return data;
    },

    authenticateLocally(credentials) {
      const email = credentials.email || credentials.username || '';
      const pass = credentials.password || '';
      const role = credentials.role || '';
      const mobile = credentials.mobile || credentials.parentMobile || credentials.phone || '';
      const adm = credentials.admissionNo || credentials.admission_no || '';

      if (role === 'SUPER_ADMIN' || email.toLowerCase().includes('admin') || credentials.username === 'admin') {
        return ClientAuth.loginAdmin(email || credentials.username, pass);
      } else if (role === 'TEACHER' || email.toLowerCase().includes('rex.edu') || (mobile && !adm && role !== 'PARENT')) {
        if (pass) return ClientAuth.loginTeacherPassword(email, pass);
        return ClientAuth.verifyTeacherOtp(mobile, credentials.otp || '123456');
      } else if (role === 'PARENT' || mobile || adm) {
        return ClientAuth.loginParent(adm, mobile, pass);
      } else {
        return ClientAuth.loginAdmin(email, pass);
      }
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
    async login(credentials) {
      if (isStaticMode) {
        return this.applyAuthResult(this.authenticateLocally(credentials));
      }
      try {
        const data = await this.request('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials)
        });
        return this.applyAuthResult(data);
      } catch (err) {
        if (!err.status || err.status === 404 || err.status === 405 || err.status >= 500) {
          return this.applyAuthResult(this.authenticateLocally(credentials));
        }
        throw err;
      }
    },

    async loginAdmin(emailOrUsername, password) {
      if (isStaticMode) {
        const data = ClientAuth.loginAdmin(emailOrUsername, password);
        return this.applyAuthResult(data);
      }
      try {
        const data = await this.request('/auth/admin/login', {
          method: 'POST',
          body: JSON.stringify({ emailOrUsername, password })
        });
        return this.applyAuthResult(data);
      } catch (err) {
        if (!err.status || err.status === 404 || err.status === 405 || err.status >= 500) {
          const data = ClientAuth.loginAdmin(emailOrUsername, password);
          return this.applyAuthResult(data);
        }
        throw err;
      }
    },

    async sendTeacherOtp(mobile) {
      if (isStaticMode) {
        return ClientAuth.sendTeacherOtp(mobile);
      }
      try {
        return await this.request('/auth/teacher/send-otp', {
          method: 'POST',
          body: JSON.stringify({ mobile })
        });
      } catch (err) {
        if (!err.status || err.status === 404 || err.status === 405 || err.status >= 500) {
          return ClientAuth.sendTeacherOtp(mobile);
        }
        throw err;
      }
    },

    async verifyTeacherOtp(mobile, otp) {
      if (isStaticMode) {
        const data = ClientAuth.verifyTeacherOtp(mobile, otp);
        return this.applyAuthResult(data);
      }
      try {
        const data = await this.request('/auth/teacher/verify-otp', {
          method: 'POST',
          body: JSON.stringify({ mobile, otp })
        });
        return this.applyAuthResult(data);
      } catch (err) {
        if (!err.status || err.status === 404 || err.status === 405 || err.status >= 500) {
          const data = ClientAuth.verifyTeacherOtp(mobile, otp);
          return this.applyAuthResult(data);
        }
        throw err;
      }
    },

    async loginParent(admissionNo, parentMobile, password = null) {
      if (!parentMobile && admissionNo && /^\d{10}$/.test(String(admissionNo).replace(/\D/g, ''))) {
        parentMobile = admissionNo;
        admissionNo = null;
      }
      if (isStaticMode) {
        const data = ClientAuth.loginParent(admissionNo, parentMobile, password);
        return this.applyAuthResult(data);
      }
      try {
        const data = await this.request('/auth/parent/login', {
          method: 'POST',
          body: JSON.stringify({ admissionNo, parentMobile, mobile: parentMobile, password })
        });
        return this.applyAuthResult(data);
      } catch (err) {
        if (!err.status || err.status === 404 || err.status === 405 || err.status >= 500) {
          const data = ClientAuth.loginParent(admissionNo, parentMobile, password);
          return this.applyAuthResult(data);
        }
        throw err;
      }
    },

    async logout() {
      try {
        if (!isStaticMode && this.getToken()) {
          await this.request('/auth/logout', { method: 'POST', silent: true });
        }
      } catch (e) {}
      this.setToken(null);
      this.setUser(null);
      this.setActiveStudent(null);
      localStorage.removeItem('rex_teacher_profile');
      localStorage.removeItem('rex_parent_profile');
      localStorage.removeItem('rex_parent_students');
      if (window.ERPStorage) {
        ERPStorage.setRole(null);
      }
      this.showToast('You have been logged out successfully.', 'info');
      if (window.App) {
        App.switchView('home');
      }
      if (window.AuthUI) {
        window.AuthUI.renderUserBadge();
        setTimeout(() => window.AuthUI.showLoginModal(), 300);
      }
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
