import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/scan_session.dart';
import '../../../core/theme/app_colors.dart';

/// Overlay UI for continuous answer page capture.
///
/// Shows a running page count, thumbnails of recently scanned pages with blur
/// warning badges, and scan-next/done buttons. The "stays open" feel comes
/// from immediately re-prompting after each capture since
/// [CunningDocumentScanner] opens the native camera each time.
class ContinuousCaptureOverlay extends ConsumerWidget {
  const ContinuousCaptureOverlay({
    super.key,
    required this.onScanNext,
    required this.onDone,
  });

  /// Called to launch the scanner for the next page.
  final VoidCallback onScanNext;

  /// Called when the professor is done scanning pages.
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(scanSessionProvider);
    final pages = session?.answerPages ?? [];
    final pageCount = pages.length;

    return Container(
      color: AppColors.background,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(),

              // Student info
              if (session?.matchedStudentName != null) ...[
                Text(
                  session!.matchedStudentName!,
                  style: const TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 14,
                  ),
                ),
                if (session.matchedRollNumber != null)
                  Text(
                    session.matchedRollNumber!,
                    style: TextStyle(
                      color: AppColors.onSurfaceVariant.withValues(alpha: 0.7),
                      fontSize: 12,
                    ),
                  ),
                const SizedBox(height: 24),
              ],

              // Large page count display
              Text(
                '$pageCount',
                style: const TextStyle(
                  color: AppColors.onBackground,
                  fontSize: 72,
                  fontWeight: FontWeight.w700,
                  height: 1,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                pageCount == 1 ? 'page scanned' : 'pages scanned',
                style: const TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 32),

              // Thumbnail row of last 3 scanned pages
              if (pages.isNotEmpty) ...[
                SizedBox(
                  height: 72,
                  child: _buildThumbnailRow(pages),
                ),
                const SizedBox(height: 32),
              ],

              const Spacer(),

              // Action buttons
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: onScanNext,
                  icon: const Icon(Icons.camera_alt, size: 22),
                  label: const Text(
                    'Scan Next Page',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: onDone,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.onBackground,
                    side: const BorderSide(color: AppColors.outline),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                  child: Text(
                    'Done ($pageCount ${pageCount == 1 ? 'page' : 'pages'})',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
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

  /// Builds a horizontal scroll row of the last 3 scanned page thumbnails.
  Widget _buildThumbnailRow(List<ScannedPageInfo> pages) {
    // Show last 3 pages (most recent first).
    final recentPages = pages.length > 3
        ? pages.sublist(pages.length - 3)
        : pages;

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: recentPages.asMap().entries.map((entry) {
        final page = entry.value;
        // Calculate the actual page number (1-indexed).
        final pageNum = pages.length > 3
            ? pages.length - 2 + entry.key
            : entry.key + 1;

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: _PageThumbnail(
            page: page,
            pageNumber: pageNum,
          ),
        );
      }).toList(),
    );
  }
}

/// A small thumbnail of a scanned page with optional blur warning badge.
class _PageThumbnail extends StatelessWidget {
  const _PageThumbnail({
    required this.page,
    required this.pageNumber,
  });

  final ScannedPageInfo page;
  final int pageNumber;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        // Thumbnail image
        Container(
          width: 60,
          height: 72,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: page.isBlurry
                  ? AppColors.warning.withValues(alpha: 0.7)
                  : AppColors.outline,
              width: page.isBlurry ? 2 : 1,
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(7),
            child: Image.file(
              File(page.path),
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                color: AppColors.surfaceContainer,
                child: Center(
                  child: Text(
                    '$pageNumber',
                    style: const TextStyle(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),

        // Blur warning badge
        if (page.isBlurry)
          Positioned(
            top: -4,
            right: -4,
            child: Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: AppColors.warning,
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.background,
                  width: 2,
                ),
              ),
              child: const Icon(
                Icons.warning_amber_rounded,
                size: 12,
                color: Colors.black87,
              ),
            ),
          ),
      ],
    );
  }
}
