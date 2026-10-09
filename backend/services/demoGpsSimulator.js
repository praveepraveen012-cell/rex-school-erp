/**
 * Rex Senior Secondary School - Backend Demo GPS Simulator Engine
 * Authoritative GPS Simulator for Demo Bus Tracking
 * Provides gradual waypoint progression, persistence, pause/resume, and multi-client sync.
 */

const db = require('../database/db');

class DemoGpsSimulator {
  constructor() {
    this.activeSimulations = new Map(); // busId -> { interval, speed, routeId }
  }

  /**
   * Calculate interpolated latitude and longitude along ordered route stops
   */
  calculatePosition(stops, progressPercent) {
    if (!stops || stops.length === 0) {
      return { latitude: 11.4116, longitude: 76.7088, stopIndex: 0, currentStop: 'Depot', nextStop: 'Gate' };
    }
    if (stops.length === 1) {
      return {
        latitude: stops[0].latitude || 11.4116,
        longitude: stops[0].longitude || 76.7088,
        stopIndex: 0,
        currentStop: stops[0].stop_name,
        nextStop: stops[0].stop_name
      };
    }

    const clampedProgress = Math.max(0.0, Math.min(0.9999, progressPercent));
    const totalSegments = stops.length - 1;
    const rawSegment = clampedProgress * totalSegments;
    const segIndex = Math.min(totalSegments - 1, Math.floor(rawSegment));
    const t = rawSegment - segIndex;

    const currentStop = stops[segIndex];
    const nextStop = stops[segIndex + 1] || stops[segIndex];

    const lat1 = currentStop.latitude || 11.3530;
    const lng1 = currentStop.longitude || 76.7959;
    const lat2 = nextStop.latitude || 11.4168;
    const lng2 = nextStop.longitude || 76.6963;

    const currentLat = lat1 + (lat2 - lat1) * t;
    const currentLng = lng1 + (lng2 - lng1) * t;

    return {
      latitude: parseFloat(currentLat.toFixed(6)),
      longitude: parseFloat(currentLng.toFixed(6)),
      stopIndex: segIndex,
      currentStop: currentStop.stop_name,
      nextStop: nextStop.stop_name
    };
  }

  /**
   * Start or restart demo tracking for a bus
   */
  start(busId, routeId = null, speedMultiplier = 1) {
    const numBusId = parseInt(busId, 10);
    const speed = Math.max(1, parseInt(speedMultiplier, 10) || 1);

    const bus = db.get(`SELECT * FROM buses WHERE id = ?`, [numBusId]);
    if (!bus) {
      throw new Error(`Bus with ID ${numBusId} not found.`);
    }

    if (bus.status === 'INACTIVE' || bus.status === 'IDLE') {
      throw new Error(`Cannot start tracking on INACTIVE bus ${bus.bus_number}. Activate bus first.`);
    }

    // Determine target route
    const targetRoute = routeId
      ? db.get(`SELECT * FROM bus_routes WHERE id = ?`, [routeId])
      : db.get(`SELECT * FROM bus_routes WHERE assigned_bus_id = ?`, [numBusId]) || db.get(`SELECT * FROM bus_routes LIMIT 1`);

    if (!targetRoute) {
      throw new Error(`No route configured for bus ${bus.bus_number}.`);
    }

    const stops = db.query(`SELECT * FROM bus_stops WHERE route_id = ? ORDER BY stop_order ASC`, [targetRoute.id]);
    if (stops.length < 2) {
      throw new Error(`Route "${targetRoute.name}" must have at least 2 ordered stops with coordinates.`);
    }

    // Clear existing interval if already running to prevent duplicate simulation loops
    this.stopInterval(numBusId);

    // Get current progress or start from initial position (0.05)
    let state = db.get(`SELECT * FROM bus_tracking_state WHERE bus_id = ?`, [numBusId]);
    let currentProgress = (state && state.progress_percent > 0 && state.progress_percent < 1.0)
      ? state.progress_percent
      : 0.02;

    const pos = this.calculatePosition(stops, currentProgress);
    const baseEta = targetRoute.eta_minutes || 15;
    const remainingEta = Math.max(1, Math.round(baseEta * (1.0 - currentProgress)));

    db.run(
      `INSERT OR REPLACE INTO bus_tracking_state
       (bus_id, route_id, driver_id, tracking_mode, is_active, speed_multiplier, current_stop_index, progress_percent, latitude, longitude, current_stop_name, next_stop_name, eta_minutes, status_text, last_updated)
       VALUES (?, ?, ?, 'DEMO', 1, ?, ?, ?, ?, ?, ?, ?, ?, 'En Route (Demo Tracking Active)', CURRENT_TIMESTAMP)`,
      [
        numBusId,
        targetRoute.id,
        bus.driver_id || null,
        speed,
        pos.stopIndex,
        parseFloat(currentProgress.toFixed(4)),
        pos.latitude,
        pos.longitude,
        pos.currentStop,
        pos.nextStop,
        remainingEta
      ]
    );

    // Start background tick interval: advances ~1% progress per 1.5 seconds at 1x
    const tickIntervalMs = 1000;
    const progressStepPerTick = 0.008 * speed; // ~0.8% per second at 1x

    const intervalId = setInterval(() => {
      try {
        this.tick(numBusId, targetRoute.id, progressStepPerTick, baseEta);
      } catch (err) {
        console.error(`[DemoGpsSimulator Error bus ${numBusId}]:`, err.message);
      }
    }, tickIntervalMs);

    this.activeSimulations.set(numBusId, {
      interval: intervalId,
      speed,
      routeId: targetRoute.id
    });

    console.log(`[DemoGpsSimulator]: Started demo tracking for Bus ${numBusId} on Route ${targetRoute.name} (${speed}x speed).`);

    return this.getState(numBusId);
  }

  /**
   * Internal simulation tick
   */
  tick(busId, routeId, step, baseEta) {
    const state = db.get(`SELECT * FROM bus_tracking_state WHERE bus_id = ?`, [busId]);
    if (!state || state.is_active !== 1) {
      this.stopInterval(busId);
      return;
    }

    const stops = db.query(`SELECT * FROM bus_stops WHERE route_id = ? ORDER BY stop_order ASC`, [routeId]);
    if (stops.length < 2) return;

    let newProgress = state.progress_percent + step;
    if (newProgress >= 1.0) {
      // Loop smoothly back for continuous demo tracking
      newProgress = newProgress % 1.0;
    }

    const pos = this.calculatePosition(stops, newProgress);
    const remainingEta = Math.max(1, Math.round(baseEta * (1.0 - newProgress)));
    const statusText = newProgress > 0.92
      ? 'Approaching Campus Gate'
      : `En Route to ${pos.nextStop}`;

    db.run(
      `UPDATE bus_tracking_state
       SET progress_percent = ?, current_stop_index = ?, latitude = ?, longitude = ?,
           current_stop_name = ?, next_stop_name = ?, eta_minutes = ?, status_text = ?,
           last_updated = CURRENT_TIMESTAMP
       WHERE bus_id = ?`,
      [
        parseFloat(newProgress.toFixed(4)),
        pos.stopIndex,
        pos.latitude,
        pos.longitude,
        pos.currentStop,
        pos.nextStop,
        remainingEta,
        statusText,
        busId
      ]
    );
  }

  /**
   * Pause demo tracking (preserves position)
   */
  pause(busId) {
    const numBusId = parseInt(busId, 10);
    this.stopInterval(numBusId);

    db.run(
      `UPDATE bus_tracking_state
       SET is_active = 0, status_text = 'Paused (Demo Tracking)', last_updated = CURRENT_TIMESTAMP
       WHERE bus_id = ?`,
      [numBusId]
    );

    console.log(`[DemoGpsSimulator]: Paused demo tracking for Bus ${numBusId}.`);
    return this.getState(numBusId);
  }

  /**
   * Resume demo tracking from paused position
   */
  resume(busId) {
    const numBusId = parseInt(busId, 10);
    const state = db.get(`SELECT * FROM bus_tracking_state WHERE bus_id = ?`, [numBusId]);
    if (!state || !state.route_id) {
      return this.start(numBusId);
    }

    return this.start(numBusId, state.route_id, state.speed_multiplier || 1);
  }

  /**
   * Stop demo tracking
   */
  stop(busId) {
    const numBusId = parseInt(busId, 10);
    this.stopInterval(numBusId);

    db.run(
      `UPDATE bus_tracking_state
       SET is_active = 0, status_text = 'Stopped (Demo Tracking)', last_updated = CURRENT_TIMESTAMP
       WHERE bus_id = ?`,
      [numBusId]
    );

    console.log(`[DemoGpsSimulator]: Stopped demo tracking for Bus ${numBusId}.`);
    return this.getState(numBusId);
  }

  /**
   * Reset demo tracking back to first stop
   */
  reset(busId) {
    const numBusId = parseInt(busId, 10);
    this.stopInterval(numBusId);

    const state = db.get(`SELECT * FROM bus_tracking_state WHERE bus_id = ?`, [numBusId]);
    const routeId = (state && state.route_id) ? state.route_id : 1;
    const stops = db.query(`SELECT * FROM bus_stops WHERE route_id = ? ORDER BY stop_order ASC`, [routeId]);

    const firstStop = stops[0] || { stop_name: 'Route Start', latitude: 11.3530, longitude: 76.7959 };
    const secondStop = stops[1] || firstStop;

    db.run(
      `UPDATE bus_tracking_state
       SET progress_percent = 0.0, current_stop_index = 0,
           latitude = ?, longitude = ?,
           current_stop_name = ?, next_stop_name = ?,
           is_active = 0, status_text = 'Stationary (Demo Ready - At Start)',
           last_updated = CURRENT_TIMESTAMP
       WHERE bus_id = ?`,
      [firstStop.latitude, firstStop.longitude, firstStop.stop_name, secondStop.stop_name, numBusId]
    );

    console.log(`[DemoGpsSimulator]: Reset demo tracking for Bus ${numBusId} to ${firstStop.stop_name}.`);
    return this.getState(numBusId);
  }

  /**
   * Set speed multiplier
   */
  setSpeed(busId, speedMultiplier) {
    const numBusId = parseInt(busId, 10);
    const speed = Math.max(1, parseInt(speedMultiplier, 10) || 1);

    db.run(
      `UPDATE bus_tracking_state
       SET speed_multiplier = ?, last_updated = CURRENT_TIMESTAMP
       WHERE bus_id = ?`,
      [speed, numBusId]
    );

    // If currently running, restart with new speed
    const active = this.activeSimulations.get(numBusId);
    if (active) {
      this.start(numBusId, active.routeId, speed);
    }

    return this.getState(numBusId);
  }

  /**
   * Clear active background timer
   */
  stopInterval(busId) {
    const active = this.activeSimulations.get(busId);
    if (active && active.interval) {
      clearInterval(active.interval);
    }
    this.activeSimulations.delete(busId);
  }

  /**
   * Get formatted tracking state for bus
   */
  getState(busId) {
    const numBusId = parseInt(busId, 10);
    return db.get(
      `SELECT bts.*, b.bus_number, b.vehicle_no, b.model, b.status as bus_status,
              br.name as route_name, br.route_code, br.start_point, br.end_point,
              d.name as driver_name, d.mobile as driver_mobile
       FROM bus_tracking_state bts
       JOIN buses b ON bts.bus_id = b.id
       LEFT JOIN bus_routes br ON bts.route_id = br.id
       LEFT JOIN drivers d ON b.id = d.assigned_bus_id
       WHERE bts.bus_id = ?`,
      [numBusId]
    );
  }
}

// Export singleton instance
const simulator = new DemoGpsSimulator();
module.exports = simulator;
