import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import 'payment_flow_models.dart';
import 'select_payment_method_screen.dart';

class PaymentFailureScreen extends StatelessWidget {
  final String errorMessage;
  final PaymentBreakdown breakdown;

  const PaymentFailureScreen({
    super.key,
    required this.errorMessage,
    required this.breakdown,
  });

  static const _navy = Color(0xFF091540);

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
                  color: Colors.red.shade50,
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.cancel_outlined, size: 64, color: Colors.red.shade600),
              ),
              const SizedBox(height: 24),
              Text(
                isOm ? 'Kaffaltiin Hin Milkoofne' : 'Payment Failed',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: _navy),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Text(
                  errorMessage,
                  style: TextStyle(fontSize: 12, color: Colors.red.shade800),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                isOm
                    ? 'Maallaqni herrega keessan irraa hin hir\'anne. Irra deebi\'aa yaalaa.'
                    : 'Your balance was not deducted. Please verify your reference details and try again.',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _navy,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.refresh, color: Colors.white),
                  label: Text(
                    isOm ? 'Irra Deebii Yaali' : 'Try Again',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  onPressed: () {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (context) => SelectPaymentMethodScreen(breakdown: breakdown),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: TextButton(
                  onPressed: () => Navigator.popUntil(context, (r) => r.isFirst),
                  child: Text(
                    isOm ? 'Dhiisi' : 'Cancel',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
