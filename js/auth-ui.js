/**
 * Rex Senior Secondary School Management Platform
 * Role Selection & Authentication UI Module
 */

(function (window) {
  const AuthUI = {
    currentTab: 'admin', // 'admin' | 'teacher' | 'parent'
    teacherMobile: '',

    init() {
      this.renderUserBadge();
      // If not authenticated, open login modal
      if (!window.RexApi.isAuthenticated()) {
        setTimeout(() => this.showLoginModal(), 400);
      }
    },

    // ------------------------------------------------------------------------
    // Top Bar User Status & Child Switcher
    // ------------------------------------------------------------------------
    renderUserBadge() {
      let badgeContainer = document.getElementById('rex-auth-badge');
      if (!badgeContainer) {
        const header = document.querySelector('.header-right') || document.querySelector('header');
        if (!header) return;
        badgeContainer = document.createElement('div');
        badgeContainer.id = 'rex-auth-badge';
        badgeContainer.className = 'rex-auth-badge';
        header.prepend(badgeContainer);
      }

      const user = window.RexApi.getUser();

      if (!user) {
        badgeContainer.innerHTML = `
          <button class="rex-btn-login" onclick="window.AuthUI.showLoginModal()">
            <i class="fas fa-sign-in-alt"></i> Sign In / Select Role
          </button>
        `;
        return;
      }

      let roleColor = '#1E3A8A';
      let roleLabel = 'Super Admin';
      if (user.role === 'TEACHER') {
        roleColor = '#059669';
        roleLabel = 'Faculty / Teacher';
      } else if (user.role === 'PARENT') {
        roleColor = '#7C3AED';
        roleLabel = 'Parent';
      }

      // Check linked students for parents
      let studentSwitcherHtml = '';
      if (user.role === 'PARENT') {
        const students = JSON.parse(localStorage.getItem('rex_parent_students') || '[]');
        const activeStudent = window.RexApi.getActiveStudent();

        if (students.length > 1) {
          studentSwitcherHtml = `
            <div class="rex-student-switcher">
              <label><i class="fas fa-child"></i> Ward:</label>
              <select onchange="window.AuthUI.switchChild(this.value)">
                ${students.map(s => `
                  <option value="${s.id}" ${activeStudent && activeStudent.id === s.id ? 'selected' : ''}>
                    ${s.first_name} ${s.last_name} (${s.class_name}-${s.section_name})
                  </option>
                `).join('')}
              </select>
            </div>
          `;
        } else if (activeStudent) {
          studentSwitcherHtml = `
            <span class="rex-single-student">
              <i class="fas fa-user-graduate"></i> ${activeStudent.first_name} (${activeStudent.class_name})
            </span>
          `;
        }
      }

      badgeContainer.innerHTML = `
        <div class="rex-user-pill">
          <span class="rex-role-tag" style="background:${roleColor}">
            ${roleLabel}
          </span>
          <span class="rex-user-name">${user.name || user.username || user.email}</span>
          ${studentSwitcherHtml}
          <button class="rex-btn-switch" onclick="window.AuthUI.showLoginModal()" title="Switch Role / Account">
            <i class="fas fa-exchange-alt"></i> Switch
          </button>
          <button class="rex-btn-logout" onclick="window.RexApi.logout()" title="Logout">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      `;
    },

    switchChild(studentId) {
      const students = JSON.parse(localStorage.getItem('rex_parent_students') || '[]');
      const target = students.find(s => String(s.id) === String(studentId));
      if (target) {
        window.RexApi.setActiveStudent(target);
        window.RexApi.showToast(`Switched active profile to ${target.first_name} ${target.last_name}`, 'info');
        window.location.reload();
      }
    },

    // ------------------------------------------------------------------------
    // Authentication Modal
    // ------------------------------------------------------------------------
    showLoginModal() {
      let modal = document.getElementById('rex-login-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'rex-login-modal';
        modal.className = 'rex-modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="rex-modal-card">
          <div class="rex-modal-header">
            <div class="rex-modal-title-group">
              <img src="assets/rex_emblem.png" alt="Rex Logo" class="rex-modal-logo" onerror="this.style.display='none'">
              <div>
                <h3>Rex Management App</h3>
                <p>Select your user profile to securely access the school platform</p>
              </div>
            </div>
            ${window.RexApi.isAuthenticated() ? '<button class="rex-modal-close" onclick="window.AuthUI.hideLoginModal()">&times;</button>' : ''}
          </div>

          <!-- Role Selection Tabs -->
          <div class="rex-role-tabs">
            <button class="rex-tab-btn ${this.currentTab === 'admin' ? 'active' : ''}" onclick="window.AuthUI.switchTab('admin')">
              <i class="fas fa-shield-alt"></i> Super Admin
            </button>
            <button class="rex-tab-btn ${this.currentTab === 'teacher' ? 'active' : ''}" onclick="window.AuthUI.switchTab('teacher')">
              <i class="fas fa-chalkboard-teacher"></i> Teacher Login
            </button>
            <button class="rex-tab-btn ${this.currentTab === 'parent' ? 'active' : ''}" onclick="window.AuthUI.switchTab('parent')">
              <i class="fas fa-user-friends"></i> Parent Login
            </button>
          </div>

          <div class="rex-modal-body">
            <!-- TAB 1: SUPER ADMIN -->
            <div id="tab-admin" class="rex-tab-pane ${this.currentTab === 'admin' ? 'active' : ''}">
              <div class="rex-login-banner admin">
                <i class="fas fa-user-shield"></i>
                <div>
                  <strong>Super Admin Access</strong>
                  <div>Full management of students, faculty, classes, events & attendance</div>
                </div>
              </div>
              <form onsubmit="window.AuthUI.handleAdminLogin(event)">
                <div class="rex-form-group">
                  <label>Email or Username</label>
                  <input type="text" id="admin-user" required placeholder="admin" value="admin">
                </div>
                <div class="rex-form-group">
                  <label>Password</label>
                  <input type="password" id="admin-pass" required placeholder="••••••••" value="AdminPassword123!">
                </div>
                <div class="rex-demo-hint">
                  <i class="fas fa-info-circle"></i> Default Demo Credentials: <code>admin</code> / <code>AdminPassword123!</code>
                </div>
                <button type="submit" class="rex-btn-primary admin" id="btn-admin-submit">
                  <i class="fas fa-key"></i> Sign In as Super Admin
                </button>
              </form>
            </div>

            <!-- TAB 2: TEACHER OTP LOGIN -->
            <div id="tab-teacher" class="rex-tab-pane ${this.currentTab === 'teacher' ? 'active' : ''}">
              <div class="rex-login-banner teacher">
                <i class="fas fa-mobile-alt"></i>
                <div>
                  <strong>Teacher Mobile OTP Authentication</strong>
                  <div>Instant secure access to your assigned classes and attendance sheet</div>
                </div>
              </div>

              <!-- Step 1: Request OTP -->
              <div id="teacher-step-1">
                <form onsubmit="window.AuthUI.handleTeacherSendOtp(event)">
                  <div class="rex-form-group">
                    <label>Registered Mobile Number</label>
                    <div class="rex-phone-input">
                      <span>+91</span>
                      <input type="tel" id="teacher-phone" maxlength="10" required placeholder="9876500004" value="9876500004">
                    </div>
                  </div>
                  <div class="rex-demo-hint">
                    <i class="fas fa-info-circle"></i> Seeded Faculty Mobile: <code>9876500004</code> (Mrs. Anitha Kumar, Class 10-A)
                  </div>
                  <button type="submit" class="rex-btn-primary teacher" id="btn-teacher-send">
                    <i class="fas fa-paper-plane"></i> Send OTP Verification Code
                  </button>
                </form>
              </div>

              <!-- Step 2: Verify OTP -->
              <div id="teacher-step-2" style="display:none;">
                <form onsubmit="window.AuthUI.handleTeacherVerifyOtp(event)">
                  <div class="rex-otp-header">
                    <span>Enter 6-digit OTP sent to <strong id="teacher-sent-phone"></strong></span>
                    <button type="button" class="rex-btn-link" onclick="window.AuthUI.resetTeacherOtp()">Change</button>
                  </div>
                  <div class="rex-form-group">
                    <input type="text" id="teacher-otp" maxlength="6" required placeholder="123456" class="rex-otp-box">
                  </div>
                  <div class="rex-demo-hint dev-otp">
                    <i class="fas fa-key"></i> Development Test OTP: <strong>123456</strong>
                  </div>
                  <button type="submit" class="rex-btn-primary teacher" id="btn-teacher-verify">
                    <i class="fas fa-check-circle"></i> Verify OTP & Enter Dashboard
                  </button>
                </form>
              </div>
            </div>

            <!-- TAB 3: PARENT LOGIN -->
            <div id="tab-parent" class="rex-tab-pane ${this.currentTab === 'parent' ? 'active' : ''}">
              <div class="rex-login-banner parent">
                <i class="fas fa-family-restroom"></i>
                <div>
                  <strong>Parent Portal Login</strong>
                  <div>View your child's attendance, bus location, marksheet, and notices</div>
                </div>
              </div>
              <form onsubmit="window.AuthUI.handleParentLogin(event)">
                <div class="rex-form-group">
                  <label>Student Admission Number</label>
                  <input type="text" id="parent-adm" required placeholder="REX-2024-001" value="REX-2024-001">
                </div>
                <div class="rex-form-group">
                  <label>Registered Parent Mobile Number</label>
                  <div class="rex-phone-input">
                    <span>+91</span>
                    <input type="tel" id="parent-phone" maxlength="10" required placeholder="9876543210" value="9876543210">
                  </div>
                </div>
                <div class="rex-demo-hint">
                  <i class="fas fa-info-circle"></i> Seeded Parent: <code>REX-2024-001</code> / <code>9876543210</code> (Aarav & Ananya Sharma)
                </div>
                <button type="submit" class="rex-btn-primary parent" id="btn-parent-submit">
                  <i class="fas fa-sign-in-alt"></i> Access Parent Portal
                </button>
              </form>
            </div>
          </div>
        </div>
      `;

      modal.style.display = 'flex';
    },

    hideLoginModal() {
      const modal = document.getElementById('rex-login-modal');
      if (modal) modal.style.display = 'none';
    },

    switchTab(tab) {
      this.currentTab = tab;
      document.querySelectorAll('.rex-tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.rex-tab-pane').forEach(p => p.classList.remove('active'));

      const targetTabBtn = Array.from(document.querySelectorAll('.rex-tab-btn')).find(b => b.textContent.toLowerCase().includes(tab));
      if (targetTabBtn) targetTabBtn.classList.add('active');

      const targetPane = document.getElementById(`tab-${tab}`);
      if (targetPane) targetPane.classList.add('active');
    },

    // ------------------------------------------------------------------------
    // Form Handlers
    // ------------------------------------------------------------------------
    async handleAdminLogin(e) {
      e.preventDefault();
      const btn = document.getElementById('btn-admin-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';

      try {
        const user = document.getElementById('admin-user').value;
        const pass = document.getElementById('admin-pass').value;
        await window.RexApi.loginAdmin(user, pass);
        window.RexApi.showToast('Super Admin authenticated successfully!', 'success');
        this.hideLoginModal();
        window.location.reload();
      } catch (err) {
        window.RexApi.showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-key"></i> Sign In as Super Admin';
      }
    },

    async handleTeacherSendOtp(e) {
      e.preventDefault();
      const phoneInput = document.getElementById('teacher-phone');
      const mobile = phoneInput.value.trim();
      const btn = document.getElementById('btn-teacher-send');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';

      try {
        const res = await window.RexApi.sendTeacherOtp(mobile);
        this.teacherMobile = mobile;
        document.getElementById('teacher-sent-phone').textContent = `+91 ${mobile}`;
        document.getElementById('teacher-step-1').style.display = 'none';
        document.getElementById('teacher-step-2').style.display = 'block';
        window.RexApi.showToast(res.message, 'success');
        if (res.devOtp) {
          document.getElementById('teacher-otp').value = res.devOtp;
        }
      } catch (err) {
        window.RexApi.showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP Verification Code';
      }
    },

    async handleTeacherVerifyOtp(e) {
      e.preventDefault();
      const otp = document.getElementById('teacher-otp').value.trim();
      const btn = document.getElementById('btn-teacher-verify');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

      try {
        await window.RexApi.verifyTeacherOtp(this.teacherMobile, otp);
        window.RexApi.showToast('Teacher verified and logged in successfully!', 'success');
        this.hideLoginModal();
        window.location.reload();
      } catch (err) {
        window.RexApi.showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Verify OTP & Enter Dashboard';
      }
    },

    resetTeacherOtp() {
      document.getElementById('teacher-step-2').style.display = 'none';
      document.getElementById('teacher-step-1').style.display = 'block';
    },

    async handleParentLogin(e) {
      e.preventDefault();
      const adm = document.getElementById('parent-adm').value.trim();
      const mobile = document.getElementById('parent-phone').value.trim();
      const btn = document.getElementById('btn-parent-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying Ward & Parent...';

      try {
        await window.RexApi.loginParent(adm, mobile);
        window.RexApi.showToast('Parent authenticated successfully!', 'success');
        this.hideLoginModal();
        window.location.reload();
      } catch (err) {
        window.RexApi.showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Access Parent Portal';
      }
    }
  };

  // Inject Styles for Auth UI
  const style = document.createElement('style');
  style.textContent = `
    .rex-auth-badge {
      display: inline-flex;
      align-items: center;
      margin-right: 12px;
    }
    .rex-user-pill {
      display: inline-flex;
      align-items: center;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      padding: 4px 8px 4px 6px;
      border-radius: 20px;
      gap: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      font-size: 12px;
    }
    .rex-role-tag {
      color: white;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      border-radius: 12px;
    }
    .rex-user-name {
      font-weight: 600;
      color: #0F172A;
    }
    .rex-student-switcher select {
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 2px 6px;
      font-size: 11px;
      background: #F8FAFC;
      color: #1E293B;
      font-weight: 600;
    }
    .rex-btn-switch, .rex-btn-logout, .rex-btn-login {
      border: none;
      background: #F1F5F9;
      color: #475569;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .rex-btn-switch:hover, .rex-btn-logout:hover, .rex-btn-login:hover {
      background: #E2E8F0;
      color: #0F172A;
    }
    .rex-btn-login {
      background: #1E3A8A;
      color: white;
      padding: 6px 12px;
      border-radius: 8px;
    }
    .rex-btn-login:hover {
      background: #172554;
      color: white;
    }

    /* Modal Overlay */
    .rex-modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      z-index: 999999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .rex-modal-card {
      background: white;
      width: 100%;
      max-width: 520px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      animation: rexPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes rexPop {
      0% { opacity: 0; transform: scale(0.95); }
      100% { opacity: 1; transform: scale(1); }
    }
    .rex-modal-header {
      padding: 20px 24px 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #F1F5F9;
    }
    .rex-modal-title-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .rex-modal-logo {
      height: 48px;
      width: 48px;
      object-fit: contain;
      background: white;
      padding: 4px;
      border-radius: 10px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }
    .rex-modal-title-group h3 {
      margin: 0;
      font-size: 18px;
      color: #0F172A;
      font-weight: 700;
    }
    .rex-modal-title-group p {
      margin: 4px 0 0;
      font-size: 12px;
      color: #64748B;
    }
    .rex-modal-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #94A3B8;
      cursor: pointer;
      line-height: 1;
    }
    .rex-role-tabs {
      display: flex;
      border-bottom: 1px solid #E2E8F0;
      background: #F8FAFC;
    }
    .rex-tab-btn {
      flex: 1;
      padding: 12px 8px;
      border: none;
      background: none;
      font-size: 13px;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }
    .rex-tab-btn.active {
      color: #1E3A8A;
      background: white;
      border-bottom-color: #1E3A8A;
    }
    .rex-modal-body {
      padding: 24px;
    }
    .rex-tab-pane {
      display: none;
    }
    .rex-tab-pane.active {
      display: block;
    }
    .rex-login-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 12px;
      margin-bottom: 20px;
    }
    .rex-login-banner.admin { background: #EFF6FF; color: #1E3A8A; }
    .rex-login-banner.teacher { background: #ECFDF5; color: #065F46; }
    .rex-login-banner.parent { background: #F5F3FF; color: #5B21B6; }
    .rex-form-group {
      margin-bottom: 16px;
    }
    .rex-form-group label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 6px;
    }
    .rex-form-group input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.2s;
    }
    .rex-form-group input:focus {
      outline: none;
      border-color: #2563EB;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .rex-phone-input {
      display: flex;
      align-items: center;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      overflow: hidden;
    }
    .rex-phone-input span {
      background: #F1F5F9;
      padding: 10px 12px;
      font-size: 13px;
      color: #475569;
      font-weight: 600;
      border-right: 1px solid #CBD5E1;
    }
    .rex-phone-input input {
      border: none;
      border-radius: 0;
    }
    .rex-otp-box {
      font-size: 22px !important;
      text-align: center;
      letter-spacing: 6px;
      font-weight: 700;
      padding: 12px !important;
    }
    .rex-demo-hint {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      color: #92400E;
      font-size: 11px;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .rex-demo-hint code {
      background: #FEF3C7;
      padding: 2px 4px;
      border-radius: 4px;
      font-weight: 700;
    }
    .rex-btn-primary {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: filter 0.2s;
    }
    .rex-btn-primary.admin { background: #1E3A8A; }
    .rex-btn-primary.teacher { background: #059669; }
    .rex-btn-primary.parent { background: #7C3AED; }
    .rex-btn-primary:hover { filter: brightness(1.1); }
    .rex-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  `;
  document.head.appendChild(style);

  window.AuthUI = AuthUI;
  document.addEventListener('DOMContentLoaded', () => AuthUI.init());
})(window);
