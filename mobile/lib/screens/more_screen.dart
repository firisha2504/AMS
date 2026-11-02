import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../providers/theme_provider.dart';
import 'penalties_screen.dart';
import 'receipts_screen.dart';
import 'special_contributions_screen.dart';
import 'attendance_screen.dart';
import 'about_screen.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  static const _primary = Color(0xFF166534);

  @override
  Widget build(BuildContext context) {
    final isOm = context.watch<LocaleProvider>().locale.languageCode == 'om';
    final isDark = context.watch<ThemeProvider>().isDarkMode;
    
    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1419) : const Color(0xFFF8FAFC),
      body: CustomScrollView(
        slivers: [
          // ── Header ──
          SliverAppBar(
            expandedHeight: 120,
            pinned: true,
            backgroundColor: _primary,
            automaticallyImplyLeading: false,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF14532D),
                      Color(0xFF166534),
                      Color(0xFF15803D),
                    ],
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.apps_rounded,
                                  color: Colors.white, size: 22),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              isOm ? 'Biroo' : 'More',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // ── Section: Records ──
                _SectionLabel(label: isOm ? 'Galmee Koo' : 'My Records'),
                const SizedBox(height: 10),

                _MenuCard(
                  icon: Icons.warning_amber_rounded,
                  title: isOm ? 'Adabbii' : 'Penalties',
                  subtitle: isOm ? 'Galmee adabbii keessanii ilaalaa' : 'View your penalty records',
                  color: const Color(0xFFDC2626),
                  onTap: () => _push(context, const PenaltiesScreen()),
                ),
                _MenuCard(
                  icon: Icons.receipt_long_outlined,
                  title: isOm ? 'Herrega' : 'Receipts',
                  subtitle: isOm ? 'Herrega kaffaltii buufadhaa' : 'Download your payment receipts',
                  color: const Color(0xFF2563EB),
                  onTap: () => _push(context, const ReceiptsScreen()),
                ),
                _MenuCard(
                  icon: Icons.volunteer_activism_outlined,
                  title: isOm ? 'Gumaacha Addaa' : 'Special Contributions',
                  subtitle: isOm ? 'Eebbaa, du\'aa fi hatattamaa' : 'Graduation, bereavement & emergency',
                  color: const Color(0xFF0D9488),
                  onTap: () =>
                      _push(context, const SpecialContributionsScreen()),
                ),
                _MenuCard(
                  icon: Icons.how_to_reg_outlined,
                  title: isOm ? 'Argamnaa' : 'Attendance',
                  subtitle: isOm ? 'Seenaa argamnaa walga\'ii ilaalaa' : 'View your meeting attendance history',
                  color: const Color(0xFF16A34A),
                  onTap: () => _push(context, const AttendanceScreen()),
                ),

                const SizedBox(height: 20),

                // ── Section: Organization ──
                _SectionLabel(label: isOm ? 'Waa\'ee Afosha' : 'About Afosha'),
                const SizedBox(height: 10),

                _MenuCard(
                  icon: Icons.info_outline_rounded,
                  title: isOm ? 'Waa\'ee Afosha' : 'About Afosha',
                  subtitle: isOm ? 'Ergama, mul\'ata, heera fi quunnamtii' : 'Mission, vision, rules & contact',
                  color: const Color(0xFF7C3AED),
                  onTap: () => _push(context, const AboutScreen()),
                ),

                const SizedBox(height: 24),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  void _push(BuildContext context, Widget screen) {
    Navigator.push(
        context, MaterialPageRoute(builder: (_) => screen));
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 2),
      child: Row(
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey,
                  letterSpacing: 0.4)),
          const SizedBox(width: 8),
          Expanded(child: Divider(color: Colors.grey.shade200)),
        ],
      ),
    );
  }
}

class _MenuCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _MenuCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade100),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 8,
                offset: const Offset(0, 2))
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: const TextStyle(
                            fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Icons.chevron_right, color: color, size: 18),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
