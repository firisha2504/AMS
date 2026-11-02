import 'package:flutter/material.dart';
import '../config/api_config.dart';

class LogoService {
  static String? _cachedLogoUrl;
  
  static String get logoUrl {
    // Add timestamp to prevent caching - ensures fresh logo on every load
    final baseUrl = '${ApiConfig.baseUrl.replaceAll('/api', '')}/api/settings/logo';
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return '$baseUrl?v=$timestamp';
  }
  
  static Widget buildLogo(BuildContext context, {double size = 40}) {
    return Container(
      width: size * 2,
      height: size * 2,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        shape: BoxShape.circle,
      ),
      child: ClipOval(
        child: Image.network(
          logoUrl,
          width: size * 2,
          height: size * 2,
          fit: BoxFit.cover,
          // Disable caching to always fetch fresh logo
          cacheWidth: null,
          cacheHeight: null,
          errorBuilder: (context, error, stackTrace) {
            // Fallback to default icon if logo fails to load
            return Icon(
              Icons.groups,
              size: size,
              color: Theme.of(context).colorScheme.primary,
            );
          },
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return Center(
              child: CircularProgressIndicator(
                value: loadingProgress.expectedTotalBytes != null
                    ? loadingProgress.cumulativeBytesLoaded /
                        loadingProgress.expectedTotalBytes!
                    : null,
              ),
            );
          },
        ),
      ),
    );
  }
}
