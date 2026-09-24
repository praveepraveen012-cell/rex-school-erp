import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/app_state.dart';

class MessageCenterScreen extends StatefulWidget {
  const MessageCenterScreen({super.key});
  @override
  State<MessageCenterScreen> createState() => _MessageCenterScreenState();
}

class _MessageCenterScreenState extends State<MessageCenterScreen> {
  String _filter = 'All';
  final _searchCtrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final msgs = appState.messages.where((m) {
      final matchesFilter = _filter == 'All' || m.type == _filter.toLowerCase();
      final matchesSearch = _searchCtrl.text.isEmpty ||
          m.body.toLowerCase().contains(_searchCtrl.text.toLowerCase()) ||
          m.title.toLowerCase().contains(_searchCtrl.text.toLowerCase());
      return matchesFilter && matchesSearch;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Message Center'),
        backgroundColor: const Color(0xFF1A2980),
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(96),
          child: Container(
            color: const Color(0xFF1A2980),
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
            child: Column(
              children: [
                TextField(
                  controller: _searchCtrl,
                  onChanged: (_) => setState(() {}),
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Search messages...',
                    hintStyle: const TextStyle(color: Colors.white54),
                    prefixIcon: const Icon(Icons.search, color: Colors.white54),
                    suffixIcon: _searchCtrl.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: Colors.white54),
                            onPressed: () => setState(() => _searchCtrl.clear()),
                          )
                        : null,
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.15),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ['All', 'Birthday', 'Absent', 'Greeting', 'General'].map((f) {
                      final sel = _filter == f;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(f, style: TextStyle(
                            color: sel ? Colors.white : Colors.white70,
                            fontSize: 12,
                          )),
                          selected: sel,
                          onSelected: (_) => setState(() => _filter = f),
                          backgroundColor: Colors.white.withOpacity(0.15),
                          selectedColor: Colors.amber.shade700,
                          checkmarkColor: Colors.white,
                          side: BorderSide.none,
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () => _showComposeDialog(context, appState),
          ),
        ],
      ),
      body: msgs.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.inbox_outlined, size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 12),
                  Text('No messages found', style: GoogleFonts.poppins(color: Colors.grey)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: msgs.length,
              itemBuilder: (_, i) => _buildMessageCard(context, msgs[i], appState),
            ),
    );
  }

  Widget _buildMessageCard(BuildContext context, dynamic msg, AppState appState) {
    final colors = {
      'birthday': const Color(0xFF1A2980),
      'absent': const Color(0xFFD62828),
      'greeting': const Color(0xFFC2185B),
      'general': const Color(0xFF555555),
    };
    final icons = {
      'birthday': Icons.cake,
      'absent': Icons.person_off_outlined,
      'greeting': Icons.school_outlined,
      'general': Icons.notifications_outlined,
    };
    final color = colors[msg.type] ?? Colors.grey;
    final icon = icons[msg.type] ?? Icons.info;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: msg.isRead ? 1 : 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          appState.markMessageRead(msg.id);
          setState(() {});
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: color.withOpacity(0.15),
                    child: Icon(icon, color: color, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          msg.title,
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            fontWeight: msg.isRead ? FontWeight.w500 : FontWeight.w700,
                          ),
                        ),
                        Text(
                          DateFormat('d MMM yyyy \'at\' h:mm a').format(msg.time),
                          style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                  if (!msg.isRead)
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: Color(0xFF1A2980),
                        shape: BoxShape.circle,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                msg.body,
                style: GoogleFonts.poppins(fontSize: 13, color: Colors.black87, height: 1.5),
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    'Status: 1/1',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      color: const Color(0xFF1A2980),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showComposeDialog(BuildContext context, AppState appState) {
    final bodyCtrl = TextEditingController();
    String selectedType = 'general';
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('New Message', style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              value: selectedType,
              items: const [
                DropdownMenuItem(value: 'general', child: Text('General')),
                DropdownMenuItem(value: 'absent', child: Text('Absent Alert')),
                DropdownMenuItem(value: 'birthday', child: Text('Birthday Wish')),
                DropdownMenuItem(value: 'greeting', child: Text('Greeting')),
              ],
              onChanged: (v) => selectedType = v!,
              decoration: const InputDecoration(labelText: 'Message Type', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: bodyCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Message',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (bodyCtrl.text.trim().isNotEmpty) {
                appState.addMessage(Message(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  type: selectedType,
                  title: 'School Announcement',
                  body: bodyCtrl.text.trim(),
                  time: DateTime.now(),
                ));
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1A2980), foregroundColor: Colors.white),
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }
}
