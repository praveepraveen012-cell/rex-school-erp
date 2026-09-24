import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ClassDiaryScreen extends StatelessWidget {
  const ClassDiaryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final entries = [
      {
        'date': 'Wednesday, 24 Sep 2026',
        'class': 'XII-A',
        'entries': [
          {'subject': 'Mathematics', 'homework': 'Complete Exercise 7.4 (Q1-Q15)', 'note': 'Test on Integration next Monday', 'teacher': 'Mrs. Anitha Kumar'},
          {'subject': 'Physics', 'homework': 'Read Chapter 10: Wave Optics', 'note': 'Lab experiment tomorrow', 'teacher': 'Mr. Rajan Pillai'},
          {'subject': 'English', 'homework': 'Write essay on climate change (500 words)', 'note': '', 'teacher': 'Mrs. Susheela Nair'},
        ]
      },
      {
        'date': 'Tuesday, 23 Sep 2026',
        'class': 'XII-A',
        'entries': [
          {'subject': 'Chemistry', 'homework': 'Revise Organic Chemistry Chapter 4', 'note': '', 'teacher': 'Mr. Rajan Pillai'},
          {'subject': 'Tamil', 'homework': 'Learn poem from unit 5', 'note': 'Oral test on Friday', 'teacher': 'Mr. Muthu Selvan'},
        ]
      },
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Class Diary'),
        backgroundColor: const Color(0xFF00695C),
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.calendar_today_outlined), onPressed: () {}),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: entries.length,
        itemBuilder: (_, i) {
          final day = entries[i];
          final dayEntries = day['entries'] as List<Map<String, dynamic>>;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [Color(0xFF00695C), Color(0xFF00BFA5)]),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        day['date'] as String,
                        style: GoogleFonts.poppins(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(day['class'] as String, style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
              ...dayEntries.map((e) {
                final subjectColors = {
                  'Mathematics': const Color(0xFF1A2980),
                  'Physics': const Color(0xFFD62828),
                  'Chemistry': const Color(0xFF2D6A4F),
                  'English': const Color(0xFF5C35AD),
                  'Tamil': const Color(0xFFC2185B),
                };
                final color = subjectColors[e['subject']] ?? Colors.grey;
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
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(20)),
                              child: Text(e['subject'] as String, style: GoogleFonts.poppins(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                            ),
                            const Spacer(),
                            Text(e['teacher'] as String, style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.assignment_outlined, size: 16, color: color),
                            const SizedBox(width: 6),
                            Expanded(child: Text(e['homework'] as String, style: GoogleFonts.poppins(fontSize: 13))),
                          ],
                        ),
                        if ((e['note'] as String).isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.amber.shade200)),
                            child: Row(
                              children: [
                                Icon(Icons.info_outline, size: 14, color: Colors.amber.shade700),
                                const SizedBox(width: 6),
                                Expanded(child: Text(e['note'] as String, style: GoogleFonts.poppins(fontSize: 11, color: Colors.amber.shade900))),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 8),
            ],
          );
        },
      ),
    );
  }
}
