import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Empty state widget for the dashboard when the professor has no courses.
///
/// Shows a warm onboarding illustration with a "Create your first course"
/// CTA button (per locked decision: illustration + CTA for warm onboarding).
class EmptyDashboard extends StatelessWidget {
  const EmptyDashboard({super.key, required this.onCreateCourse});

  /// Called when the "Create Your First Course" button is tapped.
  final VoidCallback onCreateCourse;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.school_outlined,
              size: 80,
              color: AppColors.onSurfaceVariant.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 24),
            const Text(
              'Welcome to Graider',
              style: TextStyle(
                color: AppColors.onBackground,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Create your first course to start grading',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: onCreateCourse,
              icon: const Icon(Icons.add),
              label: const Text(
                'Create Your First Course',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(28),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
