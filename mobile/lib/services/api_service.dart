import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';

class ApiService {
  static const _storage = FlutterSecureStorage();
  static String _language = 'om';

  static void setLanguage(String lang) => _language = lang;

  static Future<Map<String, String>> _headers() async {
    final token = await _storage.read(key: 'accessToken');
    return {
      'Content-Type': 'application/json',
      'Accept-Language': _language,
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<Map<String, dynamic>> get(String path, {Map<String, String>? params}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path').replace(queryParameters: params);
    final response = await http.get(uri, headers: await _headers());
    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path');
    final response = await http.post(uri, headers: await _headers(), body: jsonEncode(body));
    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path');
    final response = await http.patch(uri, headers: await _headers(), body: jsonEncode(body));
    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> uploadFile(String path, File file, {String fieldName = 'picture'}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path');
    final token = await _storage.read(key: 'accessToken');
    final request = http.MultipartRequest('POST', uri);
    request.headers['Accept-Language'] = _language;
    if (token != null) request.headers['Authorization'] = 'Bearer $token';

    // Detect MIME type from file extension so multer accepts the file
    final ext = file.path.split('.').last.toLowerCase();
    final mimeType = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    }[ext] ?? 'image/jpeg';

    request.files.add(await http.MultipartFile.fromPath(
      fieldName,
      file.path,
      contentType: MediaType('image', mimeType.split('/').last),
    ));
    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    return _handleResponse(response);
  }

  static Map<String, dynamic> _handleResponse(http.Response response) {
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw ApiException(body['message'] as String? ?? 'Request failed');
    }
    return body;
  }

  static Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: 'accessToken', value: accessToken);
    await _storage.write(key: 'refreshToken', value: refreshToken);
  }

  static Future<void> clearTokens() async {
    await _storage.delete(key: 'accessToken');
    await _storage.delete(key: 'refreshToken');
  }
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);

  @override
  String toString() => message;
}
