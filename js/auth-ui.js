/**
 * Rex Senior Secondary School Management Platform
 * Complete Role Selection, Database Authentication & Session UI Module
 */

(function (window) {
  const AuthUI = {
    currentTab: 'admin', // 'admin' | 'teacher' | 'parent'
    teacherAuthMode: 'otp', // 'otp' | 'password'
    parentAuthMode: 'mobile', // 'mobile' | 'password'
    teacherMobile: '',

    init() {
      this.attachGlobalListeners();
      this.renderUserBadge();

      // Check if user is not authenticated and is attempting to access a protected view
      const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
      const isProtected = hash && hash !== 'home';

      if (!window.RexApi.isAuthenticated() && isProtected) {
        setTimeout(() => this.showLoginModal(), 300);
      }
    },

    attachGlobalListeners() {
      window.addEventListener('hashchange', () => {
        const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
        if (hash && hash !== 'home' && !window.RexApi.isAuthenticated()) {
          this.showLoginModal();
          if (window.App) window.App.switchView('home');
        }
      });
    },

    // ------------------------------------------------------------------------
    // Top Bar & Navbar User Status & Actions
    // ------------------------------------------------------------------------
    renderUserBadge() {
      const user = window.RexApi.getUser();
      const isAuthed = window.RexApi.isAuthenticated();

      // 1. ERP Topbar Badge & Profile
      const topbarRight = document.querySelector('.topbar-right');
      if (topbarRight) {
        let badgeContainer = document.getElementById('rex-auth-badge');
        if (!badgeContainer) {
          badgeContainer = document.createElement('div');
          badgeContainer.id = 'rex-auth-badge';
          badgeContainer.className = 'rex-auth-badge';
          topbarRight.prepend(badgeContainer);
        }

        // Hide old dummy role simulator selector
        const roleSimWrapper = document.querySelector('.role-simulator-wrapper');
        if (roleSimWrapper) {
          roleSimWrapper.style.display = 'none';
        }

        if (!isAuthed) {
          badgeContainer.innerHTML = `
            <button type="button" class="rex-btn-login" onclick="window.AuthUI.showLoginModal()">
              <i class="fas fa-sign-in-alt"></i> Sign In / Select Role
            </button>
          `;

          const userNameEl = document.getElementById('current-user-name');
          const userRoleEl = document.getElementById('current-user-role');
          const userAvatarEl = document.getElementById('current-user-avatar');
          if (userNameEl) userNameEl.textContent = "Not Signed In";
          if (userRoleEl) userRoleEl.textContent = "Guest Access";
          if (userAvatarEl) userAvatarEl.textContent = "??";
        } else {
          let roleColor = '#1E3A8A';
          let roleLabel = 'Super Admin';
          let avatarInitials = 'RP';

          if (user.role === 'TEACHER') {
            roleColor = '#059669';
            roleLabel = 'Teacher / Faculty';
            avatarInitials = 'AK';
          } else if (user.role === 'PARENT') {
            roleColor = '#7C3AED';
            roleLabel = 'Parent';
            avatarInitials = 'RS';
          }

          // Student switcher for multi-child parents
          let studentSwitcherHtml = '';
          if (user.role === 'PARENT') {
            const students = JSON.parse(localStorage.getItem('rex_parent_students') || '[]');
            const activeStudent = window.RexApi.getActiveStudent();

            if (students.length > 1) {
              studentSwitcherHtml = `
                <div class="rex-student-switcher" title="Select child profile">
                  <label><i class="fas fa-child"></i> Ward:</label>
                  <select onchange="window.AuthUI.switchChild(this.value)">
                    ${students.map(s => `
                      <option value="${s.id}" ${activeStudent && activeStudent.id === s.id ? 'selected' : ''}>
                        ${s.first_name} ${s.last_name} (${s.class_name || 'Class 10'}-${s.section_name || 'A'})
                      </option>
                    `).join('')}
                  </select>
                </div>
              `;
            } else if (activeStudent) {
              studentSwitcherHtml = `
                <span class="rex-single-student">
                  <i class="fas fa-user-graduate"></i> ${activeStudent.first_name}
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
              <button type="button" class="rex-btn-switch" onclick="window.AuthUI.showLoginModal()" title="Switch Account / Role">
                <i class="fas fa-exchange-alt"></i> Switch
              </button>
              <button type="button" class="rex-btn-logout" onclick="window.RexApi.logout()" title="Logout of School Portal">
                <i class="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          `;

          // Update header profile card
          const userNameEl = document.getElementById('current-user-name');
          const userRoleEl = document.getElementById('current-user-role');
          const userAvatarEl = document.getElementById('current-user-avatar');
          if (userNameEl) userNameEl.textContent = user.name || user.username;
          if (userRoleEl) userRoleEl.textContent = roleLabel;
          if (userAvatarEl) userAvatarEl.textContent = avatarInitials;
        }
      }

      // 2. Home Landing Page Navbar Actions
      const homeNavActions = document.querySelector('.home-nav-actions');
      if (homeNavActions) {
        let homeSignInBtn = document.getElementById('home-nav-signin-btn');
        if (!homeSignInBtn) {
          homeSignInBtn = document.createElement('button');
          homeSignInBtn.id = 'home-nav-signin-btn';
          homeSignInBtn.type = 'button';
          homeSignInBtn.className = 'btn btn-outline';
          homeSignInBtn.style.fontSize = '0.82rem';
          homeSignInBtn.style.fontWeight = '700';
          homeNavActions.prepend(homeSignInBtn);
        }

        if (!isAuthed) {
          homeSignInBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
          homeSignInBtn.onclick = () => this.showLoginModal();
        } else {
          homeSignInBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${user.role.replace('_', ' ')}`;
          homeSignInBtn.onclick = () => this.routeToDashboard();
        }
      }
    },

    switchChild(studentId) {
      const students = JSON.parse(localStorage.getItem('rex_parent_students') || '[]');
      const target = students.find(s => String(s.id) === String(studentId));
      if (target) {
        window.RexApi.setActiveStudent(target);
        window.RexApi.showToast(`Switched active profile to ${target.first_name} ${target.last_name}`, 'info');
        if (window.FeesModule && typeof window.FeesModule.render === 'function') {
          window.FeesModule.render();
        }
        if (window.AttendanceModule && typeof window.AttendanceModule.render === 'function') {
          window.AttendanceModule.render();
        }
        if (window.TransportModule && typeof window.TransportModule.render === 'function') {
          window.TransportModule.render();
        }
      }
    },

    routeToDashboard() {
      const role = window.RexApi.getRole();
      if (role === 'TEACHER') {
        if (window.App) {
          window.App.applyRole('teacher', false);
          window.App.switchView('attendance');
        }
      } else if (role === 'PARENT') {
        if (window.App) {
          window.App.applyRole('parent', false);
          window.App.switchView('parent-portal');
        }
      } else {
        if (window.App) {
          window.App.applyRole('admin', false);
          window.App.switchView('dashboard');
        }
      }
    },

    // ------------------------------------------------------------------------
    // Authentication Modal Dialog
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
              <img src="assets/rex_emblem.png" alt="Rex Logo" class="rex-modal-logo" onerror="this.src='assets/logo.png'">
              <div>
                <h3>Rex Management App</h3>
                <p>Official School Management System • Authenticate via Role</p>
              </div>
            </div>
            <button type="button" class="rex-modal-close" onclick="window.AuthUI.hideLoginModal()" title="Close">&times;</button>
          </div>

          <!-- Role Selection Tabs -->
          <div class="rex-role-tabs">
            <button type="button" class="rex-tab-btn ${this.currentTab === 'admin' ? 'active' : ''}" onclick="window.AuthUI.switchTab('admin')">
              <i class="fas fa-shield-alt"></i> Super Admin
            </button>
            <button type="button" class="rex-tab-btn ${this.currentTab === 'teacher' ? 'active' : ''}" onclick="window.AuthUI.switchTab('teacher')">
              <i class="fas fa-chalkboard-teacher"></i> Teacher
            </button>
            <button type="button" class="rex-tab-btn ${this.currentTab === 'parent' ? 'active' : ''}" onclick="window.AuthUI.switchTab('parent')">
              <i class="fas fa-user-friends"></i> Parent
            </button>
          </div>

          <div class="rex-modal-body">
            <!-- Inline Error Banner -->
            <div id="auth-error-banner" class="rex-auth-error-banner" style="display: none;"></div>

            <!-- TAB 1: SUPER ADMIN -->
            <div id="tab-admin" class="rex-tab-pane ${this.currentTab === 'admin' ? 'active' : ''}">
              <div class="rex-login-banner admin">
                <i class="fas fa-user-shield" style="font-size: 1.5rem;"></i>
                <div>
                  <strong>Super Admin Sign In</strong>
                  <div>Administrative controls, student directory, fee ledgers & fleet tracking</div>
                </div>
              </div>
              <form id="admin-login-form" onsubmit="window.AuthUI.handleAdminLogin(event)">
                <div class="rex-form-group">
                  <label for="admin-user">Email or Username *</label>
                  <input type="text" id="admin-user" required placeholder="admin" value="admin" autocomplete="username">
                </div>
                <div class="rex-form-group">
                  <label for="admin-pass">Password *</label>
                  <input type="password" id="admin-pass" required placeholder="••••••••" value="AdminPassword123!" autocomplete="current-password">
                </div>
                <div class="rex-demo-hint">
                  <i class="fas fa-info-circle"></i> Default Seed Credentials: <code>admin</code> / <code>AdminPassword123!</code>
                </div>
                <button type="submit" class="rex-btn-primary admin" id="btn-admin-submit">
                  <i class="fas fa-sign-in-alt"></i> Sign In as Super Admin
                </button>
              </form>
            </div>

            <!-- TAB 2: TEACHER LOGIN -->
            <div id="tab-teacher" class="rex-tab-pane ${this.currentTab === 'teacher' ? 'active' : ''}">
              <div class="rex-login-banner teacher">
                <i class="fas fa-chalkboard-teacher" style="font-size: 1.5rem;"></i>
                <div>
                  <strong>Teacher & Faculty Access</strong>
                  <div>Mark smart attendance, post homework diaries & record test marks</div>
                </div>
              </div>

              <!-- Teacher Sub-mode selector (OTP vs Password) -->
              <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
                <button type="button" class="btn btn-sm ${this.teacherAuthMode === 'otp' ? 'btn-primary' : 'btn-outline'}" onclick="window.AuthUI.setTeacherMode('otp')" style="flex: 1; font-size: 0.78rem;">
                  📱 Mobile OTP
                </button>
                <button type="button" class="btn btn-sm ${this.teacherAuthMode === 'password' ? 'btn-primary' : 'btn-outline'}" onclick="window.AuthUI.setTeacherMode('password')" style="flex: 1; font-size: 0.78rem;">
                  🔑 Email & Password
                </button>
              </div>

              <!-- Sub-mode: OTP -->
              <div id="teacher-otp-container" style="display: ${this.teacherAuthMode === 'otp' ? 'block' : 'none'};">
                <!-- Step 1: Send OTP -->
                <div id="teacher-step-1">
                  <form onsubmit="window.AuthUI.handleTeacherSendOtp(event)">
                    <div class="rex-form-group">
                      <label for="teacher-phone">Registered Mobile Number *</label>
                      <div class="rex-phone-input">
                        <span>+91</span>
                        <input type="tel" id="teacher-phone" maxlength="10" required placeholder="9876500004" value="9876500004">
                      </div>
                    </div>
                    <div class="rex-demo-hint">
                      <i class="fas fa-info-circle"></i> Seeded Faculty Mobile: <code>9876500004</code> (Mrs. Anitha Kumar)
                    </div>
                    <button type="submit" class="rex-btn-primary teacher" id="btn-teacher-send">
                      <i class="fas fa-paper-plane"></i> Send OTP Code
                    </button>
                  </form>
                </div>

                <!-- Step 2: Verify OTP -->
                <div id="teacher-step-2" style="display: none;">
                  <form onsubmit="window.AuthUI.handleTeacherVerifyOtp(event)">
                    <div class="rex-otp-header">
                      <span>Enter 6-digit OTP sent to <strong id="teacher-sent-phone"></strong></span>
                      <button type="button" class="rex-btn-link" onclick="window.AuthUI.resetTeacherOtp()">Change</button>
                    </div>
                    <div class="rex-form-group">
                      <input type="text" id="teacher-otp" maxlength="6" required placeholder="123456" class="rex-otp-box">
                    </div>
                    <div class="rex-demo-hint dev-otp">
                      <i class="fas fa-key"></i> Test OTP Code: <strong>123456</strong>
                    </div>
                    <button type="submit" class="rex-btn-primary teacher" id="btn-teacher-verify">
                      <i class="fas fa-check-circle"></i> Verify OTP & Enter Dashboard
                    </button>
                  </form>
                </div>
              </div>

              <!-- Sub-mode: Password -->
              <div id="teacher-pass-container" style="display: ${this.teacherAuthMode === 'password' ? 'block' : 'none'};">
                <form onsubmit="window.AuthUI.handleTeacherPasswordLogin(event)">
                  <div class="rex-form-group">
                    <label for="teacher-email">Teacher Email / Username *</label>
                    <input type="text" id="teacher-email" required placeholder="maths@rex.edu" value="maths@rex.edu">
                  </div>
                  <div class="rex-form-group">
                    <label for="teacher-pass">Password *</label>
                    <input type="password" id="teacher-pass" required placeholder="••••••••" value="AdminPassword123!">
                  </div>
                  <button type="submit" class="rex-btn-primary teacher" id="btn-teacher-pass-submit">
                    <i class="fas fa-sign-in-alt"></i> Sign In as Teacher
                  </button>
                </form>
              </div>
            </div>

            <!-- TAB 3: PARENT LOGIN -->
            <div id="tab-parent" class="rex-tab-pane ${this.currentTab === 'parent' ? 'active' : ''}">
              <div class="rex-login-banner parent">
                <i class="fas fa-family-restroom" style="font-size: 1.5rem;"></i>
                <div>
                  <strong>Parent Portal Authentication</strong>
                  <div>Pay school fees via Split Payment, track school bus GPS & review homework</div>
                </div>
              </div>
              <form onsubmit="window.AuthUI.handleParentLogin(event)">
                <div class="rex-form-group">
                  <label for="parent-phone">Registered Parent Mobile Number *</label>
                  <div class="rex-phone-input">
                    <span>+91</span>
                    <input type="tel" id="parent-phone" maxlength="10" required placeholder="9876543210" value="9876543210">
                  </div>
                </div>
                <div class="rex-form-group">
                  <label for="parent-adm">Student Admission Number (Optional for Multi-child)</label>
                  <input type="text" id="parent-adm" placeholder="REX-2024-001" value="REX-2024-001">
                </div>
                <div class="rex-demo-hint">
                  <i class="fas fa-info-circle"></i> Seeded Parent: <code>9876543210</code> (Aarav & Ananya Sharma)
                </div>
                <button type="submit" class="rex-btn-primary parent" id="btn-parent-submit">
                  <i class="fas fa-sign-in-alt"></i> Enter Parent Portal
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
      this.clearError();
    },

    showError(msg) {
      const banner = document.getElementById('auth-error-banner');
      if (banner) {
        banner.textContent = msg;
        banner.style.display = 'block';
      }
      window.RexApi.showToast(msg, 'error');
    },

    clearError() {
      const banner = document.getElementById('auth-error-banner');
      if (banner) {
        banner.style.display = 'none';
        banner.textContent = '';
      }
    },

    switchTab(tab) {
      this.currentTab = tab;
      this.clearError();
      document.querySelectorAll('.rex-tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.rex-tab-pane').forEach(p => p.classList.remove('active'));

      const targetTabBtn = Array.from(document.querySelectorAll('.rex-tab-btn')).find(b => b.textContent.toLowerCase().includes(tab));
      if (targetTabBtn) targetTabBtn.classList.add('active');

      const targetPane = document.getElementById(`tab-${tab}`);
      if (targetPane) targetPane.classList.add('active');
    },

    setTeacherMode(mode) {
      this.teacherAuthMode = mode;
      this.clearError();
      const otpContainer = document.getElementById('teacher-otp-container');
      const passContainer = document.getElementById('teacher-pass-container');
      if (otpContainer) otpContainer.style.display = mode === 'otp' ? 'block' : 'none';
      if (passContainer) passContainer.style.display = mode === 'password' ? 'block' : 'none';
    },

    // ------------------------------------------------------------------------
    // Form Handlers
    // ------------------------------------------------------------------------
    async handleAdminLogin(e) {
      e.preventDefault();
      this.clearError();

      const user = document.getElementById('admin-user').value.trim();
      const pass = document.getElementById('admin-pass').value.trim();

      if (!user || !pass) {
        this.showError('Please enter both username and password.');
        return;
      }

      const btn = document.getElementById('btn-admin-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

      try {
        const res = await window.RexApi.loginAdmin(user, pass);
        window.RexApi.showToast('Super Admin authenticated successfully!', 'success');
        this.hideLoginModal();
        this.renderUserBadge();

        if (window.App) {
          window.App.applyRole('admin', false);
          window.App.switchView('dashboard');
        }
      } catch (err) {
        this.showError(err.message || 'Invalid email/username or password.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In as Super Admin';
      }
    },

    async handleTeacherSendOtp(e) {
      e.preventDefault();
      this.clearError();

      const phoneInput = document.getElementById('teacher-phone');
      const mobile = phoneInput.value.trim();

      if (!mobile || mobile.length !== 10) {
        this.showError('Please enter a valid 10-digit mobile number.');
        return;
      }

      const btn = document.getElementById('btn-teacher-send');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';

      try {
        const res = await window.RexApi.sendTeacherOtp(mobile);
        this.teacherMobile = mobile;
        document.getElementById('teacher-sent-phone').textContent = `+91 ${mobile}`;
        document.getElementById('teacher-step-1').style.display = 'none';
        document.getElementById('teacher-step-2').style.display = 'block';
        window.RexApi.showToast(res.message || 'OTP sent successfully!', 'success');
        if (res.devOtp) {
          document.getElementById('teacher-otp').value = res.devOtp;
        }
      } catch (err) {
        this.showError(err.message || 'Failed to send OTP. Please check mobile number.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP Code';
      }
    },

    async handleTeacherVerifyOtp(e) {
      e.preventDefault();
      this.clearError();

      const otp = document.getElementById('teacher-otp').value.trim();
      if (!otp) {
        this.showError('Please enter the 6-digit OTP code.');
        return;
      }

      const btn = document.getElementById('btn-teacher-verify');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

      try {
        await window.RexApi.verifyTeacherOtp(this.teacherMobile, otp);
        window.RexApi.showToast('Teacher verified and logged in successfully!', 'success');
        this.hideLoginModal();
        this.renderUserBadge();

        if (window.App) {
          window.App.applyRole('teacher', false);
          window.App.switchView('attendance');
        }
      } catch (err) {
        this.showError(err.message || 'Invalid or expired OTP code.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Verify OTP & Enter Dashboard';
      }
    },

    resetTeacherOtp() {
      document.getElementById('teacher-step-2').style.display = 'none';
      document.getElementById('teacher-step-1').style.display = 'block';
      this.clearError();
    },

    async handleTeacherPasswordLogin(e) {
      e.preventDefault();
      this.clearError();

      const email = document.getElementById('teacher-email').value.trim();
      const pass = document.getElementById('teacher-pass').value.trim();

      const btn = document.getElementById('btn-teacher-pass-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

      try {
        await window.RexApi.login({ email, password: pass, role: 'TEACHER' });
        window.RexApi.showToast('Teacher authenticated successfully!', 'success');
        this.hideLoginModal();
        this.renderUserBadge();

        if (window.App) {
          window.App.applyRole('teacher', false);
          window.App.switchView('attendance');
        }
      } catch (err) {
        this.showError(err.message || 'Invalid teacher credentials.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In as Teacher';
      }
    },

    async handleParentLogin(e) {
      e.preventDefault();
      this.clearError();

      const adm = document.getElementById('parent-adm').value.trim();
      const mobile = document.getElementById('parent-phone').value.trim();

      if (!mobile || mobile.length !== 10) {
        this.showError('Please enter a valid 10-digit registered mobile number.');
        return;
      }

      const btn = document.getElementById('btn-parent-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

      try {
        await window.RexApi.loginParent(adm, mobile);
        window.RexApi.showToast('Parent authenticated successfully!', 'success');
        this.hideLoginModal();
        this.renderUserBadge();

        if (window.App) {
          window.App.applyRole('parent', false);
          window.App.switchView('parent-portal');
        }
      } catch (err) {
        this.showError(err.message || 'Authentication failed. Please verify parent mobile.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Enter Parent Portal';
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
      padding: 4px 10px 4px 6px;
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
      cursor: pointer;
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
      padding: 6px 14px;
      border-radius: 8px;
      font-weight: 700;
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
    .rex-auth-error-banner {
      background: #FEF2F2;
      border: 1px solid #FCA5A5;
      color: #B91C1C;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
      animation: shake 0.25s ease;
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
      box-sizing: border-box;
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
      flex: 1;
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
    .rex-btn-link {
      background: none;
      border: none;
      color: #2563EB;
      font-size: 11px;
      cursor: pointer;
      font-weight: 600;
      padding: 0;
      text-decoration: underline;
    }
  `;
  document.head.appendChild(style);

  window.AuthUI = AuthUI;
  window.RexAuthUI = AuthUI;
  document.addEventListener('DOMContentLoaded', () => AuthUI.init());
})(window);
