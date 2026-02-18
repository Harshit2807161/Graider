import 'dart:io';

import 'package:flutter/material.dart';

import '../../../core/models/scan_session.dart';
import '../../../core/theme/app_colors.dart';

/// Thumbnail card for a single scanned page in the review grid.
///
/// Displays the page image with a page number badge at the bottom-left
/// and a blur warning badge at the top-right when the page is detected
/// as blurry. Supports drag feedback via [isDragging].
class PageThumbnail extends StatelessWidget {
  const PageThumbnail({
    super.key,
    required this.page,
    required this.pageIndex,
    required this.onTap,
    this.isDragging = false,
  });

  /// The scanned page data (path, blur status).
  final ScannedPageInfo page;

  /// Zero-based index in the page list, used for display as `pageIndex + 1`.
  final int pageIndex;

  /// Called when the thumbnail is tapped to open the detail sheet.
  final VoidCallback onTap;

  /// Whether this thumbnail is currently being dragged (scale + shadow).
  final bool isDragging;

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: isDragging ? 1.05 : 1.0,
      duration: const Duration(milliseconds: 150),
      child: Material(
        color: AppColors.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
        elevation: isDragging ? 8 : 0,
        shadowColor: Colors.black54,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Stack(
              fit: StackFit.expand,
              children: [
                // Page image
                Image.file(
                  File(page.path),
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const Center(
                    child: Icon(
                      Icons.broken_image_outlined,
                      color: AppColors.onSurfaceVariant,
                      size: 32,
                    ),
                  ),
                ),

                // Page number badge -- bottom-left
                Positioned(
                  left: 6,
                  bottom: 6,
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.6),
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '${pageIndex + 1}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),

                // Blur warning badge -- top-right
                if (page.isBlurry)
                  Positioned(
                    right: 6,
                    top: 6,
                    child: Tooltip(
                      message: 'Blurry',
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: AppColors.warning.withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Icon(
                          Icons.warning_amber_rounded,
                          color: AppColors.warning,
                          size: 16,
                        ),
                      ),
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
