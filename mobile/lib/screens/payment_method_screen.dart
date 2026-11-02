import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
import '../services/api_service.dart';
import 'payment_instructions_screen.dart';

class PaymentMethodScreen extends StatefulWidget {
  final Map<String, dynamic> obligation;

  const PaymentMethodScreen({
    required this.obligation,
    super.key,
  });

  @override
  State<PaymentMethodScreen> createState() => _PaymentMethodScreenState();
}

class _PaymentMethodScreenState extends State<PaymentMethodScreen> {
  String? _selectedMethod;
  bool _creating = false;

  static const _accent = Color(0xFF166534);

  final List<Map<String, String>> _paymentMethods = [
    {
      'id': 'M_PESA',
      'name': 'M-Pesa',
      'icon': '📱',
      'description': 'Send money via M-Pesa mobile money',
    },
    {
      'id': 'TELEBIRR',
      'name': 'Telebirr',
      'icon': '📲',
      'description': 'Ethio Telecom mobile money service',
    },
    {
      'id': 'CBE',
      'name': 'CBE Birr',
      'icon': '🏦',
      'description': 'Commercial Bank of Ethiopia transfer',
    },
    {
      'id': 'EBIRR',
      'name': 'eBirr',
      'icon': '💳',
      'description': 'National digital wallet service',
    },
  ];

  Future<void> _createPaymentRequest() async {
    if (_selectedMethod == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a payment method')),
      );
      return;
    }

    setState(() => _creating = true);

    try {
      final response = await ApiService.post(
        '/payment-requests',
        {
          'amount': widget.obligation['totalDue'],
          'paymentProvider': _selectedMethod,
          'obligationId': widget.obligation['id'],
        },
      );

      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => PaymentInstructionsScreen(
              paymentRequest: response['data'],
              method: _selectedMethod!,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }

    if (mounted) setState(() => _creating = false);
  }

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    final isDark = context.watch<ThemeProvider>().isDarkMode;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1419) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: _accent,
        title: Text(isOm ? 'Mala Kaffaltii Filadhu' : 'Select Payment Method'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Amount summary
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
                  border: Border.all(
                    color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isOm ? 'Waliigalaa Kaffaltii' : 'Payment Amount',
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${widget.obligation['totalDue']} ETB',
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF166534),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Payment methods
              Text(
                isOm ? 'Mala Kaffaltii' : 'Payment Methods',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.grey[900],
                ),
              ),
              const SizedBox(height: 12),
              ..._paymentMethods.map((method) {
                final isSelected = _selectedMethod == method['id'];
                return GestureDetector(
                  onTap: () => setState(() => _selectedMethod = method['id']),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
                      border: Border.all(
                        color: isSelected
                            ? const Color(0xFF166534)
                            : (isDark ? Colors.grey[700]! : Colors.grey[300]!),
                        width: isSelected ? 2 : 1,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: const Color(0xFF166534).withOpacity(0.2),
                                blurRadius: 8,
                                spreadRadius: 2,
                              ),
                            ]
                          : null,
                    ),
                    child: Row(
                      children: [
                        Text(method['icon']!, style: const TextStyle(fontSize: 32)),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                method['name']!,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                method['description']!,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? Colors.grey[500] : Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (isSelected)
                          const Icon(Icons.check_circle,
                              color: Color(0xFF166534), size: 24),
                      ],
                    ),
                  ),
                );
              }).toList(),

              const SizedBox(height: 24),

              // Continue button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _creating ? null : _createPaymentRequest,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF166534),
                    disabledBackgroundColor: Colors.grey[400],
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: _creating
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation(Colors.white),
                            strokeWidth: 2,
                          ),
                        )
                      : Text(
                          isOm ? 'Fuuldura' : 'Continue',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
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
