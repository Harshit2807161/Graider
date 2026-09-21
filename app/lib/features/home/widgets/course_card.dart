import 'package:flutter/material.dart';

import '../../../core/models/course_dto.dart';
import '../../../core/theme/app_colors.dart';

/// A course card matching the Figma `professor_dashboard_1` mockup.
///
/// Displays: leading avatar with course initials, course name, subtitle,
/// status badge (Active/Processing/Stopped), and a grading progress bar.
class CourseCard extends StatelessWidget {
  const CourseCard({super.key, required this.course, this.onTap});

  /// The course data to display.
  final CourseDto course;

  /// Called when the card is tapped. Typically navigates to course detail.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            // Top row: avatar, name/subtitle, status badge
            Row(
              children: [
                _CourseAvatar(name: course.name),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        course.name,
                        style: const TextStyle(
                          color: AppColors.onBackground,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (course.subtitle.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          course.subtitle,
                          style: const TextStyle(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 13,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _StatusBadge(status: course.status),
              ],
            ),

            const SizedBox(height: 12),

            // Progress row
            Row(
              children: [
                const Text(
                  'Grading Progress',
                  style: TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
                const Spacer(),
                Text(
                  '${course.gradedCount}/${course.totalStudents}',
                  style: const TextStyle(
                    color: AppColors.onSurface,
                    fontSize: 12,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 6),

            // Progress bar
            _ProgressBar(
              value: course.totalStudents > 0
                  ? course.gradedCount / course.totalStudents
                  : 0.0,
            ),
          ],
        ),
      ),
    );
  }
}

/// Circular avatar showing the first two characters of the course name.
///
/// Uses a color derived from the course name hash for visual variety
/// across different courses (matching the Figma mockup's colored icons).
class _CourseAvatar extends StatelessWidget {
  const _CourseAvatar({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    // Generate a consistent color from the course name
    final colors = [
      AppColors.primary,
      AppColors.success,
      AppColors.warning,
      const Color(0xFF8B5CF6), // Purple
      const Color(0xFFEC4899), // Pink
      const Color(0xFF06B6D4), // Cyan
    ];
    final colorIndex = name.hashCode.abs() % colors.length;
    final color = colors[colorIndex];

    // Extract initials: first two chars or icon-like abbreviation
    final initials = _extractInitials(name);

    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: color.withValues(alpha: 0.15),
      ),
      child: Center(
        child: Text(
          initials,
          style: TextStyle(
            color: color,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  String _extractInitials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    if (name.length >= 2) {
      return name.substring(0, 2).toUpperCase();
    }
    return name.toUpperCase();
  }
}

/// Status badge showing course state with appropriate color.
///
/// "active" -> green, "processing" -> yellow, "stopped" -> red.
class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status.toLowerCase()) {
      'active' => (AppColors.success, 'ACTIVE'),
      'processing' => (AppColors.warning, 'PROCESSING'),
      'stopped' => (AppColors.error, 'STOPPED'),
      _ => (AppColors.onSurfaceVariant, status.toUpperCase()),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: color.withValues(alpha: 0.15),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

/// Rounded progress bar with green fill on dark container background.
class _ProgressBar extends StatelessWidget {
  const _ProgressBar({required this.value});

  /// Progress value between 0.0 and 1.0.
  final double value;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(3),
      child: SizedBox(
        height: 6,
        child: LinearProgressIndicator(
          value: value.clamp(0.0, 1.0),
          backgroundColor: AppColors.surfaceContainer,
          valueColor: const AlwaysStoppedAnimation<Color>(AppColors.success),
        ),
      ),
    );
  }
}
