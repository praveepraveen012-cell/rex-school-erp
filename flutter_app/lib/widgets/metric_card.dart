import 'package:flutter/material.dart';

class MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData? icon;
  final Widget? iconWidget;
  final Color iconBgColor;
  final Color? iconColor;
  final Color? valueColor;
  final String? trend;

  const MetricCard({
    super.key,
    required this.title,
    required this.value,
    required this.subtitle,
    this.icon,
    this.iconWidget,
    this.iconBgColor = const Color(0xFFEFF6FF),
    this.iconColor,
    this.valueColor,
    this.trend,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveIcon = iconWidget ??
        (icon != null
            ? Icon(icon, color: iconColor ?? const Color(0xFF1E3A8A), size: 22)
            : const SizedBox.shrink());

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: iconColor != null
                        ? iconColor!.withOpacity(0.12)
                        : iconBgColor,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(child: effectiveIcon),
                ),
                if (trend != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      trend!,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF16A34A),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: valueColor ?? const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              title,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
