import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class SchoolCalendarScreen extends StatefulWidget {
  const SchoolCalendarScreen({super.key});
  @override
  State<SchoolCalendarScreen> createState() => _SchoolCalendarScreenState();
}

class _SchoolCalendarScreenState extends State<SchoolCalendarScreen> {
  DateTime _focusedMonth = DateTime.now();
  DateTime? _selectedDay;

  final Map<String, List<String>> _events = {
    '2026-09-24': ['Parent-Teacher Meeting'],
    '2026-09-25': ['Independence Day (Holiday)'],
    '2026-09-28': ['Unit Test 1 - Mathematics'],
    '2026-09-29': ['Unit Test 1 - Physics'],
    '2026-10-02': ['Gandhi Jayanti (Holiday)'],
    '2026-10-05': ['Annual Sports Day'],
    '2026-10-05': ['Sports Day'],
    '2026-10-15': ['Quarterly Exams Begin'],
    '2026-10-24': ['Diwali (Holiday)'],
    '2026-11-01': ['School Foundation Day'],
    '2026-12-24': ['Christmas Eve Program'],
    '2026-12-25': ['Christmas (Holiday)'],
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('School Calendar'),
        backgroundColor: const Color(0xFFC2185B),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          _buildCalendarHeader(),
          _buildCalendarGrid(),
          const Divider(height: 1),
          _buildUpcomingEvents(),
        ],
      ),
    );
  }

  Widget _buildCalendarHeader() {
    return Container(
      color: const Color(0xFFC2185B),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left, color: Colors.white),
            onPressed: () => setState(() => _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month - 1)),
          ),
          Text(
            DateFormat('MMMM yyyy').format(_focusedMonth),
            style: GoogleFonts.poppins(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right, color: Colors.white),
            onPressed: () => setState(() => _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1)),
          ),
        ],
      ),
    );
  }

  Widget _buildCalendarGrid() {
    final firstDay = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final daysInMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0).day;
    final startWeekday = firstDay.weekday % 7; // Sunday = 0

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Row(
            children: ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => Expanded(
              child: Center(child: Text(d, style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey))),
            )).toList(),
          ),
          const SizedBox(height: 4),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 7, childAspectRatio: 1),
            itemCount: startWeekday + daysInMonth,
            itemBuilder: (_, i) {
              if (i < startWeekday) return const SizedBox();
              final day = i - startWeekday + 1;
              final date = DateTime(_focusedMonth.year, _focusedMonth.month, day);
              final key = DateFormat('yyyy-MM-dd').format(date);
              final hasEvent = _events.containsKey(key);
              final isToday = date.year == DateTime.now().year && date.month == DateTime.now().month && date.day == DateTime.now().day;
              final isSelected = _selectedDay?.day == day && _selectedDay?.month == _focusedMonth.month;
              final isSunday = date.weekday == 7;

              return GestureDetector(
                onTap: () => setState(() => _selectedDay = date),
                child: Container(
                  margin: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFFC2185B) : isToday ? const Color(0xFFC2185B).withOpacity(0.1) : null,
                    shape: BoxShape.circle,
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Text(
                        '$day',
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          color: isSelected ? Colors.white : isSunday ? Colors.red : Colors.black87,
                          fontWeight: isToday || hasEvent ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                      if (hasEvent && !isSelected)
                        Positioned(
                          bottom: 4,
                          child: Container(width: 4, height: 4, decoration: const BoxDecoration(color: Color(0xFFC2185B), shape: BoxShape.circle)),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingEvents() {
    final upcomingKeys = _events.keys
        .where((k) => DateTime.parse(k).isAfter(DateTime.now().subtract(const Duration(days: 1))))
        .toList()
      ..sort();

    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text('Upcoming Events', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold)),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: upcomingKeys.length,
              itemBuilder: (_, i) {
                final key = upcomingKeys[i];
                final date = DateTime.parse(key);
                final events = _events[key] ?? [];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  elevation: 1,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    leading: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(DateFormat('dd').format(date), style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFFC2185B))),
                        Text(DateFormat('MMM').format(date), style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey)),
                      ],
                    ),
                    title: Text(events.first, style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: Text(DateFormat('EEEE').format(date), style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
                    trailing: const Icon(Icons.chevron_right, color: Colors.grey),
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
