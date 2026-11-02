/// Ethiopian Calendar Converter for Afosha Management System Flutter Mobile App.
/// Matches the exact mathematical conversion rules used by the AMS Backend and Web Frontend.

class EthiopianDate {
  final int year;
  final int month;
  final int day;
  final int hour;
  final int minute;
  final int second;

  const EthiopianDate({
    required this.year,
    required this.month,
    required this.day,
    this.hour = 0,
    this.minute = 0,
    this.second = 0,
  });

  static const List<String> monthsEn = [
    'Meskerem',
    'Tikimt',
    'Hidar',
    'Tahsas',
    'Tir',
    'Yekatit',
    'Megabit',
    'Miazia',
    'Ginbot',
    'Sene',
    'Hamle',
    'Nehase',
    'Pagume',
  ];

  static const List<String> monthsOm = [
    'Fulbaana',
    'Onkololeessa',
    'Sadaasa',
    'Muddee',
    'Amajjii',
    'Guraandhala',
    'Bitootessa',
    'Ebla',
    'Caamsaa',
    'Waxabajjii',
    'Adooleessa',
    'Hagayya',
    'Qaammee',
  ];

  static const List<String> weekdaysEn = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  static const List<String> weekdaysOm = [
    'Wiixata',
    'Kibxata',
    'Roobii',
    'Kamiisa',
    'Jimmata',
    'Sanbata',
    'Dilbata',
  ];

  String get monthNameEn => monthsEn[(month - 1).clamp(0, 12)];
  String get monthNameOm => monthsOm[(month - 1).clamp(0, 12)];

  bool get isLeapYear => year % 4 == 3;
  int get daysInMonth => month == 13 ? (isLeapYear ? 6 : 5) : 30;

  static const int _oneHour = 3600 * 1000;
  static const int _oneDay = 24 * _oneHour;
  static const int _oneYear = 365 * _oneDay;
  static const int _oneLeapYear = 366 * _oneDay;
  static const int _fourYears = 3 * _oneYear + _oneLeapYear;

  /// Difference between European December 9, 2012 and April 1, 2005
  static final int _offset =
      DateTime.utc(2012, 12, 9).millisecondsSinceEpoch -
      DateTime.utc(2005, 4, 1).millisecondsSinceEpoch;

  /// Convert standard Gregorian DateTime to EthiopianDate
  static EthiopianDate fromGregorian(DateTime gregorian) {
    // Correct for Africa/Addis_Ababa timezone (UTC+3)
    final addisTime = gregorian.toUtc().add(const Duration(hours: 3));
    final utcMidnight = DateTime.utc(addisTime.year, addisTime.month, addisTime.day);

    final epochDiff =
        utcMidnight.millisecondsSinceEpoch -
        DateTime.utc(1971, 9, 12).millisecondsSinceEpoch;

    final n = (epochDiff / _fourYears).floor();
    int i = ((epochDiff - n * _fourYears) / _oneYear).floor();
    if (i == 4) i = 3;

    final a = ((epochDiff - n * _fourYears - i * _oneYear) / (30 * _oneDay)).floor();
    final h = ((epochDiff - n * _fourYears - i * _oneYear - a * 30 * _oneDay) / _oneDay).floor();

    return EthiopianDate(
      year: i + 4 * n + 1964,
      month: a + 1,
      day: h + 1,
      hour: addisTime.hour,
      minute: addisTime.minute,
      second: addisTime.second,
    );
  }

  /// Convert this EthiopianDate to Gregorian DateTime
  DateTime toGregorian() {
    final baseEstimate =
        DateTime.utc(year, month, day).millisecondsSinceEpoch + _offset;

    for (int offsetDays = -8; offsetDays <= 8; offsetDays++) {
      final candidate = DateTime.fromMillisecondsSinceEpoch(
        baseEstimate + offsetDays * _oneDay,
        isUtc: true,
      );

      final diff =
          candidate.millisecondsSinceEpoch -
          DateTime.utc(1971, 9, 12).millisecondsSinceEpoch;

      final n = (diff / _fourYears).floor();
      int i = ((diff - n * _fourYears) / _oneYear).floor();
      if (i == 4) i = 3;

      final a = ((diff - n * _fourYears - i * _oneYear) / (30 * _oneDay)).floor();
      final h = ((diff - n * _fourYears - i * _oneYear - a * 30 * _oneDay) / _oneDay).floor();

      if (day == h + 1 && month == a + 1) {
        return candidate;
      }
    }

    // Fallback approximation
    return DateTime.utc(year + 7, month + 8, day);
  }

  /// Format as localized string (e.g. "24 Onkololeessa 2019" or "24 Tikimt 2019")
  String format({String language = 'om', bool includeDual = false}) {
    final mName = language == 'en' ? monthNameEn : monthNameOm;
    final primary = '$day $mName $year';
    if (includeDual) {
      final g = toGregorian();
      final gStr = '${g.day.toString().padLeft(2, '0')}/${g.month.toString().padLeft(2, '0')}/${g.year}';
      return '$primary ($gStr)';
    }
    return primary;
  }

  @override
  String toString() => '$day $monthNameEn $year';
}
