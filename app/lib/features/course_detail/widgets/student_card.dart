import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/student_dto.dart';
import '../../../core/models/submission_dto.dart';
import '../../../core/theme/app_colors.dart';
import 'sync_status_badge.dart';

/// A student row card matching the Figma `cs101_midterm_details` mockup.
///
/// Displays: colored avatar with initials, student name, roll number,
/// score (or "-- /100" if not graded), and a status badge.
class StudentCard extends StatelessWidget {
  const StudentCard({
    super.key,
    required this.student,
    this.onTap,
    this.syncStatus,
    this.onRetryTap,
    this.submission,
    this.courseId,
  });

  final StudentDto student;
  final VoidCallback? onTap;

  /// Sync status for this student's submission: "pending", "uploading",
  /// "synced", "failed". Null if no submission exists yet.
  final String? syncStatus;

  /// Called when a failed sync badge is tapped to trigger retry.
  final VoidCallback? onRetryTap;

  /// Full submission DTO for the student info sheet actions.
  final SubmissionDto? submission;

  /// Course ID needed for per-student submit action.
  final String? courseId;

  /// Determines the default tap action based on grading status.
  ///
  /// - If [onTap] is explicitly provided, uses it.
  /// - If grading status is 'graded' or 'processing', navigates to the
  ///   results screen passing studentId (not studentIndex).
  /// - Otherwise, navigates to the student detail screen.
  void _handleTap(BuildContext context) {
    if (onTap != null) {
      onTap!();
      return;
    }

    final status = student.gradingStatus.toLowerCase();
    if ((status == 'graded' || status == 'processing') && courseId != null) {
      context.push(
        '/course/$courseId/results?studentId=${student.id}',
      );
    } else if (courseId != null) {
      context.push('/course/$courseId/student/${student.id}');
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => _handleTap(context),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            // Avatar with initials
            _StudentAvatar(name: student.name),
            const SizedBox(width: 12),

            // Name and roll number
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    student.name,
                    style: const TextStyle(
                      color: AppColors.onBackground,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    student.rollNumber,
                    style: const TextStyle(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            // Score and status badge
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _ScoreText(student: student),
                const SizedBox(height: 4),
                _StatusBadge(status: student.gradingStatus),
              ],
            ),

            // Sync status cloud icon (if submission exists)
            if (syncStatus != null) ...[
              const SizedBox(width: 8),
              SyncStatusBadge(
                status: syncStatus!,
                onRetryTap: onRetryTap,
              ),
            ],
          ],
        ),
      ),
    );
  }

}

/// Displays the score text -- actual score if graded, "-- /100" otherwise.
class _ScoreText extends StatelessWidget {
  const _ScoreText({required this.student});

  final StudentDto student;

  @override
  Widget build(BuildContext context) {
    final maxScore = (student.maxScore ?? 100).toInt();

    if (student.gradingStatus == 'graded' && student.totalScore != null) {
      return Text.rich(
        TextSpan(
          children: [
            TextSpan(
              text: '${student.totalScore!.toInt()}',
              style: const TextStyle(
                color: AppColors.onBackground,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            TextSpan(
              text: '/$maxScore',
              style: const TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 13,
              ),
            ),
          ],
        ),
      );
    }

    return Text.rich(
      TextSpan(
        children: [
          const TextSpan(
            text: '-- ',
            style: TextStyle(
              color: AppColors.onSurfaceVariant,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          TextSpan(
            text: '/$maxScore',
            style: const TextStyle(
              color: AppColors.onSurfaceVariant,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

/// Status badge with colored background: graded=green, processing=yellow, pending=red.
class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final (color, label) = _statusStyle(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(6),
        color: color.withValues(alpha: 0.2),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// Circular avatar with student initials and deterministic color.
///
/// Color is derived from name hash using a palette of purple, green, orange,
/// blue, and pink to match the Figma's colorful avatars.
class _StudentAvatar extends StatelessWidget {
  const _StudentAvatar({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final colors = [
      const Color(0xFF8B5CF6), // Purple
      AppColors.success, // Green
      const Color(0xFFF97316), // Orange
      AppColors.primary, // Blue
      const Color(0xFFEC4899), // Pink
    ];
    final colorIndex = name.hashCode.abs() % colors.length;
    final color = colors[colorIndex];

    final initials = _extractInitials(name);

    return CircleAvatar(
      radius: 20,
      backgroundColor: color,
      child: Text(
        initials,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 14,
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

/// Returns (color, label) for a grading status string.
(Color, String) _statusStyle(String status) {
  return switch (status.toLowerCase()) {
    'graded' => (AppColors.success, 'GRADED'),
    'processing' => (AppColors.warning, 'PROCESSING'),
    'pending' => (AppColors.error, 'PENDING'),
    _ => (AppColors.onSurfaceVariant, status.toUpperCase()),
  };
}

