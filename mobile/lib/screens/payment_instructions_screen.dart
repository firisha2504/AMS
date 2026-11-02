import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
import '../services/api_service.dart';

class PaymentInstructionsScreen extends StatefulWidget {
  final Map<String, dynamic> paymentRequest;
  final String method;

  const PaymentInstructionsScreen({
    required this.paymentRequest,
    required this.method,
    super.key,
  });

  @override
  State<PaymentInstructionsScreen> createState() =>
      _PaymentInstructionsScreenState();
}

class _PaymentInstructionsScreenState extends State<PaymentInstructionsScreen> {
  static const _accent = Color(0xFF166534);

  Map<String, Map<String, String>> get _instructions => {
        'M_PESA': {
          'title': 'M-Pesa Payment Instructions',
          'titleOm': 'Eggarsi Kaffaltii M-Pesa',
          'steps':
              '1. Open M-Pesa app or dial *171#\n2. Select "Send Money"\n3. Enter the account number shown below\n4. Enter amount\n5. Confirm and complete payment\n6. Copy the transaction reference\n7. Return to this app and submit the reference',
          'stepsOm':
              '1. Appii M-Pesa banaa godhaa\n2. "Manni Maalaa Ergi" filadhu\n3. Lakkoobsa akkaawuntii armaan gadii galchi\n4. Baay\'ina guddinu\n5. Mirkaneessaa fi itti gaafatamuu xiinxala\n6. Lakkoobsa ittiin galmeeffamee kopi godhaa\n7. Appii kanatti deebi\'i fi lakkoobsa sanaa waanta\n',
        },
        'TELEBIRR': {
          'title': 'Telebirr Payment Instructions',
          'titleOm': 'Eggarsi Kaffaltii Telebirr',
          'steps':
              '1. Open Telebirr app\n2. Select "Send Money"\n3. Enter the account number\n4. Enter the amount\n5. Complete the transaction\n6. Save the transaction reference\n7. Return and submit the reference',
          'stepsOm':
              '1. Appii Telebirr banaa godhaa\n2. "Manni Maalaa Ergi" filadhu\n3. Lakkoobsa akkaawuntii galchi\n4. Baay\'ina guddinu\n5. Ittiin gaafatamuu xiinxala\n6. Lakkoobsa ittiin galmeeffamee olkaa\'u\n7. Deebi\'i fi lakkoobsa sanaa waanta\n',
        },
        'CBE': {
          'title': 'CBE Birr Transfer Instructions',
          'titleOm': 'Eggarsi Itti Gaafatamuu CBE Birr',
          'steps':
              '1. Open your bank app or go to ATM\n2. Select "Transfer" or "Send Money"\n3. Enter account number shown below\n4. Enter amount\n5. Confirm and get receipt\n6. Note the transaction reference/receipt number\n7. Return and submit the reference',
          'stepsOm':
              '1. Appii banki keessan banaa godhaa\n2. "Itti Gaafatamuu" filadhu\n3. Lakkoobsa akkaawuntii galchi\n4. Baay\'ina guddinu\n5. Mirkaneessaa fi herrega argaa\n6. Lakkoobsa ittiin galmeeffamee olkaa\'u\n7. Deebi\'i fi lakkoobsa sanaa waanta\n',
        },
        'EBIRR': {
          'title': 'eBirr Payment Instructions',
          'titleOm': 'Eggarsi Kaffaltii eBirr',
          'steps':
              '1. Open eBirr wallet app\n2. Select "Send Money"\n3. Enter the account/merchant ID\n4. Enter the amount\n5. Confirm the transaction\n6. Save the reference number\n7. Return and submit the reference',
          'stepsOm':
              '1. Appii eBirr banaa godhaa\n2. "Manni Maalaa Ergi" filadhu\n3. Lakkoobsa akkaawuntii/kauparii galchi\n4. Baay\'ina guddinu\n5. Ittiin gaafatamuu mirkaneessaa\n6. Lakkoobsa ittiin galmeeffamee olkaa\'u\n7. Deebi\'i fi lakkoobsa sanaa waanta\n',
        },
      };

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Copied to clipboard')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    final isDark = context.watch<ThemeProvider>().isDarkMode;

    final instructions = _instructions[widget.method] ??
        {'title': 'Instructions', 'titleOm': 'Eggarsi'};
    final amount = widget.paymentRequest['amount'] ?? 0;
    final reference = widget.paymentRequest['referenceNumber'] ?? '';
    final accountDetails =
        widget.paymentRequest['accountDetails'] as Map<String, dynamic>? ?? {};

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1419) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: _accent,
        title: Text(
          isOm ? instructions['titleOm']! : instructions['title']!,
        ),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Amount
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
                      isOm ? 'Baay\'ina Kaffaltii' : 'Payment Amount',
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '$amount ETB',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF166534),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Account details
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
                      isOm ? 'Akkaawuntii Kaffaltii' : 'Send To',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.grey[300] : Colors.grey[800],
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Account name
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isOm ? 'Maqaa' : 'Account Name',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark
                                    ? Colors.grey[500]
                                    : Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              accountDetails['accountName'] ?? 'N/A',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : Colors.grey[900],
                              ),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy, size: 20),
                          onPressed: () => _copyToClipboard(
                            accountDetails['accountName'] ?? '',
                          ),
                          color: _accent,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Divider(
                      color:
                          isDark ? Colors.grey[700] : Colors.grey[300],
                    ),
                    const SizedBox(height: 12),
                    // Account number
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isOm ? 'Lakkoobsa Akkaawuntii' : 'Account Number',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark
                                    ? Colors.grey[500]
                                    : Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              accountDetails['accountNumber'] ?? 'N/A',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF166534),
                                letterSpacing: 1.5,
                              ),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy, size: 20),
                          onPressed: () => _copyToClipboard(
                            accountDetails['accountNumber'] ?? '',
                          ),
                          color: _accent,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Reference number
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF166534).withOpacity(0.1),
                  border: Border.all(
                    color: const Color(0xFF166534),
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isOm ? 'Lakkoobsa Waanta' : 'Reference Number',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.grey[300] : Colors.grey[800],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            reference,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF166534),
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy, size: 20),
                          onPressed: () => _copyToClipboard(reference),
                          color: const Color(0xFF166534),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      isOm
                          ? 'Lakkoobsa kanaa waanta jalqaba'
                          : 'Include this reference in your payment',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey[400] : Colors.grey[700],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Instructions
              Text(
                isOm ? 'Eggarsi' : 'Instructions',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.grey[900],
                ),
              ),
              const SizedBox(height: 12),
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
                child: Text(
                  isOm
                      ? instructions['stepsOm'] ?? instructions['steps'] ?? ''
                      : instructions['steps'] ?? '',
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.8,
                    color: isDark ? Colors.grey[300] : Colors.grey[800],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Continue button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) =>
                            SubmitTransactionReferenceScreen(
                          paymentRequest: widget.paymentRequest,
                        ),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF166534),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: Text(
                    isOm
                        ? 'Kaffaltii Xiinxale'
                        : 'I\'ve Sent the Payment',
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

class SubmitTransactionReferenceScreen extends StatefulWidget {
  final Map<String, dynamic> paymentRequest;

  const SubmitTransactionReferenceScreen({
    required this.paymentRequest,
    super.key,
  });

  @override
  State<SubmitTransactionReferenceScreen> createState() =>
      _SubmitTransactionReferenceScreenState();
}

class _SubmitTransactionReferenceScreenState
    extends State<SubmitTransactionReferenceScreen> {
  late TextEditingController _referenceController;
  bool _submitting = false;
  static const _accent = Color(0xFF166534);

  @override
  void initState() {
    super.initState();
    _referenceController = TextEditingController();
  }

  @override
  void dispose() {
    _referenceController.dispose();
    super.dispose();
  }

  Future<void> _submitReference() async {
    if (_referenceController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter the transaction reference'),
        ),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      await ApiService.post(
        '/payment-requests/${widget.paymentRequest['id']}/submit',
        {
          'transactionReference': _referenceController.text,
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Payment submitted successfully! Your payment will be verified within 24 hours.',
            ),
            duration: Duration(seconds: 3),
          ),
        );
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) Navigator.popUntil(context, (route) => route.isFirst);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }

    if (mounted) setState(() => _submitting = false);
  }

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    final isDark = context.watch<ThemeProvider>().isDarkMode;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1419) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: _accent,
        title: Text(isOm ? 'Waanta Raawwii' : 'Submit Transaction'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              Text(
                isOm
                    ? 'Lakkoobsa Waantaa Galchi'
                    : 'Enter Transaction Reference',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.grey[900],
                ),
              ),
              const SizedBox(height: 12),
              Text(
                isOm
                    ? 'Lakkoobsa waantaa Afosha-MS ergifte galchi'
                    : 'Enter the transaction reference you received from your bank/mobile money provider',
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? Colors.grey[400] : Colors.grey[700],
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _referenceController,
                decoration: InputDecoration(
                  hintText: isOm
                      ? 'e.g., TXN123456789'
                      : 'e.g., TXN123456789',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: isDark ? Colors.grey[700]! : Colors.grey[300]!,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(
                      color: _accent,
                      width: 2,
                    ),
                  ),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF1A1F2E) : Colors.white,
                ),
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submitReference,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF166534),
                    disabledBackgroundColor: Colors.grey[400],
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: _submitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation(Colors.white),
                            strokeWidth: 2,
                          ),
                        )
                      : Text(
                          isOm ? 'Waanta Ergi' : 'Submit Payment',
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
