import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/erp_provider.dart';
import '../services/app_permissions.dart';
import '../services/api_service.dart';
import '../widgets/bus_map_painter.dart';
import '../widgets/proximity_alert_dialog.dart';

class BusTrackerScreen extends StatelessWidget {
  const BusTrackerScreen({super.key});

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
    final route = erp.selectedRoute;
    final schedule = erp.currentSchedule;
    final studentStop = erp.studentStop;
    final isParent = permissions.isParent;

    return Scaffold(
      appBar: AppBar(
        title: Text(isParent ? "Child Bus Live GPS" : "Transport & Fleet GPS"),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: "Sync Fleet",
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(isParent ? "Bus GPS Location Refreshed" : "All 4 School Buses Synced with Satellites")),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header summary
            if (isParent) ...[
              Container(
                padding: const EdgeInsets.all(14),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)]),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const CircleAvatar(
                      backgroundColor: Colors.white24,
                      child: Icon(Icons.directions_bus, color: Colors.white),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Assigned Bus: Route ${route.routeNumber} (${route.vehicleNo})",
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          Text(
                            "Ward: ${erp.currentStudent.name} • Stop: ${studentStop.name}",
                            style: const TextStyle(color: Colors.white70, fontSize: 12),
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
            ] else ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("🚌 Nilgiris Fleet GPS", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      Text("Real-time GPS tracking & 500m geofencing", style: TextStyle(color: Colors.grey, fontSize: 12)),
                    ],
                  ),
                  ElevatedButton.icon(
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
                    icon: const Icon(Icons.flash_on, size: 16),
                    label: const Text("Test 500m Alert"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF59E0B),
                      foregroundColor: Colors.black,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Route Selector Tabs (Admin/Teacher only)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: erp.busRoutes.map((r) {
                    final isSelected = r.id == erp.selectedRouteId;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text("${r.routeNumber} (${r.vehicleNo})"),
                        selected: isSelected,
                        selectedColor: const Color(0xFF1E3A8A),
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : Colors.black87,
                          fontWeight: FontWeight.bold,
                        ),
                        onSelected: (_) => erp.setSelectedRoute(r.id),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Active Route Map Canvas Card
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
                            Text(route.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            Text("Driver: ${route.driverName} • Attendant: ${route.attendantName}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                          ],
                        ),
                        // Morning / Evening switcher
                        SegmentedButton<String>(
                          segments: const [
                            ButtonSegment(value: 'morning', label: Text("Morning")),
                            ButtonSegment(value: 'evening', label: Text("Evening")),
                          ],
                          selected: {erp.tripMode},
                          onSelectionChanged: (val) => erp.setTripMode(val.first),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Canvas Map
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
                              progressPercent: erp.busProgress,
                            ),
                          ),
                          Positioned(
                            bottom: 12,
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

            // Fleet Directory / Child Bus Card
            if (isParent) ...[
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Designated Bus Crew & Emergency Help", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Color(0xFFEFF6FF),
                          child: Icon(Icons.person, color: Color(0xFF1E3A8A)),
                        ),
                        title: Text("Driver: ${route.driverName}", style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text("Vehicle ${route.vehicleNo} • Speed ${route.speed} km/h"),
                        trailing: IconButton(
                          icon: const Icon(Icons.phone, color: Color(0xFF2563EB)),
                          tooltip: "Call Driver",
                          onPressed: () => _callDriver(route.driverPhone),
                        ),
                      ),
                      const Divider(height: 12),
                      ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Color(0xFFEFF6FF),
                          child: Icon(Icons.support_agent, color: Color(0xFF1E3A8A)),
                        ),
                        title: Text("Attendant: ${route.attendantName}", style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: const Text("Student safety monitor on board"),
                        trailing: IconButton(
                          icon: const Icon(Icons.phone, color: Color(0xFF10B981)),
                          tooltip: "Call Attendant",
                          onPressed: () => _callDriver("+91 94421 99999"),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ] else ...[
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Registered Fleet Directory", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      ...erp.busRoutes.map((r) {
                        return ListTile(
                          leading: const CircleAvatar(
                            backgroundColor: Color(0xFFEFF6FF),
                            child: Text("🚌"),
                          ),
                          title: Text("${r.routeNumber}: ${r.vehicleNo}", style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text("Driver: ${r.driverName} • ${r.speed} km/h"),
                          trailing: IconButton(
                            icon: const Icon(Icons.phone, color: Color(0xFF2563EB)),
                            onPressed: () => _callDriver(r.driverPhone),
                          ),
                          onTap: () => erp.setSelectedRoute(r.id),
                        );
                      }),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
