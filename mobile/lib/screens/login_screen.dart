import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
import '../services/logo_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  bool _obscurePassword = true;
  String? _error;

  Future<void> _login() async {
    setState(() { _loading = true; _error = null; });
    try {
      await context.read<AuthProvider>().login(
        _identifierController.text,
        _passwordController.text,
      );
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        actions: [
          // Theme toggle
          Consumer<ThemeProvider>(
            builder: (context, themeProvider, _) {
              return IconButton(
                icon: Icon(
                  themeProvider.isDarkMode 
                    ? Icons.light_mode 
                    : Icons.dark_mode,
                ),
                onPressed: () => themeProvider.toggleTheme(),
                tooltip: themeProvider.isDarkMode ? 'Light Mode' : 'Dark Mode',
              );
            },
          ),
          // Language toggle
          IconButton(
            icon: const Icon(Icons.language),
            onPressed: () => locale.toggleLocale(),
            tooltip: 'Toggle Language',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 40),
              LogoService.buildLogo(context, size: 40),
              const SizedBox(height: 24),
              Text(
                locale.locale.languageCode == 'om'
                    ? 'Sirna Bulchiinsa Afosha'
                    : 'Afosha Management System',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                locale.locale.languageCode == 'om'
                    ? 'Akkaawuntii keessan fayyadamaa'
                    : 'Sign in with your account',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _identifierController,
                decoration: InputDecoration(
                  labelText: locale.locale.languageCode == 'om'
                      ? 'Lakkoofsa Bilbilaa'
                      : 'Phone Number',
                  border: const OutlineInputBorder(),
                  prefixIcon: const Icon(Icons.phone),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  labelText: locale.locale.languageCode == 'om'
                      ? 'Jecha Iccitii'
                      : 'Password',
                  border: const OutlineInputBorder(),
                  prefixIcon: const Icon(Icons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility_off : Icons.visibility,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscurePassword = !_obscurePassword;
                      });
                    },
                  ),
                ),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {
                    Navigator.of(context).pushNamed('/forgot-password');
                  },
                  child: Text(
                    locale.locale.languageCode == 'om'
                        ? 'Jecha iccitii dagatte?'
                        : 'Forgot password?',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _getErrorMessage(_error!),
                          style: TextStyle(
                            color: Colors.red.shade700,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton(
                  onPressed: _loading ? null : _login,
                  child: _loading
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(locale.locale.languageCode == 'om' ? 'Seeni' : 'Login'),
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => locale.toggleLocale(),
                child: Text(
                  locale.locale.languageCode == 'om' ? 'English' : 'Afaan Oromoo',
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  String _getErrorMessage(String error) {
    // Convert technical errors to user-friendly messages
    if (error.contains('SocketException') || error.contains('Connection timed out')) {
      return context.read<LocaleProvider>().locale.languageCode == 'om'
          ? 'Walitti dhufeenya interneetii mirkaneessi'
          : 'Check your internet connection';
    } else if (error.contains('Invalid') || error.contains('credentials')) {
      return context.read<LocaleProvider>().locale.languageCode == 'om'
          ? 'Lakkoofsa bilbilaa ykn jecha iccitii dogoggora'
          : 'Invalid phone number or password';
    } else if (error.contains('timeout')) {
      return context.read<LocaleProvider>().locale.languageCode == 'om'
          ? 'Yeroon isaanii darbeera. Irra deebi\'i yaali'
          : 'Connection timeout. Please try again';
    } else {
      return context.read<LocaleProvider>().locale.languageCode == 'om'
          ? 'Dogongorri uumame. Irra deebi\'i yaali'
          : 'An error occurred. Please try again';
    }
  }
}
