import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/erp_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/metric_card.dart';

// Screen destinations for Super Admin
import '../attendance_screen.dart';
import '../fees_screen.dart';
import '../school_strength_screen.dart';
import '../staff_room_screen.dart';
import '../fee_analysis_screen.dart';
import '../notice_board_screen.dart';
import '../message_center_screen.dart';
import '../bus_tracker_screen.dart';
import '../virtual_office_screen.dart';

class SuperAdminDashboardView extends StatefulWidget {
  const SuperAdminDashboardView({super.key});

  @override
  State<SuperAdminDashboardView> createState() => _SuperAdminDashboardViewState();
}

class _SuperAdminDashboardViewState extends State<SuperAdminDashboardView> {
  Map<String, dynamic>? _serverStats;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  Future<void> _fetchStats() async {
    final res = await ApiService.getDashboardStats();
    if (mounted) {
      setState(() {
        _isLoading = false;
        if (res['success'] == true && res['stats'] != null) {
          _serverStats = res['stats'];
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);

    // Metrics extracted from live backend or fallback to seeded store
    final totalStudents = _serverStats?['totalStudents']?.toString() ?? "1,010";
    final totalTeachers = _serverStats?['totalTeachers']?.toString() ?? "72";
    final totalParents = _serverStats?['totalParents']?.toString() ?? "940";
    final totalClasses = _serverStats?['totalClasses']?.toString() ?? "14";
    final totalSections = _serverStats?['totalSections']?.toString() ?? "28";

    final todayAtt = _serverStats?['todayAttendance'];
    final presentStudents = todayAtt?['present']?.toString() ?? "974";
    final absentStudents = todayAtt?['absent']?.toString() ?? "36";
    final attPercentage = todayAtt?['percentage']?.toString() ?? "96.4";

    final pendingFees = _serverStats?['pendingFees'] != null
        ? "₹${((_serverStats!['pendingFees'] as num) / 100000).toStringAsFixed(2)} L"
        : "₹21.40 L";

    return RefreshIndicator(
      onRefresh: _fetchStats,
      color: const Color(0xFF1E3A8A),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ================================================================
            // SUPER ADMIN MASTER BANNER
            // ================================================================
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1E3A8A).withOpacity(0.3),
                    blurRadius: 16,
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
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Text(
                          "SUPER ADMIN HQ",
                          style: TextStyle(
                            color: Colors.black,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.14),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.verified_user, color: Color(0xFF10B981), size: 13),
                            SizedBox(width: 4),
                            Text(
                              "Full RBAC Clearance",
                              style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 8),
                          ],
                        ),
                        child: Image.asset(
                          'assets/rex_emblem.png',
                          height: 38,
                          width: 38,
                          errorBuilder: (ctx, err, stack) => const Icon(Icons.school, color: Color(0xFF1E3A8A)),
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Administrative Command Center",
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.2,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              "Christus Rex Senior Secondary School • Ooty",
                              style: TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildQuickStat(label: "Enrolled", val: totalStudents),
                        _buildQuickStat(label: "Faculty", val: totalTeachers),
                        _buildQuickStat(label: "Parents", val: totalParents),
                        _buildQuickStat(label: "Classes", val: "$totalClasses ($totalSections Sec)"),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // ================================================================
            // INSTITUTION KPI GRID
            // ================================================================
            const Text(
              "Today's Pulse & Core Metrics",
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: MetricCard(
                    title: "Present Today",
                    value: presentStudents,
                    subtitle: "$attPercentage% attendance",
                    trend: "Optimal",
                    icon: Icons.how_to_reg_rounded,
                    iconColor: const Color(0xFF16A34A),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: MetricCard(
                    title: "Absent Students",
                    value: absentStudents,
                    subtitle: "SMS alert dispatched",
                    trend: "-4 from y'day",
                    icon: Icons.person_off_rounded,
                    iconColor: const Color(0xFFDC2626),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: MetricCard(
                    title: "Fee Collections",
                    value: "₹4.34 Cr",
                    subtitle: "Target: ₹4.55 Cr",
                    trend: "95.3% Collected",
                    icon: Icons.account_balance_wallet_rounded,
                    iconColor: const Color(0xFF0284C7),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: MetricCard(
                    title: "Pending Balance",
                    value: pendingFees,
                    subtitle: "Reminders active",
                    trend: "Term II Due",
                    icon: Icons.pending_actions_rounded,
                    iconColor: const Color(0xFFF59E0B),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 22),

            // ================================================================
            // QUICK ADMINISTRATIVE ACTIONS
            // ================================================================
            const Text(
              "Quick Administrative Actions",
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 3,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _buildActionTile(
                  icon: Icons.how_to_reg,
                  color: const Color(0xFF1E3A8A),
                  label: "Attendance",
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceScreen())),
                ),
                _buildActionTile(
                  icon: Icons.account_balance,
                  color: const Color(0xFF059669),
                  label: "Fee Ledger",
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FeesScreen())),
                ),
                _buildActionTile(
                  icon: Icons.group_add,
                  color: const Color(0xFF7C3AED),
                  label: "All Students",
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SchoolStrengthScreen())),
                ),
                _buildActionTile(
                  icon: Icons.badge,
                  color: const Color(0xFFD97706),
                  label: "Teachers",
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const StaffRoomScreen())),
                ),
                _buildActionTile(
                  icon: Icons.campaign,
                  color: const Color(0xFFDC2626),
                  label: "Broadcast SMS",
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MessageCenterScreen())),
                ),
                _buildActionTile(
                  icon: Icons.directions_bus,
                  color: const Color(0xFF2563EB),
                  label: "GPS Fleet",
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BusTrackerScreen())),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // ================================================================
            // UPCOMING SCHOOL EVENTS & CIRCULARS
            // ================================================================
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "Upcoming Events & Circulars",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                TextButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NoticeBoardScreen())),
                  child: const Text("View All", style: TextStyle(fontSize: 12, color: Color(0xFF1E3A8A))),
                ),
              ],
            ),
            _buildEventCard(
              title: "Annual Sports Meet 2026",
              date: "28 September 2026",
              audience: "All Classes • School Ground",
              icon: Icons.sports_kabaddi,
              color: const Color(0xFF16A34A),
            ),
            const SizedBox(height: 8),
            _buildEventCard(
              title: "CBSE Mid-Term Board Preparatory Exam",
              date: "05 October 2026",
              audience: "Grade 10 & Grade 12",
              icon: Icons.assignment_turned_in,
              color: const Color(0xFF2563EB),
            ),
            const SizedBox(height: 8),
            _buildEventCard(
              title: "General Parent-Teacher Conference",
              date: "12 October 2026",
              audience: "All Parents • Auditorium",
              icon: Icons.people_outline,
              color: const Color(0xFF7C3AED),
            ),

            const SizedBox(height: 24),

            // ================================================================
            // RECENT SYSTEM ACTIVITIES & AUDIT LOG
            // ================================================================
            const Text(
              "Recent Administrative Audit Logs",
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  _buildAuditItem("Fee payment verified (₹20,000 for Aarav Sharma)", "10 mins ago", Icons.check_circle, const Color(0xFF10B981)),
                  const Divider(height: 16),
                  _buildAuditItem("Today's morning attendance marked (Grade 10-A)", "42 mins ago", Icons.done_all, const Color(0xFF2563EB)),
                  const Divider(height: 16),
                  _buildAuditItem("Automated Absentee SMS dispatched to 36 parents", "09:15 AM", Icons.send_rounded, const Color(0xFFF59E0B)),
                  const Divider(height: 16),
                  _buildAuditItem("New homework published: Mathematics Ex 5.2", "08:45 AM", Icons.menu_book_rounded, const Color(0xFF6B7280)),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickStat({required String label, required String val}) {
    return Column(
      children: [
        Text(val, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 10)),
      ],
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required Color color,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 6, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEventCard({
    required String title,
    required String date,
    required String audience,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                const SizedBox(height: 3),
                Text(audience, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(date, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
          ),
        ],
      ),
    );
  }

  Widget _buildAuditItem(String text, String time, IconData icon, Color iconColor) {
    return Row(
      children: [
        Icon(icon, size: 16, color: iconColor),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 12, color: Color(0xFF334155), fontWeight: FontWeight.w500),
          ),
        ),
        Text(
          time,
          style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
        ),
      ],
    );
  }
}
