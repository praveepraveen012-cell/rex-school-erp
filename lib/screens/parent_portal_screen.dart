import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/erp_provider.dart';
import '../widgets/bus_map_painter.dart';
import '../widgets/proximity_alert_dialog.dart';
import '../widgets/student_id_card.dart';
import '../widgets/metric_card.dart';
import 'homework_screen.dart';
import 'leave_screen.dart';

class ParentPortalScreen extends StatelessWidget {
  const ParentPortalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);
    final aarav = erp.currentStudent;
    final route = erp.selectedRoute;
    final schedule = erp.currentSchedule;
    final studentStop = erp.studentStop;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Parent & Student Portal"),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: Icon(erp.soundEnabled ? Icons.notifications_active : Icons.notifications_off),
            tooltip: "Toggle Proximity Sound",
            onPressed: () => erp.toggleSound(),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Parent Hero Banner
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E3A8A), Color(0xFF0284C7)],
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1E3A8A).withOpacity(0.3),
                    blurRadius: 14,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: Colors.white,
                        child: Text(
                          aarav.name[0],
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A)),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Welcome, ${aarav.parentName}",
                              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              "Ward: ${aarav.name} • Class ${aarav.grade}-${aarav.section} • Roll: ${aarav.rollNo}",
                              style: const TextStyle(color: Colors.white70, fontSize: 12),
                            ),
                            const SizedBox(height: 6),
                            Wrap(
                              spacing: 6,
                              runSpacing: 4,
                              children: [
                                _badge("CBSE #1930000"),
                                _badge("Bus Route 02"),
                                _badge("500m Radar Active", color: const Color(0xFF22C55E)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Colors.white24),
                  const SizedBox(height: 10),
                  // Quick Actions in Hero
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ElevatedButton.icon(
                        onPressed: () {
                          showDialog(
                            context: context,
                            builder: (_) => StudentIdCardDialog(student: aarav),
                          );
                        },
                        icon: const Icon(Icons.badge, size: 16),
                        label: const Text("🪪 ID & Gate Pass"),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF1E3A8A),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const LeaveScreen()),
                          );
                        },
                        icon: const Icon(Icons.note_add, size: 16),
                        label: const Text("Apply Leave"),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white.withOpacity(0.9),
                          foregroundColor: const Color(0xFF1E3A8A),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const HomeworkScreen()),
                          );
                        },
                        icon: const Icon(Icons.book, size: 16),
                        label: const Text("Homework"),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white.withOpacity(0.9),
                          foregroundColor: const Color(0xFF1E3A8A),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // 2. Metrics Grid
            LayoutBuilder(builder: (context, constraints) {
              final isWide = constraints.maxWidth > 600;
              return GridView.count(
                crossAxisCount: isWide ? 4 : 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: isWide ? 1.6 : 1.3,
                children: [
                  MetricCard(
                    title: "Aarav's Attendance",
                    value: "${aarav.attendanceRate}%",
                    subtitle: "Present Today (07:48 AM)",
                    icon: const Icon(Icons.check_circle, color: Color(0xFF10B981)),
                    iconBgColor: const Color(0xFFD1FAE5),
                  ),
                  MetricCard(
                    title: "Fee Clearance",
                    value: aarav.isFeeClear ? "All Clear" : "₹${aarav.feeDue} Due",
                    subtitle: "Term II Settled",
                    icon: const Icon(Icons.receipt_long, color: Color(0xFF2563EB)),
                    iconBgColor: const Color(0xFFDBEAFE),
                  ),
                  MetricCard(
                    title: "Academic Rank",
                    value: "Rank #2",
                    subtitle: "Aggregate 92.4% (A1)",
                    icon: const Icon(Icons.emoji_events, color: Color(0xFF9333EA)),
                    iconBgColor: const Color(0xFFF3E8FF),
                  ),
                  MetricCard(
                    title: "Bus GPS Distance",
                    value: "480 Meters",
                    subtitle: "Within 500m Geofence",
                    valueColor: const Color(0xFFD97706),
                    icon: const Icon(Icons.directions_bus, color: Color(0xFFF59E0B)),
                    iconBgColor: const Color(0xFFFEF3C7),
                  ),
                ],
              );
            }),
            const SizedBox(height: 18),

            // 3. School Bus Live GPS Tracker Card
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header with Morning / Evening Switcher
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Text("🚌 School Bus Live GPS Tracker", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                  SizedBox(width: 8),
                                  Text("● Live", style: TextStyle(color: Color(0xFF10B981), fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              Text("${route.vehicleNo} • Driver: ${route.driverName}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                            ],
                          ),
                        ),
                        // Trip Mode Toggle Switcher
                        Container(
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(
                            color: Colors.grey.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            children: [
                              _tripModeButton("🌅 Morning", erp.tripMode == 'morning', () => erp.setTripMode('morning')),
                              _tripModeButton("🌆 Evening", erp.tripMode == 'evening', () => erp.setTripMode('evening')),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // 500m Geofencing Alert Bar
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFEFF6FF), Color(0xFFDBEAFE)],
                        ),
                        borderRadius: BorderRadius.circular(10),
                        border: const Border(left: BorderSide(color: Color(0xFF2563EB), width: 4)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.radar, color: Color(0xFF2563EB), size: 28),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "500m Proximity Geofencing Active",
                                  style: TextStyle(color: Color(0xFF1E3A8A), fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                Text(
                                  "Target Stop: ${studentStop.name} • 480m to boarding",
                                  style: const TextStyle(color: Color(0xFF2563EB), fontSize: 11),
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
                                  distanceMeters: 480,
                                  tripMode: erp.tripMode,
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFF59E0B),
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            ),
                            child: const Text("⚡ Trigger 500m Alert", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Interactive Nilgiris Canvas Route Map
                    Container(
                      height: 170,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.withOpacity(0.2)),
                      ),
                      child: Stack(
                        children: [
                          CustomPaint(
                            size: const Size(double.infinity, 170),
                            painter: BusMapPainter(
                              stops: schedule.stops,
                              progressPercent: erp.busProgress,
                            ),
                          ),
                          // Stop Labels
                          Positioned(
                            bottom: 8,
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
                                        fontWeight: s.isStudentStop ? FontWeight.bold : FontWeight.w500,
                                        color: s.isStudentStop ? const Color(0xFF1E3A8A) : Colors.black87,
                                      ),
                                    ),
                                    Text(s.time, style: const TextStyle(fontSize: 9, color: Colors.grey)),
                                  ],
                                );
                              }).toList(),
                            ),
                          ),
                          // Moving Live Bus Icon
                          Positioned(
                            left: (MediaQuery.of(context).size.width - 64) * 0.64,
                            top: 48,
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: const Color(0xFF2563EB),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF2563EB).withOpacity(0.5),
                                    blurRadius: 8,
                                  ),
                                ],
                              ),
                              child: const Center(child: Text("🚌", style: TextStyle(fontSize: 18))),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Telemetry Row
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.grey.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _telemetryItem("DRIVER", "${route.driverName}\n${route.driverPhone}"),
                          _telemetryItem("SPEED", "${route.speed} km/h\nNormal Transit"),
                          _telemetryItem("DESTINATION", "${schedule.destination}\nDep: ${schedule.departs}"),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),

            // 4. Digital Homework Diary Section
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
                        const Text(
                          "📖 Daily Digital Homework Diary",
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const HomeworkScreen()),
                            );
                          },
                          child: const Text("View All →"),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ...erp.homeworkList.take(3).map((hw) {
                      return CheckboxListTile(
                        value: hw.isCompleted,
                        onChanged: (_) => erp.toggleHomework(hw.id),
                        title: Text(
                          "${hw.subject}: ${hw.title}",
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            decoration: hw.isCompleted ? TextDecoration.lineThrough : null,
                          ),
                        ),
                        subtitle: Text(
                          "${hw.description}\nDue: ${hw.dueDate} • ${hw.teacher}",
                          style: TextStyle(
                            fontSize: 12,
                            decoration: hw.isCompleted ? TextDecoration.lineThrough : null,
                          ),
                        ),
                        secondary: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: hw.isCompleted
                                ? const Color(0xFFD1FAE5)
                                : (hw.priority == 'High' ? const Color(0xFFFEE2E2) : const Color(0xFFDBEAFE)),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            hw.isCompleted ? "Done" : hw.priority,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: hw.isCompleted
                                  ? const Color(0xFF065F46)
                                  : (hw.priority == 'High' ? Colors.red : const Color(0xFF1E40AF)),
                            ),
                          ),
                        ),
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

  Widget _badge(String text, {Color color = Colors.white24}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        text,
        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _tripModeButton(String label, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1E3A8A) : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : Colors.black87,
          ),
        ),
      ),
    );
  }

  Widget _telemetryItem(String label, String text) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 9, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(text, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      ],
    );
  }
}
