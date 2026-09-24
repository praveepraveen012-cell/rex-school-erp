import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ContactDirectoryScreen extends StatefulWidget {
  const ContactDirectoryScreen({super.key});
  @override
  State<ContactDirectoryScreen> createState() => _ContactDirectoryScreenState();
}

class _ContactDirectoryScreenState extends State<ContactDirectoryScreen> {
  String _search = '';
  String _filter = 'All';

  @override
  Widget build(BuildContext context) {
    final contacts = [
      {'name': 'Fr. Thomas Antony', 'role': 'Principal', 'type': 'Admin', 'phone': '+91 98765 00001', 'email': 'principal@rex.edu', 'available': true},
      {'name': 'Sr. Mary Josephine', 'role': 'Vice Principal', 'type': 'Admin', 'phone': '+91 98765 00002', 'email': 'vp@rex.edu', 'available': true},
      {'name': 'Mr. Rajan Pillai', 'role': 'HOD - Science', 'type': 'Teacher', 'phone': '+91 98765 00003', 'email': 'science@rex.edu', 'available': false},
      {'name': 'Mrs. Anitha Kumar', 'role': 'HOD - Mathematics', 'type': 'Teacher', 'phone': '+91 98765 00004', 'email': 'maths@rex.edu', 'available': true},
      {'name': 'Mr. David Raj', 'role': 'HOD - Commerce', 'type': 'Teacher', 'phone': '+91 98765 00005', 'email': 'commerce@rex.edu', 'available': true},
      {'name': 'Mrs. Susheela Nair', 'role': 'English Teacher', 'type': 'Teacher', 'phone': '+91 98765 00006', 'email': 'english@rex.edu', 'available': false},
      {'name': 'Office', 'role': 'School Office', 'type': 'Office', 'phone': '+91 423 244 1234', 'email': 'office@rex.edu', 'available': true},
      {'name': 'Accounts', 'role': 'Fee & Accounts', 'type': 'Office', 'phone': '+91 423 244 1235', 'email': 'accounts@rex.edu', 'available': true},
      {'name': 'Library', 'role': 'School Library', 'type': 'Office', 'phone': '+91 423 244 1236', 'email': 'library@rex.edu', 'available': false},
      {'name': 'Transport Office', 'role': 'Bus & Transport', 'type': 'Transport', 'phone': '+91 98765 00010', 'email': 'transport@rex.edu', 'available': true},
    ];

    final filtered = contacts.where((c) {
      final nameStr = c['name']?.toString() ?? '';
      final roleStr = c['role']?.toString() ?? '';
      final matchSearch = _search.isEmpty ||
          nameStr.toLowerCase().contains(_search.toLowerCase()) ||
          roleStr.toLowerCase().contains(_search.toLowerCase());
      final matchFilter = _filter == 'All' || c['type'] == _filter;
      return matchFilter && matchSearch;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Contact Directory'),
        backgroundColor: const Color(0xFF6A1B9A),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                TextField(
                  onChanged: (v) => setState(() => _search = v),
                  decoration: InputDecoration(
                    hintText: 'Search contacts...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    filled: true,
                    fillColor: const Color(0xFFF0F4FF),
                  ),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ['All', 'Admin', 'Teacher', 'Office', 'Transport'].map((f) {
                      final sel = _filter == f;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(f, style: TextStyle(color: sel ? Colors.white : Colors.black87, fontSize: 11)),
                          selected: sel,
                          onSelected: (_) => setState(() => _filter = f),
                          selectedColor: const Color(0xFF6A1B9A),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: filtered.length,
              itemBuilder: (_, i) {
                final c = filtered[i];
                final typeColors = {
                  'Admin': const Color(0xFF1A2980),
                  'Teacher': const Color(0xFF2D6A4F),
                  'Office': const Color(0xFFE05C00),
                  'Transport': const Color(0xFF0077B6),
                };
                final color = typeColors[c['type']] ?? Colors.grey;
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Stack(
                          children: [
                            CircleAvatar(
                              radius: 24,
                              backgroundColor: color,
                              child: Text((c['name']?.toString() ?? 'R')[0], style: GoogleFonts.poppins(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                            ),
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                width: 12,
                                height: 12,
                                decoration: BoxDecoration(
                                  color: (c['available'] as bool) ? Colors.green : Colors.grey,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(c['name'] as String, style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600)),
                              Text(c['role'] as String, style: GoogleFonts.poppins(fontSize: 11, color: color)),
                              Text(c['phone'] as String, style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
                            ],
                          ),
                        ),
                        Row(
                          children: [
                            IconButton(icon: Icon(Icons.phone_outlined, color: color, size: 20), onPressed: () {}),
                            IconButton(icon: Icon(Icons.email_outlined, color: color, size: 20), onPressed: () {}),
                          ],
                        ),
                      ],
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
