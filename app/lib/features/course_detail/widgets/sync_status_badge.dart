import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// A small cloud icon badge reflecting the sync state of a submission.
///
/// Four states:
/// - `pending`: gray cloud-upload icon (waiting to upload)
/// - `uploading`: blue circular progress indicator (actively uploading)
/// - `synced`: green cloud-done icon (upload complete)
/// - `failed`: red cloud-off icon, tappable to retry
///
/// When status is `failed` and [onRetryTap] is provided, the badge is
/// wrapped in a [GestureDetector] for immediate retry on tap.
class SyncStatusBadge extends StatelessWidget {
  const SyncStatusBadge({
    super.key,
    required this.status,
    this.onRetryTap,
  });

  /// Submission status: "pending", "uploading", "synced", "failed".
  final String status;

  /// Called when a failed badge is tapped. Triggers immediate retry.
  final VoidCallback? onRetryTap;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = _iconAndColor;

    // For "uploading" state, show a small circular progress indicator
    if (status == 'uploading') {
      return const SizedBox(
        width: 16,
        height: 16,
        child: CircularProgressIndicator(
          strokeWidth: 1.5,
          color: AppColors.primary,
        ),
      );
    }

    final iconWidget = Icon(icon, size: 16, color: color);

    // Failed state is tappable for immediate retry
    if (status == 'failed' && onRetryTap != null) {
      return GestureDetector(
        onTap: onRetryTap,
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: iconWidget,
        ),
      );
    }

    return iconWidget;
  }

  /// Returns the (icon, color) pair for the current sync status.
  (IconData, Color) get _iconAndColor {
    return switch (status) {
      'pending' => (Icons.cloud_upload_outlined, AppColors.onSurfaceVariant),
      'uploading' => (Icons.cloud_sync_outlined, AppColors.primary),
      'synced' => (Icons.cloud_done_outlined, AppColors.success),
      'failed' => (Icons.cloud_off_outlined, AppColors.error),
      _ => (Icons.cloud_outlined, AppColors.onSurfaceVariant),
    };
  }
}
