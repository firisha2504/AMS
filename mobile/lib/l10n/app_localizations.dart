import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_om.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  static const List<Locale> supportedLocales = <Locale>[
    Locale('om'),
    Locale('en')
  ];

  String get appTitle;
  String get login;
  String get dashboard;
  String get profile;
  String get contributions;
  String get notifications;
  String get logout;
  String get unread;
  String get noNotifications;
  String get allCaughtUp;
  String get newAlertsWillAppear;

  // Navigation Tabs
  String get homeTab;
  String get paymentsTab;
  String get historyTab;
  String get notificationsTab;
  String get profileTab;

  // Payment flow
  String get payNow;
  String get selectPaymentMethod;
  String get paymentConfirmation;
  String get processingPayment;
  String get paymentSuccess;
  String get paymentFailed;
  String get transactionDetails;
  String get digitalReceipt;

  // Balances and Categories
  String get outstandingBalance;
  String get totalAmountPaid;
  String get weeklyContributions;
  String get penalties;
  String get specialContributions;
  String get emergencyContributions;
  String get historicalContributions;

  // Actions
  String get save;
  String get cancel;
  String get submit;
  String get tryAgain;
  String get done;
  String get close;
  String get back;

  // Fields and Statuses
  String get amount;
  String get date;
  String get referenceNumber;
  String get status;
  String get verified;
  String get pending;
  String get requiredField;
  String get invalidAmount;
  String get emptyState;

  // Payment Methods
  String get telebirr;
  String get cbe;
  String get bankTransfer;
  String get cash;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'om'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  switch (locale.languageCode) {
    case 'om':
      return AppLocalizationsOm();
    case 'en':
    default:
      return AppLocalizationsEn();
  }
}
