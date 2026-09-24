import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ContentLibraryScreen extends StatefulWidget {
  const ContentLibraryScreen({super.key});
  @override
  State<ContentLibraryScreen> createState() => _ContentLibraryScreenState();
}

class _ContentLibraryScreenState extends State<ContentLibraryScreen> {
  String _selectedSubject = 'All';

  @override
  Widget build(BuildContext context) {
    final subjects = ['All', 'Mathematics', 'Physics', 'Chemistry', 'English', 'Tamil', 'Social Science'];
    final resources = [
      {'title': 'NCERT Mathematics Part I - Class XII', 'subject': 'Mathematics', 'type': 'PDF', 'size': '12.4 MB', 'icon': Icons.picture_as_pdf_outlined},
      {'title': 'Wave Optics - Complete Notes', 'subject': 'Physics', 'type': 'PDF', 'size': '5.2 MB', 'icon': Icons.picture_as_pdf_outlined},
      {'title': 'Organic Chemistry - Video Lecture', 'subject': 'Chemistry', 'type': 'Video', 'size': '245 MB', 'icon': Icons.play_circle_outline},
      {'title': 'English Grammar Reference', 'subject': 'English', 'type': 'PDF', 'size': '8.1 MB', 'icon': Icons.picture_as_pdf_outlined},
      {'title': 'Tamil Classical Literature', 'subject': 'Tamil', 'type': 'PDF', 'size': '4.3 MB', 'icon': Icons.picture_as_pdf_outlined},
      {'title': 'Indian History - Chapter 6', 'subject': 'Social Science', 'type': 'PDF', 'size': '7.8 MB', 'icon': Icons.picture_as_pdf_outlined},
      {'title': 'Mathematics Practice Problems', 'subject': 'Mathematics', 'type': 'PDF', 'size': '3.2 MB', 'icon': Icons.picture_as_pdf_outlined},
      {'title': 'Physics Lab Manual', 'subject': 'Physics', 'type': 'PDF', 'size': '9.5 MB', 'icon': Icons.picture_as_pdf_outlined},
    ];
    final filtered = _selectedSubject == 'All' ? resources : resources.where((r) => r['subject'] == _selectedSubject).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Content Library'),
        backgroundColor: const Color(0xFF2E7D32),
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          Container(
            height: 52,
            color: Colors.white,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: subjects.length,
              itemBuilder: (_, i) {
                final sel = _selectedSubject == subjects[i];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(subjects[i], style: TextStyle(color: sel ? Colors.white : Colors.black87, fontSize: 11)),
                    selected: sel,
                    onSelected: (_) => setState(() => _selectedSubject = subjects[i]),
                    selectedColor: const Color(0xFF2E7D32),
                  ),
                );
              },
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: filtered.length,
              itemBuilder: (_, i) {
                final r = filtered[i];
                final isVideo = r['type'] == 'Video';
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: ListTile(
                    leading: Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: isVideo ? Colors.red.withOpacity(0.1) : Colors.blue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(r['icon'] as IconData, color: isVideo ? Colors.red : Colors.blue, size: 24),
                    ),
                    title: Text(r['title'] as String, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: Text('${r['subject']} • ${r['size']}', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
                    trailing: IconButton(
                      icon: const Icon(Icons.download_outlined, color: Color(0xFF2E7D32)),
                      onPressed: () {},
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
}
