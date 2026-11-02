import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../services/api_service.dart';

class SpecialContributionsScreen extends StatefulWidget {
  const SpecialContributionsScreen({super.key});

  @override
  State<SpecialContributionsScreen> createState() =>
      _SpecialContributionsScreenState();
}

class _SpecialContributionsScreenState
    extends State<SpecialContributionsScreen> {
  List<dynamic> _obligations = [];
  bool _loading = true;

  static const _accent = Color(0xFF0D9488); // teal

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final response = await ApiService.get('/special-contributions/my');
      if (mounted) setState(() => _obligations = response['data'] ?? []);
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  double get _totalPaid {
    return _obligations
        .where((o) => o['status'] == 'PAID')
        .fold(0.0,
            (sum, o) => sum + (num.tryParse(o['amount'].toString()) ?? 0));
  }

  double get _totalPending {
    return _obligations
        .where((o) => o['status'] != 'PAID')
        .fold(0.0,
            (sum, o) => sum + (num.tryParse(o['amount'].toString()) ?? 0));
  }

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
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
                        Color(0xFF0F766E),
                        Color(0xFF0D9488),
                        Color(0xFF14B8A6),
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
                                child: const Icon(Icons.volunteer_activism,
                                    color: Colors.white, size: 22),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                isOm ? 'Gumaacha Addaa' : 'Special Contributions',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 20,
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
                          label: isOm ? 'Eegdaa' : 'Pending',
                          value:
                              '${_totalPending.toStringAsFixed(0)} ETB',
                          icon: Icons.pending_outlined,
                          color: const Color(0xFFF59E0B),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _SummaryCard(
                          label: isOm ? 'Kaffalame' : 'Paid',
                          value: '${_totalPaid.toStringAsFixed(0)} ETB',
                          icon: Icons.check_circle_outline_rounded,
                          color: const Color(0xFF16A34A),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              if (_obligations.isEmpty)
                SliverFillRemaining(
                  child: _EmptyState(
                    icon: Icons.volunteer_activism_outlined,
                    title: isOm ? 'Gumaacha Addaa Hin Jiru' : 'No Special Contributions',
                    subtitle:
                        isOm ? 'Gaaffiin gumaacha addaa asitti mul\'atu.' : 'Special contribution requests will appear here.',
                    color: _accent,
                  ),
                )
              else ...[
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
                  sliver: SliverToBoxAdapter(
                    child: Text(
                      isOm ? '${_obligations.length} gumaacha' : '${_obligations.length} contribution${_obligations.length == 1 ? '' : 's'}',
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
                        final o = _obligations[index];
                        return _ContributionCard(obligation: o);
                      },
                      childCount: _obligations.length,
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
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.04),
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
              color: color.withOpacity(0.1),
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
                    style: const TextStyle(
                        fontSize: 11, color: Colors.grey)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ContributionCard extends StatelessWidget {
  final Map<String, dynamic> obligation;

  const _ContributionCard({required this.obligation});

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    final sc = obligation['specialContribution'];
    final isPaid = obligation['status'] == 'PAID';
    final statusColor = isPaid ? Colors.green.shade600 : Colors.orange.shade600;
    final bgColor =
        isPaid ? Colors.green.shade50 : Colors.orange.shade50;
    final borderColor =
        isPaid ? Colors.green.shade100 : Colors.orange.shade100;

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
                Icons.volunteer_activism,
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
                    sc?['title'] ?? 'Special Contribution',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Row(
                      children: [
                        Text(
                          '${num.tryParse(obligation['amount'].toString())?.toStringAsFixed(0) ?? obligation['amount']} ETB',
                          style: const TextStyle(
                              fontSize: 13,
                              color: Colors.grey,
                              fontWeight: FontWeight.w500),
                        ),
                        if (sc?['type'] != null) ...[
                          const Text('  ·  ',
                              style: TextStyle(color: Colors.grey)),
                          Text(sc!['type'],
                              style: const TextStyle(
                                  fontSize: 12, color: Colors.grey)),
                        ],
                      ],
                    ),
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
                isPaid ? (isOm ? 'Kaffalame' : 'Paid') : (isOm ? obligation['status'] ?? 'Eegdaa' : obligation['status'] ?? 'Pending'),
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
                style:
                    const TextStyle(fontSize: 14, color: Colors.grey),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
