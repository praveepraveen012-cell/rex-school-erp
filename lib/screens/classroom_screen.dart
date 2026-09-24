import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ClassroomScreen extends StatelessWidget {
  const ClassroomScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final classes = [
      {'class': 'XII-A', 'students': 42, 'teacher': 'Mrs. Anitha Kumar', 'room': '301', 'stream': 'Science'},
      {'class': 'XII-B', 'students': 40, 'teacher': 'Mr. David Raj', 'room': '302', 'stream': 'Commerce'},
      {'class': 'XI-A', 'students': 45, 'teacher': 'Mr. Rajan Pillai', 'room': '201', 'stream': 'Science'},
      {'class': 'XI-B', 'students': 38, 'teacher': 'Mrs. Geetha Rao', 'room': '202', 'stream': 'Arts'},
      {'class': 'X-A', 'students': 48, 'teacher': 'Mrs. Susheela Nair', 'room': '101', 'stream': 'SSLC'},
      {'class': 'X-B', 'students': 47, 'teacher': 'Mr. Muthu Selvan', 'room': '102', 'stream': 'SSLC'},
      {'class': 'IX-A', 'students': 50, 'teacher': 'Mrs. Anitha Kumar', 'room': '103', 'stream': 'Secondary'},
      {'class': 'IX-B', 'students': 49, 'teacher': 'Mr. Rajan Pillai', 'room': '104', 'stream': 'Secondary'},
      {'class': 'VIII-A', 'students': 52, 'teacher': 'Mrs. Geetha Rao', 'room': '105', 'stream': 'Upper Primary'},
      {'class': 'VII-A', 'students': 55, 'teacher': 'Mr. David Raj', 'room': '106', 'stream': 'Upper Primary'},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Class Room'),
        backgroundColor: const Color(0xFFE9A000),
        foregroundColor: Colors.white,
      ),
      body: GridView.builder(
        padding: const EdgeInsets.all(12),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.1,
        ),
        itemCount: classes.length,
        itemBuilder: (_, i) {
          final cls = classes[i];
          final colors = [
            const Color(0xFF1A2980), const Color(0xFFD62828), const Color(0xFF2D6A4F),
            const Color(0xFFC2185B), const Color(0xFF5C35AD), const Color(0xFFE05C00),
            const Color(0xFF0077B6), const Color(0xFF2E7D32), const Color(0xFF546E7A), const Color(0xFF00838F),
          ];
          final color = colors[i % colors.length];
          return Card(
            elevation: 3,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () {},
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(Icons.class_outlined, color: color, size: 22),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: color,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'Room ${cls['room']}',
                            style: GoogleFonts.poppins(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Class ${cls['class']}',
                      style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: color),
                    ),
                    Text(
                      cls['stream'] as String,
                      style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Icon(Icons.people, size: 14, color: color),
                        const SizedBox(width: 4),
                        Text(
                          '${cls['students']} students',
                          style: GoogleFonts.poppins(fontSize: 11, color: Colors.black87, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      cls['teacher'] as String,
                      style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
