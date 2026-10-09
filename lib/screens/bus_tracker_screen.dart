import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/erp_provider.dart';
import '../services/app_permissions.dart';
import '../services/api_service.dart';
import '../widgets/bus_map_painter.dart';
import '../widgets/proximity_alert_dialog.dart';

class BusTrackerScreen extends StatefulWidget {
  const BusTrackerScreen({super.key});

  @override
  State<BusTrackerScreen> createState() => _BusTrackerScreenState();
}

class _BusTrackerScreenState extends State<BusTrackerScreen> {
  Timer? _telemetryTimer;
  Map<String, dynamic>? _liveTrackingData;
  List<dynamic> _fleetBuses = [];
  bool _isLoading = false;

  // Admin Demo Tracking controller state
  int _selectedAdminBusId = 1;
  int _selectedSpeed = 1;
  bool _isDemoActiveOnAdmin = false;
  double _demoProgress = 0.68;
  String _currentDemoStop = "Charring Cross Junction";
  String _nextDemoStop = "Rex SSS Main Gate";
  double _currentLat = 11.4116;
  double _currentLng = 76.7088;
  int _currentEta = 12;

  @override
  void initState() {
    super.initState();
    _fetchTelemetry();
    // Auto-update every 2.5 seconds without manual refresh (Section 13)
    _telemetryTimer = Timer.periodic(const Duration(milliseconds: 2500), (_) {
      if (mounted) {
        _fetchTelemetry(silent: true);
      }
    });
  }

  @override
  void dispose() {
    _telemetryTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchTelemetry({bool silent = false}) async {
    final permissions = AppPermissions.of(ApiService.activeRole);
    if (!silent) {
      setState(() => _isLoading = true);
    }

    try {
      if (permissions.isParent) {
        final erp = Provider.of<ERPProvider>(context, listen: false);
        final studentNumericId = int.tryParse(erp.currentStudent.id.replaceAll(RegExp(r'[^0-9]'), '')) ?? 1;
        final res = await ApiService.getLiveBus(studentId: studentNumericId);
        if (mounted && res['success'] == true) {
          setState(() {
            _liveTrackingData = res['tracking'];
            if (_liveTrackingData != null) {
              final prog = _liveTrackingData!['progressPercent'];
              if (prog != null) {
                _demoProgress = (prog as num).toDouble();
              }
            }
          });
        }
      } else {
        // Super Admin fleet telemetry
        final fleetRes = await ApiService.getFleet();
        if (mounted && fleetRes['success'] == true) {
          setState(() {
            _fleetBuses = fleetRes['buses'] ?? [];
            final cur = _fleetBuses.firstWhere((b) => b['id'] == _selectedAdminBusId, orElse: () => null);
            if (cur != null) {
              _isDemoActiveOnAdmin = cur['is_demo_active'] == 1;
              if (cur['progress_percent'] != null) {
                _demoProgress = (cur['progress_percent'] as num).toDouble();
              }
              if (cur['latitude'] != null) _currentLat = (cur['latitude'] as num).toDouble();
              if (cur['longitude'] != null) _currentLng = (cur['longitude'] as num).toDouble();
              if (cur['current_stop_name'] != null) _currentDemoStop = cur['current_stop_name'];
              if (cur['next_stop_name'] != null) _nextDemoStop = cur['next_stop_name'];
              if (cur['eta_minutes'] != null) _currentEta = (cur['eta_minutes'] as num).toInt();
            }
          });
        }
      }
    } catch (_) {}

    if (!silent && mounted) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _callDriver(String phone) async {
    final cleanPhone = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    final uri = Uri.parse('tel:$cleanPhone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);
    final permissions = AppPermissions.of(ApiService.activeRole);
    final isParent = permissions.isParent;

    return Scaffold(
      appBar: AppBar(
        title: Text(isParent ? "Child Bus Live Tracking" : "Transport & Fleet Telematics"),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_rounded),
            tooltip: "Sync Live Telematics",
            onPressed: () => _fetchTelemetry(),
          ),
        ],
      ),
      body: _isLoading && _liveTrackingData == null && _fleetBuses.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (isParent)
                    _buildParentTrackingView(context, erp)
                  else
                    _buildAdminFleetView(context, erp),
                ],
              ),
            ),
    );
  }

  // ==========================================================================
  // PARENT BUS TRACKING VIEW (Section 11, 13, 14, 15)
  // ==========================================================================
  Widget _buildParentTrackingView(BuildContext context, ERPProvider erp) {
    final isAnanya = erp.currentStudent.name.contains('Ananya') || erp.currentStudent.id == 'STU-1007';
    final assignedRouteId = isAnanya ? 'route-04' : 'route-02';
    final route = erp.busRoutes.firstWhere((r) => r.id == assignedRouteId, orElse: () => erp.selectedRoute);
    final schedule = route.getSchedule(erp.tripMode);
    final stops = schedule.stops;
    final studentStop = stops.firstWhere(
      (s) => s.isStudentStop,
      orElse: () => stops.length > 2 ? stops[2] : stops.first,
    );

    final tracking = _liveTrackingData;
    final isDemoMode = tracking != null && tracking['trackingMode'] == 'DEMO';
    final isDemoActive = tracking != null && tracking['isDemoActive'] == true;
    final isGpsConnected = tracking != null && tracking['isGpsConnected'] == true;
    final modeLabel = isGpsConnected ? "LIVE GPS" : (isDemoActive ? "DEMO TRACKING (ACTIVE)" : "DEMO TRACKING (STATIONARY)");
    final modeColor = isGpsConnected ? const Color(0xFF10B981) : (isDemoActive ? const Color(0xFF2563EB) : const Color(0xFFD97706));

    final busNo = tracking?['busNumber'] ?? (isAnanya ? "Bus #04" : "Route 02");
    final vehNo = tracking?['vehicleNo'] ?? (isAnanya ? "TN-43-B-3104" : "TN-43-A-2015");
    final driverName = tracking?['driverName'] ?? route.driverName;
    final driverPhone = tracking?['driverMobile'] ?? route.driverPhone;
    final currentStopText = tracking?['currentStop'] ?? studentStop.name;
    final statusText = tracking?['status'] ?? (isDemoActive ? "En Route (Continuous Motion)" : "Stationary (Awaiting GPS Feed)");

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Mode Banner (Section 14: Clear Differentiation)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          margin: const EdgeInsets.only(bottom: 14),
          decoration: BoxDecoration(
            color: modeColor.withOpacity(0.12),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: modeColor.withOpacity(0.3)),
          ),
          child: Row(
            children: [
              Icon(isGpsConnected ? Icons.satellite_alt_rounded : Icons.radar_rounded, color: modeColor, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "TRACKING MODE: $modeLabel",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: modeColor),
                    ),
                    Text(
                      isGpsConnected
                          ? "Satellite telematics link connected with real GPS telemetry."
                          : (isDemoActive
                              ? "Demo Simulation Mode: Moving along configured stops in real-time."
                              : "Demo Simulation Mode: Paused. Super Admin can start simulation in Demo Tracking."),
                      style: TextStyle(fontSize: 11, color: modeColor.withOpacity(0.9)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        // Multi-child Selector (Requirement 6: Support parents with multiple children)
        if (erp.students.length > 1)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: erp.students.map((student) {
                  final isSelected = erp.currentStudent.id == student.id;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text("${student.name} (${student.grade})"),
                      selected: isSelected,
                      selectedColor: const Color(0xFF1E3A8A),
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : Colors.black87,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12,
                      ),
                      onSelected: (selected) {
                        if (selected && !isSelected) {
                          erp.selectStudent(student);
                          _fetchTelemetry();
                        }
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

        // Child & Bus Assignment Header Card
        Container(
          padding: const EdgeInsets.all(16),
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)]),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF1E3A8A).withOpacity(0.25),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              const CircleAvatar(
                radius: 22,
                backgroundColor: Colors.white24,
                child: Icon(Icons.directions_bus, color: Colors.white, size: 26),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Assigned: $busNo ($vehNo)",
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "Ward: ${erp.currentStudent.name} • Stop: ${studentStop.name}",
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    Text(
                      "Status: $statusText",
                      style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              ElevatedButton(
                onPressed: () {
                  erp.trigger500mProximity();
                  showDialog(
                    context: context,
                    builder: (_) => ProximityAlertDialog(
                      route: route,
                      stop: studentStop,
                      tripMode: erp.tripMode,
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                ),
                child: const Text("500m Alert", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),

        // Moving Live Route Map Canvas Card
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(route.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        Text("Current Point: $currentStopText", style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                      ],
                    ),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(value: 'morning', label: Text("Morning", style: TextStyle(fontSize: 11))),
                        ButtonSegment(value: 'evening', label: Text("Evening", style: TextStyle(fontSize: 11))),
                      ],
                      selected: {erp.tripMode},
                      onSelectionChanged: (val) => erp.setTripMode(val.first),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Canvas Map with animated marker
                Container(
                  height: 190,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.withOpacity(0.2)),
                  ),
                  child: Stack(
                    children: [
                      CustomPaint(
                        size: const Size(double.infinity, 190),
                        painter: BusMapPainter(
                          stops: schedule.stops,
                          progressPercent: _demoProgress,
                        ),
                      ),
                      Positioned(
                        top: 10,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black87,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(width: 8, height: 8, decoration: BoxDecoration(color: isDemoActive ? const Color(0xFF10B981) : Colors.amber, shape: BoxShape.circle)),
                              const SizedBox(width: 6),
                              Text(
                                "Progress: ${(_demoProgress * 100).toStringAsFixed(0)}%",
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 10,
                        left: 12,
                        right: 12,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: schedule.stops.map((s) {
                            return Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  s.name.split(' ').first,
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: s.isStudentStop ? FontWeight.bold : FontWeight.w600,
                                    color: s.isStudentStop ? const Color(0xFF1E3A8A) : Colors.black87,
                                  ),
                                ),
                                Text(s.time, style: const TextStyle(fontSize: 9, color: Colors.grey)),
                              ],
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Driver & Crew Card
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Designated Bus Crew & Emergency Help", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFEFF6FF),
                    child: Icon(Icons.person, color: Color(0xFF1E3A8A)),
                  ),
                  title: Text("Driver: $driverName", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: Text("Vehicle $vehNo • Assigned to ${erp.currentStudent.name}"),
                  trailing: IconButton(
                    icon: const Icon(Icons.phone, color: Color(0xFF2563EB)),
                    tooltip: "Call Driver",
                    onPressed: () => _callDriver(driverPhone),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ==========================================================================
  // SUPER ADMIN FLEET DASHBOARD & DEMO TRACKING CONTROLS (Section 9, 10, 12, 16)
  // ==========================================================================
  Widget _buildAdminFleetView(BuildContext context, ERPProvider erp) {
    final buses = _fleetBuses.isNotEmpty
        ? _fleetBuses
        : [
            {
              'id': 1,
              'bus_number': 'Route 02',
              'vehicle_no': 'TN-43-A-2015',
              'model': 'Ashok Leyland Lynx (36-Seater)',
              'capacity': 36,
              'status': 'ACTIVE',
              'driver_name': 'Joseph Selvaraj',
              'driver_mobile': '9443210045',
              'route_name': 'Coonoor - Wellington - Charring Cross - Rex SSS',
              'is_demo_active': _isDemoActiveOnAdmin ? 1 : 0,
              'assigned_students': 1
            },
            {
              'id': 2,
              'bus_number': 'Bus #04',
              'vehicle_no': 'TN-43-B-3104',
              'model': 'Eicher Skyline Pro (36-Seater)',
              'capacity': 36,
              'status': 'ACTIVE',
              'driver_name': 'R. Kumaravel',
              'driver_mobile': '9842177420',
              'route_name': 'Kotagiri - Ooty Road - Botanical Garden - Rex SSS',
              'is_demo_active': 0,
              'assigned_students': 1
            }
          ];

    final activeBuses = buses.where((b) => b['status'] == 'ACTIVE').length;
    final demoActiveBuses = buses.where((b) => b['is_demo_active'] == 1).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Administrative Summary Card
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("NILGIRIS FLEET MANAGEMENT", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8)),
                  ElevatedButton.icon(
                    onPressed: () => _showAddBusDialog(context),
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text("Add Bus"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildAdminStat("Total Fleet", "${buses.length}", Colors.white),
                  _buildAdminStat("Active", "$activeBuses", const Color(0xFF10B981)),
                  _buildAdminStat("Demo Active", "$demoActiveBuses", const Color(0xFF38BDF8)),
                  _buildAdminStat("Live GPS", "0 (Simulated)", const Color(0xFFFBBF24)),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Section 12: DEMO TRACKING CONTROLLER CARD
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.radar_rounded, color: Color(0xFF1E3A8A)),
                        SizedBox(width: 8),
                        Text("Demo Live Tracking Controller", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _isDemoActiveOnAdmin ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _isDemoActiveOnAdmin ? "DEMO ACTIVE" : "DEMO IDLE",
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: _isDemoActiveOnAdmin ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Text(
                  "Control route simulation for testing without physical GPS hardware. Bus moves gradually along registered stops.",
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const Divider(height: 20),

                // Bus Selector Chips
                const Text("Select Bus for Simulation:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
                const SizedBox(height: 6),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: buses.map((b) {
                      final bId = b['id'] as int;
                      final isSel = _selectedAdminBusId == bId;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text("${b['bus_number']} (${b['vehicle_no']})"),
                          selected: isSel,
                          selectedColor: const Color(0xFF1E3A8A),
                          labelStyle: TextStyle(color: isSel ? Colors.white : Colors.black87, fontSize: 11),
                          onSelected: (_) => setState(() => _selectedAdminBusId = bId),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 12),

                // Speed Selector
                Row(
                  children: [
                    const Text("Simulation Speed: ", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
                    const SizedBox(width: 8),
                    ...[1, 2, 5].map((s) {
                      final isSel = _selectedSpeed == s;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text("${s}x"),
                          selected: isSel,
                          selectedColor: const Color(0xFF047857),
                          labelStyle: TextStyle(color: isSel ? Colors.white : Colors.black87, fontSize: 11),
                          visualDensity: VisualDensity.compact,
                          onSelected: (_) => setState(() => _selectedSpeed = s),
                        ),
                      );
                    }).toList(),
                  ],
                ),

                const SizedBox(height: 14),

                // Start / Pause / Resume / Stop / Reset Buttons
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ElevatedButton.icon(
                      onPressed: _isDemoActiveOnAdmin
                          ? null
                          : () async {
                              await ApiService.startDemoTracking(_selectedAdminBusId, speed: _selectedSpeed);
                              setState(() => _isDemoActiveOnAdmin = true);
                              _fetchTelemetry();
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text("DEMO TRACKING Started! Moving continuously along route stops.")),
                                );
                              }
                            },
                      icon: const Icon(Icons.play_arrow_rounded),
                      label: const Text("Start Demo"),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF047857), foregroundColor: Colors.white),
                    ),
                    ElevatedButton.icon(
                      onPressed: !_isDemoActiveOnAdmin
                          ? null
                          : () async {
                              await ApiService.pauseDemoTracking(_selectedAdminBusId);
                              setState(() => _isDemoActiveOnAdmin = false);
                              _fetchTelemetry();
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text("DEMO TRACKING Paused (Position preserved).")),
                                );
                              }
                            },
                      icon: const Icon(Icons.pause_circle_outline_rounded),
                      label: const Text("Pause Demo"),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD97706), foregroundColor: Colors.white),
                    ),
                    ElevatedButton.icon(
                      onPressed: _isDemoActiveOnAdmin
                          ? null
                          : () async {
                              await ApiService.resumeDemoTracking(_selectedAdminBusId);
                              setState(() => _isDemoActiveOnAdmin = true);
                              _fetchTelemetry();
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text("DEMO TRACKING Resumed from current position.")),
                                );
                              }
                            },
                      icon: const Icon(Icons.play_circle_outline_rounded),
                      label: const Text("Resume Demo"),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white),
                    ),
                    ElevatedButton.icon(
                      onPressed: () async {
                        await ApiService.stopDemoTracking(_selectedAdminBusId);
                        setState(() => _isDemoActiveOnAdmin = false);
                        _fetchTelemetry();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("DEMO TRACKING Stopped.")),
                          );
                        }
                      },
                      icon: const Icon(Icons.stop_rounded),
                      label: const Text("Stop Demo"),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626), foregroundColor: Colors.white),
                    ),
                    OutlinedButton.icon(
                      onPressed: () async {
                        await ApiService.resetDemoTracking(_selectedAdminBusId);
                        setState(() => _isDemoActiveOnAdmin = false);
                        _fetchTelemetry();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("DEMO TRACKING Reset to route starting depot.")),
                          );
                        }
                      },
                      icon: const Icon(Icons.replay_rounded, size: 16),
                      label: const Text("Reset Depot"),
                    ),
                  ],
                ),

                const SizedBox(height: 14),

                // Current Telemetry Box
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("Current Stop: $_currentDemoStop", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                          Text("Next Stop: $_nextDemoStop", style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("Simulated GPS: $_currentLat, $_currentLng", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          Text("ETA: $_currentEta mins", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF047857))),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Fleet Directory List (Section 9)
        const Text("Registered Fleet Buses", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
        const SizedBox(height: 10),

        ...buses.map((bus) {
          final isDemoRunning = bus['is_demo_active'] == 1;
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: isDemoRunning ? const Color(0xFF93C5FD) : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text("${bus['bus_number']} • ${bus['vehicle_no']}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isDemoRunning ? const Color(0xFFDBEAFE) : const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        isDemoRunning ? "DEMO MOVING" : (bus['status'] ?? "ACTIVE"),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isDemoRunning ? const Color(0xFF1E40AF) : const Color(0xFF15803D),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text("Model: ${bus['model'] ?? 'Standard'} • Capacity: ${bus['capacity']} seats", style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                Text("Driver: ${bus['driver_name'] ?? 'Assigned'} (${bus['driver_mobile'] ?? 'N/A'})", style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                Text("Route: ${bus['route_name'] ?? 'Assigned Nilgiris Route'}", style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildAdminStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 10)),
      ],
    );
  }

  // ==========================================================================
  // ADD BUS DIALOG (Requirements 9)
  // ==========================================================================
  void _showAddBusDialog(BuildContext context) {
    final busNoController = TextEditingController();
    final regNoController = TextEditingController();
    final modelController = TextEditingController(text: "Tata Starbus Ultra (36-Seater)");
    final capacityController = TextEditingController(text: "36");
    String status = "ACTIVE";

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: const [
            Icon(Icons.directions_bus, color: Color(0xFF1E3A8A)),
            SizedBox(width: 8),
            Text("Add New Fleet Bus", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: busNoController,
                decoration: const InputDecoration(labelText: "Bus Identifier / Number (e.g. Bus #05)", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: regNoController,
                decoration: const InputDecoration(labelText: "Vehicle Reg No (e.g. TN-43-C-4501)", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: modelController,
                decoration: const InputDecoration(labelText: "Bus Model / Fleet Spec", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: capacityController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: "Seating Capacity", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: status,
                decoration: const InputDecoration(labelText: "Operational Status", border: OutlineInputBorder()),
                items: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                onChanged: (val) => status = val ?? 'ACTIVE',
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () async {
              if (busNoController.text.trim().isEmpty || regNoController.text.trim().isEmpty) {
                return;
              }
              Navigator.pop(ctx);
              final res = await ApiService.addBus({
                'busNumber': busNoController.text.trim(),
                'vehicleNo': regNoController.text.trim(),
                'model': modelController.text.trim(),
                'capacity': int.tryParse(capacityController.text.trim()) ?? 36,
                'status': status,
                'driverId': 1,
                'routeId': 1,
              });

              _fetchTelemetry();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(res['message'] ?? "Bus added successfully."),
                    backgroundColor: const Color(0xFF047857),
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A), foregroundColor: Colors.white),
            child: const Text("Save Bus"),
          ),
        ],
      ),
    );
  }
}
