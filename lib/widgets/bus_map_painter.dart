import 'package:flutter/material.dart';
import '../models/bus_route.dart';

class BusMapPainter extends CustomPainter {
  final List<BusStop> stops;
  final double progressPercent; // 0.0 to 1.0
  final bool isDark;

  BusMapPainter({
    required this.stops,
    required this.progressPercent,
    this.isDark = false,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Draw Topographical Grid lines
    final gridPaint = Paint()
      ..color = (isDark ? Colors.white12 : Colors.grey.withOpacity(0.18))
      ..strokeWidth = 1.0;

    const double step = 28.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    // 2. Curving Nilgiris Transit Highway Path
    final path = Path();
    path.moveTo(size.width * 0.08, size.height * 0.55);
    path.cubicTo(
      size.width * 0.28, size.height * 0.28,
      size.width * 0.50, size.height * 0.78,
      size.width * 0.70, size.height * 0.45,
    );
    path.quadraticBezierTo(
      size.width * 0.85, size.height * 0.60,
      size.width * 0.92, size.height * 0.52,
    );

    // Track Background (uncompleted)
    final trackBgPaint = Paint()
      ..color = isDark ? Colors.grey[800]! : const Color(0xFFCBD5E1)
      ..strokeWidth = 10.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(path, trackBgPaint);

    // Track Active Highlight (completed)
    final trackActivePaint = Paint()
      ..color = const Color(0xFF2563EB)
      ..strokeWidth = 7.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(path, trackActivePaint);

    // 3. Draw 500m Radar Geofence Ring around Student Stop (stop 2 at 70% width)
    final studentStopOffset = Offset(size.width * 0.68, size.height * 0.46);
    final geofencePaint = Paint()
      ..color = const Color(0xFF2563EB).withOpacity(0.15)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(studentStopOffset, 38.0, geofencePaint);

    final geofenceBorderPaint = Paint()
      ..color = const Color(0xFF2563EB)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;
    canvas.drawCircle(studentStopOffset, 38.0, geofenceBorderPaint);

    // 4. Draw Waypoint Stops
    final waypoints = [
      Offset(size.width * 0.08, size.height * 0.55),
      Offset(size.width * 0.38, size.height * 0.52),
      studentStopOffset,
      Offset(size.width * 0.92, size.height * 0.52),
    ];

    for (int i = 0; i < waypoints.length; i++) {
      if (i >= stops.length) break;
      final stop = stops[i];
      final pos = waypoints[i];
      final isStudent = stop.isStudentStop;
      final isPassed = stop.status == 'passed';

      // Pin Outer Glow / Shadow
      canvas.drawCircle(
        pos,
        isStudent ? 16.0 : 12.0,
        Paint()..color = (isStudent ? const Color(0xFFF59E0B) : (isPassed ? const Color(0xFF10B981) : Colors.white)),
      );
      canvas.drawCircle(
        pos,
        isStudent ? 16.0 : 12.0,
        Paint()
          ..color = isStudent ? Colors.white : (isPassed ? const Color(0xFF10B981) : Colors.grey)
          ..strokeWidth = 2.5
          ..style = PaintingStyle.stroke,
      );
    }
  }

  @override
  bool shouldRepaint(covariant BusMapPainter oldDelegate) {
    return oldDelegate.progressPercent != progressPercent ||
        oldDelegate.stops != stops ||
        oldDelegate.isDark != isDark;
  }
}
