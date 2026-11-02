import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
import '../services/api_service.dart';

class ContributionsScreen extends StatefulWidget {
  const ContributionsScreen({super.key});

  @override
  State<ContributionsScreen> createState() => _ContributionsScreenState();
}

class _ContributionsScreenState extends State<ContributionsScreen> {
  List<dynamic> _payments = [];
  bool _loading = true;

  static const _accent = Color(0xFF166534);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final response = await ApiService.get('/payments/my');
      if (mounted) setState(() => _payments = response['data'] ?? []);
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  double get _totalVerified {
    return _payments
        .where((p) => p['status'] == 'VERIFIED')
        .fold(0.0, (sum, p) => sum + (num.tryParse(p['amount'].toString()) ?? 0));
  }

  double get _totalPending {
    return _payments
        .where((p) => p['status'] != 'VERIFIED')
        .fold(0.0, (sum, p) => sum + (num.tryParse(p['amount'].toString()) ?? 0));
  }

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    final isDark = context.watch<ThemeProvider>().isDarkMode;
    
    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1419) : const Color(0xFFF8FAFC),
      body: RefreshIndicator(
        onRefresh: _load,
        color: _accent,
        child: CustomScrollView(
          slivers: [
            // ── Header ──
            SliverAppBar(
              expandedHeight: 140,
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
                        Color(0xFF166534),
                        Color(0xFF15803D),
                      ],
                    ),
                  ),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
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
                                child: const Icon(Icons.payments_outlined,
                                    color: Colors.white, size: 22),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                isOm ? 'Kaffaltii' : 'Payments',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold),
                              ),
                            ],
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
                child: Center(child: CircularProgressIndicator()),
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
                          label: isOm ? 'Mirkaneeffame' : 'Verified',
                          value: '${_totalVerified.toStringAsFixed(0)} ETB',
                          icon: Icons.check_circle_outline_rounded,
                          color: const Color(0xFF16A34A),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _SummaryCard(
                          label: isOm ? 'Eegdaa' : 'Pending',
                          value: '${_totalPending.toStringAsFixed(0)} ETB',
                          icon: Icons.pending_outlined,
                          color: const Color(0xFFF59E0B),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              if (_payments.isEmpty)
                SliverFillRemaining(
                  child: _EmptyState(
                    icon: Icons.payment_outlined,
                    title: isOm ? 'Kaffaltiin Amma Hin Jiru' : 'No Contributions Yet',
                    subtitle: isOm ? 'Seenaa gumaacha torbanicha\nasitti mul\'atu.' : 'Your weekly contribution history\nwill appear here.',
                    color: _accent,
                  ),
                )
              else ...[
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
                  sliver: SliverToBoxAdapter(
                    child: Text(
                      isOm ? '${_payments.length} kaffaltii' : '${_payments.length} payment${_payments.length == 1 ? '' : 's'}',
                      style: const TextStyle(
                          fontSize: 13,
                          color: Colors.grey,
                          fontWeight: FontWeight.w500),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final p = _payments[index];
                        return _PaymentCard(payment: p);
                      },
                      childCount: _payments.length,
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

// ── Sub-widgets ───────────────────────────────────────────────────────────────

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
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, _) {
        final isDark = themeProvider.isDarkMode;
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? const Color(0xFF2D3748) : Colors.grey.shade100,
            ),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2))
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withOpacity(isDark ? 0.15 : 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(value,
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                            color: color)),
                    Text(label,
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? Colors.grey.shade500 : Colors.grey,
                        )),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _PaymentCard extends StatelessWidget {
  final Map<String, dynamic> payment;

  const _PaymentCard({required this.payment});

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    final isDark = context.watch<ThemeProvider>().isDarkMode;
    final isVerified = payment['status'] == 'VERIFIED';
    final statusColor =
        isVerified ? Colors.green.shade600 : Colors.orange.shade600;
    final bgColor = isDark
        ? (isVerified ? Colors.green.shade900 : Colors.orange.shade900)
        : (isVerified ? Colors.green.shade50 : Colors.orange.shade50);
    final borderColor = isDark
        ? (isVerified ? Colors.green.shade700 : Colors.orange.shade700)
        : (isVerified ? Colors.green.shade100 : Colors.orange.shade100);

    // Format date
    String dateStr = payment['paymentDate'] ?? payment['createdAt'] ?? '';
    try {
      if (dateStr.isNotEmpty) {
        final dt = DateTime.parse(dateStr).toLocal();
        dateStr = '${dt.day}/${dt.month}/${dt.year}';
      }
    } catch (_) {}

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
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
                isVerified
                    ? Icons.check_circle_rounded
                    : Icons.hourglass_empty_rounded,
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
                    '${num.tryParse(payment['amount'].toString())?.toStringAsFixed(0) ?? payment['amount']} ETB',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: isDark ? const Color(0xFFE5E7EB) : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      if (payment['paymentMethod'] != null) ...[
                        const Icon(Icons.credit_card_outlined,
                            size: 11, color: Colors.grey),
                        const SizedBox(width: 3),
                        Text(payment['paymentMethod'],
                            style: const TextStyle(
                                fontSize: 12, color: Colors.grey)),
                      ],
                      if (dateStr.isNotEmpty) ...[
                        const Text('  ·  ',
                            style: TextStyle(color: Colors.grey)),
                        const Icon(Icons.calendar_today_outlined,
                            size: 11, color: Colors.grey),
                        const SizedBox(width: 3),
                        Text(dateStr,
                            style: const TextStyle(
                                fontSize: 12, color: Colors.grey)),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: borderColor),
              ),
              child: Text(
                isVerified ? (isOm ? 'Mirkaneeffame' : 'Verified') : (isOm ? payment['status'] ?? 'Eegdaa' : payment['status'] ?? 'Pending'),
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: statusColor),
              ),
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
