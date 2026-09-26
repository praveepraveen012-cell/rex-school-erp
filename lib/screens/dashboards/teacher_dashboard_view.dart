import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/erp_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/metric_card.dart';

// Screens accessible to teachers
import '../attendance_screen.dart';
import '../homework_screen.dart';
import '../notice_board_screen.dart';
import '../calendar_screen.dart';
import '../class_diary_screen.dart';
import '../staff_room_screen.dart';

class TeacherDashboardView extends StatefulWidget {
  const TeacherDashboardView({super.key});

  @override
  State<TeacherDashboardView> createState() => _TeacherDashboardViewState();
}

class _TeacherDashboardViewState extends State<TeacherDashboardView> {
  Map<String, dynamic>? _teacherData;
  Map<String, dynamic>? _stats;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadTeacherDashboard();
  }

  Future<void> _loadTeacherDashboard() async {
    final res = await ApiService.getDashboardStats();
    if (mounted) {
      setState(() {
        _isLoading = false;
        if (res['success'] == true) {
          _teacherData = res['teacher'];
          _stats = res['stats'];
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);

    // Profile details
    final teacherName = _teacherData?['name'] ?? ApiService.currentUser?['name'] ?? "Sarah Jenkins";
    final empId = _teacherData?['employeeId'] ?? "EMP-2024-001";
    final department = _teacherData?['department'] ?? "Science Faculty";
    final qualification = _teacherData?['qualification'] ?? "M.Sc. Physics, B.Ed.";

    // Assigned classes
    final assignedSections = _teacherData?['assignedSections'] as List<dynamic>? ?? [
      {'class_name': 'Grade 10', 'section_name': 'A', 'subject_name': 'Physics'},
      {'class_name': 'Grade 9', 'section_name': 'A', 'subject_name': 'General Science'},
    ];

    // Today's schedule
    final schedule = _stats?['todaySchedule'] as List<dynamic>? ?? [
      {'period': 1, 'time': '09:00 AM - 09:45 AM', 'className': 'Grade 10', 'sectionName': 'A', 'subjectName': 'Physics', 'roomNo': 'Room 101'},
      {'period': 2, 'time': '10:00 AM - 10:45 AM', 'className': 'Grade 9', 'sectionName': 'A', 'subjectName': 'General Science', 'roomNo': 'Room 102'},
      {'period': 3, 'time': '11:15 AM - 12:00 PM', 'className': 'Grade 10', 'sectionName': 'A', 'subjectName': 'Lab Practical', 'roomNo': 'Physics Lab'},
      {'period': 4, 'time': '01:30 PM - 02:15 PM', 'className': 'Grade 9', 'sectionName': 'A', 'subjectName': 'Science Quiz', 'roomNo': 'Room 102'},
    ];

    return RefreshIndicator(
      onRefresh: _loadTeacherDashboard,
      color: const Color(0xFF059669),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ================================================================
            // TEACHER PROFILE HEADER
            // ================================================================
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF064E3B), Color(0xFF059669)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF059669).withOpacity(0.3),
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
                          "FACULTY DESK",
                          style: TextStyle(
                            color: Colors.black,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        empId,
                        style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: Colors.white,
                        child: Text(
                          teacherName.isNotEmpty ? teacherName[0] : "T",
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              teacherName,
                              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              "$department • $qualification",
                              style: const TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    "Assigned Classes & Subjects:",
                    style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: assignedSections.map((sec) {
                      final cName = sec['class_name'] ?? 'Class';
                      final sName = sec['section_name'] ?? '';
                      final subName = sec['subject_name'] ?? 'General';
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.18),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: Text(
                          "$cName - $sName ($subName)",
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // ================================================================
            // QUICK ACTION TILES FOR TEACHERS
            // ================================================================
            const Text(
              "Teaching Actions & Registers",
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildTeacherActionCard(
                    icon: Icons.how_to_reg,
                    color: const Color(0xFF059669),
                    title: "Mark Attendance",
                    subtitle: "Grade 10-A & 9-A",
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceScreen())),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildTeacherActionCard(
                    icon: Icons.menu_book,
                    color: const Color(0xFF2563EB),
                    title: "Add Homework",
                    subtitle: "Assign Exercise 5.2",
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HomeworkScreen())),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _buildTeacherActionCard(
                    icon: Icons.edit_calendar,
                    color: const Color(0xFF7C3AED),
                    title: "Class Diary",
                    subtitle: "Daily lesson logs",
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ClassDiaryScreen())),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildTeacherActionCard(
                    icon: Icons.campaign,
                    color: const Color(0xFFD97706),
                    title: "Notices & Events",
                    subtitle: "Campus announcements",
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NoticeBoardScreen())),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 22),

            // ================================================================
            // TODAY'S TEACHING SCHEDULE
            // ================================================================
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "Today's Teaching Schedule",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text("4 Periods", style: TextStyle(color: Color(0xFF059669), fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: ListView.separated(
                itemCount: schedule.length,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                separatorBuilder: (ctx, idx) => const Divider(height: 1),
                itemBuilder: (ctx, idx) {
                  final p = schedule[idx];
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: idx == 0 ? const Color(0xFF059669) : const Color(0xFFF1F5F9),
                      child: Text(
                        "P${p['period']}",
                        style: TextStyle(
                          color: idx == 0 ? Colors.white : const Color(0xFF475569),
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    title: Text(
                      "${p['className']} - ${p['sectionName']} • ${p['subjectName']}",
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    subtitle: Text("${p['time']} • ${p['roomNo']}", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    trailing: idx == 0
                        ? Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text("In Progress", style: TextStyle(color: Color(0xFFB45309), fontSize: 10, fontWeight: FontWeight.bold)),
                          )
                        : null,
                  );
                },
              ),
            ),

            const SizedBox(height: 22),

            // ================================================================
            // PENDING HOMEWORK & SUBMISSIONS STATUS
            // ================================================================
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "Assigned Homework Desk",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                TextButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HomeworkScreen())),
                  child: const Text("View All", style: TextStyle(fontSize: 12, color: Color(0xFF059669))),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.assignment, color: Color(0xFF2563EB), size: 20),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Physics: Ray Optics & Lens Formula",
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            Text("Grade 10 - A • Due 29 September 2026", style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text("24/30 Done", style: TextStyle(color: Color(0xFF059669), fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const LinearProgressIndicator(
                    value: 24 / 30,
                    backgroundColor: Color(0xFFE2E8F0),
                    valueColor: AlwaysStoppedAnimation(Color(0xFF059669)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 22),

            // ================================================================
            // UPCOMING EVENTS FOR TEACHERS
            // ================================================================
            const Text(
              "Faculty Notices & Events",
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 10),
            _buildFacultyNotice(
              title: "Staff Academic Council Meeting",
              date: "Tomorrow, 03:45 PM",
              location: "AV Conference Room",
              priority: "Mandatory",
            ),
            const SizedBox(height: 8),
            _buildFacultyNotice(
              title: "Question Paper Submission for Mid-Term Exams",
              date: "30 September 2026",
              location: "Academic Dean Desk",
              priority: "Important",
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildTeacherActionCard({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 3)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
            const SizedBox(height: 2),
            Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }

  Widget _buildFacultyNotice({
    required String title,
    required String date,
    required String location,
    required String priority,
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
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.event_note, color: Color(0xFFD97706), size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
                const SizedBox(height: 3),
                Text("$date • $location", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(priority, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
          ),
        ],
      ),
    );
  }
}
