import 'package:flutter/material.dart';

import '../../../core/models/grading_session_dto.dart';
import '../../../core/theme/app_colors.dart';

/// A session card displaying a completed grading session's summary.
///
/// Matches the existing [CourseCard] visual pattern: Container with
/// AppColors.surface, borderRadius 16, padding 16. Shows course avatar,
/// name, date, average score percentage, and graded student count.
class SessionCard extends StatelessWidget {
  const SessionCard({super.key, required this.session, required this.onTap});

  /// The grading session data to display.
  final GradingSessionDto session;

  /// Called when the card is tapped.
  final VoidCallback onTap;

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
            // Top row: avatar, name/date, score
            Row(
              children: [
                _SessionAvatar(name: session.courseName),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        session.courseName,
                        style: const TextStyle(
                          color: AppColors.onBackground,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _formatDate(session.date),
                        style: const TextStyle(
                          color: AppColors.onSurfaceVariant,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _ScoreDisplay(averageScore: session.averageScore),
              ],
            ),

            const SizedBox(height: 10),

            // Bottom row: student count
            Row(
              children: [
                const SizedBox(width: 60), // Align with text after avatar
                Text(
                  '${session.totalStudents} student${session.totalStudents == 1 ? '' : 's'} graded',
                  style: const TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Formats a [DateTime] as "Feb 18, 2026" style.
  static String _formatDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}

/// Rounded-square avatar showing course initials with deterministic color.
///
/// Reuses the _CourseAvatar pattern from course_card.dart: name hash for
/// consistent color across 6 theme colors, initials from first two words.
class _SessionAvatar extends StatelessWidget {
  const _SessionAvatar({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
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

/// Displays the average score as a percentage badge.
///
/// Shows "85%" in primary color when score is available, or "--" when
/// no scores exist (averageScore == 0).
class _ScoreDisplay extends StatelessWidget {
  const _ScoreDisplay({required this.averageScore});

  final double averageScore;

  @override
  Widget build(BuildContext context) {
    final hasScore = averageScore > 0;
    final displayText =
        hasScore ? '${averageScore.round()}%' : '--';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: AppColors.primaryContainer,
      ),
      child: Text(
        displayText,
        style: TextStyle(
          color: hasScore ? AppColors.primary : AppColors.onSurfaceVariant,
          fontSize: 15,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
