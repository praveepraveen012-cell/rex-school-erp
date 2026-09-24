import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class EvaluationScreen extends StatefulWidget {
  const EvaluationScreen({super.key});
  @override
  State<EvaluationScreen> createState() => _EvaluationScreenState();
}

class _EvaluationScreenState extends State<EvaluationScreen> with SingleTickerProviderStateMixin {
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
    final exams = [
      {'name': 'Unit Test 1 - Mathematics', 'class': 'XII-A', 'date': '28 Sep 2026', 'time': '9:00 AM', 'duration': '1.5 hrs', 'room': '301', 'maxMarks': 50},
      {'name': 'Unit Test 1 - Physics', 'class': 'XII-A', 'date': '29 Sep 2026', 'time': '9:00 AM', 'duration': '1.5 hrs', 'room': '302', 'maxMarks': 50},
      {'name': 'Quarterly Exam - All Subjects', 'class': 'All Classes', 'date': '5-15 Oct 2026', 'time': '9:00 AM', 'duration': '3 hrs', 'room': 'Respective', 'maxMarks': 100},
    ];
    final results = [
      {'subject': 'Mathematics', 'exam': 'Half Yearly', 'marks': 87, 'max': 100, 'grade': 'A+', 'rank': 3},
      {'subject': 'Physics', 'exam': 'Half Yearly', 'marks': 82, 'max': 100, 'grade': 'A', 'rank': 5},
      {'subject': 'Chemistry', 'exam': 'Half Yearly', 'marks': 91, 'max': 100, 'grade': 'A+', 'rank': 2},
      {'subject': 'English', 'exam': 'Half Yearly', 'marks': 78, 'max': 100, 'grade': 'B+', 'rank': 8},
      {'subject': 'Tamil', 'exam': 'Half Yearly', 'marks': 85, 'max': 100, 'grade': 'A', 'rank': 4},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Evaluation'),
        backgroundColor: const Color(0xFF1B5E20),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: Colors.amber,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [Tab(text: 'Exams'), Tab(text: 'Results'), Tab(text: 'Report')],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _buildExams(exams),
          _buildResults(results),
          _buildReport(results),
        ],
      ),
    );
  }

  Widget _buildExams(List<Map<String, dynamic>> exams) {
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: exams.length,
      itemBuilder: (_, i) {
        final e = exams[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(e['name'] as String, style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Divider(),
                const SizedBox(height: 8),
                _infoRow(Icons.class_outlined, 'Class', e['class'] as String),
                _infoRow(Icons.calendar_today_outlined, 'Date', e['date'] as String),
                _infoRow(Icons.access_time_outlined, 'Time', '${e['time']} (${e['duration']})'),
                _infoRow(Icons.room_outlined, 'Room', e['room'] as String),
                _infoRow(Icons.score_outlined, 'Max Marks', '${e['maxMarks']}'),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 16, color: const Color(0xFF1B5E20)),
          const SizedBox(width: 8),
          Text('$label: ', style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey)),
          Text(value, style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildResults(List<Map<String, dynamic>> results) {
    final total = results.fold(0, (s, r) => s + (r['marks'] as int));
    final max = results.fold(0, (s, r) => s + (r['max'] as int));
    return SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Card(
            elevation: 3,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF1A2980), Color(0xFF26D0CE)]),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _statCol('Total Marks', '$total/$max', Colors.white),
                  _statCol('Percentage', '${(total / max * 100).toStringAsFixed(1)}%', Colors.amber),
                  _statCol('Overall Grade', 'A', Colors.greenAccent),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          ...results.map((r) {
            final pct = (r['marks'] as int) / (r['max'] as int);
            final color = pct >= 0.9 ? Colors.green : pct >= 0.75 ? Colors.blue : Colors.orange;
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(r['subject'] as String, style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold)),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
                              child: Text(r['grade'] as String, style: GoogleFonts.poppins(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                            ),
                            const SizedBox(width: 8),
                            Text('Rank ${r['rank']}', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text('${r['marks']}/${r['max']}', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: color)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: pct,
                              minHeight: 8,
                              backgroundColor: color.withOpacity(0.1),
                              valueColor: AlwaysStoppedAnimation<Color>(color),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text('${(pct * 100).toInt()}%', style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey)),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _statCol(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: GoogleFonts.poppins(fontSize: 10, color: Colors.white70)),
      ],
    );
  }

  Widget _buildReport(List<Map<String, dynamic>> results) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.analytics_outlined, size: 64, color: Color(0xFF1B5E20)),
            const SizedBox(height: 16),
            Text('Detailed Report Card', style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
            Text('View your full academic report card', style: GoogleFonts.poppins(color: Colors.grey)),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.download_outlined),
              label: const Text('Download Report Card'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1B5E20),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
