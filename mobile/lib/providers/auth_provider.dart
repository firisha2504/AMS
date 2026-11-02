import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_service.dart';
import '../services/push_service.dart';

class User {
  final String id;
  final String? phone;
  final String role;
  final Map<String, dynamic>? member;

  User({required this.id, this.phone, required this.role, this.member});

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'],
        phone: json['phone'],
        role: json['role'],
        member: json['member'],
      );
}

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _isLoading = true;
  bool _isAuthenticated = false;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;

  AuthProvider() {
    _loadSession();
  }

  Future<void> _loadSession() async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'accessToken');
    final userJson = await storage.read(key: 'user');

    if (token != null && userJson != null) {
      _isAuthenticated = true;
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> login(String identifier, String password) async {
    final response = await ApiService.post('/auth/login', {
      'identifier': identifier,
      'password': password,
    });

    final data = response['data'] as Map<String, dynamic>;
    await ApiService.saveTokens(data['accessToken'], data['refreshToken']);

    const storage = FlutterSecureStorage();
    await storage.write(key: 'user', value: data['user'].toString());

    _user = User.fromJson(data['user']);
    _isAuthenticated = true;
    notifyListeners();
    await PushService.registerTokenIfAvailable();
  }

  Future<void> logout() async {
    await ApiService.clearTokens();
    const storage = FlutterSecureStorage();
    await storage.delete(key: 'user');
    _user = null;
    _isAuthenticated = false;
    notifyListeners();
  }
}
