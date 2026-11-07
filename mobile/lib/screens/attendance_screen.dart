import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
import '../services/api_service.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  List<dynamic> _records = [];
  int _percentage = 0;
  bool _loading = true;

  static const _accent = Color(0xFF16A34A); // green

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      // First attempt dedicated /attendance/my endpoint
      final response = await ApiService.get('/attendance/my');
      if (mounted && response['data'] != null) {
        setState(() {
          _records = response['data']?['records'] ?? [];
          _percentage = response['data']?['attendancePercentage'] ??
              response['data']?['stats']?['attendancePercentage'] ??
              0;
        });
      }
    } catch (_) {
      // Fallback to /finance/attendance/my
      try {
        final fallback = await ApiService.get('/finance/attendance/my');
        if (mounted && fallback['data'] != null) {
          setState(() {
            _records = fallback['data']?['records'] ?? [];
            _percentage = fallback['data']?['attendancePercentage'] ?? 0;
          });
        }
      } catch (_) {}
    }
    if (mounted) setState(() => _loading = false);
  }

  int get _presentCount =>
      _records.where((r) => r['status'] == 'PRESENT').length;
  int get _lateCount =>
      _records.where((r) => r['status'] == 'LATE').length;
  int get _absentCount =>
      _records.where((r) => r['status'] == 'ABSENT').length;
  int get _excusedCount =>
      _records.where((r) => r['status'] == 'EXCUSED').length;

  Future<void> _showScanDialog(BuildContext context, bool isOm) async {
    final tokenController = TextEditingController();
    bool isSubmitting = false;
    String? errorMessage;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              top: 24,
              left: 20,
              right: 20,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: _accent.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.qr_code_scanner_rounded,
                          color: _accent, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isOm
                              ? 'Hirmaannaa Koodii QR'
                              : 'QR Attendance Check-in',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            isOm
                              ? 'Koodii walga\'ii iskiriinii irratti mul\'atu galchaa'
                              : 'Enter session token or scan attendance payload',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                if (errorMessage != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.error_outline_rounded,
                            color: Colors.red.shade700, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            errorMessage!,
                            style: TextStyle(
                              color: Colors.red.shade700,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                TextField(
                  controller: tokenController,
                  autofocus: true,
                  style: const TextStyle(fontSize: 14, fontFamily: 'monospace'),
                  decoration: InputDecoration(
                    hintText: isOm
                        ? 'Token koodii QR asitti barreessaa...'
                        : 'Paste QR token or scan string here...',
                    hintStyle: const TextStyle(fontSize: 13, color: Colors.grey),
                    prefixIcon: const Icon(Icons.vpn_key_outlined, size: 20),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.content_paste_rounded, size: 20),
                      tooltip: 'Paste',
                      onPressed: () async {
                        final data = await Clipboard.getData(Clipboard.kTextPlain);
                        if (data?.text != null) {
                          tokenController.text = data!.text!.trim();
                          setModalState(() {});
                        }
                      },
                    ),
                    filled: true,
                    fillColor: Colors.grey.shade50,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.grey.shade300),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.grey.shade300),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: _accent, width: 2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final text = tokenController.text.trim();
                          if (text.isEmpty) {
                            setModalState(() {
                              errorMessage = isOm
                                  ? 'Mee koodii QR ykn token galchaa'
                                  : 'Please enter attendance token';
                            });
                            return;
                          }

                          setModalState(() {
                            isSubmitting = true;
                            errorMessage = null;
                          });

                          try {
                            final res = await ApiService.post('/attendance/scan', {
                              'token': text,
                            });

                            if (mounted) {
                              Navigator.pop(ctx);
                              _showSuccessDialog(context, res['data'], isOm);
                              _load();
                            }
                          } catch (e) {
                            setModalState(() {
                              isSubmitting = false;
                              errorMessage = e.toString().replaceAll('Exception: ', '');
                            });
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _accent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  child: isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : Text(
                          isOm ? 'Hirmaannaa Mirkaneessi' : 'Confirm Check-In',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showSuccessDialog(
      BuildContext context, Map<String, dynamic>? data, bool isOm) {
    final status = data?['status'] ?? 'PRESENT';
    final meetingTitle = data?['meetingTitle'] ?? 'Melka Jabdu Assembly';
    final isLate = status == 'LATE';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: isLate ? Colors.amber.shade50 : Colors.green.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(
                isLate ? Icons.access_time_rounded : Icons.check_circle_rounded,
                color: isLate ? Colors.amber.shade700 : Colors.green.shade600,
                size: 38,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              isOm ? 'Hirmaannaan Galmaa\'eera!' : 'Check-In Successful!',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              meetingTitle,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade700,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: isLate ? Colors.amber.shade50 : Colors.green.shade50,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isLate ? Colors.amber.shade200 : Colors.green.shade200,
                ),
              ),
              child: Text(
                status,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isLate ? Colors.amber.shade800 : Colors.green.shade700,
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              isOm
                  ? 'Hirmaannaan keessan nagahee fi sirnaan galmaa\'eera. Galatoomaa!'
                  : 'Your attendance record has been cryptographically verified.',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _accent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(isOm ? 'Tole' : 'Done'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    final isDark = context.watch<ThemeProvider>().isDarkMode;

    return Scaffold(
      backgroundColor:
          isDark ? const Color(0xFF0F1419) : const Color(0xFFF8FAFC),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showScanDialog(context, isOm),
        backgroundColor: _accent,
        foregroundColor: Colors.white,
        elevation: 3,
        icon: const Icon(Icons.qr_code_scanner_rounded, size: 22),
        label: Text(
          isOm ? 'Koodii QR Scan' : 'Scan QR Code',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: _accent,
        child: CustomScrollView(
          slivers: [
            // ── Header ──
            SliverAppBar(
              expandedHeight: 200,
              pinned: true,
              backgroundColor: _accent,
              automaticallyImplyLeading: false,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Color(0xFF14532D),
                        Color(0xFF16A34A),
                        Color(0xFF22C55E),
                      ],
                    ),
                  ),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.how_to_reg_outlined,
                                    color: Colors.white, size: 22),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                isOm ? 'Argamnaa Walga\'ii' : 'Attendance',
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          // ── Rate indicator ──
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '$_percentage%',
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 42,
                                    fontWeight: FontWeight.w800,
                                    height: 1),
                              ),
                              const SizedBox(width: 10),
                              Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Text(
                                  isOm ? 'Dhibbeentaa Argamnaa' : 'Attendance Rate',
                                  style: const TextStyle(
                                      color: Colors.white70, fontSize: 14),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          // ── Progress bar ──
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: _percentage / 100,
                              backgroundColor: Colors.white.withOpacity(0.25),
                              valueColor: const AlwaysStoppedAnimation<Color>(
                                  Colors.white),
                              minHeight: 6,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),

            if (_loading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator(color: _accent)),
              )
            else ...[
              // ── Summary Cards ──
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: Row(
                    children: [
                      Expanded(
                        child: _SummaryCard(
                          label: isOm ? 'Argame' : 'Present',
                          value: '$_presentCount',
                          icon: Icons.check_circle_outline_rounded,
                          color: _accent,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _SummaryCard(
                          label: isOm ? 'Ture' : 'Late',
                          value: '$_lateCount',
                          icon: Icons.schedule_outlined,
                          color: Colors.amber.shade700,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _SummaryCard(
                          label: isOm ? 'Hafaniiru' : 'Absent',
                          value: '$_absentCount',
                          icon: Icons.cancel_outlined,
                          color: const Color(0xFFDC2626),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _SummaryCard(
                          label: isOm ? 'Eeyyama' : 'Excused',
                          value: '$_excusedCount',
                          icon: Icons.help_outline_rounded,
                          color: Colors.indigo.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              if (_records.isEmpty)
                SliverFillRemaining(
                  child: _EmptyState(
                    icon: Icons.event_busy_outlined,
                    title: isOm
                        ? 'Galmee Argamnaa Hin Jiru'
                        : 'No Attendance Records',
                    subtitle: isOm
                        ? 'Koodii QR scan gochuun hirmaannaa keessan galmeessaa.'
                        : 'Tap "Scan QR Code" below to check in to an active meeting.',
                    color: _accent,
                  ),
                )
              else ...[
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
                  sliver: SliverToBoxAdapter(
                    child: Text(
                      isOm
                          ? '${_records.length} walga\'ii galmaa\'e'
                          : '${_records.length} meeting record${_records.length == 1 ? '' : 's'}',
                      style: const TextStyle(
                          fontSize: 13,
                          color: Colors.grey,
                          fontWeight: FontWeight.w500),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final r = _records[index];
                        return _AttendanceCard(record: r);
                      },
                      childCount: _records.length,
                    ),
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

// ── Sub-widgets ─────────────────────────────────────────────────────────────

class _SummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _SummaryCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 6,
              offset: const Offset(0, 2))
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(height: 6),
          Text(value,
              style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: color)),
          Text(label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10, color: Colors.grey)),
        ],
      ),
    );
  }
}

class _AttendanceCard extends StatelessWidget {
  final Map<String, dynamic> record;

  const _AttendanceCard({required this.record});

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    final meeting = record['meeting'];
    final status = record['status'] ?? 'PRESENT';
    final source = record['source'] ?? 'QR';

    Color statusColor;
    Color bgColor;
    Color borderColor;
    IconData statusIcon;
    String statusLabel;

    switch (status) {
      case 'PRESENT':
        statusColor = Colors.green.shade600;
        bgColor = Colors.green.shade50;
        borderColor = Colors.green.shade100;
        statusIcon = Icons.check_circle_rounded;
        statusLabel = isOm ? 'Argame' : 'Present';
        break;
      case 'LATE':
        statusColor = Colors.amber.shade800;
        bgColor = Colors.amber.shade50;
        borderColor = Colors.amber.shade100;
        statusIcon = Icons.schedule_rounded;
        statusLabel = isOm ? 'Ture' : 'Late';
        break;
      case 'EXCUSED':
        statusColor = Colors.indigo.shade600;
        bgColor = Colors.indigo.shade50;
        borderColor = Colors.indigo.shade100;
        statusIcon = Icons.help_outline_rounded;
        statusLabel = isOm ? 'Eeyyama' : 'Excused';
        break;
      default:
        statusColor = Colors.red.shade600;
        bgColor = Colors.red.shade50;
        borderColor = Colors.red.shade100;
        statusIcon = Icons.cancel_rounded;
        statusLabel = isOm ? 'Hin Argamne' : 'Absent';
    }

    // Format Ethiopian or Gregorian date
    String dateStr = meeting?['ethiopianDate'] ?? '';
    if (dateStr.isEmpty) {
      final gDate = meeting?['meetingDate'] ?? '';
      try {
        if (gDate.isNotEmpty) {
          final dt = DateTime.parse(gDate);
          dateStr = '${dt.day}/${dt.month}/${dt.year}';
        }
      } catch (_) {}
    }

    final locationStr = meeting?['location'] ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2))
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                statusIcon,
                color: statusColor,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    meeting?['title'] ?? 'Melka Jabdu Meeting',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      if (dateStr.isNotEmpty) ...[
                        const Icon(Icons.calendar_today_outlined,
                            size: 11, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(dateStr,
                            style: const TextStyle(
                                fontSize: 11, color: Colors.grey)),
                        const SizedBox(width: 10),
                      ],
                      if (locationStr.isNotEmpty) ...[
                        const Icon(Icons.location_on_outlined,
                            size: 11, color: Colors.grey),
                        const SizedBox(width: 2),
                        Flexible(
                          child: Text(
                            locationStr,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 11, color: Colors.grey),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: borderColor),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: statusColor),
                  ),
                ),
                if (source == 'QR')
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'QR Code',
                      style: TextStyle(
                        fontSize: 9,
                        color: Colors.grey.shade400,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: color.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color.withOpacity(0.6), size: 36),
            ),
            const SizedBox(height: 20),
            Text(title,
                style: const TextStyle(
                    fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(subtitle,
                style: const TextStyle(fontSize: 14, color: Colors.grey),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
