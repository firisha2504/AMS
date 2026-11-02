// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Afosha Management System';

  @override
  String get login => 'Login';

  @override
  String get dashboard => 'Dashboard';

  @override
  String get profile => 'Profile';

  @override
  String get contributions => 'Contributions';

  @override
  String get notifications => 'Notifications';

  @override
  String get logout => 'Logout';

  @override
  String get unread => 'unread';

  @override
  String get noNotifications => 'No Notifications';

  @override
  String get allCaughtUp => 'You\'re all caught up!';

  @override
  String get newAlertsWillAppear => 'New alerts will appear here.';
}
