import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';
import '../services/api_service.dart';

class AboutScreen extends StatefulWidget {
  const AboutScreen({super.key});

  @override
  State<AboutScreen> createState() => _AboutScreenState();
}

class _AboutScreenState extends State<AboutScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _tabs = [];
  bool _loading = true;

  static const _accent = Color(0xFF7C3AED);

  // Fallback content shown while loading or if API returns empty
  static const _fallbackTabs = [
    {
      'slug': 'about-afosha',
      'title': 'About Afosha',
      'titleOm': 'Waa\'ee Afosha',
      'content':
          'Afosha is a community mutual support group dedicated to '
              'improving the financial wellbeing of its members through weekly '
              'contributions and emergency support systems.',
      'contentOm':
          'Afosha garee gargaarsa walii galtee ta\'e yoo ta\'u, '
              'gumaacha torbanicha fi sirna deeggarsa hatattamaa '
              'dhaan fayyadamummaa maallaqaa miseensota isaa foyyeessuuf '
              'kutannoodhaan hojjeta.',
    },
    {
      'slug': 'mission-vision',
      'title': 'Mission & Vision',
      'titleOm': 'Ergama fi Mul\'ata',
      'content':
          'Mission: To empower community members through transparent financial '
              'management, regular contributions, and mutual aid.\n\n'
              'Vision: A financially resilient and united community where every '
              'member thrives together.',
      'contentOm':
          'Ergama: Bulchiinsa maallaqaa ifa ta\'een, gumaacha dhaabbataan fi '
              'gargaarsa waliiniin miseensota hawaasaa gabbisuu.\n\n'
              'Mul\'ata: Hawaasa maallaqaan cimaa fi gamtoomsame miseensi hundi '
              'waliin guddatu.',
    },
    {
      'slug': 'heera-danbii',
      'title': 'Rules & Regulations',
      'titleOm': 'Heera fi Danbii',
      'content':
          '1. All members must pay the weekly contribution of 50 ETB on time.\n\n'
              '2. Missing a meeting without prior notice will incur a 50 ETB penalty.\n\n'
              '3. Members must notify the group at least 24 hours before missing a meeting.\n\n'
              '4. Monthly penalty for non-payment is 100 ETB.\n\n'
              '5. Special contributions apply for graduation (100 ETB), '
              'bereavement (100 ETB), and emergency situations.',
      'contentOm':
          '1. Miseensota hundi gumaacha torbanicha 50 ETB yeroon kaffaluu qabu.\n\n'
              '2. Walga\'ii irraa malee beeksisa dursaa osoo hin kennin hafu 50 ETB adabamuu danda\'a.\n\n'
              '3. Miseensonni yoo walga\'ii irraa dheessuu barbaadan sa\'aatii 24 dura beeksisuu qabu.\n\n'
              '4. Adabbii ji\'aa kaffaltii dhabuuf 100 ETB dha.\n\n'
              '5. Gumaacha addaa eebbifamuu (100 ETB), du\'a (100 ETB) fi hatattamaa irratti ni barbaachisa.',
    },
    {
      'slug': 'contact',
      'title': 'Contact',
      'titleOm': 'Quunnamtii',
      'content':
          'For any inquiries or support, please contact the Afosha group administrator.\n\n'
              'You can reach us through the group\'s official communication channels '
              'or contact your group admin directly via the app.',
      'contentOm':
          'Gaaffii fi deeggarsa kamiifu, bulchaa garee Afosha qunnamuun ni danda\'ama.\n\n'
              'Karaa marsariitiiwwan quunnamtii mootummaa garee kanaan nu argachuu '
              'ykn bulchaa garee keessan kallattiidhaan app kana dhaan quunnamuu dandeessu.',
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
    });
    try {
      final response = await ApiService.get('/public/about');
      final data = response['data'] as List?;
      if (mounted) {
        setState(() {
          _tabs = (data != null && data.isNotEmpty) ? data : _fallbackTabs;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _tabs = _fallbackTabs;
        });
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  static const _tabIcons = [
    Icons.info_outline_rounded,
    Icons.flag_outlined,
    Icons.gavel_outlined,
    Icons.contact_support_outlined,
  ];

  static const _tabColors = [
    Color(0xFF7C3AED),
    Color(0xFF2563EB),
    Color(0xFF16A34A),
    Color(0xFF0D9488),
  ];

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final isOm = locale.locale.languageCode == 'om';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: NestedScrollView(
        headerSliverBuilder: (context, _) => [
          // ── Header ──
          SliverAppBar(
            expandedHeight: 160,
            pinned: true,
            backgroundColor: _accent,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF4C1D95),
                      Color(0xFF7C3AED),
                      Color(0xFFA78BFA),
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
                        // Logo / icon
                        Row(
                          children: [
                            Container(
                              width: 52,
                              height: 52,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                    color: Colors.white.withOpacity(0.3)),
                              ),
                              child: const Icon(Icons.groups_2_outlined,
                                  color: Colors.white, size: 28),
                            ),
                            const SizedBox(width: 14),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Afosha',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 24,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.5),
                                ),
                                Text(
                                  isOm
                                      ? 'Garee Gargaarsa Walii Galtee'
                                      : 'Mutual Support Group',
                                  style: TextStyle(
                                      color: Colors.white.withOpacity(0.8),
                                      fontSize: 12),
                                ),
                              ],
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

          // ── Tab Bar ──
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              TabBar(
                key: ValueKey(isOm), // Force rebuild when language changes
                controller: _tabController,
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                tabs: List.generate(
                  4,
                  (i) {
                    final tabData = _tabs.isNotEmpty && i < _tabs.length
                        ? _tabs[i]
                        : _fallbackTabs[i];
                    final label = isOm
                        ? (tabData['titleOm'] ?? tabData['title'] ?? '')
                        : (tabData['title'] ?? '');
                    return Tab(
                      child: Row(
                        children: [
                          Icon(_tabIcons[i], size: 15),
                          const SizedBox(width: 6),
                          Text(label,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    );
                  },
                ),
                labelColor: _accent,
                unselectedLabelColor: Colors.grey,
                indicatorColor: _accent,
                indicatorSize: TabBarIndicatorSize.label,
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
            ),
          ),
        ],
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(
                controller: _tabController,
                children: List.generate(4, (i) {
                  final tabData = i < _tabs.length
                      ? _tabs[i]
                      : _fallbackTabs[i];
                  return _TabContent(
                    tabData: tabData,
                    isOm: isOm,
                    icon: _tabIcons[i],
                    color: _tabColors[i],
                  );
                }),
              ),
      ),
    );
  }
}

// ── Tab Content ───────────────────────────────────────────────────────────────

class _TabContent extends StatelessWidget {
  final dynamic tabData;
  final bool isOm;
  final IconData icon;
  final Color color;

  const _TabContent({
    required this.tabData,
    required this.isOm,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final title =
        isOm ? (tabData['titleOm'] ?? tabData['title'] ?? '') : (tabData['title'] ?? '');
    final content =
        isOm ? (tabData['contentOm'] ?? tabData['content'] ?? '') : (tabData['content'] ?? '');
    final slug = tabData['slug'] ?? '';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Title card ──
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  color.withOpacity(0.12),
                  color.withOpacity(0.04),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: color.withOpacity(0.15)),
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, color: color, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: color),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ── Content or special layout ──
          if (slug == 'contact')
            _ContactContent(color: color, isOm: isOm, content: content)
          else if (slug == 'heera-danbii')
            _RulesContent(content: content, color: color)
          else if (slug == 'mission-vision')
            _MissionContent(content: content, color: color, isOm: isOm)
          else
            _PlainContent(content: content, color: color),

          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

// ── Plain text content ────────────────────────────────────────────────────────

class _PlainContent extends StatelessWidget {
  final String content;
  final Color color;

  const _PlainContent({required this.content, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
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
      child: Text(
        content,
        style: const TextStyle(
            fontSize: 14, height: 1.75, color: Color(0xFF374151)),
      ),
    );
  }
}

// ── Mission & Vision split layout ─────────────────────────────────────────────

class _MissionContent extends StatelessWidget {
  final String content;
  final Color color;
  final bool isOm;

  const _MissionContent(
      {required this.content, required this.color, required this.isOm});

  @override
  Widget build(BuildContext context) {
    // Try to split on double newline into mission / vision halves
    final parts = content.split('\n\n');
    final mission = parts.isNotEmpty ? parts[0] : content;
    final vision = parts.length > 1 ? parts[1] : '';

    return Column(
      children: [
        _HighlightCard(
          icon: Icons.rocket_launch_outlined,
          label: isOm ? 'Ergama' : 'Mission',
          text: mission,
          color: color,
        ),
        if (vision.isNotEmpty) ...[
          const SizedBox(height: 12),
          _HighlightCard(
            icon: Icons.visibility_outlined,
            label: isOm ? 'Mul\'ata' : 'Vision',
            text: vision,
            color: const Color(0xFF2563EB),
          ),
        ],
      ],
    );
  }
}

class _HighlightCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String text;
  final Color color;

  const _HighlightCard({
    required this.icon,
    required this.label,
    required this.text,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.15)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
              const SizedBox(width: 10),
              Text(label,
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: color)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            // Strip the "Mission: " / "Vision: " prefix if present
            text.replaceFirst(
                RegExp(r"^(Mission|Vision|Ergama|Mul'ata):\s*",
                    caseSensitive: false),
                ''),
            style: const TextStyle(
                fontSize: 14, height: 1.75, color: Color(0xFF374151)),
          ),
        ],
      ),
    );
  }
}

// ── Rules — numbered list renderer ────────────────────────────────────────────

class _RulesContent extends StatelessWidget {
  final String content;
  final Color color;

  const _RulesContent({required this.content, required this.color});

  @override
  Widget build(BuildContext context) {
    // Split content into paragraphs
    final paragraphs = content.split('\n\n');
    final widgets = <Widget>[];
    
    for (final paragraph in paragraphs) {
      final text = paragraph.trim();
      if (text.isEmpty) continue;
      
      // Check if this paragraph starts with a number (e.g., "1. ", "2. ")
      final numberMatch = RegExp(r'^(\d+)\.\s+').firstMatch(text);
      
      if (numberMatch != null) {
        // This is a numbered item - render it as a numbered card
        final number = numberMatch.group(1)!;
        final stripped = text.replaceFirst(RegExp(r'^\d+\.\s*'), '');
        
        widgets.add(Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withOpacity(0.12)),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 6,
                  offset: const Offset(0, 2))
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    number,
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: color),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    stripped,
                    style: const TextStyle(
                        fontSize: 14, height: 1.6, color: Color(0xFF374151)),
                  ),
                ),
              ),
            ],
          ),
        ));
      } else if (text.startsWith('━━━')) {
        // This is a decorative divider - render it as a line
        widgets.add(Container(
          margin: const EdgeInsets.symmetric(vertical: 12),
          height: 2,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                color.withOpacity(0.3),
                Colors.transparent,
              ],
            ),
          ),
        ));
      } else if (text.startsWith('#')) {
        // This is a hashtag/motto - render it with special styling
        widgets.add(Container(
          margin: const EdgeInsets.only(top: 16, bottom: 8),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                color.withOpacity(0.08),
                color.withOpacity(0.04),
              ],
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withOpacity(0.2)),
          ),
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              fontStyle: FontStyle.italic,
              color: color,
              height: 1.4,
            ),
          ),
        ));
      } else if (text.length < 100 && text.toUpperCase() == text && text.contains(' ')) {
        // This is likely a section header (all caps, short, multiple words)
        widgets.add(Container(
          margin: const EdgeInsets.only(top: 16, bottom: 8),
          child: Text(
            text,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: color,
              height: 1.4,
            ),
          ),
        ));
      } else {
        // Regular paragraph - render as plain text card
        widgets.add(Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade100),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 6,
                  offset: const Offset(0, 2))
            ],
          ),
          child: Text(
            text,
            style: const TextStyle(
                fontSize: 14, height: 1.7, color: Color(0xFF374151)),
          ),
        ));
      }
    }
    
    return Column(children: widgets);
  }
}

// ── Contact layout ────────────────────────────────────────────────────────────

class _ContactContent extends StatelessWidget {
  final String content;
  final Color color;
  final bool isOm;

  const _ContactContent(
      {required this.content, required this.color, required this.isOm});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Text content card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
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
          child: Text(
            content,
            style: const TextStyle(
                fontSize: 14, height: 1.75, color: Color(0xFF374151)),
          ),
        ),
        const SizedBox(height: 16),

        // Contact info chips
        _ContactTile(
          icon: Icons.admin_panel_settings_outlined,
          label: isOm ? 'Bulchaa Garee' : 'Group Admin',
          value: isOm ? 'App kana dhaan quunnamaa' : 'Contact via the app',
          color: color,
        ),
        const SizedBox(height: 10),
        _ContactTile(
          icon: Icons.group_outlined,
          label: isOm ? 'Miseensota' : 'Members',
          value: isOm ? 'Karaa garee keessan quunnamaa' : 'Reach out through your group',
          color: const Color(0xFF16A34A),
        ),
        const SizedBox(height: 10),
        _ContactTile(
          icon: Icons.notifications_outlined,
          label: isOm ? 'Beeksisa' : 'Announcements',
          value: isOm
              ? 'Kutaa Beeksisa ilaali'
              : 'Check the Notifications tab',
          color: const Color(0xFF2563EB),
        ),
      ],
    );
  }
}

class _ContactTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _ContactTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.15)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 6,
              offset: const Offset(0, 2))
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 2),
                Text(value,
                    style: const TextStyle(
                        fontSize: 12, color: Colors.grey)),
              ],
            ),
          ),
          Icon(Icons.arrow_forward_ios_rounded, size: 14, color: color.withOpacity(0.5)),
        ],
      ),
    );
  }
}

// ── Persistent TabBar delegate ────────────────────────────────────────────────

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
      color: Colors.white,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) => false;
}
