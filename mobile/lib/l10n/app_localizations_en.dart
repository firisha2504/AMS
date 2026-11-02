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

  // Navigation Tabs
  @override
  String get homeTab => 'Home';

  @override
  String get paymentsTab => 'Payments';

  @override
  String get historyTab => 'History';

  @override
  String get notificationsTab => 'Notifications';

  @override
  String get profileTab => 'Profile';

  // Payment flow
  @override
  String get payNow => 'Pay Now';

  @override
  String get selectPaymentMethod => 'Select Payment Method';

  @override
  String get paymentConfirmation => 'Payment Confirmation';

  @override
  String get processingPayment => 'Processing payment...';

  @override
  String get paymentSuccess => 'Payment Successful';

  @override
  String get paymentFailed => 'Payment Failed';

  @override
  String get transactionDetails => 'Transaction Details';

  @override
  String get digitalReceipt => 'Digital Receipt';

  // Balances and Categories
  @override
  String get outstandingBalance => 'Outstanding Balance';

  @override
  String get totalAmountPaid => 'Total Amount Paid';

  @override
  String get weeklyContributions => 'Weekly Contributions';

  @override
  String get penalties => 'Penalties';

  @override
  String get specialContributions => 'Special Contributions';

  @override
  String get emergencyContributions => 'Emergency Contributions';

  @override
  String get historicalContributions => 'Historical Contributions';

  // Actions
  @override
  String get save => 'Save';

  @override
  String get cancel => 'Cancel';

  @override
  String get submit => 'Submit';

  @override
  String get tryAgain => 'Try Again';

  @override
  String get done => 'Done';

  @override
  String get close => 'Close';

  @override
  String get back => 'Back';

  // Fields and Statuses
  @override
  String get amount => 'Amount';

  @override
  String get date => 'Date';

  @override
  String get referenceNumber => 'Transaction Reference';

  @override
  String get status => 'Status';

  @override
  String get verified => 'Verified';

  @override
  String get pending => 'Pending';

  @override
  String get requiredField => 'This field is required';

  @override
  String get invalidAmount => 'Please enter a valid amount';

  @override
  String get emptyState => 'No records found';

  // Payment Methods
  @override
  String get telebirr => 'Telebirr';

  @override
  String get cbe => 'CBE Birr';

  @override
  String get bankTransfer => 'Bank Transfer';

  @override
  String get cash => 'Cash (Office)';
}
