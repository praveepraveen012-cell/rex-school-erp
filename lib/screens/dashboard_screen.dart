import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/erp_provider.dart';
import '../widgets/metric_card.dart';
import '../widgets/student_id_card.dart';

// Screens
import 'bus_tracker_screen.dart';
import 'attendance_screen.dart';
import 'fees_screen.dart';
import 'notice_board_screen.dart';
import 'timetable_screen.dart';
import 'class_diary_screen.dart';
import 'staff_room_screen.dart';
import 'classroom_screen.dart';
import 'assignment_screen.dart';
import 'report_card_screen.dart';
import 'leave_screen.dart';
import 'homework_screen.dart';
import 'contact_directory_screen.dart';
import 'virtual_office_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome & Institution Header Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1E3A8A).withOpacity(0.25),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          "CBSE AFFILIATION #1930000",
                          style: TextStyle(
                            color: Colors.black,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          "AY 2026-2027",
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.2),
                              blurRadius: 10,
                            ),
                          ],
                        ),
                        child: Image.asset(
                          'assets/rex_emblem.png',
                          height: 46,
                          errorBuilder: (ctx, err, stack) => const Icon(
                            Icons.school,
                            size: 40,
                            color: Color(0xFF1E3A8A),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Rex Management App",
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.3,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              "Christus Rex, Diocese of Ootacamund • Nilgiris",
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildHeaderChip(
                        icon: Icons.person_outline,
                        label: erp.currentRole == 'admin'
                            ? "Principal Perspective"
                            : erp.currentRole == 'teacher'
                                ? "Faculty Perspective"
                                : "Parent: Aarav Sharma (10-A)",
                      ),
                      _buildHeaderChip(
                        icon: Icons.shield_outlined,
                        label: "Safe Campus Certified",
                      ),
                      _buildHeaderChip(
                        icon: Icons.directions_bus_outlined,
                        label: "4 GPS Fleets Active",
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Top Metric Cards Grid
            Row(
              children: [
                Expanded(
                  child: MetricCard(
                    title: "Total Enrolled",
                    value: "1,420",
                    subtitle: "Class I to XII",
                    trend: "+4.2% YoY",
                    icon: Icons.groups_outlined,
                    iconColor: const Color(0xFF2563EB),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: MetricCard(
                    title: "Today's Attendance",
                    value: "96.4%",
                    subtitle: "1,369 present today",
                    trend: "Optimal",
                    icon: Icons.how_to_reg_outlined,
                    iconColor: const Color(0xFF16A34A),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: MetricCard(
                    title: "Fee Realization",
                    value: "₹76.68L",
                    subtitle: "Out of ₹82.00L target",
                    trend: "93.5% collected",
                    icon: Icons.account_balance_wallet_outlined,
                    iconColor: const Color(0xFF7C3AED),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: MetricCard(
                    title: "Active Staff",
                    value: "92 / 92",
                    subtitle: "68 faculty, 24 support",
                    trend: "100% on duty",
                    icon: Icons.badge_outlined,
                    iconColor: const Color(0xFFD97706),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 28),

            // Quick Services & Modules
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.02),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.apps_rounded, color: Color(0xFF1E3A8A), size: 20),
                      SizedBox(width: 8),
                      Text(
                        "Quick Services & Modules",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  GridView.count(
                    crossAxisCount: 4,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.85,
                    children: [
                      _buildQuickActionItem(
                        context: context,
                        icon: Icons.calendar_view_week_rounded,
                        label: "Timetable",
                        color: const Color(0xFF7C3AED),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const TimetableScreen()),
                        ),
                      ),
                      _buildQuickActionItem(
                        context: context,
                        icon: Icons.campaign_rounded,
                        label: "Notices",
                        color: const Color(0xFFDC2626),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const NoticeBoardScreen()),
                        ),
                      ),
                      _buildQuickActionItem(
                        context: context,
                        icon: Icons.auto_stories_rounded,
                        label: "Diary",
                        color: const Color(0xFFD97706),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const ClassDiaryScreen()),
                        ),
                      ),
                      _buildQuickActionItem(
                        context: context,
                        icon: Icons.meeting_room_rounded,
                        label: "Staff Room",
                        color: const Color(0xFF0D9488),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const StaffRoomScreen()),
                        ),
                      ),
                      _buildQuickActionItem(
                        context: context,
                        icon: Icons.menu_book_rounded,
                        label: "Homework",
                        color: const Color(0xFF2563EB),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const HomeworkScreen()),
                        ),
                      ),
                      _buildQuickActionItem(
                        context: context,
                        icon: Icons.grade_rounded,
                        label: "Marksheet",
                        color: const Color(0xFF059669),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const ReportCardScreen()),
                        ),
                      ),
                      _buildQuickActionItem(
                        context: context,
                        icon: Icons.class_rounded,
                        label: "Classroom",
                        color: const Color(0xFF0284C7),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const ClassroomScreen()),
                        ),
                      ),
                      _buildQuickActionItem(
                        context: context,
                        icon: Icons.assignment_rounded,
                        label: "Tasks",
                        color: const Color(0xFFEA580C),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const AssignmentScreen()),
                        ),
                      ),
                      _buildQuickActionItem(
                        context: context,
                        icon: Icons.event_note_rounded,
                        label: "Leave Desk",
                        color: const Color(0xFFE11D48),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const LeaveScreen()),
                        ),
                      ),
                      _buildQuickActionItem(
                        context: context,
                        icon: Icons.quick_contacts_dialer_rounded,
                        label: "Directory",
                        color: const Color(0xFF475569),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const ContactDirectoryScreen()),
                        ),
                      ),
                      _buildQuickActionItem(
                        context: context,
                        icon: Icons.apartment_rounded,
                        label: "Office",
                        color: const Color(0xFF9333EA),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const VirtualOfficeScreen()),
                        ),
                      ),
                      _buildQuickActionItem(
                        context: context,
                        icon: Icons.badge_rounded,
                        label: "Gate Pass",
                        color: const Color(0xFF10B981),
                        onTap: () => showDialog(
                          context: context,
                          builder: (_) => StudentIdCardDialog(student: erp.currentStudent),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // Live Bus GPS Fleet Overview Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.directions_bus_filled,
                          color: Color(0xFFD97706),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Live GPS Transit Fleet (Nilgiris)",
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              "Real-time telematics with automated 500m proximity alarm",
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const BusTrackerScreen()),
                          );
                        },
                        icon: const Icon(Icons.open_in_new, size: 16),
                        label: const Text("Full Fleet"),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF2563EB),
                          visualDensity: VisualDensity.compact,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // List of 4 live buses
                  ...erp.busRoutes.map((route) {
                    final isNear = route.id == 'route-02';
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isNear
                            ? const Color(0xFFEFF6FF)
                            : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isNear
                              ? const Color(0xFF93C5FD)
                              : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            backgroundColor: isNear
                                ? const Color(0xFF2563EB)
                                : const Color(0xFF64748B),
                            radius: 16,
                            child: Text(
                              route.routeNumber.replaceAll("Route ", ""),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      route.vehicleNo,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: isNear
                                            ? const Color(0xFFDCFCE7)
                                            : const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        isNear
                                            ? "480m TO CHARING CROSS"
                                            : "${route.speed} KM/H",
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: isNear
                                              ? const Color(0xFF16A34A)
                                              : const Color(0xFF64748B),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  "${route.driverName} • ${route.name}",
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF64748B),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            Icons.chevron_right,
                            color: Colors.grey.shade400,
                            size: 18,
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // Class-wise Attendance Distribution
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Attendance by Grade Level",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const AttendanceScreen()),
                          );
                        },
                        child: const Text("View Register"),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildAttendanceBar("Grade 10 (Secondary High)", 0.98, "98.2%"),
                  _buildAttendanceBar("Grade 12 (Senior Sec Science)", 0.96, "96.4%"),
                  _buildAttendanceBar("Grade 9 (Secondary High)", 0.95, "95.0%"),
                  _buildAttendanceBar("Grade 8 (Middle School)", 0.93, "93.8%"),
                  _buildAttendanceBar("Primary Wing (Grades 1-5)", 0.97, "97.1%"),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // Live Institutional Activity Stream
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Real-Time Activity Audit",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    "System notifications, RFID gate scans, and proximity signals",
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ...erp.activityLog.take(6).map((log) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            margin: const EdgeInsets.only(top: 3),
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Color(0xFF2563EB),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              log,
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF334155),
                                height: 1.3,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            "Just now",
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionItem({
    required BuildContext context,
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderChip({required IconData icon, required String label}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withOpacity(0.12)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: const Color(0xFFFCD34D), size: 14),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceBar(String grade, double ratio, String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                grade,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF334155),
                ),
              ),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF16A34A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: ratio,
              minHeight: 6,
              backgroundColor: const Color(0xFFF1F5F9),
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2563EB)),
            ),
          ),
        ],
      ),
    );
  }
}
