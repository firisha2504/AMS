import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'providers/auth_provider.dart';
import 'providers/locale_provider.dart';
import 'providers/theme_provider.dart';
import 'services/push_service.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'utils/fallback_locale_delegate.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await PushService.initialize();
  runApp(const AmsApp());
}

class AmsApp extends StatelessWidget {
  const AmsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ],
      child: Consumer<LocaleProvider>(
        builder: (context, localeProvider, _) {
          return Consumer<ThemeProvider>(
            builder: (context, themeProvider, _) {
              return MaterialApp(
                title: 'Afosha MS',
                debugShowCheckedModeBanner: false,
                locale: localeProvider.locale,
                theme: themeProvider.themeData,
                localizationsDelegates: const [
                  FallbackMaterialLocalizationsDelegate(),
                  GlobalWidgetsLocalizations.delegate,
                  FallbackCupertinoLocalizationsDelegate(),
                ],
                supportedLocales: const [
                  Locale('om'),
                  Locale('en'),
                ],
                routes: {
                  '/forgot-password': (context) => const ForgotPasswordScreen(),
                },
                home: Consumer<AuthProvider>(
                  builder: (context, auth, _) {
                    if (auth.isLoading) {
                      return const Scaffold(
                        body: Center(child: CircularProgressIndicator()),
                      );
                    }
                    return auth.isAuthenticated
                        ? const HomeScreen()
                        : const LoginScreen();
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}
