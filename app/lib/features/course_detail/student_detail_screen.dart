import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/grading_result_dto.dart';
import '../../core/models/scan_session.dart';
import '../../core/models/scanned_page_dto.dart';
import '../../core/models/student_dto.dart';
import '../../core/models/submission_dto.dart';
import '../../core/repositories/grading_repository.dart';
import '../../core/repositories/scan_repository.dart';
import '../../core/repositories/student_repository.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/submit_actions.dart';
import 'widgets/sync_status_badge.dart';

/// Full-screen detail screen for a single student within a course.
///
/// Shows student info header, scanned page thumbnails, grading scores with
/// reasoning, and sync/submit actions. Replaces the previous modal bottom
/// sheet for pending students.
class StudentDetailScreen extends ConsumerWidget {
  const StudentDetailScreen({
    super.key,
    required this.courseId,
    required this.studentId,
  });

  final String courseId;
  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentsAsync = ref.watch(studentListProvider(courseId));
    final submissionsAsync = ref.watch(submissionStatusProvider(courseId));

    return studentsAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(title: const Text('Student')),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => Scaffold(
        appBar: AppBar(title: const Text('Student')),
        body: Center(
          child: Text(
            'Failed to load student data',
            style: TextStyle(
              color: AppColors.onSurfaceVariant.withValues(alpha: 0.7),
            ),
          ),
        ),
      ),
      data: (students) {
        final student = students.where((s) => s.id == studentId).firstOrNull;

        if (student == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Student')),
            body: const Center(
              child: Text(
                'Student not found',
                style: TextStyle(color: AppColors.onSurfaceVariant),
              ),
            ),
          );
        }

        final submissions = submissionsAsync.valueOrNull ?? {};
        final submission = submissions[studentId];
        final syncStatus = _deriveSyncStatus(submission);

        return Scaffold(
          appBar: AppBar(
            title: Text(
              student.name,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            centerTitle: true,
          ),
          body: _StudentDetailBody(
            student: student,
            submission: submission,
            syncStatus: syncStatus,
            courseId: courseId,
          ),
        );
      },
    );
  }

  /// Derives the sync status string from a submission's status field.
  String? _deriveSyncStatus(SubmissionDto? submission) {
    if (submission == null) return null;
    return switch (submission.status) {
      'pending' => 'pending',
      'uploading' => 'uploading',
      'synced' => 'synced',
      'failed' => 'failed',
      _ => submission.status,
    };
  }
}

/// Main body content for the student detail screen.
///
/// Separated as a [ConsumerWidget] so that conditional ref.watch calls
/// (grading results, scanned pages) are at the top level of a build method.
class _StudentDetailBody extends ConsumerWidget {
  const _StudentDetailBody({
    required this.student,
    required this.submission,
    required this.syncStatus,
    required this.courseId,
  });

  final StudentDto student;
  final SubmissionDto? submission;
  final String? syncStatus;
  final String courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch grading results if submission exists
    final AsyncValue<List<GradingResultDto>>? resultsAsync =
        submission != null
            ? ref.watch(studentGradingResultsProvider(submission!.id))
            : null;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Student info header
                _StudentInfoHeader(
                  student: student,
                  syncStatus: syncStatus,
                ),

                const SizedBox(height: 24),

                // Scanned pages section
                if (submission != null)
                  _ScannedPagesSection(submissionId: submission!.id),

                if (submission != null) const SizedBox(height: 24),

                // Scores section
                _ScoresSection(
                  student: student,
                  resultsAsync: resultsAsync,
                ),
              ],
            ),
          ),
        ),

        // Bottom action bar
        _BottomActionBar(
          student: student,
          submission: submission,
          syncStatus: syncStatus,
          courseId: courseId,
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Student Info Header
// ---------------------------------------------------------------------------

/// Displays the student avatar, name, roll number, grading status badge,
/// and sync status badge.
class _StudentInfoHeader extends StatelessWidget {
  const _StudentInfoHeader({
    required this.student,
    required this.syncStatus,
  });

  final StudentDto student;
  final String? syncStatus;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          _StudentAvatar(name: student.name, radius: 28),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  student.name,
                  style: const TextStyle(
                    color: AppColors.onBackground,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  student.rollNumber,
                  style: const TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _StatusBadge(status: student.gradingStatus),
                    if (syncStatus != null) ...[
                      const SizedBox(width: 8),
                      SyncStatusBadge(status: syncStatus!),
                      const SizedBox(width: 4),
                      Text(
                        _syncStatusLabel(syncStatus!),
                        style: const TextStyle(
                          color: AppColors.onSurfaceVariant,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          // Score display
          if (student.gradingStatus == 'graded' &&
              student.totalScore != null) ...[
            Column(
              children: [
                Text(
                  '${student.totalScore!.toInt()}',
                  style: const TextStyle(
                    color: AppColors.onBackground,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '/ ${(student.maxScore ?? 100).toInt()}',
                  style: const TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Scanned Pages Section
// ---------------------------------------------------------------------------

/// Grid of scanned page thumbnails. Each thumbnail is tappable to view
/// the full-size image in a dialog.
class _ScannedPagesSection extends ConsumerWidget {
  const _ScannedPagesSection({required this.submissionId});

  final String submissionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scanRepo = ref.watch(scanRepositoryProvider);

    return FutureBuilder<List<ScannedPageDto>>(
      future: scanRepo.getPages(submissionId),
      builder: (context, snapshot) {
        final pages = snapshot.data ?? [];
        if (pages.isEmpty) {
          return const SizedBox.shrink();
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SCANNED PAGES (${pages.length})',
              style: const TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.0,
              ),
            ),
            const SizedBox(height: 12),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 0.75,
              ),
              itemCount: pages.length,
              itemBuilder: (context, index) {
                final page = pages[index];
                return _PageThumbnail(page: page);
              },
            ),
          ],
        );
      },
    );
  }
}

/// A single scanned page thumbnail. Tapping opens the full-size image
/// in a dialog overlay.
class _PageThumbnail extends StatelessWidget {
  const _PageThumbnail({required this.page});

  final ScannedPageDto page;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showFullImage(context),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceContainer,
          borderRadius: BorderRadius.circular(8),
          border: page.isBlurry
              ? Border.all(color: AppColors.warning, width: 1.5)
              : null,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.file(
                File(page.localPath),
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const Center(
                  child: Icon(
                    Icons.broken_image_outlined,
                    color: AppColors.onSurfaceVariant,
                    size: 28,
                  ),
                ),
              ),
              // Page number label
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
                  color: Colors.black54,
                  child: Text(
                    page.type == 'cover'
                        ? 'Cover'
                        : 'Page ${page.pageNumber}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              // Blur warning indicator
              if (page.isBlurry)
                Positioned(
                  top: 4,
                  right: 4,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Icon(
                      Icons.blur_on,
                      size: 14,
                      color: Colors.white,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  /// Opens a full-screen dialog showing the scanned page image.
  void _showFullImage(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Close button
            Align(
              alignment: Alignment.topRight,
              child: IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(
                  Icons.close,
                  color: Colors.white,
                  size: 28,
                ),
              ),
            ),
            // Image
            Flexible(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: InteractiveViewer(
                  child: Image.file(
                    File(page.localPath),
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => Container(
                      width: 200,
                      height: 200,
                      color: AppColors.surfaceContainer,
                      child: const Center(
                        child: Icon(
                          Icons.broken_image_outlined,
                          color: AppColors.onSurfaceVariant,
                          size: 48,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Page info
            Text(
              page.type == 'cover'
                  ? 'Cover Page'
                  : 'Page ${page.pageNumber}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Scores Section
// ---------------------------------------------------------------------------

/// Displays per-question grading scores and reasoning if graded, or an
/// "Awaiting grading" message if pending.
class _ScoresSection extends StatelessWidget {
  const _ScoresSection({
    required this.student,
    required this.resultsAsync,
  });

  final StudentDto student;
  final AsyncValue<List<GradingResultDto>>? resultsAsync;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'SCORES',
          style: TextStyle(
            color: AppColors.onSurfaceVariant,
            fontSize: 11,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.0,
          ),
        ),
        const SizedBox(height: 12),
        _buildContent(),
      ],
    );
  }

  Widget _buildContent() {
    final status = student.gradingStatus.toLowerCase();

    // Not graded yet
    if (status != 'graded' && status != 'processing') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(
              Icons.hourglass_empty_rounded,
              size: 40,
              color: AppColors.onSurfaceVariant.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 12),
            const Text(
              'Awaiting grading',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Scores will appear here after grading is complete',
              style: TextStyle(
                color: AppColors.onSurfaceVariant.withValues(alpha: 0.7),
                fontSize: 13,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    // Processing state
    if (status == 'processing') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Column(
          children: [
            SizedBox(
              width: 32,
              height: 32,
              child: CircularProgressIndicator(
                color: AppColors.primary,
                strokeWidth: 2.5,
              ),
            ),
            SizedBox(height: 12),
            Text(
              'Grading in progress...',
              style: TextStyle(
                color: AppColors.onBackground,
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    }

    // Graded -- show results
    if (resultsAsync == null) {
      return const SizedBox.shrink();
    }

    return resultsAsync!.when(
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: CircularProgressIndicator(),
        ),
      ),
      error: (error, _) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.error.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Text(
          'Failed to load grading results',
          style: TextStyle(color: AppColors.error, fontSize: 14),
          textAlign: TextAlign.center,
        ),
      ),
      data: (results) {
        if (results.isEmpty) {
          return Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'No results available yet',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
          );
        }

        return Column(
          children: results.map((result) {
            return _QuestionResultCard(result: result);
          }).toList(),
        );
      },
    );
  }
}

/// Card displaying a single question's grading result with score and reasoning.
class _QuestionResultCard extends StatelessWidget {
  const _QuestionResultCard({required this.result});

  final GradingResultDto result;

  @override
  Widget build(BuildContext context) {
    final isFailed = result.status == 'failed';
    final scoreColor = isFailed
        ? AppColors.error
        : _scoreColor(result.effectivePercentage);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Question header with score
          Row(
            children: [
              // Question ID
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  result.questionId,
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Grader label
              Text(
                result.grader,
                style: const TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 12,
                ),
              ),
              const Spacer(),
              // Score
              if (isFailed)
                const Text(
                  'FAILED',
                  style: TextStyle(
                    color: AppColors.error,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                )
              else
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: result.effectiveScore.toStringAsFixed(1),
                        style: TextStyle(
                          color: scoreColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      TextSpan(
                        text: ' / ${result.maxScore.toStringAsFixed(1)}',
                        style: const TextStyle(
                          color: AppColors.onSurfaceVariant,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),

          // Override indicator
          if (result.isOverridden) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.edit, size: 12, color: AppColors.warning),
                const SizedBox(width: 4),
                Text(
                  'Overridden (AI: ${result.score.toStringAsFixed(1)})',
                  style: const TextStyle(
                    color: AppColors.warning,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ],

          const SizedBox(height: 10),

          // Reasoning
          if (isFailed && result.failureReason != null) ...[
            Text(
              result.failureReason!,
              style: TextStyle(
                color: AppColors.error.withValues(alpha: 0.8),
                fontSize: 13,
              ),
            ),
          ] else if (result.reasoning.isNotEmpty) ...[
            const Text(
              'Reasoning',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              result.reasoning,
              style: const TextStyle(
                color: AppColors.onSurface,
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ],

          // Feedback
          if (!isFailed && result.feedback.isNotEmpty) ...[
            const SizedBox(height: 8),
            const Text(
              'Feedback',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              result.feedback,
              style: const TextStyle(
                color: AppColors.onSurface,
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Returns a color for the score based on the percentage.
  Color _scoreColor(double percentage) {
    if (percentage >= 80) return AppColors.success;
    if (percentage >= 50) return AppColors.warning;
    return AppColors.error;
  }
}

// ---------------------------------------------------------------------------
// Bottom Action Bar
// ---------------------------------------------------------------------------

/// Bottom bar showing sync status and submit/retry actions.
class _BottomActionBar extends ConsumerWidget {
  const _BottomActionBar({
    required this.student,
    required this.submission,
    required this.syncStatus,
    required this.courseId,
  });

  final StudentDto student;
  final SubmissionDto? submission;
  final String? syncStatus;
  final String courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // No submission -- show scan prompt
    if (submission == null) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(
            top: BorderSide(color: AppColors.outline, width: 0.5),
          ),
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () {
                ref.read(scanSessionProvider.notifier).startSession(courseId);
                context.push('/course/$courseId/scan');
              },
              icon: const Icon(Icons.document_scanner_outlined, size: 20),
              label: const Text(
                'Scan Answer Sheet',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              ),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(28),
                ),
              ),
            ),
          ),
        ),
      );
    }

    // Has submission -- show submit or status
    final showSubmitButton = syncStatus == 'synced' &&
        !submission!.gradingRequested;
    final showRetryButton = syncStatus == 'failed';
    final showUploadingMessage =
        syncStatus == 'pending' || syncStatus == 'uploading';

    // Nothing actionable for graded or already-requested submissions
    if (!showSubmitButton && !showRetryButton && !showUploadingMessage) {
      // For graded students, show a "View Results" button
      if (student.gradingStatus == 'graded' ||
          student.gradingStatus == 'processing') {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: const BoxDecoration(
            color: AppColors.surface,
            border: Border(
              top: BorderSide(color: AppColors.outline, width: 0.5),
            ),
          ),
          child: SafeArea(
            top: false,
            child: FilledButton.icon(
              onPressed: () {
                context.push(
                  '/course/$courseId/results?studentId=${student.id}',
                );
              },
              icon: const Icon(Icons.assessment_outlined, size: 20),
              label: const Text(
                'View Full Results',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              ),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(28),
                ),
              ),
            ),
          ),
        );
      }

      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(
          top: BorderSide(color: AppColors.outline, width: 0.5),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (showSubmitButton)
              SizedBox(
                width: double.infinity,
                child: SubmitButton(
                  submission: submission!,
                  courseId: courseId,
                ),
              ),
            if (showRetryButton)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    // Retry is handled by the upload queue -- user can
                    // navigate back to course detail to trigger retry.
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                            'Return to course to retry upload'),
                        backgroundColor: AppColors.primary,
                      ),
                    );
                  },
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('Retry Upload'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                ),
              ),
            if (showUploadingMessage)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 1.5,
                        color: AppColors.primary,
                      ),
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Upload in progress...',
                      style: TextStyle(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 13,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Shared widgets (matching student_card.dart patterns)
// ---------------------------------------------------------------------------

/// Circular avatar with student initials and deterministic color.
class _StudentAvatar extends StatelessWidget {
  const _StudentAvatar({required this.name, this.radius = 20});

  final String name;
  final double radius;

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
      radius: radius,
      backgroundColor: color,
      child: Text(
        initials,
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: radius * 0.55,
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

/// Status badge with colored background: graded=green, processing=yellow,
/// pending=red. Matches the pattern from student_card.dart.
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

/// Returns (color, label) for a grading status string.
(Color, String) _statusStyle(String status) {
  return switch (status.toLowerCase()) {
    'graded' => (AppColors.success, 'GRADED'),
    'processing' => (AppColors.warning, 'PROCESSING'),
    'pending' => (AppColors.error, 'PENDING'),
    _ => (AppColors.onSurfaceVariant, status.toUpperCase()),
  };
}

/// Returns a human-readable label for a sync status string.
String _syncStatusLabel(String status) {
  return switch (status) {
    'pending' => 'Waiting to upload',
    'uploading' => 'Uploading...',
    'synced' => 'Uploaded',
    'failed' => 'Upload failed',
    _ => status,
  };
}
