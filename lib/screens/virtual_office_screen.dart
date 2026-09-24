import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class VirtualOfficeScreen extends StatelessWidget {
  const VirtualOfficeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final services = [
      {'title': 'TC Request', 'subtitle': 'Apply for Transfer Certificate', 'icon': Icons.article_outlined, 'color': const Color(0xFF1A2980)},
      {'title': 'Bonafide Certificate', 'subtitle': 'Request bonafide/study certificate', 'icon': Icons.verified_outlined, 'color': const Color(0xFF2D6A4F)},
      {'title': 'Character Certificate', 'subtitle': 'Apply for character certificate', 'icon': Icons.workspace_premium_outlined, 'color': const Color(0xFF5C35AD)},
      {'title': 'Leave Application', 'subtitle': 'Submit leave request to principal', 'icon': Icons.event_busy_outlined, 'color': const Color(0xFFD62828)},
      {'title': 'Complaint Box', 'subtitle': 'Submit anonymous complaint', 'icon': Icons.report_problem_outlined, 'color': const Color(0xFFE05C00)},
      {'title': 'Principal Appointment', 'subtitle': 'Book meeting with principal', 'icon': Icons.calendar_month_outlined, 'color': const Color(0xFFC2185B)},
      {'title': 'Fee Concession', 'subtitle': 'Apply for fee waiver/concession', 'icon': Icons.volunteer_activism_outlined, 'color': const Color(0xFF00695C)},
      {'title': 'Documents Upload', 'subtitle': 'Upload required documents', 'icon': Icons.upload_file_outlined, 'color': const Color(0xFF0077B6)},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Virtual Office'),
        backgroundColor: const Color(0xFFE65100),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFFE65100), Color(0xFFFF8F00)]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                const Icon(Icons.business_center_outlined, color: Colors.white, size: 40),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Virtual Office', style: GoogleFonts.poppins(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                      Text('Request certificates & services online. Track your application status.', style: GoogleFonts.poppins(color: Colors.white70, fontSize: 11)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.3,
              ),
              itemCount: services.length,
              itemBuilder: (_, i) {
                final s = services[i];
                final color = s['color'] as Color;
                return Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => _showServiceDialog(context, s),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
                            child: Icon(s['icon'] as IconData, color: color, size: 22),
                          ),
                          const Spacer(),
                          Text(s['title'] as String, style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF1A1A2E))),
                          const SizedBox(height: 2),
                          Text(s['subtitle'] as String, style: GoogleFonts.poppins(fontSize: 9, color: Colors.grey), maxLines: 2, overflow: TextOverflow.ellipsis),
                        ],
                      ),
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

  void _showServiceDialog(BuildContext context, Map<String, dynamic> service) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(service['title'] as String, style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(service['subtitle'] as String, style: GoogleFonts.poppins(fontSize: 13, color: Colors.grey)),
            const SizedBox(height: 16),
            TextField(
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Reason / Details', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('${service['title']} submitted! You will be notified.'), backgroundColor: service['color'] as Color),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: service['color'] as Color, foregroundColor: Colors.white),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }
}
