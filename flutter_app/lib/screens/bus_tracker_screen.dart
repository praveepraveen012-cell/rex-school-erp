import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/erp_provider.dart';
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
    final route = erp.selectedRoute;
    final schedule = erp.currentSchedule;
    final studentStop = erp.studentStop;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Transport & Fleet GPS"),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: "Sync Fleet",
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("All 4 Nilgiris Buses Synced with Satellites")),
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

            // Route Selector Tabs
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

            // Fleet Table Card
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
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFFEFF6FF),
                          child: const Text("🚌"),
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
        ),
      ),
    );
  }
}
