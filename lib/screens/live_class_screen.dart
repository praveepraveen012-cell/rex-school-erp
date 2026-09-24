import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class LiveClassScreen extends StatelessWidget {
  const LiveClassScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final live = [
      {'subject': 'Mathematics', 'topic': 'Integration by Parts', 'teacher': 'Mrs. Anitha Kumar', 'class': 'XII-A', 'status': 'live', 'duration': '35 min', 'viewers': 38},
    ];
    final upcoming = [
      {'subject': 'Physics', 'topic': 'Wave Optics', 'teacher': 'Mr. Rajan Pillai', 'class': 'XII-A', 'time': '2:00 PM'},
      {'subject': 'Chemistry', 'topic': 'Organic Reactions', 'teacher': 'Mr. Rajan Pillai', 'class': 'XI-A', 'time': '3:00 PM'},
      {'subject': 'English', 'topic': 'Essay Writing', 'teacher': 'Mrs. Susheela Nair', 'class': 'X-A', 'time': '4:00 PM'},
    ];
    final recorded = [
      {'subject': 'Mathematics', 'topic': 'Differential Equations', 'teacher': 'Mrs. Anitha Kumar', 'class': 'XII-A', 'date': 'Yesterday', 'duration': '48 min'},
      {'subject': 'Physics', 'topic': 'Electromagnetic Induction', 'teacher': 'Mr. Rajan Pillai', 'class': 'XII-A', 'date': '22 Sep', 'duration': '52 min'},
      {'subject': 'Tamil', 'topic': 'Classical Literature', 'teacher': 'Mr. Muthu Selvan', 'class': 'X-A', 'date': '21 Sep', 'duration': '45 min'},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Live Class'),
        backgroundColor: const Color(0xFFE53935),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Live now
            if (live.isNotEmpty) ...[
              Row(children: [
                Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle)),
                const SizedBox(width: 6),
                Text('LIVE NOW', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.red)),
              ]),
              const SizedBox(height: 8),
              ...live.map((c) => _buildLiveCard(c)),
              const SizedBox(height: 16),
            ],
            Text('Upcoming Classes', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...upcoming.map((c) => _buildUpcomingCard(c)),
            const SizedBox(height: 16),
            Text('Recorded Classes', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...recorded.map((c) => _buildRecordedCard(c)),
          ],
        ),
      ),
    );
  }

  Widget _buildLiveCard(Map<String, dynamic> c) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFFE53935), Color(0xFFFF7043)]),
          borderRadius: BorderRadius.circular(16),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(width: 6, height: 6, decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle)),
                      const SizedBox(width: 4),
                      Text('LIVE', style: GoogleFonts.poppins(fontSize: 10, color: Colors.red, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                const Spacer(),
                Row(
                  children: [
                    const Icon(Icons.remove_red_eye_outlined, color: Colors.white70, size: 14),
                    const SizedBox(width: 4),
                    Text('${c['viewers']} watching', style: GoogleFonts.poppins(fontSize: 11, color: Colors.white70)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(c['subject'] as String, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
            Text(c['topic'] as String, style: GoogleFonts.poppins(fontSize: 13, color: Colors.white70)),
            const SizedBox(height: 4),
            Text('${c['teacher']} | ${c['class']}', style: GoogleFonts.poppins(fontSize: 11, color: Colors.white60)),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.play_arrow),
              label: const Text('Join Live Class'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: Colors.red,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUpcomingCard(Map<String, dynamic> c) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFFE53935).withOpacity(0.1),
          child: const Icon(Icons.schedule, color: Color(0xFFE53935)),
        ),
        title: Text('${c['subject']} - ${c['topic']}', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600)),
        subtitle: Text('${c['teacher']} | ${c['class']}', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(c['time'] as String, style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF1A2980))),
            Text('Today', style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey)),
          ],
        ),
      ),
    );
  }

  Widget _buildRecordedCard(Map<String, dynamic> c) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.grey.shade100,
          child: const Icon(Icons.play_circle_outline, color: Color(0xFF1A2980)),
        ),
        title: Text('${c['subject']} - ${c['topic']}', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600)),
        subtitle: Text('${c['teacher']} | ${c['class']}', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(c['date'] as String, style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
            Text(c['duration'] as String, style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
