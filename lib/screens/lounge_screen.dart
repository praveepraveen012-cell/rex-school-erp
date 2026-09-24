import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class LoungeScreen extends StatefulWidget {
  const LoungeScreen({super.key});
  @override
  State<LoungeScreen> createState() => _LoungeScreenState();
}

class _LoungeScreenState extends State<LoungeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  final _tabs = ['All', 'Events', 'Sports', 'Academics', 'Cultural'];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media = [
      {'title': 'Annual Sports Day 2025', 'category': 'Sports', 'date': '15 Mar 2025', 'count': 48, 'gradient': const [Color(0xFF1A2980), Color(0xFF26D0CE)]},
      {'title': 'Science Exhibition', 'category': 'Academics', 'date': '22 Feb 2025', 'count': 35, 'gradient': const [Color(0xFF2D6A4F), Color(0xFF00BFA5)]},
      {'title': 'Christmas Celebration', 'category': 'Cultural', 'date': '24 Dec 2024', 'count': 62, 'gradient': const [Color(0xFFD62828), Color(0xFFFF6B6B)]},
      {'title': 'Republic Day', 'category': 'Events', 'date': '26 Jan 2025', 'count': 28, 'gradient': const [Color(0xFFE05C00), Color(0xFFFFB74D)]},
      {'title': 'Cultural Program', 'category': 'Cultural', 'date': '14 Nov 2024', 'count': 55, 'gradient': const [Color(0xFF5C35AD), Color(0xFFAB47BC)]},
      {'title': 'Inter-School Debate', 'category': 'Academics', 'date': '5 Sep 2024', 'count': 22, 'gradient': const [Color(0xFF0077B6), Color(0xFF00B4D8)]},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Lounge'),
        backgroundColor: const Color(0xFF546E7A),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabCtrl,
          isScrollable: true,
          indicatorColor: Colors.amber,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: _tabs.map((tab) {
          final filtered = tab == 'All' ? media : media.where((m) => m['category'] == tab).toList();
          if (filtered.isEmpty) {
            return Center(child: Text('No media in this category', style: GoogleFonts.poppins(color: Colors.grey)));
          }
          return GridView.builder(
            padding: const EdgeInsets.all(12),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 0.85,
            ),
            itemCount: filtered.length,
            itemBuilder: (_, i) {
              final m = filtered[i];
              final gradient = m['gradient'] as List<Color>;
              return GestureDetector(
                onTap: () => _openGallery(context, m),
                child: Card(
                  elevation: 3,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: gradient, begin: Alignment.topLeft, end: Alignment.bottomRight),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.photo_library_outlined, color: Colors.white54, size: 48),
                            const SizedBox(height: 8),
                            Text('${m['count']} Photos', style: GoogleFonts.poppins(color: Colors.white70, fontSize: 12)),
                          ],
                        ),
                      ),
                      Positioned(
                        bottom: 0,
                        left: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Colors.transparent, Colors.black.withOpacity(0.7)],
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(m['title'] as String, style: GoogleFonts.poppins(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                              Text(m['date'] as String, style: GoogleFonts.poppins(color: Colors.white70, fontSize: 9)),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(color: Colors.black38, borderRadius: BorderRadius.circular(8)),
                          child: Text(m['category'] as String, style: GoogleFonts.poppins(color: Colors.white, fontSize: 9)),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        }).toList(),
      ),
    );
  }

  void _openGallery(BuildContext context, Map<String, dynamic> album) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(album['title'] as String, style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
        content: Text('Gallery with ${album['count']} photos\nDate: ${album['date']}', style: GoogleFonts.poppins()),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
      ),
    );
  }
}
