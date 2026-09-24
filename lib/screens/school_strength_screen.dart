import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SchoolStrengthScreen extends StatelessWidget {
  const SchoolStrengthScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final classData = [
      {'class': 'Class XII', 'boys': 45, 'girls': 37, 'stream': 'Science, Commerce'},
      {'class': 'Class XI', 'boys': 48, 'girls': 35, 'stream': 'Science, Arts'},
      {'class': 'Class X', 'boys': 55, 'girls': 40, 'stream': 'SSLC'},
      {'class': 'Class IX', 'boys': 58, 'girls': 45, 'stream': 'Secondary'},
      {'class': 'Class VIII', 'boys': 60, 'girls': 52, 'stream': 'Upper Primary'},
      {'class': 'Class VII', 'boys': 62, 'girls': 55, 'stream': 'Upper Primary'},
      {'class': 'Class VI', 'boys': 65, 'girls': 58, 'stream': 'Middle'},
      {'class': 'Class V', 'boys': 60, 'girls': 55, 'stream': 'Primary'},
      {'class': 'Class IV', 'boys': 58, 'girls': 52, 'stream': 'Primary'},
      {'class': 'Class III', 'boys': 55, 'girls': 50, 'stream': 'Primary'},
    ];

    final totalBoys = classData.fold(0, (s, c) => s + (c['boys'] as int));
    final totalGirls = classData.fold(0, (s, c) => s + (c['girls'] as int));
    final total = totalBoys + totalGirls;

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('School Strength'),
        backgroundColor: const Color(0xFF0D7377),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Summary
            Card(
              elevation: 3,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF0D7377), Color(0xFF14A085)]),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    Text('Total Students', style: GoogleFonts.poppins(color: Colors.white70, fontSize: 14)),
                    Text('$total', style: GoogleFonts.poppins(color: Colors.white, fontSize: 48, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _statPill('Boys', '$totalBoys', Colors.blue.shade300),
                        _statPill('Girls', '$totalGirls', Colors.pink.shade300),
                        _statPill('Staff', '72', Colors.amber.shade300),
                        _statPill('Classes', '${classData.length}', Colors.green.shade300),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Gender ratio bar
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Gender Ratio', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Row(
                        children: [
                          Expanded(
                            flex: totalBoys,
                            child: Container(
                              height: 24,
                              color: Colors.blue.shade400,
                              child: Center(child: Text('Boys ${(totalBoys / total * 100).toInt()}%', style: GoogleFonts.poppins(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold))),
                            ),
                          ),
                          Expanded(
                            flex: totalGirls,
                            child: Container(
                              height: 24,
                              color: Colors.pink.shade300,
                              child: Center(child: Text('Girls ${(totalGirls / total * 100).toInt()}%', style: GoogleFonts.poppins(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold))),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('Class-wise Strength', style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            ...classData.asMap().entries.map((entry) {
              final i = entry.key;
              final c = entry.value;
              final boys = c['boys'] as int;
              final girls = c['girls'] as int;
              final classTotal = boys + girls;
              final colors = [
                const Color(0xFF1A2980), const Color(0xFFD62828), const Color(0xFF2D6A4F),
                const Color(0xFFC2185B), const Color(0xFF5C35AD), const Color(0xFFE05C00),
                const Color(0xFF0077B6), const Color(0xFF2E7D32), const Color(0xFF546E7A), const Color(0xFF00838F),
              ];
              final color = colors[i % colors.length];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                elevation: 1,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
                        child: Center(child: Text(c['class'].toString().split(' ').last, style: GoogleFonts.poppins(color: color, fontSize: 11, fontWeight: FontWeight.bold))),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(c['class'] as String, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600)),
                                Text('$classTotal students', style: GoogleFonts.poppins(fontSize: 12, color: color, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            Text(c['stream'] as String, style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                _miniChip('B: $boys', Colors.blue),
                                const SizedBox(width: 6),
                                _miniChip('G: $girls', Colors.pink),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _statPill(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: GoogleFonts.poppins(color: color, fontSize: 20, fontWeight: FontWeight.bold)),
        Text(label, style: GoogleFonts.poppins(color: Colors.white60, fontSize: 10)),
      ],
    );
  }

  Widget _miniChip(String label, MaterialColor color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: color.shade50, borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: GoogleFonts.poppins(fontSize: 10, color: color.shade700, fontWeight: FontWeight.w500)),
    );
  }
}
