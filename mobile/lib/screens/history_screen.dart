import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
import '../services/api_service.dart';
import 'transaction_details_screen.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<dynamic> _allTransactions = [];
  bool _loading = true;

  String _statusFilter = 'ALL'; // ALL, VERIFIED, PENDING, REJECTED
  String _methodFilter = 'ALL'; // ALL, CBE, TELEBIRR, EBIRR, BANK_TRANSFER, CASH

  static const _navy = Color(0xFF091540);
  static const _green = Color(0xFF166534);
  static const _gold = Color(0xFFD97706);

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/payments/my');
      if (mounted && res['data'] != null && res['data'] is List) {
        setState(() {
          _allTransactions = res['data'];
        });
      }
    } catch (_) {}

    // Fallback to dashboard recent payments if empty
    if (_allTransactions.isEmpty) {
      try {
        final dRes = await ApiService.get('/dashboard/member');
        if (mounted && dRes['data']?['recentPayments'] != null) {
          setState(() {
            _allTransactions = dRes['data']['recentPayments'];
          });
        }
      } catch (_) {}
    }

    if (mounted) setState(() => _loading = false);
  }

  List<dynamic> get _filteredTransactions {
    return _allTransactions.where((tx) {
      final status = (tx['status'] ?? 'VERIFIED').toString().toUpperCase();
      final method = (tx['method'] ?? tx['paymentMethod'] ?? '').toString().toUpperCase();

      if (_statusFilter != 'ALL' && !status.contains(_statusFilter)) {
        return false;
      }

      if (_methodFilter != 'ALL') {
        if (_methodFilter == 'CBE' && !method.contains('CBE')) return false;
        if (_methodFilter == 'TELEBIRR' && !method.contains('TELEBIRR')) return false;
        if (_methodFilter == 'EBIRR' && !method.contains('EBIRR')) return false;
        if (_methodFilter == 'BANK' && !method.contains('BANK')) return false;
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    final isDark = context.watch<ThemeProvider>().isDarkMode;
    final transactions = _filteredTransactions;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1419) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          isOm ? 'Seenaa Kaffaltii' : 'Transaction History',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: _navy,
        elevation: 0,
      ),
      body: Column(
        children: [
          // ── Filter Bar ──
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
            child: Column(
              children: [
                // Status Filter Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _statusChip('ALL', isOm ? 'Hunda' : 'All Status'),
                      const SizedBox(width: 6),
                      _statusChip('VERIFIED', isOm ? 'Mirkanaa\'aa' : 'Verified', color: _green),
                      const SizedBox(width: 6),
                      _statusChip('PENDING', isOm ? 'Eeggataa' : 'Pending', color: _gold),
                      const SizedBox(width: 6),
                      _statusChip('REJECTED', isOm ? 'Kufaa' : 'Rejected', color: Colors.red),
                    ],
                  ),
                ),
                const SizedBox(height: 8),

                // Method Filter Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _methodChip('ALL', 'All Methods'),
                      const SizedBox(width: 6),
                      _methodChip('CBE', 'CBE Birr'),
                      const SizedBox(width: 6),
                      _methodChip('TELEBIRR', 'Telebirr'),
                      const SizedBox(width: 6),
                      _methodChip('EBIRR', 'eBirr'),
                      const SizedBox(width: 6),
                      _methodChip('BANK', 'Bank Wire'),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── List of Transactions ──
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: _green))
                : RefreshIndicator(
                    onRefresh: _loadHistory,
                    color: _green,
                    child: transactions.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.history_outlined, size: 64, color: Colors.grey.shade400),
                                const SizedBox(height: 12),
                                Text(
                                  isOm ? 'Kaffaltiin hin argamne' : 'No Transactions Found',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? Colors.grey[300] : Colors.grey[700],
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  isOm ? 'Filtarii jijjiiraa yaalaa' : 'Try adjusting your status/method filters',
                                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: transactions.length,
                            itemBuilder: (context, index) {
                              final tx = transactions[index];
                              final id = tx['id'] ?? '';
                              final amount = tx['amount'] ?? 0;
                              final date = (tx['date'] ?? tx['paymentDate'] ?? '').toString().split('T')[0];
                              final method = tx['method'] ?? tx['paymentMethod'] ?? 'CBE';
                              final status = (tx['status'] ?? 'VERIFIED').toString().toUpperCase();
                              final receiptNo = tx['receiptNumber'] ?? tx['paymentId'] ?? 'REC-${id.toString().substring(0, id.toString().length > 8 ? 8 : id.toString().length)}';
                              final category = tx['obligation'] != null
                                  ? (isOm ? 'Kaffaltii Torbanii' : 'Weekly Contribution')
                                  : (tx['specialContributionObligation'] != null
                                      ? (isOm ? 'Gumaacha Addaa' : 'Special Contribution')
                                      : (isOm ? 'Kaffaltii Waliigalaa' : 'General Contribution'));

                              final isVerified = status == 'VERIFIED';
                              final isPending = status.contains('PEND');

                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.04),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: InkWell(
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) => TransactionDetailsScreen(transaction: tx),
                                      ),
                                    );
                                  },
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.all(8),
                                                decoration: BoxDecoration(
                                                  color: isVerified
                                                      ? Colors.green.shade50
                                                      : (isPending ? Colors.amber.shade50 : Colors.red.shade50),
                                                  shape: BoxShape.circle,
                                                ),
                                                child: Icon(
                                                  isVerified
                                                      ? Icons.check
                                                      : (isPending ? Icons.access_time : Icons.close),
                                                  color: isVerified ? _green : (isPending ? _gold : Colors.red),
                                                  size: 16,
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              Text(
                                                receiptNo,
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 13,
                                                  fontFamily: 'monospace',
                                                ),
                                              ),
                                            ],
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: isVerified
                                                  ? Colors.green.shade50
                                                  : (isPending ? Colors.amber.shade50 : Colors.red.shade50),
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            child: Text(
                                              status,
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: isVerified ? _green : (isPending ? _gold : Colors.red),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const Divider(height: 20),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(category, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                              const SizedBox(height: 2),
                                              Text(
                                                '$date • $method',
                                                style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                                              ),
                                            ],
                                          ),
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.end,
                                            children: [
                                              Text(
                                                '$amount ETB',
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w900,
                                                  fontSize: 16,
                                                  color: _green,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                isOm ? 'Nagahee Ilaali ›' : 'View Receipt ›',
                                                style: const TextStyle(fontSize: 11, color: _navy, fontWeight: FontWeight.bold),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _statusChip(String id, String label, {Color? color}) {
    final isSelected = _statusFilter == id;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isSelected ? Colors.white : Colors.black87)),
      selected: isSelected,
      selectedColor: color ?? _navy,
      backgroundColor: Colors.grey.shade100,
      onSelected: (val) => setState(() => _statusFilter = id),
    );
  }

  Widget _methodChip(String id, String label) {
    final isSelected = _methodFilter == id;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isSelected ? Colors.white : Colors.black87)),
      selected: isSelected,
      selectedColor: _green,
      backgroundColor: Colors.grey.shade100,
      onSelected: (val) => setState(() => _methodFilter = id),
    );
  }
}

extension _ListFilter on List<dynamic> {
  Iterable<dynamic> filter(bool Function(dynamic) predicate) sync* {
    for (var element in this) {
      if (predicate(element)) yield element;
    }
  }
}
