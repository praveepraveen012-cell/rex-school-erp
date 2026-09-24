import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key});
  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  int _rating = 0;
  String _category = 'General';
  final _feedbackCtrl = TextEditingController();
  bool _anonymous = false;
  bool _submitted = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Feedback'),
        backgroundColor: const Color(0xFF00838F),
        foregroundColor: Colors.white,
      ),
      body: _submitted ? _buildThankYou() : _buildForm(),
    );
  }

  Widget _buildForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF00838F), Color(0xFF00BCD4)]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                const Icon(Icons.feedback_outlined, color: Colors.white, size: 40),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Share Your Feedback', style: GoogleFonts.poppins(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                      Text('Help us improve the school experience', style: GoogleFonts.poppins(color: Colors.white70, fontSize: 11)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Category', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: ['General', 'Teaching', 'Transport', 'Infrastructure', 'Administration', 'Food', 'Other']
                        .map((c) {
                      final sel = _category == c;
                      return ChoiceChip(
                        label: Text(c, style: TextStyle(color: sel ? Colors.white : Colors.black87, fontSize: 11)),
                        selected: sel,
                        onSelected: (_) => setState(() => _category = c),
                        selectedColor: const Color(0xFF00838F),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),
                  Text('Overall Rating', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Row(
                    children: List.generate(5, (i) {
                      return GestureDetector(
                        onTap: () => setState(() => _rating = i + 1),
                        child: Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Icon(
                            i < _rating ? Icons.star : Icons.star_border,
                            color: Colors.amber,
                            size: 36,
                          ),
                        ),
                      );
                    }),
                  ),
                  if (_rating > 0) ...[
                    const SizedBox(height: 4),
                    Text(
                      ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][_rating],
                      style: GoogleFonts.poppins(fontSize: 12, color: Colors.amber.shade700, fontWeight: FontWeight.w600),
                    ),
                  ],
                  const SizedBox(height: 20),
                  Text('Your Feedback', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _feedbackCtrl,
                    maxLines: 5,
                    decoration: InputDecoration(
                      hintText: 'Write your feedback here...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.all(16),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SwitchListTile(
                    title: Text('Submit Anonymously', style: GoogleFonts.poppins(fontSize: 13)),
                    subtitle: Text('Your name will not be shared', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
                    value: _anonymous,
                    onChanged: (v) => setState(() => _anonymous = v),
                    activeColor: const Color(0xFF00838F),
                    contentPadding: EdgeInsets.zero,
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _rating > 0 && _feedbackCtrl.text.trim().isNotEmpty
                          ? () => setState(() => _submitted = true)
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00838F),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text('Submit Feedback', style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildThankYou() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: const BoxDecoration(color: Color(0xFF00838F), shape: BoxShape.circle),
              child: const Icon(Icons.check, color: Colors.white, size: 50),
            ),
            const SizedBox(height: 24),
            Text('Thank You!', style: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.bold, color: const Color(0xFF00838F))),
            const SizedBox(height: 8),
            Text(
              'Your feedback has been submitted successfully. We will review it and use it to improve our services.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(fontSize: 14, color: Colors.grey, height: 1.6),
            ),
            const SizedBox(height: 24),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) => Icon(i < _rating ? Icons.star : Icons.star_border, color: Colors.amber, size: 28))),
            const SizedBox(height: 32),
            OutlinedButton(
              onPressed: () => setState(() { _submitted = false; _rating = 0; _feedbackCtrl.clear(); }),
              child: const Text('Submit Another'),
            ),
          ],
        ),
      ),
    );
  }
}
