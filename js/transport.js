/**
 * Rex Senior Secondary School - GPS Transport & 500m Proximity Geofencing Engine
 * Real-time School Bus Tracker with Google Maps JavaScript API Integration,
 * Backend GPS Simulation Synchronization, Super Admin Fleet Management, and Parent Tracking.
 */

const TransportModule = {
  selectedBusId: 1,
  selectedRouteId: 1,
  selectedStudentId: 1,
  tripMode: 'morning', // 'morning' or 'evening'
  viewMode: 'map', // 'map' or 'topo'
  demoSpeed: 1,
  soundEnabled: true,
  lastAlertTriggeredStop: null,
  pollingTimer: null,
  liveTrackingData: null,
  fleetData: [],
  routesData: [],
  driversData: [],
  mapsConfig: {
    apiKey: '',
    isConfigured: false,
    defaultCenter: { lat: 11.4116, lng: 76.7088 }
  },
  googleMapsLoaded: false,
  googleMapInstance: null,
  googleBusMarker: null,
  googleRoutePolyline: null,
  googleStopMarkers: [],
  googleGeofenceCircle: null,

  init() {
    this.attachEventListeners();
    this.fetchMapsConfig();
    this.startPolling();
    console.log("Rex SSS Transport & Google Maps Bus Tracking Engine initialized.");
  },

  attachEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeProximityModal();
        this.closeAddBusModal();
        this.closeViewBusModal();
        this.closeAssignModal();
        this.closeRouteModal();
      }
    });
  },

  // --------------------------------------------------------------------------
  // GOOGLE MAPS API INTEGRATION
  // --------------------------------------------------------------------------
  async fetchMapsConfig() {
    try {
      const res = await fetch('/api/transport/maps-config');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          this.mapsConfig = data;
          if (data.isConfigured && data.apiKey) {
            this.loadGoogleMapsScript(data.apiKey);
          }
        }
      }
    } catch (e) {
      console.log('Maps config check:', e.message);
    }
  },

  loadGoogleMapsScript(apiKey) {
    if (window.google && window.google.maps) {
      this.googleMapsLoaded = true;
      return;
    }

    if (document.getElementById('google-maps-js-script')) return;

    window.onRexGoogleMapsInit = () => {
      this.googleMapsLoaded = true;
      console.log("✓ Google Maps JavaScript API loaded successfully.");
      this.initGoogleMap();
    };

    const script = document.createElement('script');
    script.id = 'google-maps-js-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=onRexGoogleMapsInit&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.warn("Google Maps script failed to load. Falling back to Interactive Topo Navigator.");
      this.googleMapsLoaded = false;
      this.viewMode = 'topo';
      this.render();
    };
    document.head.appendChild(script);
  },

  setViewMode(mode) {
    this.viewMode = mode;
    this.render();
  },

  initGoogleMap(containerId = 'google-bus-map-container') {
    const container = document.getElementById(containerId);
    if (!container || !window.google || !window.google.maps) return;

    const tracking = this.liveTrackingData;
    const currentLat = tracking?.currentLatitude || tracking?.latitude || 11.4116;
    const currentLng = tracking?.currentLongitude || tracking?.longitude || 76.7088;
    const centerLatLng = { lat: currentLat, lng: currentLng };

    // Styled modern map options
    const mapOptions = {
      zoom: 14,
      center: centerLatLng,
      mapTypeId: 'roadmap',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit.station", elementType: "labels", stylers: [{ visibility: "off" }] }
      ]
    };

    try {
      this.googleMapInstance = new google.maps.Map(container, mapOptions);

      // Clean existing markers
      this.clearMapOverlays();

      const stops = (tracking && tracking.routeStops && tracking.routeStops.length > 0)
        ? tracking.routeStops
        : [
            { id: 101, stop_name: "Coonoor Stand", stop_order: 1, latitude: 11.3530, longitude: 76.7959, pickup_time: "07:15 AM" },
            { id: 102, stop_name: "Wellington Barracks", stop_order: 2, latitude: 11.3688, longitude: 76.7865, pickup_time: "07:30 AM" },
            { id: 103, stop_name: "Charring Cross Junction", stop_order: 3, latitude: 11.4116, longitude: 76.7088, pickup_time: "07:48 AM" },
            { id: 104, stop_name: "Rex SSS Campus Gate", stop_order: 4, latitude: 11.4168, longitude: 76.6963, pickup_time: "08:15 AM" }
          ];

      const bounds = new google.maps.LatLngBounds();

      // 1. Draw Ordered Stops Markers
      this.googleStopMarkers = stops.map((stop, index) => {
        const stopPos = { lat: stop.latitude, lng: stop.longitude };
        bounds.extend(stopPos);

        const isStudentStop = (stop.id === 103 || stop.stop_name.includes('Charring') || stop.stop_name.includes('Botanical'));

        const marker = new google.maps.Marker({
          position: stopPos,
          map: this.googleMapInstance,
          title: stop.stop_name,
          label: {
            text: isStudentStop ? '★' : `${index + 1}`,
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '12px'
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isStudentStop ? 14 : 10,
            fillColor: isStudentStop ? '#f59e0b' : '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family: inherit; padding: 4px; max-width: 200px;">
              <strong style="color: #1e3a8a; font-size: 13px;">${stop.stop_name}</strong>
              <div style="font-size: 11px; color: #475569; margin-top: 3px;">Stop #${stop.stop_order} • Pickup: ${stop.pickup_time || '07:30 AM'}</div>
              ${isStudentStop ? '<div style="margin-top: 4px; background: #fef3c7; color: #92400e; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px;">🎯 Assigned Ward Pickup Stop</div>' : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(this.googleMapInstance, marker);
        });

        return marker;
      });

      // 2. Draw Route Polyline
      const pathCoordinates = stops.map(s => ({ lat: s.latitude, lng: s.longitude }));
      this.googleRoutePolyline = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.85,
        strokeWeight: 5,
        map: this.googleMapInstance
      });

      // 3. Draw 500m Geofence Circle around Student Stop (Stop 103 or Charring Cross)
      const targetStop = stops.find(s => s.id === 103 || s.stop_name.includes('Charring')) || stops[stops.length - 2] || stops[0];
      if (targetStop) {
        this.googleGeofenceCircle = new google.maps.Circle({
          strokeColor: '#2563eb',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.18,
          map: this.googleMapInstance,
          center: { lat: targetStop.latitude, lng: targetStop.longitude },
          radius: 500 // 500 meters geofence
        });
      }

      // 4. Create Moving Bus Marker
      const busSvgIcon = {
        path: 'M 12 2 C 8 2 5 5 5 9 L 5 19 C 5 20.1 5.9 21 7 21 L 8 21 C 8.55 21 9 20.55 9 20 L 9 19 L 15 19 L 15 20 C 15 20.55 15.45 21 16 21 L 17 21 C 18.1 21 19 20.1 19 19 L 19 9 C 19 5 16 2 12 2 Z M 7.5 16 C 6.67 16 6 15.33 6 14.5 C 6 13.67 6.67 13 7.5 13 C 8.33 13 9 13.67 9 14.5 C 9 15.33 8.33 16 7.5 16 Z M 16.5 16 C 15.67 16 15 15.33 15 14.5 C 15 13.67 15.67 13 16.5 13 C 17.33 13 18 13.67 18 14.5 C 18 15.33 17.33 16 16.5 16 Z M 18 11 L 6 11 L 6 6 L 18 6 L 18 11 Z',
        fillColor: '#f59e0b',
        fillOpacity: 1,
        scale: 1.5,
        strokeColor: '#000000',
        strokeWeight: 1.5,
        anchor: new google.maps.Point(12, 12)
      };

      this.googleBusMarker = new google.maps.Marker({
        position: centerLatLng,
        map: this.googleMapInstance,
        title: `Bus Marker: ${tracking?.busNumber || 'Route 02'}`,
        icon: busSvgIcon,
        zIndex: 999
      });

      bounds.extend(centerLatLng);
      this.googleMapInstance.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    } catch (e) {
      console.warn("Failed to create Google Maps instance:", e);
    }
  },

  clearMapOverlays() {
    if (this.googleBusMarker) {
      this.googleBusMarker.setMap(null);
      this.googleBusMarker = null;
    }
    if (this.googleRoutePolyline) {
      this.googleRoutePolyline.setMap(null);
      this.googleRoutePolyline = null;
    }
    if (this.googleGeofenceCircle) {
      this.googleGeofenceCircle.setMap(null);
      this.googleGeofenceCircle = null;
    }
    if (this.googleStopMarkers && this.googleStopMarkers.length > 0) {
      this.googleStopMarkers.forEach(m => m.setMap(null));
      this.googleStopMarkers = [];
    }
  },

  updateGoogleMapMarker(lat, lng) {
    if (!this.googleMapInstance || !this.googleBusMarker || !window.google) return;
    const newPos = new google.maps.LatLng(lat, lng);
    this.googleBusMarker.setPosition(newPos);
  },

  // --------------------------------------------------------------------------
  // LIVE TELEMETRY POLLING & DATA SYNC
  // --------------------------------------------------------------------------
  startPolling() {
    this.stopPolling();
    this.pollTelemetry();
    this.pollingTimer = setInterval(() => {
      this.pollTelemetry();
    }, 2500); // Poll every 2.5 seconds (Section 5 requirement)
  },

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  },

  async pollTelemetry() {
    const isAuthed = window.RexApi ? window.RexApi.isAuthenticated() : false;
    const token = isAuthed ? window.RexApi.getToken() : null;
    if (!token) return;

    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      // 1. Fetch fleet for Super Admin
      const fleetRes = await fetch('/api/transport/fleet', { headers });
      if (fleetRes.ok) {
        const fleetJson = await fleetRes.json();
        if (fleetJson.success) {
          this.fleetData = fleetJson.buses || [];
        }
      }

      // 2. Fetch tracking for active bus or active child
      const currentRole = window.App ? App.currentRole : 'admin';
      let trackingUrl = `/api/transport/bus/${this.selectedBusId}/tracking`;

      if (currentRole === 'parent') {
        trackingUrl = `/api/transport/my-bus?studentId=${this.selectedStudentId}`;
      }

      const trackingRes = await fetch(trackingUrl, { headers });
      if (trackingRes.ok) {
        const json = await trackingRes.json();
        if (json.success && json.tracking) {
          this.liveTrackingData = json.tracking;
          this.syncLiveCoordinates(json.tracking);
        }
      }
    } catch (e) {
      // Silently catch network hiccups during periodic background poll
    }
  },

  syncLiveCoordinates(tracking) {
    if (!tracking) return;

    const lat = tracking.currentLatitude || tracking.latitude;
    const lng = tracking.currentLongitude || tracking.longitude;
    const progress = (tracking.progressPercent !== undefined) ? tracking.progressPercent : 0.0;
    this.currentProgressPercent = Math.round(progress * 100);

    // Update Google Map Marker smoothly if loaded
    if (lat && lng && this.googleMapsLoaded && this.googleBusMarker) {
      this.updateGoogleMapMarker(lat, lng);
    }

    // Update Topo SVG route marker if rendered
    this.updateBusMarkerPosition();

    // Update real-time telemetry badge texts in DOM without full re-render
    const badgeEl = document.getElementById('live-tracking-mode-badge');
    if (badgeEl) {
      const isDemoActive = tracking.isDemoActive;
      badgeEl.className = `badge ${isDemoActive ? 'badge-present' : 'badge-warning'}`;
      badgeEl.textContent = isDemoActive ? '● DEMO TRACKING (ACTIVE)' : '○ DEMO TRACKING (STATIONARY)';
    }

    const etaEl = document.getElementById('live-bus-eta-val');
    if (etaEl && tracking.etaMinutes) {
      etaEl.textContent = `${tracking.etaMinutes} mins`;
    }

    const stopEl = document.getElementById('live-bus-current-stop-val');
    if (stopEl && tracking.currentStop) {
      stopEl.textContent = tracking.currentStop;
    }

    const coordsEl = document.getElementById('live-bus-coords-val');
    if (coordsEl && lat && lng) {
      coordsEl.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    // Check 500m geofence trigger
    if (this.currentProgressPercent >= 65 && this.currentProgressPercent <= 72) {
      if (this.lastAlertTriggeredStop !== 'charring-cross') {
        this.lastAlertTriggeredStop = 'charring-cross';
        this.triggerProximityAlert(480);
      }
    } else if (this.currentProgressPercent < 50) {
      this.lastAlertTriggeredStop = null;
    }
  },

  // --------------------------------------------------------------------------
  // AUDIO & 500m PROXIMITY GEOFENCING
  // --------------------------------------------------------------------------
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

  playChime() {
    if (!this.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

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

  simulate500mAlert() {
    this.triggerProximityAlert(480);
  },

  triggerProximityAlert(distanceMeters) {
    this.playChime();
    const tracking = this.liveTrackingData;
    const busNo = tracking?.busNumber || 'Route 02';
    const vehNo = tracking?.vehicleNo || 'TN-43-A-2015';
    const stopName = tracking?.pickupStop || 'Charring Cross Junction';

    this.openProximityModal(busNo, vehNo, stopName, distanceMeters);

    if (window.App && App.showToast) {
      App.showToast(`🚨 BUS 500m PROXIMITY ALERT: ${busNo} (${vehNo}) is ${distanceMeters}m from ${stopName}!`, "warning");
    }
  },

  openProximityModal(busNo, vehNo, stopName, distanceMeters) {
    let modal = document.getElementById('bus-proximity-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bus-proximity-modal';
      modal.className = 'modal-overlay open';
      document.body.appendChild(modal);
    }

    const etaMins = Math.max(1, Math.round(distanceMeters / (32 * 1000 / 60)));

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 520px; border-top: 6px solid #f59e0b; animation: scaleIn 0.25s ease;">
        <div class="modal-header" style="background: linear-gradient(135deg, #fffbeb, #fef3c7);">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: #f59e0b; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; box-shadow: 0 0 15px rgba(245, 158, 11, 0.5);">
              🔔
            </div>
            <div>
              <h3 class="modal-title" style="color: #92400e; font-size: 1.15rem; margin: 0;">500m Proximity Geofence Alert!</h3>
              <div style="font-size: 0.75rem; color: #b45309; font-weight: 700;">Rex SSS Automated Fleet Telemetry System</div>
            </div>
          </div>
          <button type="button" class="modal-close-btn" onclick="TransportModule.closeProximityModal()">&times;</button>
        </div>

        <div class="modal-body" style="padding: 1.5rem;">
          <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #fff; padding: 1.25rem; border-radius: var(--radius-md); text-align: center; margin-bottom: 1.25rem; box-shadow: var(--shadow-md);">
            <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.9;">
              DEMO TRACKING • Bus Approaching Ward Stop
            </div>
            <div style="font-size: 2.2rem; font-weight: 800; margin: 0.25rem 0;">
              ${distanceMeters} Meters Away
            </div>
            <div style="font-size: 0.85rem; font-weight: 600; opacity: 0.95;">
              Estimated Arrival at Stop: <span style="background: #22c55e; color: #000; padding: 2px 8px; border-radius: 12px; font-weight: 800;">${etaMins} mins</span>
            </div>
          </div>

          <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Assigned Bus:</span>
              <strong style="color: var(--text-primary);">${busNo} (${vehNo})</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Designated Stop:</span>
              <strong style="color: var(--primary);">${stopName}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Mode:</span>
              <span class="badge badge-warning">DEMO TRACKING (Simulated Route)</span>
            </div>
          </div>

          <div style="background: #e2f7cb; border: 1px solid #b2df8a; border-radius: var(--radius-md); padding: 0.85rem; font-size: 0.75rem; color: #111; line-height: 1.45;">
            <div style="font-weight: 800; color: #075e54; margin-bottom: 0.3rem;">✓ AUTOMATED WHATSAPP NOTIFICATION DISPATCHED:</div>
            "🚨 *REX SSS 500m PROXIMITY ALERT*: School bus *${busNo}* is *${distanceMeters}m* away from *${stopName}* (approx. ${etaMins} mins). Please ensure your ward is ready at the pickup boarding point!"
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

  // --------------------------------------------------------------------------
  // SUPER ADMIN DEMO TRACKING CONTROLS (Requirements 3, 4, 5)
  // --------------------------------------------------------------------------
  async startDemoTracking(speed = null) {
    if (speed) this.demoSpeed = speed;
    const token = window.RexApi ? window.RexApi.getToken() : null;

    try {
      const res = await fetch('/api/transport/demo-tracking/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          busId: this.selectedBusId,
          speedMultiplier: this.demoSpeed
        })
      });

      const data = await res.json();
      if (data.success) {
        if (window.App && App.showToast) {
          App.showToast(`DEMO TRACKING Started at ${this.demoSpeed}x speed for Bus ${this.selectedBusId}`, 'success');
        }
        this.pollTelemetry();
      } else {
        if (window.App && App.showToast) App.showToast(data.error || 'Failed to start demo', 'error');
      }
    } catch (e) {
      if (window.App && App.showToast) App.showToast(e.message, 'error');
    }
  },

  async pauseDemoTracking() {
    const token = window.RexApi ? window.RexApi.getToken() : null;
    try {
      const res = await fetch('/api/transport/demo-tracking/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ busId: this.selectedBusId })
      });
      const data = await res.json();
      if (data.success) {
        if (window.App && App.showToast) App.showToast('DEMO TRACKING Paused (Position preserved)', 'info');
        this.pollTelemetry();
      }
    } catch (e) {
      if (window.App && App.showToast) App.showToast(e.message, 'error');
    }
  },

  async resumeDemoTracking() {
    const token = window.RexApi ? window.RexApi.getToken() : null;
    try {
      const res = await fetch('/api/transport/demo-tracking/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ busId: this.selectedBusId })
      });
      const data = await res.json();
      if (data.success) {
        if (window.App && App.showToast) App.showToast('DEMO TRACKING Resumed from current position', 'success');
        this.pollTelemetry();
      }
    } catch (e) {
      if (window.App && App.showToast) App.showToast(e.message, 'error');
    }
  },

  async stopDemoTracking() {
    const token = window.RexApi ? window.RexApi.getToken() : null;
    try {
      const res = await fetch('/api/transport/demo-tracking/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ busId: this.selectedBusId })
      });
      const data = await res.json();
      if (data.success) {
        if (window.App && App.showToast) App.showToast('DEMO TRACKING Stopped', 'info');
        this.pollTelemetry();
      }
    } catch (e) {
      if (window.App && App.showToast) App.showToast(e.message, 'error');
    }
  },

  async resetDemoTracking() {
    const token = window.RexApi ? window.RexApi.getToken() : null;
    try {
      const res = await fetch('/api/transport/demo-tracking/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ busId: this.selectedBusId })
      });
      const data = await res.json();
      if (data.success) {
        if (window.App && App.showToast) App.showToast('DEMO TRACKING Reset to route start depot', 'info');
        this.pollTelemetry();
      }
    } catch (e) {
      if (window.App && App.showToast) App.showToast(e.message, 'error');
    }
  },

  async setSpeedMultiplier(speed) {
    this.demoSpeed = speed;
    const token = window.RexApi ? window.RexApi.getToken() : null;
    try {
      await fetch('/api/transport/demo-tracking/speed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ busId: this.selectedBusId, speedMultiplier: speed })
      });
      if (window.App && App.showToast) App.showToast(`Simulation speed set to ${speed}x`, 'info');
      this.pollTelemetry();
    } catch (e) {
      console.warn('Set speed error:', e);
    }
  },

  selectBus(busId) {
    this.selectedBusId = parseInt(busId, 10);
    this.pollTelemetry();
    this.render();
  },

  selectChild(studentId) {
    this.selectedStudentId = parseInt(studentId, 10);
    this.pollTelemetry();
    this.render();
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
        distLabel.textContent = `${dist + 480}m to Ward Stop`;
      } else if (pct === 68) {
        distLabel.textContent = `🎯 480m (At Geofence!)`;
      } else {
        distLabel.textContent = `${(pct - 68) * 35}m past Stop`;
      }
    }
  },

  // --------------------------------------------------------------------------
  // SUPER ADMIN BUS CRUD MODALS & ACTIONS (Requirement 3)
  // --------------------------------------------------------------------------
  async openAddBusModal(busToEdit = null) {
    let modal = document.getElementById('add-bus-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'add-bus-modal';
      modal.className = 'modal-overlay open';
      document.body.appendChild(modal);
    }

    const isEdit = !!busToEdit;
    const b = busToEdit || {
      id: '',
      bus_number: `Route 0${this.fleetData.length + 1}`,
      vehicle_no: 'TN-43-C-',
      model: 'Tata Starbus Ultra (36-Seater)',
      capacity: 36,
      status: 'ACTIVE',
      driver_id: 1,
      route_id: 1
    };

    // Fetch drivers and routes for select dropdowns
    const token = window.RexApi ? window.RexApi.getToken() : null;
    let drivers = [];
    let routes = [];

    try {
      const [dRes, rRes] = await Promise.all([
        fetch('/api/transport/drivers', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/transport/routes', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (dRes.ok) drivers = (await dRes.json()).drivers || [];
      if (rRes.ok) routes = (await rRes.json()).routes || [];
    } catch (_) {}

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 580px;">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? '✏️ Edit School Bus' : '➕ Register New School Bus'}</h3>
          <button type="button" class="modal-close-btn" onclick="TransportModule.closeAddBusModal()">&times;</button>
        </div>
        <form id="bus-mgmt-form" onsubmit="TransportModule.submitBusForm(event, '${isEdit ? b.id : ''}')">
          <div class="modal-body" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; max-height: 72vh; overflow-y: auto;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div>
                <label class="form-label">Bus Identifier / Number *</label>
                <input type="text" id="form-bus-number" class="form-control" required value="${b.bus_number || ''}" placeholder="e.g. Route 02">
              </div>
              <div>
                <label class="form-label">Registration Number *</label>
                <input type="text" id="form-vehicle-no" class="form-control" required value="${b.vehicle_no || ''}" placeholder="e.g. TN-43-A-2015">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div>
                <label class="form-label">Vehicle Fleet Model</label>
                <input type="text" id="form-bus-model" class="form-control" value="${b.model || 'Standard Fleet (36-Seater)'}">
              </div>
              <div>
                <label class="form-label">Seating Capacity *</label>
                <input type="number" id="form-bus-capacity" class="form-control" required value="${b.capacity || 36}" min="10" max="60">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div>
                <label class="form-label">Operational Status *</label>
                <select id="form-bus-status" class="form-control">
                  <option value="ACTIVE" ${b.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                  <option value="INACTIVE" ${b.status === 'INACTIVE' ? 'selected' : ''}>INACTIVE</option>
                  <option value="MAINTENANCE" ${b.status === 'MAINTENANCE' ? 'selected' : ''}>MAINTENANCE</option>
                </select>
              </div>
              <div>
                <label class="form-label">Assign Driver</label>
                <select id="form-bus-driver" class="form-control">
                  <option value="">-- None --</option>
                  ${drivers.map(d => `<option value="${d.id}" ${b.driver_id === d.id ? 'selected' : ''}>${d.name} (${d.mobile})</option>`).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="form-label">Assign Route *</label>
              <select id="form-bus-route" class="form-control" required>
                ${routes.map(r => `<option value="${r.id}" ${b.route_id === r.id ? 'selected' : ''}>${r.route_code}: ${r.name}</option>`).join('')}
              </select>
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

  async submitBusForm(e, editId) {
    e.preventDefault();
    const token = window.RexApi ? window.RexApi.getToken() : null;

    const busNumber = document.getElementById('form-bus-number').value.trim();
    const vehicleNo = document.getElementById('form-vehicle-no').value.trim();
    const model = document.getElementById('form-bus-model').value.trim();
    const capacity = parseInt(document.getElementById('form-bus-capacity').value, 10) || 36;
    const status = document.getElementById('form-bus-status').value;
    const driverId = document.getElementById('form-bus-driver').value ? parseInt(document.getElementById('form-bus-driver').value, 10) : null;
    const routeId = document.getElementById('form-bus-route').value ? parseInt(document.getElementById('form-bus-route').value, 10) : null;

    const payload = { busNumber, vehicleNo, model, capacity, status, driverId, routeId };
    const url = editId ? `/api/transport/bus/${editId}` : '/api/transport/bus';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        if (window.App && App.showToast) {
          App.showToast(editId ? `Bus ${busNumber} updated successfully!` : `Bus ${busNumber} registered!`, 'success');
        }
        this.closeAddBusModal();
        this.pollTelemetry();
        this.render();
      } else {
        if (window.App && App.showToast) App.showToast(data.error || 'Failed to save bus', 'error');
      }
    } catch (err) {
      if (window.App && App.showToast) App.showToast(err.message, 'error');
    }
  },

  async toggleBusStatus(busId, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const token = window.RexApi ? window.RexApi.getToken() : null;

    try {
      const res = await fetch(`/api/transport/bus/${busId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        if (window.App && App.showToast) App.showToast(`Bus status changed to ${newStatus}`, 'info');
        this.pollTelemetry();
        this.render();
      }
    } catch (e) {
      if (window.App && App.showToast) App.showToast(e.message, 'error');
    }
  },

  async viewBusDetails(busId) {
    const token = window.RexApi ? window.RexApi.getToken() : null;
    try {
      const res = await fetch(`/api/transport/bus/${busId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        this.renderViewBusModal(data);
      }
    } catch (e) {
      if (window.App && App.showToast) App.showToast(e.message, 'error');
    }
  },

  renderViewBusModal(data) {
    let modal = document.getElementById('view-bus-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'view-bus-modal';
      modal.className = 'modal-overlay open';
      document.body.appendChild(modal);
    }

    const { bus, driver, route, assignedStudents, trackingState } = data;

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 650px;">
        <div class="modal-header" style="background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #fff;">
          <div>
            <h3 class="modal-title" style="color: #fff; margin: 0;">🚌 Bus Profile: ${bus.bus_number}</h3>
            <span style="font-size: 0.75rem; opacity: 0.9;">Registration: ${bus.vehicle_no} • Status: ${bus.status}</span>
          </div>
          <button type="button" class="modal-close-btn" style="color: #fff;" onclick="TransportModule.closeViewBusModal()">&times;</button>
        </div>

        <div class="modal-body" style="padding: 1.25rem; max-height: 75vh; overflow-y: auto;">
          <!-- Telemetry State Card -->
          <div style="background: var(--bg-subtle); border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">DEMO TRACKING TELEMETRY</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; margin-top: 0.5rem; font-size: 0.82rem;">
              <div>Status: <strong style="color: #2563eb;">${trackingState?.status_text || 'Stationary'}</strong></div>
              <div>Current Stop: <strong>${trackingState?.current_stop_name || 'Depot'}</strong></div>
              <div>Next Stop: <strong>${trackingState?.next_stop_name || 'Destination'}</strong></div>
              <div>GPS Coords: <strong>${trackingState?.latitude || '11.3530'}, ${trackingState?.longitude || '76.7959'}</strong></div>
              <div>ETA: <strong>${trackingState?.eta_minutes || 15} mins</strong></div>
              <div>Progress: <strong>${Math.round((trackingState?.progress_percent || 0) * 100)}%</strong></div>
            </div>
          </div>

          <!-- Driver & Route Split -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
            <div style="border: 1px solid var(--border-subtle); padding: 0.85rem; border-radius: var(--radius-sm);">
              <h5 style="margin: 0 0 0.4rem 0; font-size: 0.85rem; color: var(--primary);">👤 Assigned Driver</h5>
              <div style="font-size: 0.82rem;">
                <strong>${driver?.name || 'Unassigned'}</strong><br>
                <span style="color: var(--text-muted);">Phone: ${driver?.mobile || 'N/A'}</span><br>
                <span style="color: var(--text-muted);">License: ${driver?.license_no || 'N/A'}</span>
              </div>
            </div>

            <div style="border: 1px solid var(--border-subtle); padding: 0.85rem; border-radius: var(--radius-sm);">
              <h5 style="margin: 0 0 0.4rem 0; font-size: 0.85rem; color: var(--primary);">🛣️ Assigned Route</h5>
              <div style="font-size: 0.82rem;">
                <strong>${route?.name || 'Unassigned'}</strong><br>
                <span style="color: var(--text-muted);">${route?.start_point || ''} &rarr; ${route?.end_point || ''}</span><br>
                <span style="color: var(--text-muted);">Stops: ${route?.stops ? route.stops.length : 0} waypoints</span>
              </div>
            </div>
          </div>

          <!-- Assigned Students List -->
          <div>
            <h5 style="margin: 0 0 0.5rem 0; font-size: 0.88rem; color: var(--text-primary);">
              👥 Assigned Students (${assignedStudents.length})
            </h5>
            ${assignedStudents.length === 0 ? '<p style="font-size: 0.8rem; color: var(--text-muted);">No students assigned to this bus yet.</p>' : `
              <div class="table-responsive">
                <table class="data-table" style="font-size: 0.78rem;">
                  <thead>
                    <tr>
                      <th>Adm No</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>Pickup Stop</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${assignedStudents.map(s => `
                      <tr>
                        <td><strong>${s.admission_no}</strong></td>
                        <td>${s.first_name} ${s.last_name}</td>
                        <td>${s.class_name}-${s.section_name}</td>
                        <td>${s.pickup_stop_name || 'Designated Gate'}</td>
                        <td>${s.pickup_time || '07:45 AM'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>

        <div class="modal-footer" style="background: var(--bg-subtle);">
          <button type="button" class="btn btn-secondary" onclick="TransportModule.closeViewBusModal()">Close</button>
          <button type="button" class="btn btn-primary" onclick="TransportModule.closeViewBusModal(); TransportModule.selectBus(${bus.id});">
            🎮 Track This Bus in Controller
          </button>
        </div>
      </div>
    `;

    modal.classList.add('open');
  },

  closeViewBusModal() {
    const modal = document.getElementById('view-bus-modal');
    if (modal) modal.classList.remove('open');
  },

  // Assign Driver, Route, and Students Modal
  async openAssignModal(busId) {
    let modal = document.getElementById('assign-transport-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'assign-transport-modal';
      modal.className = 'modal-overlay open';
      document.body.appendChild(modal);
    }

    const token = window.RexApi ? window.RexApi.getToken() : null;
    let drivers = [];
    let routes = [];
    let students = [];

    try {
      const [dRes, rRes, sRes] = await Promise.all([
        fetch('/api/transport/drivers', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/transport/routes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/students', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (dRes.ok) drivers = (await dRes.json()).drivers || [];
      if (rRes.ok) routes = (await rRes.json()).routes || [];
      if (sRes.ok) students = (await sRes.json()).students || [];
    } catch (_) {}

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 560px;">
        <div class="modal-header">
          <h3 class="modal-title">🔗 Assign Transport (Bus #${busId})</h3>
          <button type="button" class="modal-close-btn" onclick="TransportModule.closeAssignModal()">&times;</button>
        </div>
        <form id="assign-mgmt-form" onsubmit="TransportModule.submitAssignForm(event, ${busId})">
          <div class="modal-body" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; max-height: 70vh; overflow-y: auto;">
            <div>
              <label class="form-label">Assign Driver</label>
              <select id="assign-driver-select" class="form-control">
                <option value="">-- No change --</option>
                ${drivers.map(d => `<option value="${d.id}">${d.name} (${d.mobile})</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="form-label">Assign Route</label>
              <select id="assign-route-select" class="form-control">
                <option value="">-- No change --</option>
                ${routes.map(r => `<option value="${r.id}">${r.route_code}: ${r.name}</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="form-label">Assign Students to this Bus</label>
              <div style="max-height: 180px; overflow-y: auto; border: 1px solid var(--border-medium); border-radius: var(--radius-sm); padding: 0.5rem;">
                ${students.map(s => `
                  <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.5rem; font-size: 0.82rem; cursor: pointer;">
                    <input type="checkbox" name="assign_student_ids" value="${s.id}">
                    <span><strong>${s.admission_no}</strong> • ${s.first_name} ${s.last_name} (${s.class_name || ''})</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="modal-footer" style="background: var(--bg-subtle);">
            <button type="button" class="btn btn-secondary" onclick="TransportModule.closeAssignModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Assignments</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.add('open');
  },

  closeAssignModal() {
    const modal = document.getElementById('assign-transport-modal');
    if (modal) modal.classList.remove('open');
  },

  async submitAssignForm(e, busId) {
    e.preventDefault();
    const token = window.RexApi ? window.RexApi.getToken() : null;

    const driverId = document.getElementById('assign-driver-select').value ? parseInt(document.getElementById('assign-driver-select').value, 10) : null;
    const routeId = document.getElementById('assign-route-select').value ? parseInt(document.getElementById('assign-route-select').value, 10) : null;
    const studentCheckboxes = document.querySelectorAll('input[name="assign_student_ids"]:checked');
    const studentIds = Array.from(studentCheckboxes).map(cb => parseInt(cb.value, 10));

    try {
      const res = await fetch('/api/transport/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ busId, driverId, routeId, studentIds })
      });
      const data = await res.json();
      if (data.success) {
        if (window.App && App.showToast) App.showToast('Assignments saved successfully!', 'success');
        this.closeAssignModal();
        this.pollTelemetry();
        this.render();
      } else {
        if (window.App && App.showToast) App.showToast(data.error || 'Assignment failed', 'error');
      }
    } catch (err) {
      if (window.App && App.showToast) App.showToast(err.message, 'error');
    }
  },

  // Route & Stops Management Modal (Requirement 8)
  async openRouteManagementModal() {
    let modal = document.getElementById('route-mgmt-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'route-mgmt-modal';
      modal.className = 'modal-overlay open';
      document.body.appendChild(modal);
    }

    const token = window.RexApi ? window.RexApi.getToken() : null;
    let routes = [];

    try {
      const res = await fetch('/api/transport/routes', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) routes = (await res.json()).routes || [];
    } catch (_) {}

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 680px;">
        <div class="modal-header">
          <h3 class="modal-title">🛣️ Route & Ordered Stops Management</h3>
          <button type="button" class="modal-close-btn" onclick="TransportModule.closeRouteModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.25rem; max-height: 70vh; overflow-y: auto;">
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.8rem; color: #1e40af;">
            💡 <strong>Configurable Ordered Stops:</strong> The backend demo GPS simulator gradually progresses between ordered stop coordinates. Replace or refine stop coordinates below.
          </div>

          ${routes.map(r => `
            <div style="border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem; background: var(--bg-surface);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <div>
                  <strong style="color: var(--primary); font-size: 1rem;">${r.route_code}: ${r.name}</strong>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${r.start_point} &rarr; ${r.end_point} • Base ETA: ${r.eta_minutes} mins</div>
                </div>
                <button type="button" class="btn btn-sm btn-outline" onclick="TransportModule.openAddStopForm(${r.id})">
                  ➕ Add Stop
                </button>
              </div>

              <div class="table-responsive">
                <table class="data-table" style="font-size: 0.75rem;">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Stop Name</th>
                      <th>Latitude</th>
                      <th>Longitude</th>
                      <th>Pickup Time</th>
                      <th>Drop Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(r.stops || []).map(s => `
                      <tr>
                        <td><strong>#${s.stop_order}</strong></td>
                        <td>${s.stop_name}</td>
                        <td><code>${s.latitude}</code></td>
                        <td><code>${s.longitude}</code></td>
                        <td>${s.pickup_time || '07:30 AM'}</td>
                        <td>${s.drop_time || '04:00 PM'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="modal-footer" style="background: var(--bg-subtle);">
          <button type="button" class="btn btn-secondary" onclick="TransportModule.closeRouteModal()">Close</button>
        </div>
      </div>
    `;

    modal.classList.add('open');
  },

  closeRouteModal() {
    const modal = document.getElementById('route-mgmt-modal');
    if (modal) modal.classList.remove('open');
  },

  openAddStopForm(routeId) {
    const name = prompt("Enter Stop Name (e.g. Wellington Barracks):");
    if (!name) return;
    const lat = prompt("Enter Latitude coordinate (e.g. 11.3688):", "11.3688");
    if (!lat) return;
    const lng = prompt("Enter Longitude coordinate (e.g. 76.7865):", "76.7865");
    if (!lng) return;

    const token = window.RexApi ? window.RexApi.getToken() : null;
    fetch(`/api/transport/routes/${routeId}/stops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stop_name: name,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        pickup_time: '07:35 AM',
        drop_time: '04:15 PM'
      })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        if (window.App && App.showToast) App.showToast('Ordered stop added to route!', 'success');
        this.openRouteManagementModal();
      }
    });
  },

  // --------------------------------------------------------------------------
  // MASTER RENDERERS (Super Admin & Parent)
  // --------------------------------------------------------------------------

  // Render Parent Portal Tracking Widget (Requirement 6)
  renderParentWidget(containerId = 'parent-bus-widget') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const tracking = this.liveTrackingData;
    const isDemoActive = tracking && tracking.isDemoActive;
    const isGpsConnected = tracking && tracking.isGpsConnected;
    const modeLabel = isGpsConnected ? 'LIVE GPS' : 'DEMO TRACKING';
    const statusText = isDemoActive
      ? (tracking?.status || 'En Route (Moving along route stops)')
      : 'Stationary (DEMO TRACKING Standby)';

    const busNumber = tracking?.busNumber || 'Route 02';
    const vehicleNo = tracking?.vehicleNo || 'TN-43-A-2015';
    const routeName = tracking?.routeName || 'Coonoor - Wellington - Charring Cross - Rex SSS';
    const driverName = tracking?.driverName || 'Joseph Selvaraj';
    const driverPhone = tracking?.driverMobile || '9443210045';
    const currentStop = tracking?.currentStop || 'Coonoor Stand';
    const nextStop = tracking?.nextStop || 'Wellington Barracks';
    const etaMinutes = tracking?.etaMinutes || 12;
    const lastUpdated = tracking?.lastUpdated ? new Date(tracking.lastUpdated).toLocaleTimeString() : 'Just now';

    const stops = (tracking && tracking.routeStops && tracking.routeStops.length > 0)
      ? tracking.routeStops
      : [
          { id: 101, stop_name: "Coonoor Stand", stop_order: 1, pickup_time: "07:15 AM", status: "passed" },
          { id: 102, stop_name: "Wellington Barracks", stop_order: 2, pickup_time: "07:30 AM", status: "passed" },
          { id: 103, stop_name: "Charring Cross Junction", stop_order: 3, pickup_time: "07:48 AM", isStudentStop: true },
          { id: 104, stop_name: "Rex SSS Campus Gate", stop_order: 4, pickup_time: "08:15 AM", status: "pending" }
        ];

    container.innerHTML = `
      <div class="card" style="border: 1px solid var(--border-medium); box-shadow: var(--shadow-md);">
        <!-- Mode Differentiation Banner (Requirement 4 & 6) -->
        <div style="background: linear-gradient(90deg, #eff6ff, #dbeafe); border-bottom: 2px solid #2563eb; padding: 0.6rem 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; font-size: 0.8rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: #1e40af;">
            <span>🧪 ${modeLabel}</span>
            <span style="font-size: 0.72rem; font-weight: 500; opacity: 0.85;">
              (Gradual continuous simulation along ordered Nilgiris route stops)
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span id="live-tracking-mode-badge" class="badge ${isDemoActive ? 'badge-present' : 'badge-warning'}" style="font-size: 0.7rem;">
              ${isDemoActive ? '● SIMULATION RUNNING' : '○ SIMULATION STANDBY'}
            </span>
            <!-- Map Toggle Button -->
            <button type="button" class="btn btn-sm btn-outline" onclick="TransportModule.setViewMode('${this.viewMode === 'map' ? 'topo' : 'map'}')" style="font-size: 0.72rem; padding: 0.2rem 0.6rem; background: #fff;">
              ${this.viewMode === 'map' ? '⛰️ Topo Route' : '🗺️ Google Maps'}
            </button>
          </div>
        </div>

        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <h3 class="card-title" style="margin: 0; font-size: 1.15rem;">🚌 School Bus Live Tracker</h3>
              <span class="badge badge-present" style="animation: pulse 2s infinite;">● Live Sync</span>
            </div>
            <p class="card-subtitle" style="margin: 0.2rem 0 0 0;">
              ${busNumber} (${vehicleNo}) • Route: ${routeName} • Driver: ${driverName} (${driverPhone})
            </p>
          </div>

          <!-- Multi-Child Selector Chips (Requirement 6) -->
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            <button type="button" class="btn btn-sm ${this.selectedStudentId === 1 ? 'btn-primary' : 'btn-outline'}" onclick="TransportModule.selectChild(1)" style="font-size: 0.75rem;">
              Aarav Sharma (Bus 1)
            </button>
            <button type="button" class="btn btn-sm ${this.selectedStudentId === 2 ? 'btn-primary' : 'btn-outline'}" onclick="TransportModule.selectChild(2)" style="font-size: 0.75rem;">
              Ananya Sharma (Bus 2)
            </button>
          </div>
        </div>

        <div class="card-body">
          <!-- 500m Geofence Bar -->
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
                  Target Stop: <strong>Charring Cross Junction</strong> • Proximity: <strong id="live-bus-distance-tag" style="color: #1e3a8a;">480m (Within Geofence)</strong>
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <button type="button" class="btn btn-sm btn-primary" onclick="TransportModule.simulate500mAlert()" style="background: #f59e0b; border-color: #f59e0b; color: #000; font-weight: 800; font-size: 0.75rem;" title="Test 500m audio chime and modal">
                ⚡ Trigger 500m Alert Now
              </button>
              <button type="button" id="btn-toggle-sound" class="btn btn-sm ${this.soundEnabled ? 'btn-primary' : 'btn-secondary'}" onclick="TransportModule.toggleSound()" style="font-size: 0.75rem;">
                ${this.soundEnabled ? '🔔 Sound On' : '🔕 Muted'}
              </button>
            </div>
          </div>

          <!-- MAP CONTAINER: Google Maps JS API OR Topo Route Visualizer -->
          ${this.viewMode === 'map' && this.googleMapsLoaded ? `
            <div id="google-bus-map-container" style="width: 100%; height: 260px; border-radius: var(--radius-md); border: 1px solid var(--border-medium); margin-bottom: 1.25rem; overflow: hidden; background: #e5e7eb;">
              <!-- Google Map rendered here -->
            </div>
          ` : `
            <!-- Interactive Topo Route Visualizer (Fallback & Alternate) -->
            <div style="position: relative; height: 230px; background: radial-gradient(circle at 10% 20%, #f1f5f9 0%, #e2e8f0 100%); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 1.25rem;">
              <!-- Notice when Google Maps key is not set -->
              ${!this.mapsConfig.isConfigured ? `
                <div style="position: absolute; top: 8px; left: 8px; z-index: 10; background: rgba(255, 255, 255, 0.92); padding: 3px 8px; border-radius: 6px; font-size: 0.68rem; color: #475569; border: 1px solid #cbd5e1;">
                  🗺️ Google Maps API key unconfigured in .env • Showing Interactive Route Navigator
                </div>
              ` : ''}

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
                ${stops.map((stop, idx) => {
                  const isPassed = stop.status === 'passed';
                  const isStudent = stop.isStudentStop || stop.id === 103;
                  return `
                    <div style="display: flex; flex-direction: column; align-items: center; text-align: center; z-index: 2;">
                      <div style="width: ${isStudent ? '34px' : '26px'}; height: ${isStudent ? '34px' : '26px'}; border-radius: 50%; background: ${isStudent ? '#f59e0b' : (isPassed ? '#10b981' : '#fff')}; border: 3px solid ${isStudent ? '#fff' : (isPassed ? '#10b981' : '#94a3b8')}; color: ${isPassed || isStudent ? '#fff' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: ${isStudent ? '1rem' : '0.7rem'}; font-weight: 800; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                        ${isStudent ? '★' : (isPassed ? '✓' : (idx + 1))}
                      </div>
                      <div style="margin-top: 0.35rem; font-size: 0.72rem; font-weight: ${isStudent ? '800' : '600'}; color: ${isStudent ? '#1e3a8a' : 'var(--text-primary)'}; max-width: 90px; line-height: 1.2;">
                        ${stop.stop_name.split(' ')[0]}
                      </div>
                      <div style="font-size: 0.65rem; color: var(--text-muted);">${stop.pickup_time || '07:30 AM'}</div>
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
                  32 km/h
                </div>
              </div>
            </div>
          `}

          <!-- Live Telemetry Status Strip -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.85rem; margin-bottom: 1rem; font-size: 0.82rem;">
            <div style="background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted); font-size: 0.7rem; display: block;">LIVE STATUS</span>
              <strong style="color: ${isDemoActive ? '#16a34a' : 'var(--text-primary)'};">${statusText}</strong>
              <div style="color: var(--text-muted); font-size: 0.72rem;">Updated: ${lastUpdated}</div>
            </div>

            <div style="background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted); font-size: 0.7rem; display: block;">CURRENT STOP & ETA</span>
              <strong style="color: var(--primary);" id="live-bus-current-stop-val">${currentStop}</strong>
              <div style="color: #16a34a; font-weight: 700; font-size: 0.75rem;">ETA: <span id="live-bus-eta-val">${etaMinutes} mins</span></div>
            </div>

            <div style="background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted); font-size: 0.7rem; display: block;">GPS COORDINATES</span>
              <strong id="live-bus-coords-val">${(tracking?.currentLatitude || 11.3530).toFixed(4)}, ${(tracking?.currentLongitude || 76.7959).toFixed(4)}</strong>
              <div style="color: var(--text-muted); font-size: 0.72rem;">Progress: ${this.currentProgressPercent}%</div>
            </div>

            <div style="background: var(--bg-subtle); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted); font-size: 0.7rem; display: block;">DRIVER & DISPATCH</span>
              <strong style="color: var(--text-primary);">${driverName}</strong>
              <div style="color: var(--primary); font-size: 0.75rem;">
                <a href="tel:${driverPhone}" style="color: var(--primary); text-decoration: none;">📞 ${driverPhone}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (this.viewMode === 'map' && this.googleMapsLoaded) {
      setTimeout(() => this.initGoogleMap('google-bus-map-container'), 100);
    }
  },

  // Render Super Admin Full Fleet Management (Requirement 3)
  renderAdminFleet(containerId = 'transport-view-content') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const buses = this.fleetData.length > 0 ? this.fleetData : [
      { id: 1, bus_number: 'Route 02', vehicle_no: 'TN-43-A-2015', model: 'Ashok Leyland Lynx', capacity: 36, status: 'ACTIVE', driver_name: 'Joseph Selvaraj', driver_mobile: '9443210045', route_name: 'Coonoor - Wellington - Rex SSS', is_demo_active: 0 },
      { id: 2, bus_number: 'Bus #04', vehicle_no: 'TN-43-B-3104', model: 'Eicher Skyline Pro', capacity: 36, status: 'ACTIVE', driver_name: 'R. Kumaravel', driver_mobile: '9842177420', route_name: 'Kotagiri - Ooty Road - Rex SSS', is_demo_active: 0 }
    ];

    const currentBus = buses.find(b => b.id === this.selectedBusId) || buses[0];
    const isDemoRunning = currentBus && currentBus.is_demo_active === 1;

    container.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin: 0;">🚌 Transport & GPS Fleet Management</h2>
            <p style="color: var(--text-secondary); margin: 0.25rem 0 0 0; font-size: 0.9rem;">
              Authoritative Nilgiris route simulation, Google Maps live tracker, and bus fleet administration.
            </p>
          </div>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary" onclick="TransportModule.openAddBusModal()">
              ➕ Add Bus
            </button>
            <button type="button" class="btn btn-secondary" onclick="TransportModule.openRouteManagementModal()">
              🛣️ Routes & Stops
            </button>
            <button type="button" class="btn btn-outline" onclick="TransportModule.simulate500mAlert()">
              ⚡ Test 500m Alarm
            </button>
          </div>
        </div>
      </div>

      <!-- Super Admin Demo Tracking Controller Card (Requirement 3, 4, 5) -->
      <div class="card" style="margin-bottom: 1.5rem; border: 2px solid ${isDemoRunning ? '#2563eb' : 'var(--border-medium)'}; background: var(--bg-surface);">
        <div class="card-header" style="background: linear-gradient(90deg, #f8fafc, #f1f5f9); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h4 class="card-title" style="margin: 0; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem;">
              🎮 Backend Demo GPS Simulator Controller
              <span class="badge ${isDemoRunning ? 'badge-present' : 'badge-warning'}">
                ${isDemoRunning ? '● SIMULATION RUNNING' : '○ SIMULATION STANDBY'}
              </span>
            </h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">
              Authoritative backend GPS simulator moves gradually along configured route stops. Web and Android observe the exact same coordinates.
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge badge-info" style="font-size: 0.72rem;">DEMO TRACKING MODE</span>
          </div>
        </div>

        <div class="card-body" style="padding: 1.25rem;">
          <!-- Bus Selector & Controls Row -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <!-- Select Bus for Simulation -->
            <div>
              <label class="form-label" style="font-size: 0.8rem; font-weight: 700;">Select Bus for Simulation & Tracking:</label>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                ${buses.map(b => `
                  <button type="button" class="btn btn-sm ${b.id === this.selectedBusId ? 'btn-primary' : 'btn-outline'}" onclick="TransportModule.selectBus(${b.id})" style="font-size: 0.78rem;">
                    ${b.bus_number} (${b.vehicle_no}) ${b.is_demo_active === 1 ? '● Moving' : ''}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Start / Pause / Resume / Stop / Reset Buttons -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button type="button" class="btn btn-sm ${isDemoRunning ? 'btn-secondary' : 'btn-primary'}" onclick="TransportModule.startDemoTracking()" ${isDemoRunning ? 'disabled' : ''}>
                  ▶ Start Demo
                </button>
                <button type="button" class="btn btn-sm btn-warning" onclick="TransportModule.pauseDemoTracking()" ${!isDemoRunning ? 'disabled' : ''}>
                  ⏸ Pause Demo
                </button>
                <button type="button" class="btn btn-sm btn-secondary" onclick="TransportModule.resumeDemoTracking()" ${isDemoRunning ? 'disabled' : ''}>
                  ⏯ Resume Demo
                </button>
                <button type="button" class="btn btn-sm btn-outline" onclick="TransportModule.stopDemoTracking()" style="color: #ef4444; border-color: #ef4444;">
                  ⏹ Stop Demo
                </button>
                <button type="button" class="btn btn-sm btn-outline" onclick="TransportModule.resetDemoTracking()">
                  🔄 Reset Depot
                </button>
              </div>

              <!-- Speed Selector Multiplier -->
              <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem;">
                <span style="font-weight: 700; color: var(--text-secondary);">Sim Speed:</span>
                <button type="button" class="btn btn-sm ${this.demoSpeed === 1 ? 'btn-primary' : 'btn-ghost'}" onclick="TransportModule.setSpeedMultiplier(1)" style="padding: 0.2rem 0.55rem; font-size: 0.75rem;">1x</button>
                <button type="button" class="btn btn-sm ${this.demoSpeed === 2 ? 'btn-primary' : 'btn-ghost'}" onclick="TransportModule.setSpeedMultiplier(2)" style="padding: 0.2rem 0.55rem; font-size: 0.75rem;">2x</button>
                <button type="button" class="btn btn-sm ${this.demoSpeed === 5 ? 'btn-primary' : 'btn-ghost'}" onclick="TransportModule.setSpeedMultiplier(5)" style="padding: 0.2rem 0.55rem; font-size: 0.75rem;">5x Fast</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Bus Tracker Display Widget for Super Admin -->
      <div id="admin-bus-widget" style="margin-bottom: 2rem;">
        <!-- Injected by renderParentWidget -->
      </div>

      <!-- Complete Fleet Table Directory (Requirement 3: Bus Management) -->
      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <h4 class="card-title" style="margin: 0;">School Bus Fleet Directory & Drivers</h4>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${buses.length} Registered Vehicles</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Bus #</th>
                <th>Reg No</th>
                <th>Model</th>
                <th>Capacity</th>
                <th>Driver</th>
                <th>Route</th>
                <th>Status</th>
                <th>Demo Simulation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${buses.map(b => `
                <tr>
                  <td><strong>${b.bus_number}</strong></td>
                  <td><span class="badge badge-info">${b.vehicle_no}</span></td>
                  <td>${b.model || 'Standard Fleet'}</td>
                  <td>${b.capacity || 36} seats</td>
                  <td>
                    <strong>${b.driver_name || 'Unassigned'}</strong>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${b.driver_mobile || ''}</div>
                  </td>
                  <td>${b.route_name || 'Assigned Nilgiris Route'}</td>
                  <td>
                    <button type="button" class="btn btn-sm ${b.status === 'ACTIVE' ? 'btn-success' : 'btn-secondary'}" onclick="TransportModule.toggleBusStatus(${b.id}, '${b.status}')" style="font-size: 0.7rem; padding: 2px 6px;">
                      ${b.status}
                    </button>
                  </td>
                  <td>
                    <span class="badge ${b.is_demo_active === 1 ? 'badge-present' : 'badge-warning'}">
                      ${b.is_demo_active === 1 ? '● Moving' : '○ Standby'}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 0.35rem;">
                      <button type="button" class="btn btn-sm btn-outline" onclick="TransportModule.viewBusDetails(${b.id})" title="View Details">
                        👁️
                      </button>
                      <button type="button" class="btn btn-sm btn-outline" onclick="TransportModule.openAssignModal(${b.id})" title="Assign Driver/Route/Students">
                        🔗
                      </button>
                      <button type="button" class="btn btn-sm btn-ghost" onclick='TransportModule.openAddBusModal(${JSON.stringify(b).replace(/'/g, "&apos;")})' title="Edit Bus">
                        ✏️
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
