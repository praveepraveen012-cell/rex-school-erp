import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';

class StaffRoomScreen extends StatefulWidget {
  const StaffRoomScreen({super.key});
  @override
  State<StaffRoomScreen> createState() => _StaffRoomScreenState();
}

class _StaffRoomScreenState extends State<StaffRoomScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final filtered = appState.staff.where((s) =>
        s.name.toLowerCase().contains(_search.toLowerCase()) ||
        s.designation.toLowerCase().contains(_search.toLowerCase()) ||
        s.department.toLowerCase().contains(_search.toLowerCase())).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: Text('Staff Room (${appState.staff.length})'),
        backgroundColor: const Color(0xFFE05C00),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(12),
            child: TextField(
              onChanged: (v) => setState(() => _search = v),
              decoration: InputDecoration(
                hintText: 'Search staff...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                filled: true,
                fillColor: const Color(0xFFF0F4FF),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: filtered.length,
              itemBuilder: (_, i) {
                final staff = filtered[i];
                final colors = [
                  const Color(0xFF1A2980), const Color(0xFFD62828), const Color(0xFF2D6A4F),
                  const Color(0xFFC2185B), const Color(0xFF5C35AD), const Color(0xFFE05C00),
                ];
                final color = colors[i % colors.length];
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    leading: CircleAvatar(
                      radius: 24,
                      backgroundColor: color,
                      child: Text(
                        staff.name.substring(0, 1),
                        style: GoogleFonts.poppins(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ),
                    title: Text(staff.name, style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(staff.designation, style: GoogleFonts.poppins(fontSize: 12, color: color)),
                        Text(staff.department, style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: Icon(Icons.phone_outlined, color: color),
                          onPressed: () {},
                        ),
                        IconButton(
                          icon: Icon(Icons.email_outlined, color: color),
                          onPressed: () {},
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
