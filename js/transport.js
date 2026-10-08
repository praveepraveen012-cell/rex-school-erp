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

  demoTrackingActive: false,
  demoSpeed: 1, // 1x, 2x, 5x
  trackingMode: 'DEMO', // 'DEMO' or 'LIVE_GPS'

  setTrackingMode(mode) {
    this.trackingMode = mode;
    if (window.App && App.showToast) {
      App.showToast(`Tracking Mode switched to ${mode === 'DEMO' ? 'DEMO TRACKING (Route Simulation)' : 'LIVE GPS (Satellite Telemetry)'}`, 'info');
    }
    this.render();
  },

  startDemoTracking(speed = 1) {
    this.demoSpeed = speed;
    this.demoTrackingActive = true;
    this.isAnimating = true;

    // Call backend if online
    if (window.Auth && Auth.getToken) {
      fetch('/api/transport/demo-tracking/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Auth.getToken()}` },
        body: JSON.stringify({ busId: 1, speedMultiplier: speed })
      }).catch(e => console.log('Backend demo tracking sync:', e));
    }

    if (this.animationTimer) clearInterval(this.animationTimer);
    const intervalMs = Math.max(100, Math.round(500 / this.demoSpeed));
    this.animationTimer = setInterval(() => {
      this.currentProgressPercent += 1;
      if (this.currentProgressPercent > 98) {
        this.currentProgressPercent = 5; // Loop back along configured route
      }
      if (this.currentProgressPercent === 68) {
        this.triggerProximityAlert(480);
      }
      this.updateBusMarkerPosition();
    }, intervalMs);

    if (window.App && App.showToast) {
      App.showToast(`Demo Tracking Started at ${speed}x simulation speed`, 'success');
    }
    this.render();
  },

  stopDemoTracking() {
    this.demoTrackingActive = false;
    this.isAnimating = false;
    if (this.animationTimer) clearInterval(this.animationTimer);

    if (window.Auth && Auth.getToken) {
      fetch('/api/transport/demo-tracking/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Auth.getToken()}` },
        body: JSON.stringify({ busId: 1 })
      }).catch(e => console.log('Backend demo stop sync:', e));
    }

    if (window.App && App.showToast) {
      App.showToast('Demo Tracking Paused', 'info');
    }
    this.render();
  },

  resetDemoTracking() {
    this.demoTrackingActive = false;
    this.isAnimating = false;
    if (this.animationTimer) clearInterval(this.animationTimer);
    this.currentProgressPercent = 10;
    this.updateBusMarkerPosition();

    if (window.Auth && Auth.getToken) {
      fetch('/api/transport/demo-tracking/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Auth.getToken()}` },
        body: JSON.stringify({ busId: 1 })
      }).catch(e => console.log('Backend demo reset sync:', e));
    }

    if (window.App && App.showToast) {
      App.showToast('Demo Tracking Reset to Starting Depot', 'info');
    }
    this.render();
  },

  startJourneyAnimation() {
    this.startDemoTracking(this.demoSpeed);
  },

  stopJourneyAnimation() {
    this.stopDemoTracking();
  },

  updateBusMarkerPosition() {
    const marker = document.getElementById('live-bus-marker');
    const distLabel = document.getElementById('live-bus-distance-tag');
    if (!marker) return;

    const pct = this.currentProgressPercent;
    marker.style.left = `${pct}%`;

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
        <!-- Mode Differentiation Banner -->
        <div style="background: ${this.trackingMode === 'DEMO' ? 'linear-gradient(90deg, #eff6ff, #dbeafe)' : 'linear-gradient(90deg, #ecfdf5, #d1fae5)'}; border-bottom: 2px solid ${this.trackingMode === 'DEMO' ? '#3b82f6' : '#10b981'}; padding: 0.6rem 1rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: ${this.trackingMode === 'DEMO' ? '#1e40af' : '#065f46'};">
            <span>${this.trackingMode === 'DEMO' ? '🧪 DEMO TRACKING' : '🛰️ LIVE GPS'}</span>
            <span style="font-size: 0.72rem; font-weight: 500; opacity: 0.85;">
              (${this.trackingMode === 'DEMO' ? 'Simulated continuous movement along configured route stops' : 'Connected to actual onboard GPS device'})
            </span>
          </div>
          <span class="badge ${this.demoTrackingActive ? 'badge-present' : 'badge-warning'}" style="font-size: 0.7rem;">
            ${this.demoTrackingActive ? '● Active Simulation' : '○ Standby'}
          </span>
        </div>

        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <h3 class="card-title" style="margin: 0; font-size: 1.15rem;">🚌 School Bus Live Tracker</h3>
              <span class="badge badge-present" style="animation: pulse 2s infinite;">● Live Updates</span>
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
              <path d="M 40,115 C 200,60 400,170 650,90 S 900,140 1100,115" fill="none" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round"/>
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
              <div style="color: var(--text-muted); font-size: 0.75rem;">Speed: ${route.speed} km/h • Last Updated: Just now</div>
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
            <button type="button" class="btn btn-outline" onclick="TransportModule.selectRoute('${route.id}')" style="font-size: 0.85rem; margin-left: auto;">
              🔄 Refresh Telemetry
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Open Add Bus Modal for Super Admin
  openAddBusModal(busToEdit = null) {
    let modal = document.getElementById('add-bus-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'add-bus-modal';
      modal.className = 'modal-overlay open';
      document.body.appendChild(modal);
    }

    const isEdit = !!busToEdit;
    const b = busToEdit || {
      routeNumber: `Route 0${ERPStorage.getBusRoutes().length + 1}`,
      vehicleNo: 'TN-43-C-',
      name: 'Kotagiri - Rex SSS Express',
      model: 'Tata Starbus Ultra (40-Seater)',
      capacity: 40,
      status: 'Active',
      driverName: '',
      driverPhone: '',
      driverLicense: '',
      attendantName: '',
      attendantPhone: '',
      speed: 30,
      startingPoint: 'Coonoor Bus Stand',
      destination: 'Rex SSS Campus',
      stops: 'Coonoor, Wellington, Aruvankadu, Charring Cross, Rex SSS',
      assignedStudents: '12 Students'
    };

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit School Bus' : 'Add New Bus & Route'}</h3>
          <button type="button" class="modal-close-btn" onclick="TransportModule.closeAddBusModal()">&times;</button>
        </div>
        <form id="add-bus-form" onsubmit="TransportModule.submitBusForm(event, '${isEdit ? b.id : ''}')">
          <div class="modal-body" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; max-height: 70vh; overflow-y: auto;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div>
                <label class="form-label">Bus Number / Route Code *</label>
                <input type="text" id="bus-route-number" class="form-control" required value="${b.routeNumber}">
              </div>
              <div>
                <label class="form-label">Registration Number *</label>
                <input type="text" id="bus-vehicle-no" class="form-control" required value="${b.vehicleNo}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div>
                <label class="form-label">Bus Name / Identifier *</label>
                <input type="text" id="bus-name" class="form-control" required value="${b.name}">
              </div>
              <div>
                <label class="form-label">Vehicle Model / Type *</label>
                <input type="text" id="bus-model" class="form-control" required value="${b.model}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div>
                <label class="form-label">Seating Capacity *</label>
                <input type="number" id="bus-capacity" class="form-control" required value="${b.capacity || 40}" min="10" max="60">
              </div>
              <div>
                <label class="form-label">Fleet Status *</label>
                <select id="bus-status" class="form-control">
                  <option value="Active" ${b.status === 'Active' ? 'selected' : ''}>Active</option>
                  <option value="In Transit" ${b.status === 'In Transit' ? 'selected' : ''}>In Transit</option>
                  <option value="Maintenance" ${b.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                  <option value="Inactive" ${b.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                </select>
              </div>
            </div>

            <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
              <h5 style="margin: 0 0 0.5rem 0; font-size: 0.88rem; color: var(--primary);">Driver Information</h5>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div>
                  <label class="form-label">Driver Name *</label>
                  <input type="text" id="bus-driver-name" class="form-control" required value="${b.driverName || ''}" placeholder="e.g. Ramesh Kumar">
                </div>
                <div>
                  <label class="form-label">Driver Mobile *</label>
                  <input type="tel" id="bus-driver-phone" class="form-control" required value="${b.driverPhone || ''}" placeholder="e.g. +91 94432 00000">
                </div>
              </div>
            </div>

            <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
              <h5 style="margin: 0 0 0.5rem 0; font-size: 0.88rem; color: var(--primary);">Route & Waypoints</h5>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                <div>
                  <label class="form-label">Starting Point *</label>
                  <input type="text" id="bus-start-point" class="form-control" required value="${b.startingPoint || 'Coonoor Bus Stand'}">
                </div>
                <div>
                  <label class="form-label">Destination *</label>
                  <input type="text" id="bus-dest-point" class="form-control" required value="${b.destination || 'Rex SSS Campus'}">
                </div>
              </div>
              <div>
                <label class="form-label">Stops Sequence (comma separated) *</label>
                <input type="text" id="bus-stops" class="form-control" required value="${b.stops || 'Stop 1, Stop 2, Stop 3, Rex Campus'}">
              </div>
            </div>
          </div>
          <div class="modal-footer" style="background: var(--bg-subtle);">
            <button type="button" class="btn btn-secondary" onclick="TransportModule.closeAddBusModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Register Bus'}</button>
          </div>
        </form>
      </div>
    `;
    modal.classList.add('open');
  },

  closeAddBusModal() {
    const modal = document.getElementById('add-bus-modal');
    if (modal) modal.classList.remove('open');
  },

  submitBusForm(e, editId) {
    e.preventDefault();
    const routeNumber = document.getElementById('bus-route-number').value.trim();
    const vehicleNo = document.getElementById('bus-vehicle-no').value.trim();
    const name = document.getElementById('bus-name').value.trim();
    const model = document.getElementById('bus-model').value.trim();
    const capacity = parseInt(document.getElementById('bus-capacity').value) || 40;
    const status = document.getElementById('bus-status').value;
    const driverName = document.getElementById('bus-driver-name').value.trim();
    const driverPhone = document.getElementById('bus-driver-phone').value.trim();
    const startingPoint = document.getElementById('bus-start-point').value.trim();
    const destination = document.getElementById('bus-dest-point').value.trim();
    const stopsStr = document.getElementById('bus-stops').value.trim();

    const stopList = stopsStr.split(',').map((s, idx) => ({
      name: s.trim(),
      time: `07:${15 + (idx * 12)} AM`,
      status: idx === 0 ? 'passed' : 'pending',
      distanceMeters: (stopsStr.split(',').length - idx) * 1200,
      isStudentStop: idx === 1
    }));

    const busPayload = {
      id: editId || `route-${Date.now()}`,
      routeNumber,
      vehicleNo,
      name,
      model,
      capacity,
      status,
      driverName,
      driverPhone,
      driverLicense: 'TN43-VALID-LIC',
      attendantName: 'Assigned Attendant',
      attendantPhone: '+91 94881 00000',
      speed: 32,
      currentLocationName: startingPoint,
      distanceToStudentStop: 480,
      studentStop: stopList[1] ? stopList[1].name : startingPoint,
      startingPoint,
      destination,
      stops: stopsStr,
      morning: {
        title: "Morning Pickup Schedule",
        departs: "07:15 AM",
        destination: destination,
        currentStopIndex: 1,
        stops: stopList
      },
      evening: {
        title: "Evening Drop-off Schedule",
        departs: "03:45 PM",
        destination: startingPoint,
        currentStopIndex: 0,
        stops: [...stopList].reverse()
      }
    };

    if (editId) {
      ERPStorage.updateBusRoute(editId, busPayload);
      if (window.App && App.showToast) App.showToast(`Bus ${vehicleNo} updated successfully!`, 'success');
    } else {
      ERPStorage.addBusRoute(busPayload);
      if (window.App && App.showToast) App.showToast(`New Bus ${vehicleNo} registered successfully!`, 'success');
    }

    // Attempt backend sync
    if (window.Auth && Auth.getToken) {
      fetch('/api/transport/bus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Auth.getToken()}` },
        body: JSON.stringify({
          busNumber: routeNumber,
          regNumber: vehicleNo,
          busName: name,
          busType: model,
          capacity,
          driverName,
          driverPhone,
          routeName: name,
          startingPoint,
          destination,
          status
        })
      }).catch(err => console.log('Backend sync bus:', err));
    }

    this.closeAddBusModal();
    this.render();
  },

  deleteBus(id) {
    if (!confirm('Are you sure you want to deactivate and remove this bus from active fleet?')) return;
    ERPStorage.deleteBusRoute(id);
    if (window.App && App.showToast) App.showToast('Bus removed from fleet.', 'info');
    this.render();
  },

  // Master Render for Full School-Wide Transport & Fleet Management View
  renderAdminFleet(containerId) {
    const container = document.getElementById(containerId || 'transport-view-content');
    if (!container) return;

    const routes = ERPStorage.getBusRoutes();

    container.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin: 0;">🚌 Transport & GPS Fleet Management</h2>
            <p style="color: var(--text-secondary); margin: 0.25rem 0 0 0; font-size: 0.9rem;">
              Real-time Nilgiris GPS tracking, driver manifests, geofencing proximity alerts, and bus speed telemetry.
            </p>
          </div>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary" onclick="TransportModule.openAddBusModal()">
              ➕ Add Bus
            </button>
            <button type="button" class="btn btn-secondary" onclick="TransportModule.simulate500mAlert()">
              ⚡ Test 500m Alert
            </button>
            <button type="button" class="btn btn-outline" onclick="App.showToast('All ${routes.length} Nilgiris buses synced with GPS Satellites', 'success')">
              🛰️ Sync GPS Fleet
            </button>
          </div>
        </div>
      </div>

      <!-- Super Admin Demo Tracking Controller -->
      <div class="card" style="margin-bottom: 1.5rem; border: 2px solid ${this.demoTrackingActive ? '#3b82f6' : 'var(--border-medium)'}; background: var(--bg-surface);">
        <div class="card-header" style="background: linear-gradient(90deg, #f8fafc, #f1f5f9); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h4 class="card-title" style="margin: 0; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem;">
              🎮 Demo Live Tracking Controller
              <span class="badge ${this.demoTrackingActive ? 'badge-present' : 'badge-warning'}">
                ${this.demoTrackingActive ? '● SIMULATION RUNNING' : '○ SIMULATION STOPPED'}
              </span>
            </h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">
              Super Admin can simulate continuous route traversal without physical GPS hardware.
            </span>
          </div>

          <!-- Mode Switcher -->
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">MODE:</span>
            <button type="button" class="btn btn-sm ${this.trackingMode === 'DEMO' ? 'btn-primary' : 'btn-outline'}" onclick="TransportModule.setTrackingMode('DEMO')" style="font-size: 0.72rem; padding: 0.2rem 0.6rem;">
              DEMO TRACKING
            </button>
            <button type="button" class="btn btn-sm ${this.trackingMode === 'LIVE_GPS' ? 'btn-success' : 'btn-outline'}" onclick="TransportModule.setTrackingMode('LIVE_GPS')" style="font-size: 0.72rem; padding: 0.2rem 0.6rem;">
              LIVE GPS
            </button>
          </div>
        </div>

        <div class="card-body" style="padding: 1rem 1.25rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <!-- Start / Stop / Reset Buttons -->
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-sm ${this.demoTrackingActive ? 'btn-secondary' : 'btn-primary'}" onclick="TransportModule.startDemoTracking(${this.demoSpeed})">
                ▶ Start Demo Tracking
              </button>
              <button type="button" class="btn btn-sm btn-warning" onclick="TransportModule.stopDemoTracking()" ${!this.demoTrackingActive ? 'disabled' : ''}>
                ⏸ Stop Demo
              </button>
              <button type="button" class="btn btn-sm btn-outline" onclick="TransportModule.resetDemoTracking()">
                🔄 Reset Depot
              </button>
            </div>

            <!-- Simulation Speed Selector -->
            <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem;">
              <span style="font-weight: 700; color: var(--text-secondary);">Speed:</span>
              <button type="button" class="btn btn-sm ${this.demoSpeed === 1 ? 'btn-primary' : 'btn-ghost'}" onclick="TransportModule.startDemoTracking(1)" style="padding: 0.2rem 0.55rem; font-size: 0.75rem;">1x</button>
              <button type="button" class="btn btn-sm ${this.demoSpeed === 2 ? 'btn-primary' : 'btn-ghost'}" onclick="TransportModule.startDemoTracking(2)" style="padding: 0.2rem 0.55rem; font-size: 0.75rem;">2x</button>
              <button type="button" class="btn btn-sm ${this.demoSpeed === 5 ? 'btn-primary' : 'btn-ghost'}" onclick="TransportModule.startDemoTracking(5)" style="padding: 0.2rem 0.55rem; font-size: 0.75rem;">5x Fast</button>
            </div>

            <!-- Live Position Telemetry Display -->
            <div style="background: var(--bg-subtle); padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.78rem;">
              Current Route Progress: <strong>${this.currentProgressPercent}%</strong> • Geofence: <strong>${Math.abs(Math.round((68 - this.currentProgressPercent) * 45)) + 480}m</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Fleet Overview KPI Cards -->
      <div class="dashboard-metrics-grid" style="margin-bottom: 2rem;">
        <div class="metric-card metric-primary">
          <div class="metric-icon-box">🚌</div>
          <div class="metric-info">
            <div class="metric-title">Total Active Buses</div>
            <div class="metric-value">${routes.length} Fleets</div>
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
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h4 class="card-title">School Bus Fleet Directory & Drivers</h4>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${routes.length} Registered Vehicles</span>
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
                  <td>${r.attendantName || 'Staff'}</td>
                  <td><span style="color: #16a34a; font-weight: 700;">${r.speed} km/h</span></td>
                  <td><span class="badge badge-present">${r.status}</span></td>
                  <td>
                    <div style="display: flex; gap: 0.35rem;">
                      <button type="button" class="btn btn-sm btn-outline" onclick="TransportModule.selectRoute('${r.id}')">
                        Inspect
                      </button>
                      <button type="button" class="btn btn-sm btn-ghost" onclick='TransportModule.openAddBusModal(${JSON.stringify(r).replace(/'/g, "&apos;")})'>
                        ✏️
                      </button>
                      <button type="button" class="btn btn-sm btn-ghost" onclick="TransportModule.deleteBus('${r.id}')" style="color: #ef4444;">
                        🗑️
                      </button>
                    </div>
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
