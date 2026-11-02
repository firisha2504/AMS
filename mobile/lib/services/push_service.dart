import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../services/api_service.dart';

class PushService {
  static Future<void> initialize() async {
    try {
      await Firebase.initializeApp();
      await FirebaseMessaging.instance.requestPermission();
    } catch (_) {
      // Firebase not configured — push notifications disabled
    }
  }

  static Future<void> registerTokenIfAvailable() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) return;
      await ApiService.post('/members/me/device-token', {
        'token': token,
        'platform': Platform.isAndroid ? 'android' : 'ios',
      });
    } catch (_) {
      // Best-effort registration
    }
  }
}
