import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

/// Falls back to English for locales not supported by the standard Flutter
/// material localization delegates (e.g. Oromo 'om').
class FallbackMaterialLocalizationsDelegate
    extends LocalizationsDelegate<MaterialLocalizations> {
  const FallbackMaterialLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<MaterialLocalizations> load(Locale locale) =>
      GlobalMaterialLocalizations.delegate.load(
        GlobalMaterialLocalizations.delegate.isSupported(locale)
            ? locale
            : const Locale('en'),
      );

  @override
  bool shouldReload(FallbackMaterialLocalizationsDelegate old) => false;
}

/// Falls back to English for locales not supported by the standard Flutter
/// cupertino localization delegates (e.g. Oromo 'om').
class FallbackCupertinoLocalizationsDelegate
    extends LocalizationsDelegate<CupertinoLocalizations> {
  const FallbackCupertinoLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<CupertinoLocalizations> load(Locale locale) =>
      GlobalCupertinoLocalizations.delegate.load(
        GlobalCupertinoLocalizations.delegate.isSupported(locale)
            ? locale
            : const Locale('en'),
      );

  @override
  bool shouldReload(FallbackCupertinoLocalizationsDelegate old) => false;
}
