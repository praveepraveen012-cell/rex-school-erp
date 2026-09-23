import 'package:flutter/services.dart';

class AudioService {
  static void playChime() {
    try {
      SystemSound.play(SystemSoundType.alert);
      HapticFeedback.heavyImpact();
    } catch (e) {
      // Graceful fallback
    }
  }
}
