import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class FeeAnalysisScreen extends StatelessWidget {
  const FeeAnalysisScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final stats = [
      {'label': 'Total Collected', 'amount': '₹18,45,000', 'color': const Color(0xFF2D6A4F), 'icon': Icons.check_circle_outline},
      {'label': 'Pending', 'amount': '₹3,20,000', 'color': const Color(0xFFD62828), 'icon': Icons.pending_outlined},
      {'label': 'Waived', 'amount': '₹55,000', 'color': const Color(0xFFC2185B), 'icon': Icons.volunteer_activism_outlined},
      {'label': 'Total Expected', 'amount': '₹22,20,000', 'color': const Color(0xFF1A2980), 'icon': Icons.account_balance_outlined},
    ];
    final breakdown = [
      {'type': 'Tuition Fee', 'collected': 85, 'color': const Color(0xFF1A2980)},
      {'type': 'Transport Fee', 'collected': 78, 'color': const Color(0xFF2D6A4F)},
      {'type': 'Exam Fee', 'collected': 92, 'color': const Color(0xFFE9A000)},
      {'type': 'Activity Fee', 'collected': 65, 'color': const Color(0xFFC2185B)},
      {'type': 'Library Fee', 'collected': 88, 'color': const Color(0xFF5C35AD)},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Fee Analysis'),
        backgroundColor: const Color(0xFF1565C0),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Summary cards
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.5,
              ),
              itemCount: stats.length,
              itemBuilder: (_, i) {
                final s = stats[i];
                final color = s['color'] as Color;
                return Card(
                  elevation: 3,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(s['icon'] as IconData, color: color, size: 22),
                        const Spacer(),
                        Text(s['amount'] as String, style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.bold, color: color)),
                        Text(s['label'] as String, style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey)),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 20),
            Text('Collection by Category', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...breakdown.map((b) {
              final pct = b['collected'] as int;
              final color = b['color'] as Color;
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(b['type'] as String, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w500)),
                          Text('$pct%', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold, color: color)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: pct / 100,
                          minHeight: 8,
                          backgroundColor: color.withOpacity(0.12),
                          valueColor: AlwaysStoppedAnimation<Color>(color),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 20),
            Text('Monthly Collection', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    ...[
                      {'month': 'June 2026', 'amount': '₹4,20,000', 'pct': 0.9},
                      {'month': 'July 2026', 'amount': '₹3,80,000', 'pct': 0.75},
                      {'month': 'August 2026', 'amount': '₹2,90,000', 'pct': 0.6},
                      {'month': 'September 2026', 'amount': '₹2,10,000', 'pct': 0.45},
                    ].map((m) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 100,
                            child: Text(m['month'] as String, style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
                          ),
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: m['pct'] as double,
                                minHeight: 20,
                                backgroundColor: const Color(0xFF1A2980).withOpacity(0.1),
                                valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF1A2980)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(m['amount'] as String, style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF1A2980))),
                        ],
                      ),
                    )),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
