import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';

class NoticeBoardScreen extends StatefulWidget {
  const NoticeBoardScreen({super.key});
  @override
  State<NoticeBoardScreen> createState() => _NoticeBoardScreenState();
}

class _NoticeBoardScreenState extends State<NoticeBoardScreen> {
  String _selectedCategory = 'All';

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final categories = ['All', 'Event', 'Finance', 'Holiday', 'Academic'];
    final filtered = _selectedCategory == 'All'
        ? appState.notices
        : appState.notices.where((n) => n.category == _selectedCategory).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Notice Board'),
        backgroundColor: const Color(0xFF1A2980),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showAddNotice(context, appState),
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            height: 50,
            color: Colors.white,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: categories.length,
              itemBuilder: (_, i) {
                final sel = _selectedCategory == categories[i];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(categories[i]),
                    selected: sel,
                    onSelected: (_) => setState(() => _selectedCategory = categories[i]),
                    selectedColor: const Color(0xFF1A2980),
                    labelStyle: TextStyle(color: sel ? Colors.white : Colors.black87, fontSize: 12),
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
                final notice = filtered[i];
                final catColors = {
                  'Event': Colors.blue,
                  'Finance': Colors.green,
                  'Holiday': Colors.orange,
                  'Academic': Colors.purple,
                };
                final color = catColors[notice.category] ?? Colors.grey;
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.08),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: color,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                notice.category,
                                style: GoogleFonts.poppins(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                              ),
                            ),
                            if (notice.isPinned) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.amber.shade100,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.push_pin, size: 12, color: Colors.amber.shade700),
                                    const SizedBox(width: 2),
                                    Text('Pinned', style: GoogleFonts.poppins(fontSize: 10, color: Colors.amber.shade700)),
                                  ],
                                ),
                              ),
                            ],
                            const Spacer(),
                            Text(
                              _timeAgo(notice.date),
                              style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              notice.title,
                              style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.bold, color: const Color(0xFF1A1A2E)),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              notice.body,
                              style: GoogleFonts.poppins(fontSize: 13, color: Colors.black54, height: 1.5),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  String _timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  void _showAddNotice(BuildContext context, AppState appState) {
    final titleCtrl = TextEditingController();
    final bodyCtrl = TextEditingController();
    String category = 'Academic';
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Add Notice', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Title', border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(controller: bodyCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Body', border: OutlineInputBorder())),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: category,
                items: ['Event', 'Finance', 'Holiday', 'Academic'].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (v) => category = v!,
                decoration: const InputDecoration(labelText: 'Category', border: OutlineInputBorder()),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (titleCtrl.text.isNotEmpty) {
                appState.addNotice(Notice(
                  id: DateTime.now().toString(),
                  title: titleCtrl.text,
                  body: bodyCtrl.text,
                  date: DateTime.now(),
                  category: category,
                ));
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1A2980), foregroundColor: Colors.white),
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}
