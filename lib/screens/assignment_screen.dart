import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AssignmentScreen extends StatefulWidget {
  const AssignmentScreen({super.key});
  @override
  State<AssignmentScreen> createState() => _AssignmentScreenState();
}

class _AssignmentScreenState extends State<AssignmentScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final assignments = [
      {'subject': 'Mathematics', 'title': 'Integration Problems Set 5', 'dueDate': '26 Sep 2026', 'submitted': false, 'teacher': 'Mrs. Anitha Kumar', 'marks': 20},
      {'subject': 'Physics', 'title': 'Lab Report - Optics Experiment', 'dueDate': '28 Sep 2026', 'submitted': true, 'teacher': 'Mr. Rajan Pillai', 'marks': 15},
      {'subject': 'English', 'title': 'Essay: Environmental Conservation', 'dueDate': '25 Sep 2026', 'submitted': false, 'teacher': 'Mrs. Susheela Nair', 'marks': 10},
      {'subject': 'Chemistry', 'title': 'Organic Chemistry Notes', 'dueDate': '30 Sep 2026', 'submitted': true, 'teacher': 'Mr. Rajan Pillai', 'marks': 25},
      {'subject': 'Tamil', 'title': 'கவிதை எழுதுக', 'dueDate': '27 Sep 2026', 'submitted': false, 'teacher': 'Mr. Muthu Selvan', 'marks': 10},
    ];
    final pending = assignments.where((a) => a['submitted'] == false).toList();
    final submitted = assignments.where((a) => a['submitted'] == true).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Assignments'),
        backgroundColor: const Color(0xFFAD1457),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: Colors.amber,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: [
            Tab(text: 'All (${assignments.length})'),
            Tab(text: 'Pending (${pending.length})'),
            Tab(text: 'Submitted (${submitted.length})'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _buildList(assignments),
          _buildList(pending),
          _buildList(submitted),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        backgroundColor: const Color(0xFFAD1457),
        icon: const Icon(Icons.add, color: Colors.white),
        label: Text('New', style: GoogleFonts.poppins(color: Colors.white)),
      ),
    );
  }

  Widget _buildList(List<Map<String, dynamic>> items) {
    if (items.isEmpty) {
      return Center(child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.task_alt, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 12),
          Text('No assignments here', style: GoogleFonts.poppins(color: Colors.grey)),
        ],
      ));
    }
    final subjectColors = {
      'Mathematics': const Color(0xFF1A2980),
      'Physics': const Color(0xFFD62828),
      'Chemistry': const Color(0xFF2D6A4F),
      'English': const Color(0xFF5C35AD),
      'Tamil': const Color(0xFFC2185B),
      'Social Science': const Color(0xFFE05C00),
    };
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: items.length,
      itemBuilder: (_, i) {
        final a = items[i];
        final color = subjectColors[a['subject']] ?? Colors.grey;
        final submitted = a['submitted'] as bool;
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: IntrinsicHeight(
            child: Row(
              children: [
                Container(width: 5, decoration: BoxDecoration(color: color, borderRadius: const BorderRadius.horizontal(left: Radius.circular(14)))),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                              child: Text(a['subject'] as String, style: GoogleFonts.poppins(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: submitted ? Colors.green.withOpacity(0.1) : Colors.orange.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                submitted ? '✓ Submitted' : '⏱ Pending',
                                style: GoogleFonts.poppins(fontSize: 10, color: submitted ? Colors.green.shade700 : Colors.orange.shade700, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(a['title'] as String, style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600)),
                        Text(a['teacher'] as String, style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(Icons.calendar_today_outlined, size: 12, color: submitted ? Colors.grey : Colors.red),
                            const SizedBox(width: 4),
                            Text('Due: ${a['dueDate']}', style: GoogleFonts.poppins(fontSize: 11, color: submitted ? Colors.grey : Colors.red.shade700)),
                            const Spacer(),
                            Text('Max: ${a['marks']} marks', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
                          ],
                        ),
                        if (!submitted) ...[
                          const SizedBox(height: 10),
                          OutlinedButton.icon(
                            onPressed: () {},
                            icon: Icon(Icons.upload_outlined, color: color, size: 16),
                            label: Text('Submit', style: GoogleFonts.poppins(fontSize: 12, color: color)),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: color),
                              minimumSize: const Size(0, 32),
                            ),
                          ),
                        ],
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
  }
}
