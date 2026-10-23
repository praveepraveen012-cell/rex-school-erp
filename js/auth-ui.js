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
          let roleColor = '#2563eb';
          let roleLabel = 'Super Admin';
          let avatarInitials = 'SA';

          if (user.role === 'PLATFORM_ADMIN') {
            roleColor = '#7c3aed';
            roleLabel = 'Platform Admin';
            avatarInitials = 'GX';
          } else if (user.role === 'TEACHER') {
            roleColor = '#059669';
            roleLabel = 'Teacher / Faculty';
            avatarInitials = 'TC';
          } else if (user.role === 'PARENT') {
            roleColor = '#0284c7';
            roleLabel = 'Parent';
            avatarInitials = 'PR';
          }

          // Show/Hide Platform Admin item in sidebar
          const platNav = document.getElementById('nav-item-platform-admin');
          if (platNav) {
            platNav.style.display = (user.role === 'PLATFORM_ADMIN') ? 'flex' : 'none';
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

          const schoolTag = user.school ? `
            <span class="rex-school-tag" style="background: rgba(255,255,255,0.18); color: #fff; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; margin-left: 4px;" title="Connected to ${user.school.display_name}">
              🏫 ${user.school.display_name || user.school.name}
            </span>
          ` : '';

          let trialTag = '';
          const trialData = JSON.parse(localStorage.getItem('rex_school_trial') || 'null');
          const schoolData = user.school || JSON.parse(localStorage.getItem('rex_school_profile') || 'null');

          if (user.role === 'SUPER_ADMIN' || user.role === 'SCHOOL_ADMIN' || user.role === 'admin') {
            const endsAt = trialData?.endsAt || schoolData?.trial_ends_at;
            const subStatus = schoolData?.subscription_status || trialData?.status || 'TRIAL_ACTIVE';

            if (subStatus === 'ACTIVE_SUBSCRIPTION') {
              trialTag = `
                <button type="button" class="rex-trial-pill active" onclick="window.AuthUI.showSubscriptionModal()" title="Active Paid Subscription - Click to view billing" style="background:#059669; color:#fff; border:none; padding:3px 9px; border-radius:12px; font-size:0.72rem; font-weight:700; cursor:pointer; margin-left:4px;">
                  ✓ Paid Plan
                </button>
              `;
            } else if (endsAt) {
              const diffMs = new Date(endsAt).getTime() - Date.now();
              const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
              if (daysLeft > 0) {
                const color = daysLeft <= 2 ? '#ea580c' : '#7c3aed';
                trialTag = `
                  <button type="button" class="rex-trial-pill" onclick="window.AuthUI.showSubscriptionModal()" title="${daysLeft} days remaining in free trial. Click to upgrade" style="background:${color}; color:#fff; border:none; padding:3px 9px; border-radius:12px; font-size:0.72rem; font-weight:700; cursor:pointer; margin-left:4px; display:inline-flex; align-items:center; gap:4px;">
                    <i class="fas fa-hourglass-half"></i> ${daysLeft}d Trial (Upgrade)
                  </button>
                `;
              } else {
                trialTag = `
                  <button type="button" class="rex-trial-pill expired" onclick="window.AuthUI.showSubscriptionModal()" title="Free Trial Expired! Click to renew and restore access." style="background:#dc2626; color:#fff; border:none; padding:3px 9px; border-radius:12px; font-size:0.72rem; font-weight:700; cursor:pointer; margin-left:4px;">
                    ⚠️ Trial Expired - Upgrade
                  </button>
                `;
              }
            }
          }

          badgeContainer.innerHTML = `
            <div class="rex-user-pill">
              <span class="rex-role-tag" style="background:${roleColor}">
                ${roleLabel}
              </span>
              <span class="rex-user-name">${user.name || user.username || user.email}</span>
              ${schoolTag}
              ${trialTag}
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
      if (role === 'PLATFORM_ADMIN') {
        if (window.App) {
          window.App.applyRole('platform_admin', false);
          window.App.switchView('platform-admin');
        }
      } else if (role === 'TEACHER') {
        if (window.App) {
          window.App.applyRole('teacher', false);
          window.App.switchView('teacher-dashboard');
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
      modal.style.display = 'flex';

      modal.innerHTML = `
        <div class="rex-modal-card">
          <div class="rex-modal-header" style="background:#fff; border-bottom:1px solid var(--border-subtle); padding: 1.25rem 1.5rem;">
            <div class="rex-modal-title-group">
              <div class="grexotix-logo-container sm" style="background:#ffffff; border:1px solid #e2e8f0; padding:4px 8px; border-radius:6px;">
                <img src="assets/grexotix_logo.png" alt="Grexotix Logo" class="grexotix-logo-img" style="height:34px; object-fit:contain;">
              </div>
              <div style="margin-left: 0.75rem;">
                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #1e1b4b;">Grexotix School Platform</h3>
                <p style="margin: 0.15rem 0 0 0; font-size: 0.75rem; color: #64748b; font-weight: 600;">
                  Empowering Schools with Smart Management • Product of Grexotix
                </p>
              </div>
            </div>
            <button type="button" class="rex-modal-close" onclick="window.AuthUI.hideLoginModal()" title="Close">&times;</button>
          </div>

          <!-- Role Selection Tabs -->
          <div class="rex-role-tabs">
            <button type="button" class="rex-tab-btn ${this.currentTab === 'register' ? 'active' : ''}" onclick="window.AuthUI.switchTab('register')" style="color: #673AB7; font-weight: 700;">
              <i class="fas fa-rocket"></i> Register School (7-Day Trial)
            </button>
            <button type="button" class="rex-tab-btn ${this.currentTab === 'admin' ? 'active' : ''}" onclick="window.AuthUI.switchTab('admin')">
              <i class="fas fa-shield-alt"></i> School Admin Login
            </button>
            <button type="button" class="rex-tab-btn ${this.currentTab === 'teacher' ? 'active' : ''}" onclick="window.AuthUI.switchTab('teacher')">
              <i class="fas fa-chalkboard-teacher"></i> Teacher Login
            </button>
            <button type="button" class="rex-tab-btn ${this.currentTab === 'parent' ? 'active' : ''}" onclick="window.AuthUI.switchTab('parent')">
              <i class="fas fa-user-friends"></i> Parent Login
            </button>
          </div>

          <div class="rex-modal-body">
            <!-- Inline Error Banner -->
            <div id="auth-error-banner" class="rex-auth-error-banner" style="display: none;"></div>

            <!-- TAB 0: REGISTER YOUR SCHOOL (7-DAY TRIAL) -->
            <div id="tab-register" class="rex-tab-pane ${this.currentTab === 'register' ? 'active' : ''}">
              <div class="rex-login-banner" style="background: linear-gradient(135deg, #ede9fe, #ddd6fe); color: #5b21b6; border-radius: 8px;">
                <i class="fas fa-rocket" style="font-size: 1.5rem;"></i>
                <div>
                  <strong>Register Your School &bull; 7-Day Full Free Trial</strong>
                  <div style="font-size: 0.75rem; opacity: 0.9;">Instant activation &bull; Unique School ID assigned &bull; Zero credit card required</div>
                </div>
              </div>
              <form id="school-register-form" onsubmit="window.AuthUI.handleRegisterSchool(event)">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div class="rex-form-group">
                    <label for="reg-sch-name">Official School Name *</label>
                    <input type="text" id="reg-sch-name" required placeholder="e.g. Oakridge International">
                  </div>
                  <div class="rex-form-group">
                    <label for="reg-sch-email">School Official Email *</label>
                    <input type="email" id="reg-sch-email" required placeholder="contact@oakridge.edu">
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div class="rex-form-group">
                    <label for="reg-sch-phone">School Contact Phone *</label>
                    <input type="tel" id="reg-sch-phone" required placeholder="9876500001">
                  </div>
                  <div class="rex-form-group">
                    <label for="reg-sch-city">City, State & Postal Code *</label>
                    <input type="text" id="reg-sch-city" required placeholder="Bengaluru, Karnataka - 560001">
                  </div>
                </div>
                <div class="rex-form-group">
                  <label for="reg-sch-address">School Campus Address *</label>
                  <input type="text" id="reg-sch-address" required placeholder="Plot 45, Knowledge Park Road">
                </div>
                <div style="border-top: 1px dashed #cbd5e1; padding-top: 10px; margin: 8px 0;">
                  <div style="font-size: 0.74rem; font-weight: 700; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em;">School Administrator Credentials</div>
                  <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 8px;">
                    <div class="rex-form-group">
                      <label for="reg-adm-name">Administrator Full Name *</label>
                      <input type="text" id="reg-adm-name" required placeholder="Dr. Sarah Johnson">
                    </div>
                    <div class="rex-form-group">
                      <label for="reg-adm-mobile">Admin Mobile Number *</label>
                      <input type="tel" id="reg-adm-mobile" required placeholder="9876543210">
                    </div>
                  </div>
                  <div class="rex-form-group">
                    <label for="reg-adm-email">Administrator Email (Login ID) *</label>
                    <input type="email" id="reg-adm-email" required placeholder="principal@oakridge.edu">
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div class="rex-form-group">
                      <label for="reg-adm-pass">Password * (Min 8 chars)</label>
                      <input type="password" id="reg-adm-pass" required minlength="8" placeholder="••••••••">
                    </div>
                    <div class="rex-form-group">
                      <label for="reg-adm-confirm">Confirm Password *</label>
                      <input type="password" id="reg-adm-confirm" required minlength="8" placeholder="••••••••">
                    </div>
                  </div>
                </div>
                <button type="submit" class="rex-btn-primary" id="btn-reg-submit" style="background: linear-gradient(135deg, #7c3aed, #6d28d9); font-weight: 800;">
                  <i class="fas fa-rocket"></i> Activate 7-Day Free Trial & Register School
                </button>
              </form>
            </div>

            <!-- TAB 1: SCHOOL SUPER ADMIN -->
            <div id="tab-admin" class="rex-tab-pane ${this.currentTab === 'admin' ? 'active' : ''}">
              <div class="rex-login-banner admin">
                <i class="fas fa-user-shield" style="font-size: 1.5rem;"></i>
                <div>
                  <strong>School Super Admin Sign In</strong>
                  <div>Institutional workspace management, admissions, fee cashiers & staff controls</div>
                </div>
              </div>
              <form id="admin-login-form" onsubmit="window.AuthUI.handleAdminLogin(event)">
                <div class="rex-form-group">
                  <label for="admin-school-id">School ID (e.g. GRX-SCH-XXXXXX, Optional for Default)</label>
                  <input type="text" id="admin-school-id" placeholder="e.g. GRX-SCH-B49F7A (Leave blank for default campus)" style="text-transform: uppercase; font-family: monospace; font-weight: 700;">
                </div>
                <div class="rex-form-group">
                  <label for="admin-user">Email or Username *</label>
                  <input type="text" id="admin-user" required placeholder="admin" value="admin" autocomplete="username">
                </div>
                <div class="rex-form-group">
                  <label for="admin-pass">Password *</label>
                  <input type="password" id="admin-pass" required placeholder="••••••••" value="AdminPassword123!" autocomplete="current-password">
                </div>
                <div style="display: flex; justify-content: flex-end; margin-top: -8px; margin-bottom: 12px;">
                  <a href="#" onclick="window.AuthUI.showForgotPasswordModal(); return false;" class="rex-btn-link" style="color: #2563eb; font-size: 0.76rem;">Forgot password?</a>
                </div>
                <div class="rex-demo-hint">
                  <i class="fas fa-info-circle"></i> Default Institutional Credentials: <code>admin</code> / <code>AdminPassword123!</code>
                </div>
                <button type="submit" class="rex-btn-primary admin" id="btn-admin-submit">
                  <i class="fas fa-sign-in-alt"></i> Sign In to School Workspace
                </button>
              </form>
            </div>

            <!-- TAB 2: TEACHER LOGIN -->
            <div id="tab-teacher" class="rex-tab-pane ${this.currentTab === 'teacher' ? 'active' : ''}">
              <div class="rex-login-banner teacher">
                <i class="fas fa-chalkboard-teacher" style="font-size: 1.5rem;"></i>
                <div>
                  <strong>Teacher & Faculty Access</strong>
                  <div style="font-size: 0.75rem; opacity: 0.9;">Sign in with your assigned Username and Password</div>
                </div>
              </div>

              <!-- Primary Mode: Username & Password -->
              <div id="teacher-pass-container">
                <form onsubmit="window.AuthUI.handleTeacherPasswordLogin(event)">
                  <div class="rex-form-group">
                    <label for="teacher-school-id">School ID (Optional)</label>
                    <input type="text" id="teacher-school-id" placeholder="e.g. GRX-SCH-XXXXXX (Optional)" autocomplete="organization">
                  </div>
                  <div class="rex-form-group">
                    <label for="teacher-email">Teacher Username / Email *</label>
                    <input type="text" id="teacher-email" required placeholder="maths@grexotix.edu or faculty username" value="maths@grexotix.edu" autocomplete="username">
                  </div>
                  <div class="rex-form-group">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <label for="teacher-pass" style="margin: 0;">Password *</label>
                      <a href="#" onclick="window.AuthUI.openForgotPasswordModal(); return false;" style="font-size: 0.75rem; color: #059669; text-decoration: none;">Forgot Password?</a>
                    </div>
                    <input type="password" id="teacher-pass" required placeholder="••••••••" value="AdminPassword123!" autocomplete="current-password" style="margin-top: 4px;">
                  </div>
                  <div class="rex-demo-hint">
                    <i class="fas fa-info-circle"></i> Faculty Credentials: <code>maths@grexotix.edu</code> / <code>AdminPassword123!</code>
                  </div>
                  <button type="submit" class="rex-btn-primary teacher" id="btn-teacher-pass-submit" style="background: linear-gradient(135deg, #059669, #047857); border-color: #047857;">
                    <i class="fas fa-sign-in-alt"></i> Sign In as Teacher
                  </button>
                  <div style="text-align: center; margin-top: 0.75rem;">
                    <button type="button" class="rex-btn-link" onclick="const el = document.getElementById('teacher-otp-container'); el.style.display = (el.style.display === 'none' ? 'block' : 'none');" style="font-size: 0.75rem; color: #059669;">
                      📱 Alternate: Sign in with Registered Mobile OTP
                    </button>
                  </div>
                </form>
              </div>

              <!-- Secondary Alternate Mode: OTP (Optional Toggle) -->
              <div id="teacher-otp-container" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed #cbd5e1;">
                <div id="teacher-step-1">
                  <form onsubmit="window.AuthUI.handleTeacherSendOtp(event)">
                    <div class="rex-form-group">
                      <label for="teacher-phone">Registered Mobile Number *</label>
                      <div class="rex-phone-input">
                        <span>+91</span>
                        <input type="tel" id="teacher-phone" maxlength="10" placeholder="9876500004" value="9876500004">
                      </div>
                    </div>
                    <button type="submit" class="rex-btn-primary teacher" id="btn-teacher-send" style="background: #059669; border-color: #047857;">
                      <i class="fas fa-paper-plane"></i> Send OTP Code
                    </button>
                  </form>
                </div>
                <div id="teacher-step-2" style="display: none;">
                  <form onsubmit="window.AuthUI.handleTeacherVerifyOtp(event)">
                    <div class="rex-otp-header">
                      <span>Enter 6-digit OTP sent to <strong id="teacher-sent-phone"></strong></span>
                      <button type="button" class="rex-btn-link" onclick="window.AuthUI.resetTeacherOtp()">Change</button>
                    </div>
                    <div class="rex-form-group">
                      <input type="text" id="teacher-otp" maxlength="6" placeholder="123456" class="rex-otp-box">
                    </div>
                    <button type="submit" class="rex-btn-primary teacher" id="btn-teacher-verify">
                      <i class="fas fa-check-circle"></i> Verify OTP & Enter Dashboard
                    </button>
                  </form>
                </div>
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
                  <input type="text" id="parent-adm" placeholder="e.g. REX-2024-001 (Optional)" value="">
                </div>
                <div class="rex-demo-hint">
                  <i class="fas fa-info-circle"></i> Registered Parent Mobile: <code>9876543210</code>
                </div>
                <button type="submit" class="rex-btn-primary parent" id="btn-parent-submit">
                  <i class="fas fa-sign-in-alt"></i> Enter Parent Portal
                </button>
              </form>
            </div>

            <!-- TAB 4: PLATFORM ADMIN -->
            <div id="tab-platform" class="rex-tab-pane ${this.currentTab === 'platform' ? 'active' : ''}">
              <div class="rex-login-banner" style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: #fff; padding: 0.85rem 1rem; border-radius: 6px; display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
                <i class="fas fa-crown" style="font-size: 1.5rem;"></i>
                <div>
                  <strong>Grexotix Platform Administrator</strong>
                  <div style="font-size: 0.75rem; opacity: 0.9;">Platform school registrations, tenant activations & multi-school metrics</div>
                </div>
              </div>
              <form id="platform-login-form" onsubmit="window.AuthUI.handlePlatformLogin(event)">
                <div class="rex-form-group">
                  <label for="platform-user">Platform Email or Username *</label>
                  <input type="text" id="platform-user" required placeholder="admin@grexotix.com" value="admin@grexotix.com" autocomplete="username">
                </div>
                <div class="rex-form-group">
                  <label for="platform-pass">Password *</label>
                  <input type="password" id="platform-pass" required placeholder="••••••••" value="GrexotixAdmin2026!" autocomplete="current-password">
                </div>
                <div class="rex-demo-hint">
                  <i class="fas fa-info-circle"></i> Platform Administrator: <code>admin@grexotix.com</code> / <code>GrexotixAdmin2026!</code>
                </div>
                <button type="submit" class="rex-btn-primary" id="btn-platform-submit" style="background: linear-gradient(135deg, #7c3aed, #6d28d9); border-color: #6d28d9; width: 100%;">
                  <i class="fas fa-sign-in-alt"></i> Access Platform Console
                </button>
              </form>
            </div>

            <!-- Registration Callout & Discreet Platform Access -->
            <div style="text-align: center; margin-top: 1.25rem; padding-top: 0.85rem; border-top: 1px dashed var(--border-subtle); font-size: 0.78rem; color: #64748b;">
              New School Institution? <a href="#" onclick="window.AuthUI.switchTab('register'); return false;" style="color: #673AB7; font-weight: 700;">Register Your School (7-Day Trial) &rarr;</a>
              &bull; <a href="#" onclick="window.AuthUI.hideLoginModal(); if(window.PlatformModule) window.PlatformModule.openStatusModal(); return false;" style="color: #1D2F80; font-weight: 600;">Track Status</a>
              <div style="margin-top: 6px; font-size: 0.72rem; opacity: 0.75;">
                <a href="#" onclick="window.AuthUI.switchTab('platform'); return false;" style="color: #64748b; text-decoration: none;">Authorized Platform Superadmin Console &rarr;</a>
              </div>
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

      const schoolId = document.getElementById('admin-school-id')?.value.trim();
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
        let res;
        if (schoolId) {
          res = await window.RexApi.loginSchool(schoolId, pass, user);
        } else {
          res = await window.RexApi.loginAdmin(user, pass);
        }
        this.hideLoginModal();
        this.renderUserBadge();

        if (res.user && res.user.role === 'PLATFORM_ADMIN') {
          window.RexApi.showToast('Grexotix Platform Admin authenticated!', 'success');
          if (window.App) {
            window.App.applyRole('platform_admin', false);
            window.App.switchView('platform-admin');
          }
        } else {
          window.RexApi.showToast('School Super Admin authenticated successfully!', 'success');
          if (window.App) {
            window.App.applyRole('admin', false);
            window.App.switchView('dashboard');
          }
        }
      } catch (err) {
        this.showError(err.message || 'Invalid credentials or School ID.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In to School Workspace';
      }
    },

    async handleRegisterSchool(e) {
      e.preventDefault();
      this.clearError();

      const schoolName = document.getElementById('reg-sch-name')?.value.trim();
      const schoolEmail = document.getElementById('reg-sch-email')?.value.trim();
      const schoolPhone = document.getElementById('reg-sch-phone')?.value.trim();
      const cityState = document.getElementById('reg-sch-city')?.value.trim() || 'Bengaluru, Karnataka - 560001';
      const address = document.getElementById('reg-sch-address')?.value.trim() || 'Campus Road';
      const adminName = document.getElementById('reg-adm-name')?.value.trim();
      const adminMobile = document.getElementById('reg-adm-mobile')?.value.trim();
      const adminEmail = document.getElementById('reg-adm-email')?.value.trim();
      const pass = document.getElementById('reg-adm-pass')?.value.trim();
      const confirmPass = document.getElementById('reg-adm-confirm')?.value.trim();

      if (pass !== confirmPass) {
        this.showError('Password and password confirmation do not match.');
        return;
      }

      const btn = document.getElementById('btn-reg-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Activating 7-Day Free Trial...';

      try {
        const res = await window.RexApi.registerSchool({
          schoolName,
          displayName: schoolName,
          schoolEmail,
          schoolPhone,
          address,
          city: cityState.split(',')[0]?.trim() || 'Bengaluru',
          state: cityState.split(',')[1]?.split('-')[0]?.trim() || 'Karnataka',
          postalCode: cityState.split('-')[1]?.trim() || '560001',
          adminName,
          adminEmail,
          adminMobile,
          password: pass,
          confirmPassword: confirmPass
        });

        this.hideLoginModal();
        this.showRegistrationSuccessModal(res);
      } catch (err) {
        this.showError(err.message || 'School registration failed. Please check your details.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-rocket"></i> Activate 7-Day Free Trial & Register School';
      }
    },

    showRegistrationSuccessModal(data) {
      let modal = document.getElementById('rex-reg-success-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'rex-reg-success-modal';
        modal.className = 'rex-modal-overlay';
        document.body.appendChild(modal);
      }

      const schoolId = data.schoolId || data.school?.code || 'GRX-SCH-ACTIVE';
      const trialEnds = data.trial?.endsAt ? new Date(data.trial.endsAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '7 Days from today';
      const adminEmail = data.user?.email || '';

      modal.innerHTML = `
        <div class="rex-modal-card" style="max-width: 520px; width: 95%; text-align: center;">
          <div style="padding: 2rem 1.5rem;">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); color: white; display: flex; align-items: center; justify-content: center; font-size: 2.4rem; margin: 0 auto 1.25rem auto; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);">
              ✓
            </div>
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.4rem; color: #0f172a; font-weight: 800;">
              School Registered Successfully!
            </h3>
            <p style="font-size: 0.88rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.5;">
              Welcome <strong>${data.school?.name || 'School Campus'}</strong>! Your official institutional tenant has been created on Grexotix SaaS.
            </p>

            <div style="background: linear-gradient(135deg, #f5f3ff, #ede9fe); border: 2px solid #7c3aed; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
              <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: #6d28d9; font-weight: 800;">
                Permanent Unique School ID
              </div>
              <div style="font-size: 1.9rem; font-weight: 900; color: #5b21b6; letter-spacing: 0.05em; margin: 0.4rem 0;">
                ${schoolId}
              </div>
              <div style="display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 700; color: #047857; margin-bottom: 0.75rem;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
                7-Day Free Trial Active &bull; Valid until ${trialEnds}
              </div>
              <button type="button" class="btn btn-sm btn-outline" onclick="window.AuthUI.copySchoolId('${schoolId}')" style="background: #ffffff; border-color: #7c3aed; color: #6d28d9; font-weight: 700;">
                📋 Copy School ID
              </button>
            </div>

            <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 1.75rem; line-height: 1.5;">
              Account details and verification notice have been dispatched to <strong>${adminEmail}</strong>.
            </div>

            <button type="button" class="btn btn-primary btn-block" onclick="document.getElementById('rex-reg-success-modal').style.display='none'; window.AuthUI.renderUserBadge(); window.AuthUI.routeToDashboard();" style="background: linear-gradient(135deg, #7c3aed, #5b21b6); border-color: #5b21b6; font-weight: 800; padding: 0.85rem; font-size: 0.95rem; width: 100%;">
              🚀 Launch School Workspace Dashboard
            </button>
          </div>
        </div>
      `;

      modal.style.display = 'flex';
    },

    copySchoolId(id) {
      if (!id) return;
      navigator.clipboard.writeText(id).then(() => {
        window.RexApi.showToast(`School ID ${id} copied to clipboard!`, 'success');
      }).catch(() => {
        prompt('Permanent School ID:', id);
      });
    },

    showForgotPasswordModal() {
      this.hideLoginModal();
      let modal = document.getElementById('rex-forgot-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'rex-forgot-modal';
        modal.className = 'rex-modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="rex-modal-card" style="max-width: 440px; width: 95%;">
          <div class="rex-modal-header" style="background:#fff; border-bottom:1px solid var(--border-subtle); padding: 1.25rem 1.5rem;">
            <div class="rex-modal-title-group">
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #0f172a;">Password Recovery</h3>
              <p style="margin: 0.15rem 0 0 0; font-size: 0.75rem; color: #64748b;">Grexotix Account Recovery & Reset</p>
            </div>
            <button type="button" class="rex-modal-close" onclick="document.getElementById('rex-forgot-modal').style.display='none'">&times;</button>
          </div>
          <div class="rex-modal-body" style="padding: 1.5rem;">
            <div id="forgot-error-banner" class="rex-auth-error-banner" style="display: none;"></div>
            <div id="forgot-step-1">
              <p style="font-size: 0.82rem; color: #64748b; margin-bottom: 1.25rem; line-height: 1.5;">
                Enter your registered administrator or user email address to receive password reset authorization.
              </p>
              <form onsubmit="window.AuthUI.handleForgotPasswordSubmit(event)">
                <div class="rex-form-group">
                  <label>Registered Email Address *</label>
                  <input type="email" id="forgot-email" required placeholder="admin@school.edu">
                </div>
                <div class="rex-form-group">
                  <label>School ID (Optional)</label>
                  <input type="text" id="forgot-school-id" placeholder="e.g. GRX-SCH-XXXXXX" style="text-transform: uppercase;">
                </div>
                <button type="submit" class="rex-btn-primary admin" id="btn-forgot-send" style="margin-top: 1rem;">
                  <i class="fas fa-paper-plane"></i> Send Password Reset Link
                </button>
              </form>
            </div>
            <div id="forgot-step-2" style="display: none;">
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; font-size: 0.82rem; color: #065f46;">
                <strong>✓ Reset Instructions Sent!</strong>
                <div id="forgot-token-hint" style="margin-top: 0.35rem; font-size: 0.76rem;"></div>
              </div>
              <form onsubmit="window.AuthUI.handleResetPasswordSubmit(event)">
                <div class="rex-form-group">
                  <label>Reset Token Code *</label>
                  <input type="text" id="reset-token-input" required placeholder="Enter token from email">
                </div>
                <div class="rex-form-group">
                  <label>New Secure Password * (Min 8 chars)</label>
                  <input type="password" id="reset-new-pass" required minlength="8" placeholder="••••••••">
                </div>
                <button type="submit" class="rex-btn-primary admin" id="btn-reset-submit">
                  <i class="fas fa-key"></i> Update Password & Sign In
                </button>
              </form>
            </div>
          </div>
        </div>
      `;

      modal.style.display = 'flex';
    },

    async handleForgotPasswordSubmit(e) {
      e.preventDefault();
      const email = document.getElementById('forgot-email')?.value.trim();
      const schoolId = document.getElementById('forgot-school-id')?.value.trim();
      const btn = document.getElementById('btn-forgot-send');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

      try {
        const res = await window.RexApi.forgotPassword(email, schoolId);
        document.getElementById('forgot-step-1').style.display = 'none';
        document.getElementById('forgot-step-2').style.display = 'block';
        if (res.devToken) {
          document.getElementById('reset-token-input').value = res.devToken;
          document.getElementById('forgot-token-hint').textContent = `Test token generated: ${res.devToken}`;
        }
        window.RexApi.showToast('Password reset token dispatched successfully!', 'success');
      } catch (err) {
        const banner = document.getElementById('forgot-error-banner');
        if (banner) {
          banner.textContent = err.message || 'Failed to request password reset.';
          banner.style.display = 'block';
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Password Reset Link';
      }
    },

    async handleResetPasswordSubmit(e) {
      e.preventDefault();
      const token = document.getElementById('reset-token-input')?.value.trim();
      const newPassword = document.getElementById('reset-new-pass')?.value.trim();
      const btn = document.getElementById('btn-reset-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

      try {
        await window.RexApi.resetPassword(token, newPassword);
        window.RexApi.showToast('Password reset successfully! Please sign in with your new password.', 'success');
        document.getElementById('rex-forgot-modal').style.display = 'none';
        this.showLoginModal();
      } catch (err) {
        const banner = document.getElementById('forgot-error-banner');
        if (banner) {
          banner.textContent = err.message || 'Failed to reset password. Invalid or expired token.';
          banner.style.display = 'block';
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-key"></i> Update Password & Sign In';
      }
    },

    async showSubscriptionModal() {
      let modal = document.getElementById('rex-subscription-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'rex-subscription-modal';
        modal.className = 'rex-modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="rex-modal-card" style="max-width: 780px; width: 95%;">
          <div class="rex-modal-header" style="background:#fff; border-bottom:1px solid var(--border-subtle); padding: 1.25rem 1.5rem;">
            <div class="rex-modal-title-group">
              <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: #0f172a;">Subscription & Plan Management</h3>
              <p style="margin: 0.15rem 0 0 0; font-size: 0.75rem; color: #64748b;">Grexotix School SaaS &bull; Verified Gateway & Invoicing</p>
            </div>
            <button type="button" class="rex-modal-close" onclick="document.getElementById('rex-subscription-modal').style.display='none'">&times;</button>
          </div>
          <div class="rex-modal-body" style="padding: 1.5rem;" id="subscription-modal-body">
            <div style="text-align: center; padding: 2rem;">
              <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #7c3aed;"></i>
              <div style="margin-top: 0.75rem; color: #64748b; font-size: 0.85rem;">Loading subscription status and plans...</div>
            </div>
          </div>
        </div>
      `;
      modal.style.display = 'flex';

      try {
        const [statusData, plansData] = await Promise.all([
          window.RexApi.getSubscriptionStatus(),
          window.RexApi.getSubscriptionPlans()
        ]);

        const body = document.getElementById('subscription-modal-body');
        if (!body) return;

        const subStatus = statusData.subscriptionStatus || 'TRIAL_ACTIVE';
        const isPaid = statusData.subscription?.isPaid;
        const daysLeft = statusData.trial?.daysRemaining || 0;
        const plans = plansData.plans || [];

        let statusBanner = '';
        if (isPaid) {
          statusBanner = `
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 1.75rem; color: #059669;">✓</span>
                <div>
                  <div style="font-weight: 800; color: #065f46; font-size: 0.95rem;">Active Paid Subscription (${statusData.subscription.planId})</div>
                  <div style="font-size: 0.76rem; color: #047857;">Valid until: ${new Date(statusData.subscription.endsAt).toLocaleDateString()} &bull; Payment Ref: ${statusData.subscription.verifiedPaymentRef || 'Verified'}</div>
                </div>
              </div>
              <span class="badge" style="background:#059669; color:#fff; font-size:0.75rem; padding: 4px 10px;">ACTIVE</span>
            </div>
          `;
        } else if (daysLeft > 0) {
          statusBanner = `
            <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 1.75rem; color: #7c3aed;">⏳</span>
                <div>
                  <div style="font-weight: 800; color: #5b21b6; font-size: 0.95rem;">7-Day Free Trial Active (${daysLeft} Days Remaining)</div>
                  <div style="font-size: 0.76rem; color: #6d28d9;">Trial expires on: ${new Date(statusData.trial.endsAt).toLocaleDateString()} &bull; Upgrade to prevent service disruption</div>
                </div>
              </div>
              <span class="badge" style="background:#7c3aed; color:#fff; font-size:0.75rem; padding: 4px 10px;">TRIAL ACTIVE</span>
            </div>
          `;
        } else {
          statusBanner = `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 1.75rem; color: #dc2626;">⚠️</span>
                <div>
                  <div style="font-weight: 800; color: #991b1b; font-size: 0.95rem;">7-Day Free Trial Expired</div>
                  <div style="font-size: 0.76rem; color: #b91c1c;">New records are locked. Choose a plan below to immediately restore full write operations.</div>
                </div>
              </div>
              <span class="badge" style="background:#dc2626; color:#fff; font-size:0.75rem; padding: 4px 10px;">EXPIRED</span>
            </div>
          `;
        }

        body.innerHTML = `
          ${statusBanner}

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            ${plans.map(p => `
              <div style="background: #ffffff; border: 2px solid ${p.id === 'GROWTH' ? '#7c3aed' : '#e2e8f0'}; border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
                ${p.id === 'GROWTH' ? '<span style="position: absolute; top: -10px; right: 12px; background: #7c3aed; color: #fff; font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 10px;">MOST POPULAR</span>' : ''}
                <div>
                  <h4 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #0f172a;">${p.name}</h4>
                  <div style="font-size: 1.4rem; font-weight: 900; color: #7c3aed; margin: 0.5rem 0;">
                    ₹${p.priceMonthly.toLocaleString()} <span style="font-size: 0.75rem; font-weight: 600; color: #64748b;">/ month</span>
                  </div>
                  <ul style="list-style: none; padding: 0; margin: 0.75rem 0 1rem 0; font-size: 0.78rem; color: #475569; display: flex; flex-direction: column; gap: 0.4rem;">
                    ${p.features.map(f => `<li>✓ ${f}</li>`).join('')}
                  </ul>
                </div>
                <button type="button" class="btn btn-primary" onclick="window.AuthUI.activatePlan('${p.id}', 'MONTHLY')" style="width: 100%; font-size: 0.82rem; font-weight: 800; background: ${p.id === 'GROWTH' ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#1e3a8a'};">
                  Activate & Pay (Sandbox)
                </button>
              </div>
            `).join('')}
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; font-size: 0.78rem; color: #64748b;">
            🔒 <strong>Secure Invoicing & Sandbox Verification</strong>: All subscription upgrades generate server-verified tax invoices and receipts dispatched to the school administrator's registered email address.
          </div>
        `;
      } catch (err) {
        const body = document.getElementById('subscription-modal-body');
        if (body) {
          body.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1.5rem; text-align: center; color: #991b1b;">
              <p>Failed to load subscription status: ${err.message || 'Server error'}</p>
              <button class="btn btn-secondary btn-sm" onclick="window.AuthUI.showSubscriptionModal()">Retry</button>
            </div>
          `;
        }
      }
    },

    async activatePlan(planId, billingCycle = 'MONTHLY') {
      try {
        const res = await window.RexApi.verifySubscription({
          planId,
          billingCycle,
          transactionRef: `TXN-SANDBOX-${Date.now()}`,
          paymentMethod: 'UPI_SANDBOX'
        });

        window.RexApi.showToast(`Plan ${planId} activated successfully! Invoice ${res.invoiceNumber} generated.`, 'success');
        document.getElementById('rex-subscription-modal').style.display = 'none';
        this.renderUserBadge();
      } catch (err) {
        window.RexApi.showToast(err.message || 'Failed to activate plan.', 'error');
      }
    },

    async handlePlatformLogin(e) {
      e.preventDefault();
      this.clearError();

      const user = document.getElementById('platform-user').value.trim();
      const pass = document.getElementById('platform-pass').value.trim();

      if (!user || !pass) {
        this.showError('Please enter both platform username/email and password.');
        return;
      }

      const btn = document.getElementById('btn-platform-submit');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';

      try {
        const res = await window.RexApi.loginAdmin(user, pass);
        this.hideLoginModal();
        this.renderUserBadge();

        window.RexApi.showToast('Grexotix Platform Admin authenticated!', 'success');
        if (window.App) {
          window.App.applyRole('platform_admin', false);
          window.App.switchView('platform-admin');
        }
      } catch (err) {
        this.showError(err.message || 'Invalid Platform Admin credentials.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Access Platform Console';
      }
    },

    async handleTeacherPasswordLogin(e) {
      e.preventDefault();
      this.clearError();

      const schoolId = (document.getElementById('teacher-school-id')?.value || '').trim();
      const identifier = (document.getElementById('teacher-email')?.value || '').trim();
      const password = (document.getElementById('teacher-pass')?.value || '').trim();

      if (!identifier || !password) {
        this.showError('Please enter both teacher username/email and password.');
        return;
      }

      const btn = document.getElementById('btn-teacher-pass-submit');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
      }

      try {
        let authResult;
        if (schoolId) {
          authResult = await window.RexApi.loginSchool(schoolId, password, identifier);
        } else {
          authResult = await window.RexApi.login({ username: identifier, email: identifier, password, role: 'TEACHER' });
        }

        window.RexApi.showToast('Welcome, Faculty! Successfully signed in.', 'success');
        this.hideLoginModal();
        this.renderUserBadge();

        if (window.App) {
          window.App.applyRole('teacher', false);
          window.App.switchView('teacher-dashboard');
        }
      } catch (err) {
        this.showError(err.message || 'Invalid teacher credentials. Please check your username and password.');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In as Teacher';
        }
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
          window.App.switchView('teacher-dashboard');
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
        await window.RexApi.login({ identifier: email, email, username: email, password: pass, role: 'TEACHER' });
        window.RexApi.showToast('Teacher authenticated successfully!', 'success');
        this.hideLoginModal();
        this.renderUserBadge();

        if (window.App) {
          window.App.applyRole('teacher', false);
          window.App.switchView('teacher-dashboard');
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
      max-height: 90vh;
      display: flex;
      flex-direction: column;
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
      overflow-y: auto;
      flex: 1;
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
