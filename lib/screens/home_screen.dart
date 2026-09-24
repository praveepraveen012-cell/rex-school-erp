import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/app_state.dart';
import 'notice_board_screen.dart';
import 'attendance_screen.dart';
import 'classroom_screen.dart';
import 'staff_room_screen.dart';
import 'fees_screen.dart';
import 'fee_analysis_screen.dart';
import 'timetable_screen.dart';
import 'admission_screen.dart';
import 'live_class_screen.dart';
import 'assignment_screen.dart';
import 'class_diary_screen.dart';
import 'content_library_screen.dart';
import 'evaluation_screen.dart';
import 'virtual_office_screen.dart';
import 'school_strength_screen.dart';
import 'lounge_screen.dart';
import 'calendar_screen.dart';
import 'contact_directory_screen.dart';
import 'feedback_screen.dart';
import 'bus_tracker_screen.dart';
import 'report_card_screen.dart';
import 'leave_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      body: Column(
        children: [
          _buildHeader(context),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Left: Feature Grid
                Expanded(
                  flex: 3,
                  child: _buildFeatureGrid(context, appState),
                ),
                // Right: Message Feed
                SizedBox(
                  width: 130,
                  child: _buildMessageFeed(context, appState),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1A2980), Color(0xFF26D0CE)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  Builder(
                    builder: (ctx) => IconButton(
                      icon: const Icon(Icons.menu, color: Colors.white),
                      onPressed: () {},
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.search, color: Colors.white),
                    onPressed: () {},
                  ),
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined, color: Colors.white),
                    onPressed: () {},
                  ),
                ],
              ),
            ),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.12),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Container(
                    width: 76,
                    height: 76,
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.18),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.asset(
                        'assets/rex_emblem.png',
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => Image.asset(
                          'assets/logo.png',
                          fit: BoxFit.contain,
                        ),
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
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF26D0CE),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'MANAGEMENT',
                                style: GoogleFonts.poppins(
                                  color: const Color(0xFF1A2980),
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'Rex Management App',
                          style: GoogleFonts.poppins(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Christus Rex Senior Secondary School',
                          style: GoogleFonts.poppins(
                            color: Colors.white70,
                            fontSize: 11,
                          ),
                        ),
                        Text(
                          'Ootacamund, Nilgiris • Diocese of Ooty',
                          style: GoogleFonts.poppins(
                            color: Colors.white54,
                            fontSize: 10,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade600,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            DateFormat('EEE, d MMM yyyy').format(DateTime.now()),
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureGrid(BuildContext context, AppState appState) {
    final features = _getFeatures(context, appState);
    return ListView.separated(
      padding: const EdgeInsets.all(8),
      itemCount: features.length,
      separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFE0E8FF)),
      itemBuilder: (ctx, i) {
        final f = features[i];
        return Material(
          color: Colors.white,
          child: InkWell(
            onTap: f['onTap'] as VoidCallback,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          (f['color'] as Color).withOpacity(0.9),
                          (f['color'] as Color),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: (f['color'] as Color).withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Icon(f['icon'] as IconData, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      f['label'] as String,
                      style: GoogleFonts.poppins(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF1A1A2E),
                      ),
                    ),
                  ),
                  if (f['badge'] != null)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Total',
                          style: GoogleFonts.poppins(fontSize: 9, color: Colors.grey),
                        ),
                        Text(
                          f['badge'] as String,
                          style: GoogleFonts.poppins(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF1A2980),
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(width: 4),
                  const Icon(Icons.chevron_right, color: Colors.grey, size: 18),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  List<Map<String, dynamic>> _getFeatures(BuildContext context, AppState appState) {
    return [
      {
        'label': 'Notice Board',
        'icon': Icons.campaign_outlined,
        'color': const Color(0xFF0077B6),
        'badge': 'Recent (${appState.recentNotices})',
        'onTap': () => _navigate(context, const NoticeBoardScreen()),
      },
      {
        'label': 'Attendance',
        'icon': Icons.how_to_reg_outlined,
        'color': const Color(0xFFD62828),
        'badge': 'Absent (${appState.absentCount})',
        'onTap': () => _navigate(context, const AttendanceScreen()),
      },
      {
        'label': 'Class Room',
        'icon': Icons.school_outlined,
        'color': const Color(0xFFE9A000),
        'badge': null,
        'onTap': () => _navigate(context, const ClassroomScreen()),
      },
      {
        'label': 'Staff Room',
        'icon': Icons.people_alt_outlined,
        'color': const Color(0xFFE05C00),
        'badge': 'Total (${appState.staff.length})',
        'onTap': () => _navigate(context, const StaffRoomScreen()),
      },
      {
        'label': 'Fee Activity',
        'icon': Icons.currency_rupee,
        'color': const Color(0xFF2D6A4F),
        'badge': null,
        'onTap': () => _navigate(context, const FeesScreen()),
      },
      {
        'label': 'Fee Analysis',
        'icon': Icons.pie_chart_outline,
        'color': const Color(0xFF1565C0),
        'badge': null,
        'onTap': () => _navigate(context, const FeeAnalysisScreen()),
      },
      {
        'label': 'Timetable',
        'icon': Icons.schedule_outlined,
        'color': const Color(0xFF1A2980),
        'badge': null,
        'onTap': () => _navigate(context, const TimetableScreen()),
      },
      {
        'label': 'Admission',
        'icon': Icons.assignment_ind_outlined,
        'color': const Color(0xFF5C35AD),
        'badge': null,
        'onTap': () => _navigate(context, const AdmissionScreen()),
      },
      {
        'label': 'Live Class',
        'icon': Icons.videocam_outlined,
        'color': const Color(0xFFE53935),
        'badge': null,
        'onTap': () => _navigate(context, const LiveClassScreen()),
      },
      {
        'label': 'Assignment',
        'icon': Icons.task_outlined,
        'color': const Color(0xFFAD1457),
        'badge': null,
        'onTap': () => _navigate(context, const AssignmentScreen()),
      },
      {
        'label': 'Class Diary',
        'icon': Icons.menu_book_outlined,
        'color': const Color(0xFF00695C),
        'badge': null,
        'onTap': () => _navigate(context, const ClassDiaryScreen()),
      },
      {
        'label': 'Content Library',
        'icon': Icons.library_books_outlined,
        'color': const Color(0xFF2E7D32),
        'badge': null,
        'onTap': () => _navigate(context, const ContentLibraryScreen()),
      },
      {
        'label': 'Evaluation',
        'icon': Icons.fact_check_outlined,
        'color': const Color(0xFF1B5E20),
        'badge': null,
        'onTap': () => _navigate(context, const EvaluationScreen()),
      },
      {
        'label': 'Virtual Office',
        'icon': Icons.business_center_outlined,
        'color': const Color(0xFFE65100),
        'badge': null,
        'onTap': () => _navigate(context, const VirtualOfficeScreen()),
      },
      {
        'label': 'School Strength',
        'icon': Icons.groups_outlined,
        'color': const Color(0xFF0D7377),
        'badge': '1010',
        'onTap': () => _navigate(context, const SchoolStrengthScreen()),
      },
      {
        'label': 'Lounge',
        'icon': Icons.photo_library_outlined,
        'color': const Color(0xFF546E7A),
        'badge': null,
        'onTap': () => _navigate(context, const LoungeScreen()),
      },
      {
        'label': 'Calendar',
        'icon': Icons.calendar_month_outlined,
        'color': const Color(0xFFC2185B),
        'badge': null,
        'onTap': () => _navigate(context, const SchoolCalendarScreen()),
      },
      {
        'label': 'Contact Directory',
        'icon': Icons.contacts_outlined,
        'color': const Color(0xFF6A1B9A),
        'badge': null,
        'onTap': () => _navigate(context, const ContactDirectoryScreen()),
      },
      {
        'label': 'Feedback',
        'icon': Icons.feedback_outlined,
        'color': const Color(0xFF00838F),
        'badge': null,
        'onTap': () => _navigate(context, const FeedbackScreen()),
      },
      {
        'label': 'Bus GPS Tracker',
        'icon': Icons.directions_bus_outlined,
        'color': const Color(0xFF1565C0),
        'badge': null,
        'onTap': () => _navigate(context, const BusTrackerScreen()),
      },
      {
        'label': 'Report Card',
        'icon': Icons.analytics_outlined,
        'color': const Color(0xFF558B2F),
        'badge': null,
        'onTap': () => _navigate(context, const ReportCardScreen()),
      },
      {
        'label': 'Leave Desk',
        'icon': Icons.event_busy_outlined,
        'color': const Color(0xFFBF360C),
        'badge': null,
        'onTap': () => _navigate(context, const LeaveScreen()),
      },
    ];
  }

  void _navigate(BuildContext context, Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }

  Widget _buildMessageFeed(BuildContext context, AppState appState) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(left: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
            color: const Color(0xFF1A2980).withOpacity(0.05),
            child: Text(
              'Messages',
              style: GoogleFonts.poppins(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1A2980),
              ),
            ),
          ),
          Expanded(
            child: ListView.separated(
              itemCount: appState.messages.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (ctx, i) {
                final msg = appState.messages[i];
                return GestureDetector(
                  onTap: () => _showMessageDetail(context, msg, appState),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    color: msg.isRead ? Colors.white : const Color(0xFFF0F8FF),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 14,
                              backgroundColor: _msgColor(msg.type),
                              child: Icon(_msgIcon(msg.type), color: Colors.white, size: 12),
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                msg.title,
                                style: GoogleFonts.poppins(
                                  fontSize: 8,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF1A1A2E),
                                ),
                                maxLines: 2,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          DateFormat('d MMM, h:mm a').format(msg.time),
                          style: GoogleFonts.poppins(
                            fontSize: 7,
                            color: Colors.grey,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          msg.body,
                          style: GoogleFonts.poppins(fontSize: 8, color: const Color(0xFF444444)),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Color _msgColor(String type) {
    switch (type) {
      case 'birthday': return const Color(0xFF1A2980);
      case 'absent': return const Color(0xFFAD1010);
      case 'greeting': return const Color(0xFFC2185B);
      default: return const Color(0xFF555555);
    }
  }

  IconData _msgIcon(String type) {
    switch (type) {
      case 'birthday': return Icons.cake;
      case 'absent': return Icons.warning;
      case 'greeting': return Icons.school;
      default: return Icons.notifications;
    }
  }

  void _showMessageDetail(BuildContext context, dynamic msg, AppState appState) {
    appState.markMessageRead(msg.id);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        maxChildSize: 0.9,
        minChildSize: 0.3,
        expand: false,
        builder: (_, ctrl) => SingleChildScrollView(
          controller: ctrl,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: _msgColor(msg.type),
                    child: Icon(_msgIcon(msg.type), color: Colors.white),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(msg.title, style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold)),
                        Text(
                          DateFormat('d MMM yyyy, h:mm a').format(msg.time),
                          style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 12),
              Text(msg.body, style: GoogleFonts.poppins(fontSize: 14, height: 1.6)),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text('Status: 1/1', style: GoogleFonts.poppins(fontSize: 12, color: const Color(0xFF1A2980))),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
