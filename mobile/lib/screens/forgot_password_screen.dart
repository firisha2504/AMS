import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../services/api_service.dart';

enum ForgotPasswordStep { identifier, otp, newPassword, success }

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  ForgotPasswordStep _step = ForgotPasswordStep.identifier;
  String _channel = 'SMS'; // SMS or EMAIL
  final _identifierController = TextEditingController();
  final _otpController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  String? _userId;
  bool _loading = false;
  String? _error;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _identifierController.dispose();
    _otpController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    if (_identifierController.text.isEmpty) {
      setState(() => _error = 'Please enter your phone number or email');
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      final response = await ApiService.post('/auth/request-otp', {
        'identifier': _identifierController.text,
        'purpose': 'PASSWORD_RESET',
        'channel': _channel,
      });
      
      setState(() {
        _userId = response['data']['userId'] as String;
        _step = ForgotPasswordStep.otp;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    if (_otpController.text.length != 6) {
      setState(() => _error = 'Please enter the 6-digit code');
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      await ApiService.post('/auth/verify-otp', {
        'userId': _userId,
        'code': _otpController.text,
        'purpose': 'PASSWORD_RESET',
      });
      
      setState(() => _step = ForgotPasswordStep.newPassword);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _resetPassword() async {
    if (_passwordController.text.length < 8) {
      setState(() => _error = 'Password must be at least 8 characters');
      return;
    }

    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() => _error = 'Passwords do not match');
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      await ApiService.post('/auth/reset-password', {
        'userId': _userId,
        'code': _otpController.text,
        'newPassword': _passwordController.text,
      });
      
      setState(() => _step = ForgotPasswordStep.success);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Widget _buildIdentifierStep(LocaleProvider locale) {
    final isOm = locale.locale.languageCode == 'om';
    
    return Column(
      children: [
        Text(
          isOm ? 'Jecha Iccitii Dagatte?' : 'Forgot Password?',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          isOm 
              ? 'Bilbila ykn email galchaa' 
              : 'Enter your phone number or email',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Colors.grey,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        
        // Channel selector
        Container(
          decoration: BoxDecoration(
            color: Colors.grey[100],
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.all(4),
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _channel = 'SMS'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: _channel == 'SMS' ? Colors.white : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: _channel == 'SMS'
                          ? [BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            )]
                          : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.phone,
                          size: 18,
                          color: _channel == 'SMS' 
                              ? Theme.of(context).colorScheme.primary 
                              : Colors.grey,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          isOm ? 'Bilbila' : 'Phone',
                          style: TextStyle(
                            fontWeight: _channel == 'SMS' ? FontWeight.bold : FontWeight.normal,
                            color: _channel == 'SMS' 
                                ? Theme.of(context).colorScheme.primary 
                                : Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _channel = 'EMAIL'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: _channel == 'EMAIL' ? Colors.white : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: _channel == 'EMAIL'
                          ? [BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            )]
                          : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.email,
                          size: 18,
                          color: _channel == 'EMAIL' 
                              ? Theme.of(context).colorScheme.primary 
                              : Colors.grey,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Email',
                          style: TextStyle(
                            fontWeight: _channel == 'EMAIL' ? FontWeight.bold : FontWeight.normal,
                            color: _channel == 'EMAIL' 
                                ? Theme.of(context).colorScheme.primary 
                                : Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        
        TextField(
          controller: _identifierController,
          keyboardType: _channel == 'SMS' 
              ? TextInputType.phone 
              : TextInputType.emailAddress,
          decoration: InputDecoration(
            labelText: _channel == 'SMS' 
                ? (isOm ? 'Lakkoofsa Bilbilaa' : 'Phone Number')
                : 'Email Address',
            border: const OutlineInputBorder(),
            prefixIcon: Icon(_channel == 'SMS' ? Icons.phone : Icons.email),
            hintText: _channel == 'SMS' ? '+251...' : 'your@email.com',
          ),
        ),
        
        if (_error != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red[200]!),
            ),
            child: Row(
              children: [
                const Icon(Icons.warning, color: Colors.red, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red))),
              ],
            ),
          ),
        ],
        
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton(
            onPressed: _loading ? null : _requestOtp,
            child: _loading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(isOm ? 'Koodii Ergi' : 'Send Verification Code'),
          ),
        ),
      ],
    );
  }

  Widget _buildOtpStep(LocaleProvider locale) {
    final isOm = locale.locale.languageCode == 'om';
    
    return Column(
      children: [
        Text(
          isOm ? 'Koodii Mirkaneessi' : 'Verify Code',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          isOm 
              ? 'Koodii gara ${_channel == 'SMS' ? 'bilbilaa' : 'email'} keessanii ergame galchaa'
              : 'Enter the 6-digit code sent to your ${_channel == 'SMS' ? 'phone' : 'email'}',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Colors.grey,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          _identifierController.text,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey[600],
            fontFamily: 'monospace',
          ),
        ),
        const SizedBox(height: 32),
        
        TextField(
          controller: _otpController,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            letterSpacing: 8,
          ),
          decoration: InputDecoration(
            labelText: isOm ? 'Koodii Mirkaneessaa' : 'Verification Code',
            border: const OutlineInputBorder(),
            counterText: '',
            hintText: '123456',
          ),
          onChanged: (value) {
            // Auto-submit when 6 digits entered
            if (value.length == 6) {
              _verifyOtp();
            }
          },
        ),
        
        if (_error != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red[200]!),
            ),
            child: Row(
              children: [
                const Icon(Icons.warning, color: Colors.red, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red))),
              ],
            ),
          ),
        ],
        
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton(
            onPressed: _loading || _otpController.text.length != 6 ? null : _verifyOtp,
            child: _loading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(isOm ? 'Mirkaneessi' : 'Verify Code'),
          ),
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () => setState(() {
            _step = ForgotPasswordStep.identifier;
            _error = null;
          }),
          child: Text(
            isOm ? 'Koodii hin arganne? Irra deebi\'ii barbaadi' : 'Didn\'t receive code? Try again',
          ),
        ),
      ],
    );
  }

  Widget _buildNewPasswordStep(LocaleProvider locale) {
    final isOm = locale.locale.languageCode == 'om';
    
    return Column(
      children: [
        Text(
          isOm ? 'Jecha Iccitii Haaraa' : 'Set New Password',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          isOm ? 'Jecha iccitii cimaa filadhu' : 'Choose a strong password',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 32),
        
        TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          decoration: InputDecoration(
            labelText: isOm ? 'Jecha Iccitii Haaraa' : 'New Password',
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.lock),
            suffixIcon: IconButton(
              icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
            ),
            helperText: isOm ? 'Yoo xiqqaate qubee 8' : 'At least 8 characters',
          ),
        ),
        const SizedBox(height: 16),
        
        TextField(
          controller: _confirmPasswordController,
          obscureText: _obscureConfirmPassword,
          decoration: InputDecoration(
            labelText: isOm ? 'Jecha Iccitii Mirkaneessi' : 'Confirm Password',
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(
              icon: Icon(_obscureConfirmPassword ? Icons.visibility : Icons.visibility_off),
              onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
            ),
          ),
        ),
        
        if (_error != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red[200]!),
            ),
            child: Row(
              children: [
                const Icon(Icons.warning, color: Colors.red, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red))),
              ],
            ),
          ),
        ],
        
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton(
            onPressed: _loading ? null : _resetPassword,
            child: _loading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(isOm ? 'Jecha Iccitii Irra Deebi\'ii Kaa\'i' : 'Reset Password'),
          ),
        ),
      ],
    );
  }

  Widget _buildSuccessStep(LocaleProvider locale) {
    final isOm = locale.locale.languageCode == 'om';
    
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: Colors.green[50],
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.check_circle,
            size: 50,
            color: Colors.green,
          ),
        ),
        const SizedBox(height: 24),
        Text(
          isOm ? 'Milkaa\'e!' : 'Success!',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          isOm 
              ? 'Jecha iccitii keessan jijjiirameera. Amma seenuu dandeessu.'
              : 'Your password has been reset. You can now sign in.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Colors.grey,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton.icon(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.login),
            label: Text(isOm ? 'Amma Seeni' : 'Sign In Now'),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final isOm = locale.locale.languageCode == 'om';

    return Scaffold(
      appBar: AppBar(
        title: Text(isOm ? 'Jecha Iccitii Dagatte' : 'Forgot Password'),
        leading: _step == ForgotPasswordStep.success 
            ? null 
            : IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  if (_step == ForgotPasswordStep.identifier) {
                    Navigator.of(context).pop();
                  } else {
                    setState(() {
                      if (_step == ForgotPasswordStep.otp) {
                        _step = ForgotPasswordStep.identifier;
                      } else if (_step == ForgotPasswordStep.newPassword) {
                        _step = ForgotPasswordStep.otp;
                      }
                      _error = null;
                    });
                  }
                },
              ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Step indicator
              if (_step != ForgotPasswordStep.success) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildStepIndicator(1, _step.index >= 0),
                    _buildStepLine(_step.index >= 1),
                    _buildStepIndicator(2, _step.index >= 1),
                    _buildStepLine(_step.index >= 2),
                    _buildStepIndicator(3, _step.index >= 2),
                  ],
                ),
                const SizedBox(height: 32),
              ],
              
              // Current step content
              if (_step == ForgotPasswordStep.identifier)
                _buildIdentifierStep(locale)
              else if (_step == ForgotPasswordStep.otp)
                _buildOtpStep(locale)
              else if (_step == ForgotPasswordStep.newPassword)
                _buildNewPasswordStep(locale)
              else
                _buildSuccessStep(locale),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepIndicator(int step, bool active) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: active 
            ? Theme.of(context).colorScheme.primary 
            : Colors.grey[300],
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          '$step',
          style: TextStyle(
            color: active ? Colors.white : Colors.grey[600],
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildStepLine(bool active) {
    return Container(
      width: 40,
      height: 2,
      color: active 
          ? Theme.of(context).colorScheme.primary 
          : Colors.grey[300],
    );
  }
}
