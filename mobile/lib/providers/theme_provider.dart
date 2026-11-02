import 'package:flutter/material.dart';

class ThemeProvider extends ChangeNotifier {
  bool _isDarkMode = false;

  bool get isDarkMode => _isDarkMode;

  ThemeData get themeData {
    if (_isDarkMode) {
      return _darkTheme;
    } else {
      return _lightTheme;
    }
  }

  void setThemeMode(bool isDark) {
    _isDarkMode = isDark;
    notifyListeners();
  }

  void toggleTheme() {
    _isDarkMode = !_isDarkMode;
    notifyListeners();
  }

  // Light Theme
  static final ThemeData _lightTheme = ThemeData(
    brightness: Brightness.light,
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xFF2563EB),
      brightness: Brightness.light,
      surface: const Color(0xFFFAFAFA),
      surfaceContainer: const Color(0xFFF3F4F6),
    ),
    useMaterial3: true,
    appBarTheme: const AppBarTheme(
      centerTitle: true,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    scaffoldBackgroundColor: const Color(0xFFFAFAFA),
  );

  // Dark Theme
  static final ThemeData _darkTheme = ThemeData(
    brightness: Brightness.dark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xFF60A5FA),
      brightness: Brightness.dark,
      surface: const Color(0xFF1A1F2E),
      surfaceContainer: const Color(0xFF252D3D),
    ),
    useMaterial3: true,
    appBarTheme: const AppBarTheme(
      centerTitle: true,
      elevation: 0,
      backgroundColor: Color(0xFF0F1419),
      surfaceTintColor: Colors.transparent,
    ),
    scaffoldBackgroundColor: const Color(0xFF0F1419),
    textTheme: const TextTheme(
      bodyLarge: TextStyle(color: Color(0xFFE5E7EB)),
      bodyMedium: TextStyle(color: Color(0xFFD1D5DB)),
      bodySmall: TextStyle(color: Color(0xFF9CA3AF)),
      labelLarge: TextStyle(color: Color(0xFFE5E7EB)),
    ),
  );
}
