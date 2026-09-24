import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';

class TimetableScreen extends StatefulWidget {
  const TimetableScreen({super.key});
  @override
  State<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends State<TimetableScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  final _days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  @override
  void initState() {
    super.initState();
    final today = DateTime.now().weekday;
    final initial = today <= 5 ? today - 1 : 0;
    _tabCtrl = TabController(length: _days.length, vsync: this, initialIndex: initial.clamp(0, 4));
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Timetable'),
        backgroundColor: const Color(0xFF1A2980),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabCtrl,
          isScrollable: true,
          indicatorColor: Colors.amber,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          labelStyle: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600),
          tabs: _days.map((d) => Tab(text: d.substring(0, 3))).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: _days.map((day) {
          final periods = appState.timetable[day] ?? [];
          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: periods.length,
            itemBuilder: (_, i) {
              final period = periods[i];
              final isBreak = period['subject'] == 'BREAK';
              if (isBreak) {
                return Container(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.amber.shade200),
                  ),
                  child: Center(
                    child: Text(
                      '☕ Break Time (${period['time']})',
                      style: GoogleFonts.poppins(fontSize: 12, color: Colors.amber.shade700, fontWeight: FontWeight.w500),
                    ),
                  ),
                );
              }
              final subjectColors = {
                'Mathematics': const Color(0xFF1A2980),
                'Physics': const Color(0xFFD62828),
                'Chemistry': const Color(0xFF2D6A4F),
                'English': const Color(0xFF5C35AD),
                'Tamil': const Color(0xFFC2185B),
                'Social Science': const Color(0xFFE05C00),
                'Computer Science': const Color(0xFF0077B6),
                'Physical Education': const Color(0xFF2E7D32),
              };
              final color = subjectColors[period['subject']] ?? const Color(0xFF555555);
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                child: IntrinsicHeight(
                  child: Row(
                    children: [
                      Container(
                        width: 6,
                        decoration: BoxDecoration(
                          color: color,
                          borderRadius: const BorderRadius.horizontal(left: Radius.circular(14)),
                        ),
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              Container(
                                width: 60,
                                child: Text(
                                  period['time']!.replaceAll('-', '\n'),
                                  style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.w500),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: color.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(Icons.book_outlined, color: color, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(period['subject']!, style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600, color: const Color(0xFF1A1A2E))),
                                    Text(period['teacher']!, style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: color.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'Room ${period['room']}',
                                  style: GoogleFonts.poppins(fontSize: 10, color: color, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        }).toList(),
      ),
    );
  }
}
