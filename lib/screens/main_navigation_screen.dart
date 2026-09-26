import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/erp_provider.dart';
import '../services/app_state.dart';
import '../services/api_service.dart';
import '../widgets/student_id_card.dart';
import 'login_screen.dart';

// Primary Screens
import 'dashboard_screen.dart';
import 'attendance_screen.dart';
import 'fees_screen.dart';
import 'bus_tracker_screen.dart';
import 'parent_portal_screen.dart';

// Academics & Services
import 'homework_screen.dart';
import 'leave_screen.dart';
import 'report_card_screen.dart';
import 'notice_board_screen.dart';
import 'timetable_screen.dart';
import 'class_diary_screen.dart';
import 'staff_room_screen.dart';
import 'classroom_screen.dart';
import 'assignment_screen.dart';
import 'content_library_screen.dart';
import 'evaluation_screen.dart';

// Campus & Administration
import 'contact_directory_screen.dart';
import 'school_strength_screen.dart';
import 'admission_screen.dart';
import 'virtual_office_screen.dart';
import 'fee_analysis_screen.dart';
import 'lounge_screen.dart';
import 'calendar_screen.dart';
import 'message_center_screen.dart';
import 'feedback_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    DashboardScreen(),
    AttendanceScreen(),
    FeesScreen(),
    BusTrackerScreen(),
    ParentPortalScreen(),
  ];

  void _handleSignOut() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Sign Out"),
        content: const Text("Are you sure you want to sign out of Rex Management App?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
            onPressed: () {
              Navigator.pop(ctx);
              ApiService.logout();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (route) => false,
              );
            },
            child: const Text("Sign Out", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showChildSwitcher(ERPProvider erp) {
    final students = ApiService.linkedStudents.isNotEmpty
        ? ApiService.linkedStudents
        : [
            {'id': 1, 'first_name': 'Aarav', 'last_name': 'Sharma', 'class_name': 'Grade 10', 'section_name': 'A', 'admission_no': 'REX-2024-001'},
            {'id': 7, 'first_name': 'Ananya', 'last_name': 'Sharma', 'class_name': 'Grade 8', 'section_name': 'B', 'admission_no': 'REX-2024-007'},
          ];

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.family_restroom, color: Color(0xFF1E3A8A)),
                  SizedBox(width: 8),
                  Text(
                    "Switch Student Ward",
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                "Select which child's academic, bus, and attendance records to view:",
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 16),
              ...students.map((s) {
                final fullName = "${s['first_name']} ${s['last_name']}".trim();
                final classInfo = "${s['class_name'] ?? 'Grade 10'}-${s['section_name'] ?? 'A'}";
                final isActive = (ApiService.activeStudent?['id'] == s['id']) ||
                    (ApiService.activeStudent == null && fullName.contains('Aarav'));

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: isActive ? const Color(0xFFEFF6FF) : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isActive ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                      width: isActive ? 2 : 1,
                    ),
                  ),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: isActive ? const Color(0xFF1E3A8A) : const Color(0xFFE2E8F0),
                      child: Text(
                        s['first_name']?[0] ?? 'S',
                        style: TextStyle(
                          color: isActive ? Colors.white : const Color(0xFF0F172A),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text("Class: $classInfo • Admission: ${s['admission_no'] ?? 'REX-2024'}"),
                    trailing: isActive ? const Icon(Icons.check_circle, color: Color(0xFF2563EB)) : null,
                    onTap: () {
                      ApiService.switchChild(s);
                      Navigator.pop(ctx);
                      setState(() {});
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text("Switched active ward to $fullName ($classInfo)"),
                          backgroundColor: const Color(0xFF1E3A8A),
                        ),
                      );
                    },
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: Colors.white),
            onPressed: () => Scaffold.of(ctx).openDrawer(),
          ),
        ),
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    blurRadius: 4,
                  ),
                ],
              ),
              child: Center(
                child: Image.asset(
                  'assets/rex_emblem.png',
                  height: 24,
                  width: 24,
                  fit: BoxFit.contain,
                  alignment: Alignment.center,
                  errorBuilder: (ctx, err, stack) => const Icon(
                    Icons.school,
                    color: Color(0xFF1E3A8A),
                    size: 20,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Rex Management App",
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.2,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    "CBSE Affiliation #1930000 • Nilgiris",
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Audio chime mute/unmute button
          IconButton(
            tooltip: erp.soundEnabled ? "Sound Alerts On" : "Muted",
            icon: Icon(
              erp.soundEnabled ? Icons.volume_up : Icons.volume_off,
              color: erp.soundEnabled ? const Color(0xFFF59E0B) : Colors.white38,
              size: 20,
            ),
            onPressed: () => erp.toggleSound(),
          ),

          // Multi-child switcher chip for parents
          if (erp.currentRole == 'parent')
            InkWell(
              onTap: () => _showChildSwitcher(erp),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF60A5FA).withOpacity(0.5)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.swap_horiz, color: Color(0xFF93C5FD), size: 14),
                    const SizedBox(width: 4),
                    Text(
                      ApiService.activeStudent?['first_name'] ?? "Aarav",
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),

          // Role Badge
          Container(
            margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.12),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.2)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  erp.currentRole == 'admin'
                      ? Icons.admin_panel_settings
                      : erp.currentRole == 'teacher'
                          ? Icons.school
                          : Icons.family_restroom,
                  color: const Color(0xFFFCD34D),
                  size: 13,
                ),
                const SizedBox(width: 4),
                Text(
                  erp.currentRole == 'admin'
                      ? "Admin"
                      : erp.currentRole == 'teacher'
                          ? "Staff"
                          : "Parent",
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),

          // Sign Out Button
          IconButton(
            tooltip: "Sign Out",
            icon: const Icon(Icons.logout_rounded, color: Colors.white70, size: 20),
            onPressed: _handleSignOut,
          ),
          const SizedBox(width: 4),
        ],
      ),

      drawer: Drawer(
        child: Column(
          children: [
            // Drawer Header - Center Aligned Regal Presentation
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 48, 20, 20),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Center(
                    child: Container(
                      width: 68,
                      height: 68,
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.25),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                          BoxShadow(
                            color: const Color(0xFFF59E0B).withOpacity(0.35),
                            blurRadius: 14,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Image.asset(
                          'assets/rex_emblem.png',
                          height: 50,
                          width: 50,
                          fit: BoxFit.contain,
                          alignment: Alignment.center,
                          errorBuilder: (ctx, err, stack) => const Icon(
                            Icons.school,
                            size: 38,
                            color: Color(0xFF1E3A8A),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    "Rex Management App",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    "Christus Rex Senior Secondary School",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Color(0xFFF59E0B),
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text(
                      "CBSE Affiliation #1930000 • Ootacamund",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Color(0xFFFCD34D),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Navigation List Items
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  _buildDrawerSectionHeader("PRIMARY MODULES"),
                  _buildDrawerItem(
                    icon: Icons.dashboard_outlined,
                    title: "Principal Pulse Dashboard",
                    isSelected: _currentIndex == 0,
                    onTap: () {
                      Navigator.pop(context);
                      setState(() => _currentIndex = 0);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.how_to_reg_outlined,
                    title: "Smart Attendance Register",
                    isSelected: _currentIndex == 1,
                    onTap: () {
                      Navigator.pop(context);
                      setState(() => _currentIndex = 1);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.account_balance_wallet_outlined,
                    title: "Fee Cashier & Ledger",
                    isSelected: _currentIndex == 2,
                    onTap: () {
                      Navigator.pop(context);
                      setState(() => _currentIndex = 2);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.directions_bus_outlined,
                    title: "Live GPS Bus Fleet",
                    isSelected: _currentIndex == 3,
                    onTap: () {
                      Navigator.pop(context);
                      setState(() => _currentIndex = 3);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.family_restroom_outlined,
                    title: "Parent Portal & 500m Radar",
                    isSelected: _currentIndex == 4,
                    onTap: () {
                      Navigator.pop(context);
                      setState(() => _currentIndex = 4);
                    },
                  ),

                  _buildDrawerSectionHeader("ACADEMICS & CLASSROOM"),
                  _buildDrawerItem(
                    icon: Icons.calendar_view_week_outlined,
                    title: "Timetable & Bell Schedule",
                    badge: "Class 10-A",
                    badgeColor: const Color(0xFF7C3AED),
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const TimetableScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.campaign_outlined,
                    title: "Notice Board & Circulars",
                    badge: "New",
                    badgeColor: const Color(0xFFDC2626),
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const NoticeBoardScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.auto_stories_outlined,
                    title: "Class Diary & Observations",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ClassDiaryScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.meeting_room_outlined,
                    title: "Staff Room & Faculty",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const StaffRoomScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.menu_book_outlined,
                    title: "Digital Homework Diary",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const HomeworkScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.grade_outlined,
                    title: "Official CBSE Marksheet",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ReportCardScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.class_outlined,
                    title: "Classroom & Student Roster",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ClassroomScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.assignment_outlined,
                    title: "Assignments & Projects",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const AssignmentScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.local_library_outlined,
                    title: "Digital Content Library",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ContentLibraryScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.analytics_outlined,
                    title: "Evaluation & Exams",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const EvaluationScreen()),
                      );
                    },
                  ),

                  _buildDrawerSectionHeader("CAMPUS & ADMINISTRATION"),
                  _buildDrawerItem(
                    icon: Icons.quick_contacts_dialer_outlined,
                    title: "Contact Directory",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ContactDirectoryScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.event_note_outlined,
                    title: "Student Leave Desk",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const LeaveScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.groups_outlined,
                    title: "School Strength & Stats",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const SchoolStrengthScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.app_registration_outlined,
                    title: "Admissions Desk",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const AdmissionScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.apartment_outlined,
                    title: "Virtual Office",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const VirtualOfficeScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.pie_chart_outline,
                    title: "Fee Collection Analysis",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const FeeAnalysisScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.weekend_outlined,
                    title: "Student Lounge & Events",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const LoungeScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.calendar_month_outlined,
                    title: "School Calendar",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const SchoolCalendarScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.chat_bubble_outline,
                    title: "Message Center",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const MessageCenterScreen()),
                      );
                    },
                  ),

                  _buildDrawerSectionHeader("TELEMATICS & SAFETY"),
                  ListTile(
                    leading: const Icon(Icons.radar, color: Color(0xFF2563EB)),
                    title: const Text(
                      "Test 500m Geofence Alarm",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF2563EB),
                      ),
                    ),
                    subtitle: const Text(
                      "Plays chime & opens proximity modal",
                      style: TextStyle(fontSize: 11),
                    ),
                    onTap: () {
                      Navigator.pop(context);
                      setState(() => _currentIndex = 4); // Go to parent portal
                      erp.trigger500mProximity();
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.badge_outlined, color: Color(0xFF059669)),
                    title: const Text(
                      "Official Student ID & Gate Pass",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF059669),
                      ),
                    ),
                    subtitle: const Text(
                      "Scannable RFID & QR Code Gate Pass",
                      style: TextStyle(fontSize: 11),
                    ),
                    onTap: () {
                      Navigator.pop(context);
                      showDialog(
                        context: context,
                        builder: (_) => StudentIdCardDialog(student: erp.currentStudent),
                      );
                    },
                  ),

                  _buildDrawerSectionHeader("SUPPORT & SESSION"),
                  _buildDrawerItem(
                    icon: Icons.rate_review_outlined,
                    title: "Feedback & Suggestions",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const FeedbackScreen()),
                      );
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.logout_rounded, color: Color(0xFFDC2626)),
                    title: const Text(
                      "Sign Out",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFDC2626),
                      ),
                    ),
                    subtitle: const Text(
                      "Return to role selection & login",
                      style: TextStyle(fontSize: 11),
                    ),
                    onTap: () {
                      Navigator.pop(context);
                      _handleSignOut();
                    },
                  ),
                ],
              ),
            ),

            // Footer
            Container(
              padding: const EdgeInsets.all(16),
              color: const Color(0xFFF8FAFC),
              child: const Row(
                children: [
                  Icon(Icons.shield_outlined,
                      color: Color(0xFF16A34A), size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Rex Management App • Safe Campus ERP",
                      style: TextStyle(
                        fontSize: 11,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),

      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),

      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          selectedItemColor: const Color(0xFF1E3A8A),
          unselectedItemColor: const Color(0xFF94A3B8),
          selectedLabelStyle:
              const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard_rounded),
              label: "Pulse",
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.how_to_reg_outlined),
              activeIcon: Icon(Icons.how_to_reg_rounded),
              label: "Attendance",
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.account_balance_wallet_outlined),
              activeIcon: Icon(Icons.account_balance_wallet_rounded),
              label: "Fees",
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.directions_bus_outlined),
              activeIcon: Icon(Icons.directions_bus_filled_rounded),
              label: "Bus GPS",
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.family_restroom_outlined),
              activeIcon: Icon(Icons.family_restroom_rounded),
              label: "Parent",
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Text(
        title,
        style: const TextStyle(
          color: Color(0xFF94A3B8),
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String title,
    bool isSelected = false,
    String? badge,
    Color? badgeColor,
    required VoidCallback onTap,
  }) {
    return ListTile(
      dense: true,
      leading: Icon(
        icon,
        color: isSelected ? const Color(0xFF1E3A8A) : const Color(0xFF475569),
        size: 20,
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 13,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          color: isSelected ? const Color(0xFF1E3A8A) : const Color(0xFF1E293B),
        ),
      ),
      trailing: badge != null
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: badgeColor ?? const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                badge,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            )
          : null,
      selected: isSelected,
      selectedTileColor: const Color(0xFFEFF6FF),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      onTap: onTap,
    );
  }
}
