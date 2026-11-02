import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import 'transaction_details_screen.dart';

class PaymentSuccessScreen extends StatelessWidget {
  final String referenceNumber;
  final double amount;
  final String methodName;
  final String category;

  const PaymentSuccessScreen({
    super.key,
    required this.referenceNumber,
    required this.amount,
    required this.methodName,
    required this.category,
  });

  static const _navy = Color(0xFF091540);
  static const _green = Color(0xFF166534);
  static const _gold = Color(0xFFD97706);

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle, size: 64, color: _green),
              ),
              const SizedBox(height: 24),
              Text(
                isOm ? 'Kaffaltiin Milkaa\'inaan Galmaa\'eera!' : 'Payment Submitted Successfully!',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: _navy),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                isOm
                    ? 'Gaaffiin kaffaltii keessanii sirnaan galmaa\'ee qorataan mirkaneessaa jira.'
                    : 'Your payment request has been logged and queued for audit verification.',
                style: const TextStyle(fontSize: 13, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),

              // Details card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    _itemRow(isOm ? 'Lakkoofsa Ragaa:' : 'Reference No:', referenceNumber, isBold: true),
                    const Divider(height: 16),
                    _itemRow(isOm ? 'Hanga Kaffalame:' : 'Amount Paid:', '${amount.toStringAsFixed(0)} ETB', isHighlight: true),
                    const Divider(height: 16),
                    _itemRow(isOm ? 'Mala Kaffaltii:' : 'Provider:', methodName),
                    const Divider(height: 16),
                    _itemRow(isOm ? 'Gosa Kaffaltii:' : 'Category:', category),
                    const Divider(height: 16),
                    _itemRow(isOm ? 'Haala:' : 'Status:', isOm ? 'Mirkaneessa Eegaa Jira' : 'Pending Verification', statusColor: _gold),
                  ],
                ),
              ),

              const Spacer(),

              // View receipt button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: _green, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.receipt_long, color: _green),
                  label: Text(
                    isOm ? 'Nagahee Dijitaalaa Ilaali' : 'View Digital Receipt',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: _green),
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => TransactionDetailsScreen(
                          transaction: {
                            'receiptNumber': referenceNumber,
                            'amount': amount,
                            'method': methodName,
                            'date': DateTime.now().toString(),
                            'status': 'PENDING_VERIFIED',
                          },
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),

              // Return button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _navy,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    Navigator.popUntil(context, (route) => route.isFirst);
                  },
                  child: Text(
                    isOm ? 'Gara Fuula Duraatti Deebi\'i' : 'Return to Home',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _itemRow(String label, String value, {bool isBold = false, bool isHighlight = false, Color? statusColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        Text(
          value,
          style: TextStyle(
            fontSize: isHighlight ? 16 : 12,
            fontWeight: isBold || isHighlight ? FontWeight.bold : FontWeight.w500,
            color: statusColor ?? (isHighlight ? _green : Colors.black87),
          ),
        ),
      ],
    );
  }
}
