import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
import 'payment_flow_models.dart';
import 'payment_confirmation_screen.dart';

class SelectPaymentMethodScreen extends StatefulWidget {
  final PaymentBreakdown breakdown;

  const SelectPaymentMethodScreen({
    super.key,
    required this.breakdown,
  });

  @override
  State<SelectPaymentMethodScreen> createState() => _SelectPaymentMethodScreenState();
}

class _SelectPaymentMethodScreenState extends State<SelectPaymentMethodScreen> {
  late String _selectedMethodId;
  late TextEditingController _amountController;
  bool _isPartial = false;

  static const _navy = Color(0xFF091540);
  static const _green = Color(0xFF166534);
  static const _gold = Color(0xFFD97706);

  @override
  void initState() {
    super.initState();
    _selectedMethodId = standardPaymentMethods.first.id;
    _amountController = TextEditingController(
      text: widget.breakdown.totalDue.toStringAsFixed(0),
    );
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label copied to clipboard'),
        duration: const Duration(seconds: 2),
        backgroundColor: _green,
      ),
    );
  }

  void _onContinue() {
    final isOm = context.read<LocaleProvider>().locale.languageCode == 'om';
    final amount = double.tryParse(_amountController.text.trim()) ?? 0;

    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(isOm ? 'Hanga maallaqaa sirrii galchaa' : 'Please enter a valid amount')),
      );
      return;
    }

    final selectedMethod = standardPaymentMethods.firstWhere(
      (m) => m.id == _selectedMethodId,
      orElse: () => standardPaymentMethods.first,
    );

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PaymentConfirmationScreen(
          breakdown: widget.breakdown,
          selectedMethod: selectedMethod,
          confirmedAmount: amount,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    final isDark = context.watch<ThemeProvider>().isDarkMode;
    final method = standardPaymentMethods.firstWhere(
      (m) => m.id == _selectedMethodId,
      orElse: () => standardPaymentMethods.first,
    );

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1419) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(isOm ? 'Mala Kaffaltii Filadhu' : 'Select Payment Method'),
        backgroundColor: _navy,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── 1. Payment Breakdown Card ──
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [_navy, Color(0xFF0d1e5e)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isOm ? widget.breakdown.titleOm : widget.breakdown.titleEn,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _green,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          widget.breakdown.category,
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(isOm ? 'Gumaata Dhaabbataa:' : 'Principal Obligation:', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                      Text('${widget.breakdown.amount.toStringAsFixed(0)} ETB', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  if (widget.breakdown.penaltyAmount > 0) ...[
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(isOm ? 'Adabbii Yeroo Darbee:' : 'Late Penalty Fee:', style: const TextStyle(color: Colors.amberAccent, fontSize: 12)),
                        Text('+${widget.breakdown.penaltyAmount.toStringAsFixed(0)} ETB', style: const TextStyle(color: Colors.amberAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                  const Divider(color: Colors.white24, height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(isOm ? 'Waliigala Kaffalamu:' : 'Total Amount Due:', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      Text(
                        '${widget.breakdown.totalDue.toStringAsFixed(0)} ETB',
                        style: const TextStyle(color: _gold, fontWeight: FontWeight.w900, fontSize: 20),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // ── 2. Payment Amount Input & Partial Option ──
            Text(
              isOm ? 'Hanga Kaffaltii (ETB)' : 'Payment Amount (ETB)',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: isDark ? Colors.white : Colors.black87),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.attach_money, color: _green),
                suffixText: 'ETB',
                suffixStyle: const TextStyle(fontWeight: FontWeight.bold, color: _green),
                filled: true,
                fillColor: isDark ? const Color(0xFF1A1F2E) : Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 6),
            if (widget.breakdown.allowsPartial)
              Row(
                children: [
                  Checkbox(
                    value: _isPartial,
                    activeColor: _green,
                    onChanged: (val) {
                      setState(() {
                        _isPartial = val ?? false;
                        if (!_isPartial) {
                          _amountController.text = widget.breakdown.totalDue.toStringAsFixed(0);
                        }
                      });
                    },
                  ),
                  Text(
                    isOm ? 'Kaffaltii gari tokko (Partial payment)' : 'Allow partial payment instalment',
                    style: TextStyle(fontSize: 12, color: isDark ? Colors.grey[400] : Colors.grey[700]),
                  ),
                ],
              ),

            const SizedBox(height: 16),

            // ── 3. Supported Providers List ──
            Text(
              isOm ? 'Malawwan Kaffaltii' : 'Supported Payment Methods',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: isDark ? Colors.white : Colors.black87),
            ),
            const SizedBox(height: 8),

            ...standardPaymentMethods.map((m) {
              final isSelected = _selectedMethodId == m.id;
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1A1F2E) : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isSelected ? _green : (isDark ? Colors.grey.shade800 : Colors.grey.shade300),
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: RadioListTile<String>(
                  value: m.id,
                  groupValue: _selectedMethodId,
                  activeColor: _green,
                  onChanged: (val) => setState(() => _selectedMethodId = val!),
                  title: Row(
                    children: [
                      Text(m.icon, style: const TextStyle(fontSize: 22)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          isOm ? m.nameOm : m.nameEn,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                      ),
                    ],
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      m.accountNumber,
                      style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 12, color: _gold),
                    ),
                  ),
                ),
              );
            }),

            const SizedBox(height: 12),

            // Provider details instructions
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _green.withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _green.withOpacity(0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isOm ? 'Qajeelfama Kaffaltii (${method.id})' : 'Payment Steps (${method.id})',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: _green),
                      ),
                      InkWell(
                        onTap: () => _copyToClipboard(method.merchantCode ?? method.accountNumber, 'Account Number'),
                        child: const Row(
                          children: [
                            Icon(Icons.copy, size: 14, color: _green),
                            SizedBox(width: 4),
                            Text('Copy', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: _green)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    isOm ? method.instructionsOm : method.instructionsEn,
                    style: TextStyle(fontSize: 11, color: isDark ? Colors.grey.shade300 : Colors.grey.shade700, height: 1.4),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Continue Button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _green,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _onContinue,
                child: Text(
                  isOm ? 'Itti Fufi (Confirmation)' : 'Continue to Confirmation',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
