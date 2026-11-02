import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';

class TransactionDetailsScreen extends StatelessWidget {
  final Map<String, dynamic> transaction;

  const TransactionDetailsScreen({
    super.key,
    required this.transaction,
  });

  static const _navy = Color(0xFF091540);
  static const _green = Color(0xFF166534);
  static const _gold = Color(0xFFD97706);

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    final isDark = context.watch<ThemeProvider>().isDarkMode;

    final id = transaction['id'] ?? '';
    final receiptNo = transaction['receiptNumber'] ?? transaction['paymentId'] ?? 'REC-${id.toString().substring(0, id.toString().length > 8 ? 8 : id.toString().length)}';
    final amount = transaction['amount'] ?? 0;
    final date = (transaction['date'] ?? transaction['paymentDate'] ?? '').toString().split('T')[0];
    final method = transaction['method'] ?? transaction['paymentMethod'] ?? 'CBE';
    final status = transaction['status'] ?? 'VERIFIED';
    final memberName = transaction['member']?['fullName'] ?? transaction['memberName'] ?? 'Member';
    final memberId = transaction['member']?['memberId'] ?? transaction['memberId'] ?? '';
    final category = transaction['obligation'] != null
        ? (isOm ? 'Kaffaltii Torbanii' : 'Weekly Contribution')
        : (transaction['specialContributionObligation'] != null
            ? (isOm ? 'Gumaacha Addaa' : 'Special Contribution')
            : (isOm ? 'Kaffaltii Waliigalaa' : 'General Contribution'));

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1419) : const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: Text(isOm ? 'Nagahee Dijitaalaa' : 'Digital Receipt'),
        backgroundColor: _navy,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.copy, size: 20),
            tooltip: 'Copy details',
            onPressed: () {
              Clipboard.setData(ClipboardData(
                text: 'AFOSHA RECEIPT\nReceipt: $receiptNo\nMember: $memberName ($memberId)\nAmount: $amount ETB\nDate: $date\nStatus: $status',
              ));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: _green,
                  content: Text(isOm ? 'Ragaan nagahee koppii ta\'eera' : 'Receipt copied to clipboard'),
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 480),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
              border: Border.all(
                color: isDark ? Colors.grey.shade800 : Colors.grey.shade200,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Seal / Logo Header
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: _green.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.verified, color: _green, size: 32),
                ),
                const SizedBox(height: 12),
                const Text(
                  'AFOSHA MANAGEMENT SYSTEM',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                    color: _navy,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 2),
                const Text(
                  'Gamtaan dargaggoota Melka Jabdu Qaxaa Araati',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey),
                  textAlign: TextAlign.center,
                ),
                const Text(
                  '"Tokkummaan Ciminaa fi Milkaayina"',
                  style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: _gold, fontWeight: FontWeight.w500),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),

                // Receipt Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: Text(
                    receiptNo,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'monospace',
                      color: _navy,
                    ),
                  ),
                ),

                const Divider(height: 32),

                // Main Amount Highlight
                Text(
                  isOm ? 'Hanga Kaffalame' : 'Amount Paid',
                  style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 4),
                Text(
                  '$amount ETB',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: _green,
                  ),
                ),

                const SizedBox(height: 24),

                // Key-value grid
                _infoRow(isOm ? 'Maqaa Miseensaa:' : 'Member Name:', memberName),
                const SizedBox(height: 10),
                _infoRow(isOm ? 'Eenyummeessaa:' : 'Member ID:', memberId),
                const SizedBox(height: 10),
                _infoRow(isOm ? 'Gosa Kaffaltii:' : 'Category:', category),
                const SizedBox(height: 10),
                _infoRow(isOm ? 'Mala Kaffaltii:' : 'Payment Method:', method),
                const SizedBox(height: 10),
                _infoRow(isOm ? 'Guyyaa:' : 'Payment Date:', date),
                const SizedBox(height: 10),
                _infoRow(
                  isOm ? 'Haala:' : 'Transaction Status:',
                  status,
                  statusColor: status == 'VERIFIED'
                      ? _green
                      : (status == 'PENDING' ? _gold : Colors.red),
                ),

                const Divider(height: 32),

                // Auditor confirmation badge
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.shield_outlined, color: _green, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          isOm
                              ? 'Nagaheen kun ragaa qabatamaa herrega gamtaatiin mirkanaa\'eera.'
                              : 'Official verified transaction registered on the Afosha general ledger.',
                          style: const TextStyle(fontSize: 11, color: _green, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Done button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _navy,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => Navigator.pop(context),
                    child: Text(
                      isOm ? 'Deebi\'i' : 'Done',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value, {Color? statusColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500)),
        Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: statusColor ?? Colors.black87,
          ),
        ),
      ],
    );
  }
}
