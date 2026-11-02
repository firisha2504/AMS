import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/auth_provider.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with SingleTickerProviderStateMixin {
  Map<String, dynamic>? _profile;
  bool _loading = true;
  bool _uploading = false;
  late TabController _tabController;
  final _picker = ImagePicker();

  // Edit profile form
  final _fullNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _occupationCtrl = TextEditingController();
  final _dobCtrl = TextEditingController();
  String _gender = 'MALE';
  // Emergency contact
  final _ecNameCtrl = TextEditingController();
  final _ecRelCtrl = TextEditingController();
  final _ecPhoneCtrl = TextEditingController();
  final _ecAddressCtrl = TextEditingController();
  bool _editSaving = false;
  String? _editError;
  String? _editSuccess;

  // Password form
  final _currentPwCtrl = TextEditingController();
  final _newPwCtrl = TextEditingController();
  final _confirmPwCtrl = TextEditingController();
  bool _pwSaving = false;
  String? _pwError;
  String? _pwSuccess;
  bool _showCurrent = false;
  bool _showNew = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _currentPwCtrl.dispose();
    _newPwCtrl.dispose();
    _confirmPwCtrl.dispose();
    _fullNameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _addressCtrl.dispose();
    _occupationCtrl.dispose();
    _dobCtrl.dispose();
    _ecNameCtrl.dispose();
    _ecRelCtrl.dispose();
    _ecPhoneCtrl.dispose();
    _ecAddressCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final response = await ApiService.get('/members/me');
      if (mounted) {
        setState(() => _profile = response['data']);
        _populateEditForm();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  void _populateEditForm() {
    if (_profile == null) return;
    _fullNameCtrl.text = _profile?['fullName'] ?? '';
    _phoneCtrl.text = _profile?['user']?['phone'] ?? '';
    _emailCtrl.text = _profile?['user']?['email'] ?? '';
    _addressCtrl.text = _profile?['address'] ?? '';
    _occupationCtrl.text = _profile?['occupation'] ?? '';
    _gender = _profile?['gender'] ?? 'MALE';
    final dob = _profile?['dateOfBirth'] as String?;
    if (dob != null) _dobCtrl.text = dob.split('T')[0];
    final ec = _profile?['emergencyContact'] as Map<String, dynamic>?;
    if (ec != null) {
      _ecNameCtrl.text = ec['fullName'] ?? '';
      _ecRelCtrl.text = ec['relationship'] ?? '';
      _ecPhoneCtrl.text = ec['phone'] ?? '';
      _ecAddressCtrl.text = ec['address'] ?? '';
    }
  }

  Future<void> _saveProfile() async {
    setState(() { _editError = null; _editSuccess = null; _editSaving = true; });
    try {
      final body = <String, dynamic>{};

      // Only send fields that actually changed
      final origName = _profile?['fullName'] as String? ?? '';
      final origPhone = _profile?['user']?['phone'] as String? ?? '';
      final origEmail = _profile?['user']?['email'] as String? ?? '';
      final origAddress = _profile?['address'] as String? ?? '';
      final origOccupation = _profile?['occupation'] as String? ?? '';
      final origDob = (_profile?['dateOfBirth'] as String? ?? '').split('T')[0];
      final origGender = _profile?['gender'] as String? ?? 'MALE';

      final newName = _fullNameCtrl.text.trim();
      final newPhone = _phoneCtrl.text.trim();
      final newEmail = _emailCtrl.text.trim();
      final newAddress = _addressCtrl.text.trim();
      final newOccupation = _occupationCtrl.text.trim();
      final newDob = _dobCtrl.text.trim();

      if (newName.isNotEmpty && newName != origName) body['fullName'] = newName;
      if (newPhone.isNotEmpty && newPhone != origPhone) body['phone'] = newPhone;
      if (newEmail != origEmail) body['email'] = newEmail.isNotEmpty ? newEmail : null;
      if (newAddress != origAddress) body['address'] = newAddress;
      if (newOccupation != origOccupation) body['occupation'] = newOccupation;
      if (newDob.isNotEmpty && newDob != origDob) body['dateOfBirth'] = newDob;
      if (_gender != origGender) body['gender'] = _gender;

      if (_ecNameCtrl.text.trim().isNotEmpty) {
        body['emergencyContact'] = {
          'fullName': _ecNameCtrl.text.trim(),
          'relationship': _ecRelCtrl.text.trim(),
          'phone': _ecPhoneCtrl.text.trim(),
          'address': _ecAddressCtrl.text.trim(),
        };
      }

      if (body.isEmpty) {
        setState(() {
          _editSuccess = 'No changes to save';
          _editSaving = false;
        });
        return;
      }

      await ApiService.patch('/members/me/profile', body);
      await _load();
      setState(() => _editSuccess = 'Profile updated successfully');
    } catch (e) {
      setState(() => _editError = 'Failed to update. Phone/email may already be in use.');
    } finally {
      if (mounted) setState(() => _editSaving = false);
    }
  }

  String? get _pictureUrl {
    final pic = _profile?['profilePicture'] as String?;
    if (pic == null || pic.isEmpty) return null;
    if (pic.startsWith('http')) return pic;
    final base = ApiConfig.baseUrl.replaceAll('/api', '');
    return '$base$pic';
  }

  String get _initials {
    final name = _profile?['fullName'] as String? ?? '';
    if (name.isEmpty) return '?';
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return name[0].toUpperCase();
  }

  Future<void> _uploadPicture() async {
    final picked = await _picker.pickImage(
        source: ImageSource.gallery, maxWidth: 800, imageQuality: 85);
    if (picked == null) return;
    setState(() => _uploading = true);
    try {
      await ApiService.uploadFile(
          '/members/me/profile-picture', File(picked.path));
      await _load();
      if (mounted) {
        _showSnack('Profile picture updated successfully', success: true);
      }
    } catch (e) {
      if (mounted) _showSnack(e.toString());
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _changePassword() async {
    setState(() {
      _pwError = null;
      _pwSuccess = null;
    });
    if (_newPwCtrl.text != _confirmPwCtrl.text) {
      setState(() => _pwError = 'New passwords do not match');
      return;
    }
    if (_newPwCtrl.text.length < 8) {
      setState(() => _pwError = 'Password must be at least 8 characters');
      return;
    }
    setState(() => _pwSaving = true);
    try {
      await ApiService.post('/auth/change-password', {
        'currentPassword': _currentPwCtrl.text,
        'newPassword': _newPwCtrl.text,
      });
      setState(() {
        _pwSuccess = 'Password changed successfully';
        _pwError = null;
      });
      _currentPwCtrl.clear();
      _newPwCtrl.clear();
      _confirmPwCtrl.clear();
    } catch (e) {
      setState(() => _pwError = 'Incorrect current password. Try again.');
    } finally {
      if (mounted) setState(() => _pwSaving = false);
    }
  }

  void _showSnack(String msg, {bool success = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: success ? Colors.green.shade700 : Colors.red.shade700,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final isOm = locale.locale.languageCode == 'om';
    final isDark = context.watch<ThemeProvider>().isDarkMode;
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1419) : Colors.white,
      body: NestedScrollView(
        headerSliverBuilder: (context, _) => [
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: _buildHeader(primary, isOm),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.language),
                onPressed: () => locale.toggleLocale(),
                tooltip: isOm ? 'English' : 'Afaan Oromoo',
              ),
            ],
          ),
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              TabBar(
                controller: _tabController,
                tabs: [
                  Tab(text: isOm ? 'Odeeffannoo' : 'Info'),
                  Tab(text: isOm ? 'Gulaali' : 'Edit'),
                  Tab(text: isOm ? 'Jecha Iccitii' : 'Password'),
                  Tab(text: isOm ? 'Suuraa' : 'Picture'),
                ],
                labelColor: primary,
                unselectedLabelColor: Colors.grey,
                indicatorColor: primary,
                indicatorSize: TabBarIndicatorSize.label,
              ),
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildInfoTab(isOm),
            _buildEditTab(isOm, primary),
            _buildPasswordTab(isOm, primary),
            _buildPictureTab(isOm, primary),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(Color primary, bool isOm) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [primary.withOpacity(0.9), primary],
        ),
      ),
      child: SafeArea(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 16),
            // Avatar
            Stack(
              alignment: Alignment.bottomRight,
              children: [
                Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 12)
                    ],
                  ),
                  child: CircleAvatar(
                    radius: 44,
                    backgroundColor: Colors.white24,
                    backgroundImage: _pictureUrl != null
                        ? CachedNetworkImageProvider(_pictureUrl!)
                        : null,
                    child: _pictureUrl == null
                        ? Text(_initials,
                            style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: Colors.white))
                        : null,
                  ),
                ),
                GestureDetector(
                  onTap: _uploading ? null : _uploadPicture,
                  child: Container(
                    width: 30,
                    height: 30,
                    decoration: const BoxDecoration(
                        color: Colors.white, shape: BoxShape.circle),
                    child: _uploading
                        ? Padding(
                            padding: const EdgeInsets.all(6),
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: primary))
                        : Icon(Icons.camera_alt, size: 16, color: primary),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              _profile?['fullName'] ?? '',
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _profile?['memberId'] ?? '',
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoTab(bool isOm) {
    final ec = _profile?['emergencyContact'] as Map<String, dynamic>?;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionCard(
          title: isOm ? 'Odeeffannoo Dhuunfaa' : 'Personal Information',
          children: [
            _InfoRow(
                icon: Icons.person_outline,
                label: isOm ? 'Maqaa Guutuu' : 'Full Name',
                value: _profile?['fullName'] ?? '-'),
            _InfoRow(
                icon: Icons.badge_outlined,
                label: isOm ? 'Lakk. Miseensaa' : 'Member ID',
                value: _profile?['memberId'] ?? '-'),
            _InfoRow(
                icon: Icons.phone_outlined,
                label: isOm ? 'Bilbila' : 'Phone',
                value: _profile?['user']?['phone'] ?? '-'),
            _InfoRow(
                icon: Icons.email_outlined,
                label: isOm ? 'Imeelii' : 'Email',
                value: _profile?['user']?['email'] ?? '-'),
            _InfoRow(
                icon: Icons.wc_outlined,
                label: isOm ? 'Saala' : 'Gender',
                value: _profile?['gender'] ?? '-'),
            _InfoRow(
                icon: Icons.cake_outlined,
                label: isOm ? 'Guyyaa Dhalootaa' : 'Date of Birth',
                value: _profile?['dateOfBirth'] != null
                    ? _profile!['dateOfBirth'].toString().split('T')[0]
                    : '-'),
            _InfoRow(
                icon: Icons.location_on_outlined,
                label: isOm ? 'Teessoo' : 'Address',
                value: _profile?['address'] ?? '-'),
            _InfoRow(
                icon: Icons.work_outline,
                label: isOm ? 'Hojii' : 'Occupation',
                value: _profile?['occupation'] ?? '-'),
          ],
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: isOm ? 'Haala Akkaawuntii' : 'Account Status',
          children: [
            _InfoRow(
                icon: Icons.verified_outlined,
                label: isOm ? 'Haala' : 'Status',
                value: _profile?['status'] ?? '-',
                valueColor: Colors.green),
            _InfoRow(
                icon: Icons.calendar_today_outlined,
                label: isOm ? 'Guyyaa Galmee' : 'Registration Date',
                value: _profile?['registrationDate'] != null
                    ? _profile!['registrationDate'].toString().split('T')[0]
                    : '-'),
          ],
        ),
        if (ec != null) ...[
          const SizedBox(height: 16),
          _SectionCard(
            title: isOm ? 'Quunnamtii Yeroo Hatattamaa' : 'Emergency Contact',
            children: [
              _InfoRow(
                  icon: Icons.person_pin_outlined,
                  label: isOm ? 'Maqaa' : 'Name',
                  value: ec['fullName'] ?? '-'),
              _InfoRow(
                  icon: Icons.people_outline,
                  label: isOm ? 'Hidhata' : 'Relationship',
                  value: ec['relationship'] ?? '-'),
              _InfoRow(
                  icon: Icons.phone_outlined,
                  label: isOm ? 'Bilbila' : 'Phone',
                  value: ec['phone'] ?? '-'),
              _InfoRow(
                  icon: Icons.location_on_outlined,
                  label: isOm ? 'Teessoo' : 'Address',
                  value: ec['address'] ?? '-'),
            ],
          ),
        ],
        const SizedBox(height: 24),
        // Logout
        ElevatedButton.icon(
          onPressed: () => context.read<AuthProvider>().logout(),
          icon: const Icon(Icons.logout),
          label: Text(isOm ? 'Ba\'i' : 'Logout'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red.shade50,
            foregroundColor: Colors.red.shade700,
            elevation: 0,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ],
    );
  }

  Widget _buildEditTab(bool isOm, Color primary) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionCard(
          title: isOm ? 'Odeeffannoo Dhuunfaa' : 'Personal Information',
          children: [
            _EditField(ctrl: _fullNameCtrl, label: isOm ? 'Maqaa Guutuu' : 'Full Name', icon: Icons.person_outline),
            const SizedBox(height: 10),
            _EditField(ctrl: _phoneCtrl, label: isOm ? 'Bilbila' : 'Phone', icon: Icons.phone_outlined, keyboardType: TextInputType.phone),
            const SizedBox(height: 10),
            _EditField(ctrl: _emailCtrl, label: isOm ? 'Imeelii' : 'Email', icon: Icons.email_outlined, keyboardType: TextInputType.emailAddress),
            const SizedBox(height: 10),
            _EditField(ctrl: _addressCtrl, label: isOm ? 'Teessoo' : 'Address', icon: Icons.location_on_outlined),
            const SizedBox(height: 10),
            _EditField(ctrl: _occupationCtrl, label: isOm ? 'Hojii' : 'Occupation', icon: Icons.work_outline),
            const SizedBox(height: 10),
            // Date of Birth
            TextField(
              controller: _dobCtrl,
              readOnly: true,
              decoration: InputDecoration(
                labelText: isOm ? 'Guyyaa Dhalootaa' : 'Date of Birth',
                prefixIcon: const Icon(Icons.cake_outlined),
                filled: true,
                fillColor: Colors.grey.shade50,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
              ),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _dobCtrl.text.isNotEmpty ? DateTime.tryParse(_dobCtrl.text) ?? DateTime(1990) : DateTime(1990),
                  firstDate: DateTime(1940),
                  lastDate: DateTime.now(),
                );
                if (picked != null) {
                  setState(() => _dobCtrl.text = picked.toIso8601String().split('T')[0]);
                }
              },
            ),
            const SizedBox(height: 10),
            // Gender
            DropdownButtonFormField<String>(
              value: _gender,
              decoration: InputDecoration(
                labelText: isOm ? 'Saala' : 'Gender',
                prefixIcon: const Icon(Icons.wc_outlined),
                filled: true,
                fillColor: Colors.grey.shade50,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
              ),
              items: [
                DropdownMenuItem(value: 'MALE', child: Text(isOm ? 'Dhiira' : 'Male')),
                DropdownMenuItem(value: 'FEMALE', child: Text(isOm ? 'Dhalaa' : 'Female')),
                DropdownMenuItem(value: 'OTHER', child: Text(isOm ? 'Kan Biroo' : 'Other')),
              ],
              onChanged: (v) => setState(() => _gender = v!),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: isOm ? 'Quunnamtii Yeroo Hatattamaa' : 'Emergency Contact',
          children: [
            _EditField(ctrl: _ecNameCtrl, label: isOm ? 'Maqaa' : 'Name', icon: Icons.person_pin_outlined),
            const SizedBox(height: 10),
            _EditField(ctrl: _ecRelCtrl, label: isOm ? 'Hidhata' : 'Relationship', icon: Icons.people_outline),
            const SizedBox(height: 10),
            _EditField(ctrl: _ecPhoneCtrl, label: isOm ? 'Bilbila' : 'Phone', icon: Icons.phone_outlined, keyboardType: TextInputType.phone),
            const SizedBox(height: 10),
            _EditField(ctrl: _ecAddressCtrl, label: isOm ? 'Teessoo' : 'Address', icon: Icons.location_on_outlined),
          ],
        ),
        const SizedBox(height: 16),
        if (_editError != null)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.red.shade100)),
            child: Row(children: [
              const Icon(Icons.warning_amber, color: Colors.red, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text(_editError!, style: const TextStyle(color: Colors.red))),
            ]),
          ),
        if (_editSuccess != null)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.green.shade100)),
            child: Row(children: [
              const Icon(Icons.check_circle_outline, color: Colors.green, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text(_editSuccess!, style: const TextStyle(color: Colors.green))),
            ]),
          ),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _editSaving ? null : _saveProfile,
            style: ElevatedButton.styleFrom(
              backgroundColor: primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: _editSaving
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(isOm ? 'Kuusi' : 'Save Changes', style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildPasswordTab(bool isOm, Color primary) {    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionCard(
          title: isOm ? 'Jecha Iccitii Jijjiiri' : 'Change Password',
          children: [
            _PasswordField(
              controller: _currentPwCtrl,
              label: isOm ? 'Jecha Iccitii Ammaa' : 'Current Password',
              show: _showCurrent,
              onToggle: () =>
                  setState(() => _showCurrent = !_showCurrent),
            ),
            const SizedBox(height: 12),
            _PasswordField(
              controller: _newPwCtrl,
              label: isOm ? 'Jecha Iccitii Haaraa' : 'New Password',
              show: _showNew,
              hint: isOm ? 'Xiqqaa 8 tookn' : 'Min 8 characters',
              onToggle: () => setState(() => _showNew = !_showNew),
            ),
            const SizedBox(height: 12),
            _PasswordField(
              controller: _confirmPwCtrl,
              label:
                  isOm ? 'Jecha Haaraa Mirkaneessi' : 'Confirm New Password',
              show: _showNew,
              onToggle: () => setState(() => _showNew = !_showNew),
            ),
            if (_pwError != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.red.shade100),
                ),
                child: Row(children: [
                  const Icon(Icons.warning_amber, color: Colors.red, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                      child: Text(_pwError!,
                          style: const TextStyle(color: Colors.red))),
                ]),
              ),
            ],
            if (_pwSuccess != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.green.shade100),
                ),
                child: Row(children: [
                  const Icon(Icons.check_circle_outline,
                      color: Colors.green, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                      child: Text(_pwSuccess!,
                          style: const TextStyle(color: Colors.green))),
                ]),
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _pwSaving ? null : _changePassword,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: _pwSaving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child:
                            CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(isOm ? 'Jijjiiri' : 'Update Password',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPictureTab(bool isOm, Color primary) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SectionCard(
          title: isOm ? 'Suuraa Profaayilii' : 'Profile Picture',
          children: [
            Center(
              child: Column(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                          color: primary.withOpacity(0.3), width: 3),
                    ),
                    child: CircleAvatar(
                      radius: 60,
                      backgroundColor: primary.withOpacity(0.1),
                      backgroundImage: _pictureUrl != null
                          ? CachedNetworkImageProvider(_pictureUrl!)
                          : null,
                      child: _pictureUrl == null
                          ? Text(_initials,
                              style: TextStyle(
                                  fontSize: 36,
                                  fontWeight: FontWeight.bold,
                                  color: primary))
                          : null,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    isOm
                        ? 'Suuraa haaraa filadhu (JPEG, PNG)'
                        : 'Choose a new photo (JPEG, PNG)',
                    style: const TextStyle(color: Colors.grey, fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _uploading ? null : _uploadPicture,
                      icon: _uploading
                          ? SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: primary))
                          : const Icon(Icons.photo_library_outlined),
                      label: Text(_uploading
                          ? (isOm ? 'Fe\'aa jira...' : 'Uploading...')
                          : (isOm ? 'Suuraa Filachuu' : 'Choose from Gallery')),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: primary,
                        side: BorderSide(color: primary),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ── Supporting Widgets ────────────────────────────────────────────────────────

class _EditField extends StatelessWidget {
  final TextEditingController ctrl;
  final String label;
  final IconData icon;
  final TextInputType? keyboardType;

  const _EditField({
    required this.ctrl,
    required this.label,
    required this.icon,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: ctrl,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        filled: true,
        fillColor: Colors.grey.shade50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
              color: Theme.of(context).colorScheme.primary, width: 1.5),
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _SectionCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade100),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey.shade600,
                    letterSpacing: 0.5)),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: Colors.grey.shade500),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade500,
                        fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text(value,
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: valueColor ?? Colors.grey.shade900)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PasswordField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? hint;
  final bool show;
  final VoidCallback onToggle;

  const _PasswordField({
    required this.controller,
    required this.label,
    required this.show,
    required this.onToggle,
    this.hint,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: !show,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: Colors.grey.shade50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade200),
        ),
        suffixIcon: IconButton(
          icon: Icon(show ? Icons.visibility_off : Icons.visibility,
              size: 20, color: Colors.grey),
          onPressed: onToggle,
        ),
      ),
    );
  }
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  const _TabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) => false;
}
