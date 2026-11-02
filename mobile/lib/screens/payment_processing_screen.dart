import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../services/api_service.dart';
import 'payment_flow_models.dart';
import 'payment_success_screen.dart';
import 'payment_failure_screen.dart';

class PaymentProcessingScreen extends StatefulWidget {
  final PaymentBreakdown breakdown;
  final PaymentMethodOption selectedMethod;
  final double amount;
  final String transactionReference;

  const PaymentProcessingScreen({
    super.key,
    required this.breakdown,
    required this.selectedMethod,
    required this.amount,
    required this.transactionReference,
  });

  @override
  State<PaymentProcessingScreen> createState() => _PaymentProcessingScreenState();
}

class _PaymentProcessingScreenState extends State<PaymentProcessingScreen> {
  String _statusMessage = 'Initiating payment request...';
  int _step = 1;

  static const _navy = Color(0xFF091540);
  static const _green = Color(0xFF166534);
  static const _gold = Color(0xFFD97706);

  @override
  void initState() {
    super.initState();
    _processPayment();
  }

  Future<void> _processPayment() async {
    final isOm = context.read<LocaleProvider>().locale.languageCode == 'om';

    try {
      // Step 1: Create Payment Request
      setState(() {
        _statusMessage = isOm ? 'Gaaffii kaffaltii qopheessaa jira...' : 'Initiating payment request...';
        _step = 1;
      });
      await Future.delayed(const Duration(milliseconds: 600));

      final createRes = await ApiService.post('/payment-requests', {
        'amount': widget.amount,
        'paymentProvider': widget.selectedMethod.id,
        if (widget.breakdown.obligationId != null) 'obligationId': widget.breakdown.obligationId,
        if (widget.breakdown.specialContributionObligationId != null)
          'specialContributionObligationId': widget.breakdown.specialContributionObligationId,
      });

      final requestId = createRes['data']?['id'];
      final referenceNumber = createRes['data']?['referenceNumber'] ?? widget.transactionReference;

      // Step 2: Submit Reference
      setState(() {
        _statusMessage = isOm ? 'Ragaa kaffaltii mirkaneessaa jira...' : 'Submitting transaction reference...';
        _step = 2;
      });
      await Future.delayed(const Duration(milliseconds: 700));

      if (requestId != null) {
        await ApiService.post('/payment-requests/$requestId/submit', {
          'transactionReference': widget.transactionReference,
        });
      }

      // Step 3: Success
      setState(() {
        _statusMessage = isOm ? 'Kaffaltiin milkaa\'eera!' : 'Payment recorded successfully!';
        _step = 3;
      });
      await Future.delayed(const Duration(milliseconds: 500));

      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => PaymentSuccessScreen(
            referenceNumber: referenceNumber,
            amount: widget.amount,
            methodName: widget.selectedMethod.nameEn,
            category: isOm ? widget.breakdown.titleOm : widget.breakdown.titleEn,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => PaymentFailureScreen(
            errorMessage: e.toString(),
            breakdown: widget.breakdown,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _navy,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 100,
                      height: 100,
                      child: CircularProgressIndicator(
                        valueColor: const AlwaysStoppedAnimation<Color>(_green),
                        strokeWidth: 4,
                        backgroundColor: Colors.white.withOpacity(0.1),
                      ),
                    ),
                    const Icon(Icons.shield_outlined, color: _gold, size: 40),
                  ],
                ),
                const SizedBox(height: 32),
                Text(
                  _statusMessage,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  'Step $_step of 3',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Connecting securely to Afosha Financial Engine',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.4),
                    fontSize: 11,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
