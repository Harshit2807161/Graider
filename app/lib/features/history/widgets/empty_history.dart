import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Empty state widget for the History screen when no grading sessions exist.
///
/// Shows a centered icon with instructional text following the EmptyDashboard
/// visual pattern from Phase 3.
class EmptyHistory extends StatelessWidget {
  const EmptyHistory({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.history,
              size: 80,
              color: AppColors.onSurfaceVariant.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 16),
            const Text(
              'No grading sessions yet',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Completed grading sessions will appear here',
              style: TextStyle(
                color: AppColors.onSurfaceVariant.withValues(alpha: 0.7),
                fontSize: 13,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
