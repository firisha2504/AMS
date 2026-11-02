import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
import '../providers/auth_provider.dart';
import 'payment_flow_models.dart';
import 'payment_processing_screen.dart';

class PaymentConfirmationScreen extends StatefulWidget {
  final PaymentBreakdown breakdown;
  final PaymentMethodOption selectedMethod;
  final double confirmedAmount;

  const PaymentConfirmationScreen({
    super.key,
    required this.breakdown,
    required this.selectedMethod,
    required this.confirmedAmount,
  });

  @override
  State<PaymentConfirmationScreen> createState() => _PaymentConfirmationScreenState();
}

class _PaymentConfirmationScreenState extends State<PaymentConfirmationScreen> {
  final TextEditingController _refController = TextEditingController();

  static const _navy = Color(0xFF091540);
  static const _green = Color(0xFF166534);
  static const _gold = Color(0xFFD97706);

  @override
  void dispose() {
    _refController.dispose();
    super.dispose();
  }

  void _onConfirmAndPay() {
    final isOm = context.read<LocaleProvider>().locale.languageCode == 'om';
    final ref = _refController.text.trim();

    if (ref.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isOm ? 'Lakk. ragaa kaffaltii (Reference/SMS) galchaa' : 'Please enter the transaction reference / SMS code'),
        ),
      );
      return;
    }

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => PaymentProcessingScreen(
          breakdown: widget.breakdown,
          selectedMethod: widget.selectedMethod,
          amount: widget.confirmedAmount,
          transactionReference: ref,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    final isDark = context.watch<ThemeProvider>().isDarkMode;
    final user = context.watch<AuthProvider>().user;
    final memberName = user?.member?['fullName'] ?? user?.fullName ?? (isOm ? 'Miseensa' : 'Member');
    final memberId = user?.member?['memberId'] ?? '';

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1419) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(isOm ? 'Mirkaneessa Kaffaltii' : 'Payment Confirmation'),
        backgroundColor: _navy,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header review card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: isDark ? Colors.grey.shade800 : Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 3)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isOm ? 'Gabaasa Kaffaltii' : 'Payment Summary',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _green.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          isOm ? 'Qophii' : 'Pending Verification',
                          style: const TextStyle(color: _green, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  _row(isOm ? 'Miseensa:' : 'Member:', '$memberName ($memberId)'),
                  const SizedBox(height: 8),
                  _row(isOm ? 'Gosa Kaffaltii:' : 'Category:', isOm ? widget.breakdown.titleOm : widget.breakdown.titleEn),
                  const SizedBox(height: 8),
                  _row(isOm ? 'Mala:' : 'Provider:', '${widget.selectedMethod.icon} ${widget.selectedMethod.nameEn}'),
                  const SizedBox(height: 8),
                  _row(isOm ? 'Lakk. Herregaa:' : 'Account #:', widget.selectedMethod.accountNumber),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isOm ? 'Hanga Mirkanaa\'u:' : 'Total to Confirm:',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      Text(
                        '${widget.confirmedAmount.toStringAsFixed(0)} ETB',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: _green),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Transaction Reference Input
            Text(
              isOm ? 'Lakkoofsa Ragaa Kaffaltii (Transaction Reference)' : 'Transaction Reference / Receipt Code',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: isDark ? Colors.white : Colors.black87),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _refController,
              decoration: InputDecoration(
                hintText: isOm ? 'Fkn: CBE12345678 ykn TEL9876543' : 'e.g. CBE12345678 or TEL9876543',
                prefixIcon: const Icon(Icons.confirmation_number_outlined, color: _green),
                filled: true,
                fillColor: isDark ? const Color(0xFF1A1F2E) : Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
            const SizedBox(height: 12),

            // Policy Notice
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.shield_outlined, color: Colors.amber.shade900, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      isOm
                          ? 'Kaffaltiin kun eega qorannoo herregaa (Audit Verification) dhaan mirkanaa\'ee nagaheen seera qabeessi ni kennama.'
                          : 'Transactions are audited securely and reconciled with the general ledger before final confirmation.',
                      style: TextStyle(fontSize: 11, color: Colors.amber.shade900, height: 1.3),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Confirm & Submit Button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _green,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 2,
                ),
                icon: const Icon(Icons.check_circle, color: Colors.white),
                label: Text(
                  isOm ? 'Mirkaneessi fi Galchi' : 'Confirm & Submit Payment',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                onPressed: _onConfirmAndPay,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
