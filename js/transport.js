/**
 * Rex Senior Secondary School - GPS Transport & 500m Proximity Geofencing Engine
 * High-precision School Bus Tracker for Morning Pickup & Evening Drop-off
 */

const TransportModule = {
  selectedRouteId: 'route-02',
  tripMode: 'morning', // 'morning' or 'evening'
  animationTimer: null,
  isAnimating: false,
  currentProgressPercent: 68, // 0 to 100 along the path
  soundEnabled: true,
  lastAlertTriggered: null,

  init() {
    this.attachEventListeners();
    console.log("Rex SSS Transport & 500m Geofencing Engine initialized.");
  },

  attachEventListeners() {
    // Global listener for modal close or escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeProximityModal();
      }
    });
  },

  selectRoute(routeId) {
    this.selectedRouteId = routeId;
    this.currentProgressPercent = (routeId === 'route-02') ? 68 : 35;
    this.render();
  },

  selectTripMode(mode) {
    this.tripMode = mode;
    this.currentProgressPercent = (mode === 'morning') ? 68 : 25;
    this.render();
    if (window.App && App.showToast) {
      App.showToast(`Switched to ${mode.toUpperCase()} Transit Schedule`, "info");
    }
  },

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    const btn = document.getElementById('btn-toggle-sound');
    if (btn) {
      btn.innerHTML = this.soundEnabled ? '🔔 Sound On' : '🔕 Muted';
      btn.classList.toggle('btn-primary', this.soundEnabled);
      btn.classList.toggle('btn-secondary', !this.soundEnabled);
    }
    if (this.soundEnabled) {
      this.playChime();
    }
  },

  // Synthesize a chime via Web Audio API (cross-browser, zero external files)
  playChime() {
    if (!this.soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      // First chime tone (D5 - 587.33Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Second high chime tone (A5 - 880Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.18);
      gain2.gain.setValueAtTime(0.3, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.85);
    } catch (e) {
      console.log("Audio notification status:", e);
    }
  },

  // 1-Click Simulator Button: Forces immediate 500m proximity trigger
  simulate500mAlert() {
    this.currentProgressPercent = 68;
    this.triggerProximityAlert(480);
  },

  triggerProximityAlert(distanceMeters) {
    const route = ERPStorage.getBusRouteById(this.selectedRouteId);
    const schedule = route[this.tripMode];
    const studentStop = schedule.stops.find(s => s.isStudentStop) || schedule.stops[1];

    this.playChime();
    this.openProximityModal(route, studentStop, distanceMeters);

    if (window.App && App.showToast) {
      App.showToast(`🚨 BUS 500m PROXIMITY ALERT: ${route.vehicleNo} is ${distanceMeters}m away from ${studentStop.name}!`, "warning");
    }

    // Update activity log
    ERPStorage.addActivity(`500m Proximity Alert sent to Rajesh Sharma: Bus ${route.vehicleNo} at ${studentStop.name}`);
  },

  openProximityModal(route, stop, distanceMeters) {
    let modal = document.getElementById('bus-proximity-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bus-proximity-modal';
      modal.className = 'modal-overlay open';
      document.body.appendChild(modal);
    }

    const etaMins = Math.max(1, Math.round(distanceMeters / (route.speed * 1000 / 60)));
    const tripName = this.tripMode === 'morning' ? 'Morning Pickup' : 'Evening Drop-off';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 520px; border-top: 6px solid #f59e0b; animation: scaleIn 0.25s ease;">
        <div class="modal-header" style="background: linear-gradient(135deg, #fffbeb, #fef3c7);">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: #f59e0b; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; box-shadow: 0 0 15px rgba(245, 158, 11, 0.5); animation: pulse 1.2s infinite;">
              🔔
            </div>
            <div>
              <h3 class="modal-title" style="color: #92400e; font-size: 1.15rem;">500m Proximity Geofence Alert!</h3>
              <div style="font-size: 0.75rem; color: #b45309; font-weight: 700;">Rex SSS Automated Fleet Telemetry System</div>
            </div>
          </div>
          <button type="button" class="modal-close-btn" onclick="TransportModule.closeProximityModal()">&times;</button>
        </div>

        <div class="modal-body" style="padding: 1.5rem;">
          <!-- Live Distance Hero Badge -->
          <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #fff; padding: 1.25rem; border-radius: var(--radius-md); text-align: center; margin-bottom: 1.25rem; box-shadow: var(--shadow-md);">
            <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.9;">
              ${tripName} • Bus Approaching Stop
            </div>
            <div style="font-size: 2.2rem; font-weight: 800; margin: 0.25rem 0;">
              ${distanceMeters} Meters Away
            </div>
            <div style="font-size: 0.85rem; font-weight: 600; opacity: 0.95;">
              Estimated Arrival at Stop: <span style="background: #22c55e; color: #000; padding: 2px 8px; border-radius: 12px; font-weight: 800;">${etaMins} mins</span>
            </div>
          </div>

          <!-- Ward & Location Details -->
          <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Student:</span>
              <strong style="color: var(--text-primary);">Aarav Sharma (Grade 10-A)</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Boarding Stop:</span>
              <strong style="color: var(--primary);">${stop.name}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Vehicle & Route:</span>
              <span>${route.vehicleNo} (${route.routeNumber})</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Current Speed:</span>
              <span style="color: #16a34a; font-weight: 700;">${route.speed} km/h (Normal Hill Transit)</span>
            </div>
          </div>

          <!-- Driver Contact Card -->
          <div style="border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; background: var(--bg-surface);">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: #0284c7; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">
                JS
              </div>
              <div>
                <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">${route.driverName}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Attendant: ${route.attendantName}</div>
              </div>
            </div>
            <a href="tel:${route.driverPhone}" class="btn btn-sm btn-primary" style="display: flex; align-items: center; gap: 0.35rem; text-decoration: none;">
              📞 Call Driver
            </a>
          </div>

          <!-- Automated WhatsApp Message Copy Preview -->
          <div style="background: #e2f7cb; border: 1px solid #b2df8a; border-radius: var(--radius-md); padding: 0.85rem; font-size: 0.75rem; color: #111; line-height: 1.45;">
            <div style="font-weight: 800; color: #075e54; margin-bottom: 0.3rem;">✓ AUTOMATED WHATSAPP BROADCAST DISPATCHED:</div>
            "🚨 *REX SSS 500m PROXIMITY ALERT*: School bus *${route.vehicleNo}* is *${distanceMeters}m* away from *${stop.name}* (approx. ${etaMins} mins). Please ensure Aarav Sharma is ready at the pickup boarding point! Driver: ${route.driverName} (${route.driverPhone})."
          </div>
        </div>

        <div class="modal-footer" style="background: var(--bg-subtle);">
          <button type="button" class="btn btn-secondary" onclick="TransportModule.closeProximityModal()">Close Alert</button>
          <button type="button" class="btn btn-primary" onclick="TransportModule.closeProximityModal(); App.showToast('Parent confirmed ready at pickup stop', 'success');">
            ✓ Ward is Ready at Stop
          </button>
        </div>
      </div>
    `;

    modal.classList.add('open');
  },

  closeProximityModal() {
    const modal = document.getElementById('bus-proximity-modal');
    if (modal) modal.classList.remove('open');
  },

  // Toggle Live Journey Animation along the path
  toggleJourneyAnimation() {
    if (this.isAnimating) {
      this.stopJourneyAnimation();
    } else {
      this.startJourneyAnimation();
    }
  },

  startJourneyAnimation() {
    this.isAnimating = true;
    const btn = document.getElementById('btn-animate-journey');
    if (btn) btn.innerHTML = '⏸ Pause Journey';

    if (this.animationTimer) clearInterval(this.animationTimer);
    this.animationTimer = setInterval(() => {
      this.currentProgressPercent += 1;
      if (this.currentProgressPercent > 98) {
        this.currentProgressPercent = 10; // loop back
      }

      // Check distance to 500m mark around 68%
      if (this.currentProgressPercent === 68) {
        this.triggerProximityAlert(480);
      }

      this.updateBusMarkerPosition();
    }, 400);
  },

  stopJourneyAnimation() {
    this.isAnimating = false;
    if (this.animationTimer) clearInterval(this.animationTimer);
    const btn = document.getElementById('btn-animate-journey');
    if (btn) btn.innerHTML = '▶ Play Live Journey';
  },

  updateBusMarkerPosition() {
    const marker = document.getElementById('live-bus-marker');
    const distLabel = document.getElementById('live-bus-distance-tag');
    if (!marker) return;

    // SVG path coordinate interpolation (approximate linear progression along 4-stop curve)
    const pct = this.currentProgressPercent;
    marker.style.left = `${pct}%`;

    // Compute synthetic distance based on progress
    let dist = Math.abs(Math.round((68 - pct) * 45));
    if (distLabel) {
      if (pct < 68) {
        distLabel.textContent = `${dist + 480}m to Student Stop`;
      } else if (pct === 68) {
        distLabel.textContent = `🎯 480m (At Geofence!)`;
      } else {
        distLabel.textContent = `${(pct - 68) * 35}m past Stop`;
      }
    }
  },

  // Master Render for Parent Portal Widget
  renderParentWidget(containerId) {
    const container = document.getElementById(containerId || 'parent-bus-widget');
    if (!container) return;

    const route = ERPStorage.getBusRouteById(this.selectedRouteId);
    const schedule = route[this.tripMode];
    const studentStop = schedule.stops.find(s => s.isStudentStop) || schedule.stops[1];

    container.innerHTML = `
      <div class="card" style="border: 1px solid var(--border-medium); box-shadow: var(--shadow-md);">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <h3 class="card-title" style="margin: 0; font-size: 1.15rem;">🚌 School Bus Live GPS Tracker</h3>
              <span class="badge badge-present" style="animation: pulse 2s infinite;">● Live Telemetry</span>
            </div>
            <p class="card-subtitle" style="margin: 0.2rem 0 0 0;">
              ${route.vehicleNo} • ${route.model} • Driver: ${route.driverName} (${route.driverPhone})
            </p>
          </div>

          <!-- Trip Mode Pill Toggle (Morning vs Evening) -->
          <div style="display: flex; align-items: center; gap: 0.4rem; background: var(--bg-subtle); padding: 0.25rem 0.35rem; border-radius: var(--radius-full); border: 1px solid var(--border-subtle);">
            <button type="button" class="btn btn-sm ${this.tripMode === 'morning' ? 'btn-primary' : 'btn-ghost'}" onclick="TransportModule.selectTripMode('morning')" style="border-radius: var(--radius-full); font-size: 0.75rem; padding: 0.35rem 0.85rem;">
              🌅 Morning Pickup
            </button>
            <button type="button" class="btn btn-sm ${this.tripMode === 'evening' ? 'btn-primary' : 'btn-ghost'}" onclick="TransportModule.selectTripMode('evening')" style="border-radius: var(--radius-full); font-size: 0.75rem; padding: 0.35rem 0.85rem;">
              🌆 Evening Drop-off
            </button>
          </div>
        </div>

        <div class="card-body">
          <!-- 500m Geofence Highlight Alert Bar -->
          <div style="background: linear-gradient(90deg, #eff6ff, #dbeafe); border: 1px solid #bfdbfe; border-left: 5px solid #2563eb; border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">
                🎯
              </div>
              <div>
                <div style="font-weight: 800; font-size: 0.9rem; color: #1e3a8a;">
                  500m Proximity Geofencing Active
                </div>
                <div style="font-size: 0.75rem; color: #3b82f6;">
                  Target Stop: <strong>${studentStop.name}</strong> • Current Proximity: <strong id="live-bus-distance-tag" style="color: #1e3a8a;">480m (Within Geofence)</strong>
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <button type="button" class="btn btn-sm btn-primary" onclick="TransportModule.simulate500mAlert()" style="background: #f59e0b; border-color: #f59e0b; color: #000; font-weight: 800; font-size: 0.75rem; box-shadow: 0 2px 8px rgba(245,158,11,0.4);" title="Test the 500m proximity alarm and alert popup">
                ⚡ Trigger 500m Alert Now
              </button>
              <button type="button" id="btn-toggle-sound" class="btn btn-sm ${this.soundEnabled ? 'btn-primary' : 'btn-secondary'}" onclick="TransportModule.toggleSound()" style="font-size: 0.75rem;">
                ${this.soundEnabled ? '🔔 Sound On' : '🔕 Muted'}
              </button>
            </div>
          </div>

          <!-- Interactive SVG/Topographical Nilgiris Hill Route Map -->
          <div style="position: relative; height: 230px; background: radial-gradient(circle at 10% 20%, #f1f5f9 0%, #e2e8f0 100%); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 1.25rem;">
            <!-- Nilgiris hill topo grid lines -->
            <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.25;" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#64748b" stroke-width="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            <!-- Curving Transit Highway Line -->
            <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" xmlns="http://www.w3.org/2000/svg">
              <!-- Route background track -->
              <path d="M 40,115 C 200,60 400,170 650,90 S 900,140 1100,115" fill="none" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round"/>
              <!-- Completed route track -->
              <path d="M 40,115 C 200,60 400,170 650,90 S 760,110 820,112" fill="none" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/>
            </svg>

            <!-- 500m Radar Geofence Ring Around Student Stop -->
            <div style="position: absolute; left: 70%; top: calc(50% - 40px); width: 80px; height: 80px; border-radius: 50%; background: rgba(37, 99, 235, 0.12); border: 2px dashed #2563eb; transform: translate(-50%, -50%); animation: radarPulse 2s infinite; pointer-events: none;">
              <span style="position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 0.65rem; font-weight: 800; color: #1e3a8a; background: #dbeafe; padding: 1px 6px; border-radius: 8px; white-space: nowrap;">
                500m Geofence
              </span>
            </div>

            <!-- Route Stop Waypoint Markers -->
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 5%;">
              ${schedule.stops.map((stop, idx) => {
                const isPassed = stop.status === 'passed';
                const isStudent = stop.isStudentStop;
                return `
                  <div style="display: flex; flex-direction: column; align-items: center; text-align: center; z-index: 2;">
                    <div style="width: ${isStudent ? '34px' : '26px'}; height: ${isStudent ? '34px' : '26px'}; border-radius: 50%; background: ${isStudent ? '#f59e0b' : (isPassed ? '#10b981' : '#fff')}; border: 3px solid ${isStudent ? '#fff' : (isPassed ? '#10b981' : '#94a3b8')}; color: ${isPassed || isStudent ? '#fff' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: ${isStudent ? '1rem' : '0.7rem'}; font-weight: 800; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                      ${isStudent ? '★' : (isPassed ? '✓' : (idx + 1))}
                    </div>
                    <div style="margin-top: 0.35rem; font-size: 0.72rem; font-weight: ${isStudent ? '800' : '600'}; color: ${isStudent ? '#1e3a8a' : 'var(--text-primary)'}; max-width: 90px; line-height: 1.2;">
                      ${stop.name.split(' ')[0]}
                    </div>
                    <div style="font-size: 0.65rem; color: var(--text-muted);">${stop.time}</div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Moving Live School Bus Marker -->
            <div id="live-bus-marker" style="position: absolute; left: ${this.currentProgressPercent}%; top: calc(50% - 14px); transform: translate(-50%, -50%); z-index: 5; transition: left 0.35s ease;">
              <div style="width: 44px; height: 44px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.6); border: 2px solid #fff;">
                🚌
              </div>
              <div style="position: absolute; top: -22px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); color: #fff; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; white-space: nowrap;">
                ${route.speed} km/h
              </div>
            </div>
          </div>

          <!-- Bottom Telemetry & Controls Strip -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1rem; font-size: 0.82rem;">
            <div style="background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted); font-size: 0.72rem; display: block;">DRIVER</span>
              <strong style="color: var(--text-primary);">${route.driverName}</strong>
              <div style="color: var(--primary); font-size: 0.75rem;">${route.driverPhone}</div>
            </div>

            <div style="background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted); font-size: 0.72rem; display: block;">VEHICLE</span>
              <strong style="color: var(--text-primary);">${route.vehicleNo}</strong>
              <div style="color: var(--text-muted); font-size: 0.75rem;">Speed: ${route.speed} km/h • GPS OK</div>
            </div>

            <div style="background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted); font-size: 0.72rem; display: block;">CURRENT DESTINATION</span>
              <strong style="color: #16a34a;">${schedule.destination}</strong>
              <div style="color: var(--text-muted); font-size: 0.75rem;">Departs: ${schedule.departs}</div>
            </div>

            <div style="background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted); font-size: 0.72rem; display: block;">ATTENDANT</span>
              <strong style="color: var(--text-primary);">${route.attendantName}</strong>
              <div style="color: var(--text-muted); font-size: 0.75rem;">${route.attendantPhone}</div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button type="button" id="btn-animate-journey" class="btn btn-outline" onclick="TransportModule.toggleJourneyAnimation()" style="font-size: 0.85rem;">
              ${this.isAnimating ? '⏸ Pause Journey' : '▶ Play Live Journey'}
            </button>
            <a href="tel:${route.driverPhone}" class="btn btn-secondary" style="text-decoration: none; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
              📞 Call Driver
            </a>
            <button type="button" class="btn btn-outline" onclick="TransportModule.selectRoute('route-02')" style="font-size: 0.85rem; margin-left: auto;">
              🔄 Refresh Telemetry
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Master Render for Full School-Wide Transport & Fleet Management View
  renderAdminFleet(containerId) {
    const container = document.getElementById(containerId || 'transport-view-content');
    if (!container) return;

    const routes = ERPStorage.getBusRoutes();

    container.innerHTML = `
      <div style="margin-bottom: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin: 0;">🚌 Transport & GPS Fleet Management</h2>
            <p style="color: var(--text-secondary); margin: 0.25rem 0 0 0; font-size: 0.9rem;">
              Real-time Nilgiris GPS tracking, driver manifests, geofencing proximity alerts, and bus speed telemetry.
            </p>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button type="button" class="btn btn-secondary" onclick="TransportModule.simulate500mAlert()">
              ⚡ Test 500m Geofence Alert
            </button>
            <button type="button" class="btn btn-primary" onclick="App.showToast('All 4 Nilgiris buses synced with GPS Satellites', 'success')">
              🛰️ Sync GPS Fleet
            </button>
          </div>
        </div>
      </div>

      <!-- Fleet Overview KPI Cards -->
      <div class="dashboard-metrics-grid" style="margin-bottom: 2rem;">
        <div class="metric-card metric-primary">
          <div class="metric-icon-box">🚌</div>
          <div class="metric-info">
            <div class="metric-title">Total Active Buses</div>
            <div class="metric-value">4 Fleets</div>
            <div class="metric-trend trend-up">100% Vehicles Operational</div>
          </div>
        </div>

        <div class="metric-card metric-success">
          <div class="metric-icon-box">🛡️</div>
          <div class="metric-info">
            <div class="metric-title">500m Geofence Status</div>
            <div class="metric-value">Active</div>
            <div class="metric-trend trend-up">Automated WhatsApp Alerts ON</div>
          </div>
        </div>

        <div class="metric-card metric-purple">
          <div class="metric-icon-box">👥</div>
          <div class="metric-info">
            <div class="metric-title">Students on Transit</div>
            <div class="metric-value">138 Scholars</div>
            <div class="metric-trend trend-up">All Boardings Verified by RFID</div>
          </div>
        </div>

        <div class="metric-card metric-warning">
          <div class="metric-icon-box">⛰️</div>
          <div class="metric-info">
            <div class="metric-title">Nilgiris Ghat Conditions</div>
            <div class="metric-value">Normal</div>
            <div class="metric-trend trend-up">Coonoor & Kotagiri Roads Clear</div>
          </div>
        </div>
      </div>

      <!-- Live Bus Route Selector Tabs -->
      <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 0.5rem;">
        ${routes.map(r => `
          <button type="button" class="btn ${r.id === this.selectedRouteId ? 'btn-primary' : 'btn-secondary'}" onclick="TransportModule.selectRoute('${r.id}')" style="white-space: nowrap; font-size: 0.85rem;">
            ${r.routeNumber}: ${r.name.split('-')[0]} (${r.vehicleNo})
          </button>
        `).join('')}
      </div>

      <!-- Selected Bus Live Tracker Map & Telemetry -->
      <div id="admin-bus-widget" style="margin-bottom: 2rem;">
        <!-- Injected by renderParentWidget -->
      </div>

      <!-- Complete Fleet Table Directory -->
      <div class="card">
        <div class="card-header">
          <h4 class="card-title">School Bus Fleet Directory & Drivers</h4>
          <span style="font-size: 0.75rem; color: var(--text-muted);">4 Registered Vehicles</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Route #</th>
                <th>Bus Reg No</th>
                <th>Vehicle Model</th>
                <th>Driver Name</th>
                <th>Driver Phone</th>
                <th>Attendant</th>
                <th>Speed</th>
                <th>Live Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${routes.map(r => `
                <tr>
                  <td><strong>${r.routeNumber}</strong></td>
                  <td><span class="badge badge-info">${r.vehicleNo}</span></td>
                  <td>${r.model}</td>
                  <td><strong>${r.driverName}</strong></td>
                  <td>${r.driverPhone}</td>
                  <td>${r.attendantName}</td>
                  <td><span style="color: #16a34a; font-weight: 700;">${r.speed} km/h</span></td>
                  <td><span class="badge badge-present">${r.status}</span></td>
                  <td>
                    <button type="button" class="btn btn-sm btn-outline" onclick="TransportModule.selectRoute('${r.id}')">
                      Inspect GPS
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.renderParentWidget('admin-bus-widget');
  },

  render() {
    this.renderParentWidget('parent-bus-widget');
    this.renderAdminFleet('transport-view-content');
  }
};

window.TransportModule = TransportModule;
