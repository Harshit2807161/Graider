import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/grading_result_dto.dart';
import '../../core/models/student_dto.dart';
import '../../core/models/submission_dto.dart';
import '../../core/repositories/course_repository.dart';
import '../../core/repositories/grading_repository.dart';
import '../../core/repositories/scan_repository.dart';
import '../../core/repositories/student_repository.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/question_accordion.dart';
import 'widgets/score_header.dart';

/// Full grading results screen with PageView-based student navigation.
///
/// Accepts [courseId] and [initialStudentId] to identify which student's
/// results to display initially. Professors can swipe left/right to navigate
/// between students. Each page shows one of four states: no submission,
/// processing, graded, or failed.
class StudentResultsScreen extends ConsumerStatefulWidget {
  const StudentResultsScreen({
    super.key,
    required this.courseId,
    required this.initialStudentId,
  });

  /// The course this results view belongs to.
  final String courseId;

  /// The student whose results to display initially.
  final String initialStudentId;

  @override
  ConsumerState<StudentResultsScreen> createState() =>
      _StudentResultsScreenState();
}

class _StudentResultsScreenState extends ConsumerState<StudentResultsScreen> {
  PageController? _pageController;
  int _currentIndex = 0;

  @override
  void dispose() {
    _pageController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final studentsAsync = ref.watch(studentListProvider(widget.courseId));
    final coursesAsync = ref.watch(courseListProvider);
    final submissionsAsync =
        ref.watch(submissionStatusProvider(widget.courseId));

    // Resolve course name from cached courses
    final courseName = coursesAsync.maybeWhen(
      data: (courses) {
        final course =
            courses.where((c) => c.id == widget.courseId).firstOrNull;
        return course?.name ?? 'Results';
      },
      orElse: () => 'Results',
    );

    // Extract submissions map (null-safe)
    final submissions = submissionsAsync.valueOrNull ?? {};

    return Scaffold(
      appBar: AppBar(
        title: Column(
          children: [
            Text(
              courseName,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            studentsAsync.maybeWhen(
              data: (students) => Text(
                'Student ${_currentIndex + 1} of ${students.length}',
                style: const TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 12,
                ),
              ),
              orElse: () => const SizedBox.shrink(),
            ),
          ],
        ),
        centerTitle: true,
      ),
      body: studentsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Text(
            'Failed to load students',
            style: TextStyle(
              color: AppColors.onSurfaceVariant.withValues(alpha: 0.7),
            ),
          ),
        ),
        data: (students) {
          if (students.isEmpty) {
            return const Center(
              child: Text(
                'No students in this course',
                style: TextStyle(color: AppColors.onSurfaceVariant),
              ),
            );
          }

          // Sort students by roll number (matching course detail list order)
          final sortedStudents = List<StudentDto>.from(students)
            ..sort((a, b) => a.rollNumber.compareTo(b.rollNumber));

          // Resolve initial page index from initialStudentId
          final initialIndex = sortedStudents
              .indexWhere((s) => s.id == widget.initialStudentId);
          final resolvedIndex = initialIndex >= 0 ? initialIndex : 0;

          // Create PageController only once with the resolved initial page
          _pageController ??= PageController(initialPage: resolvedIndex);
          if (_currentIndex == 0 && resolvedIndex != 0) {
            _currentIndex = resolvedIndex;
          }

          return Column(
            children: [
              // Persistent student header above PageView
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    _StudentAvatar(
                        name: sortedStudents[_currentIndex].name),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            sortedStudents[_currentIndex].name,
                            style: const TextStyle(
                              color: AppColors.onBackground,
                              fontSize: 17,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            sortedStudents[_currentIndex].rollNumber,
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
              ),
              const Divider(color: AppColors.outline, height: 1),
              // PageView for swipe navigation
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: sortedStudents.length,
                  onPageChanged: (index) {
                    setState(() => _currentIndex = index);
                  },
                  itemBuilder: (context, index) {
                    final student = sortedStudents[index];
                    return _StudentResultPage(
                      student: student,
                      submission: submissions[student.id],
                      courseId: widget.courseId,
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Per-student result page rendered inside the PageView.
///
/// This is a separate [ConsumerWidget] so that [ref.watch] calls are at the
/// TOP LEVEL of its [build] method (Riverpod safe). The PageView.builder
/// simply instantiates this widget per page.
class _StudentResultPage extends ConsumerWidget {
  const _StudentResultPage({
    required this.student,
    required this.submission,
    required this.courseId,
  });

  final StudentDto student;
  final SubmissionDto? submission;
  final String courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // --- Unconditional ref.watch calls at top of build ---

    // Watch polling status if grading was requested
    final AsyncValue<String>? pollerStatus =
        (submission != null && submission!.gradingRequested)
            ? ref.watch(gradingStatusPollerProvider(submission!.id))
            : null;

    // Watch grading results if submission exists
    final AsyncValue<List<GradingResultDto>>? resultsAsync =
        submission != null
            ? ref.watch(studentGradingResultsProvider(submission!.id))
            : null;

    // Auto-refresh: listen for grading completion and invalidate results
    if (submission != null && submission!.gradingRequested) {
      ref.listen<AsyncValue<String>>(
        gradingStatusPollerProvider(submission!.id),
        (previous, next) {
          if (previous?.value != 'graded' && next.value == 'graded') {
            ref.invalidate(studentGradingResultsProvider(submission!.id));
          }
        },
      );
    }

    // --- Determine what to display ---

    // (a) No submission yet
    if (submission == null) {
      return _NoSubmissionState(student: student);
    }

    final submissionId = submission!.id;

    // Determine grading status from poller or submission status
    final gradingStatus = pollerStatus?.valueOrNull ?? submission!.status;

    // (b) Processing state
    if (submission!.gradingRequested &&
        gradingStatus != 'graded' &&
        gradingStatus != 'failed') {
      return _ProcessingState(
        submissionId: submissionId,
        currentStep: pollerStatus?.valueOrNull,
      );
    }

    // (c) & (d) Graded or Failed -- show results
    final results = resultsAsync?.valueOrNull ?? [];

    if (results.isEmpty && gradingStatus != 'failed') {
      // Still loading results
      return const Center(child: CircularProgressIndicator());
    }

    final gradedResults =
        results.where((r) => r.status == 'graded').toList();
    final failedResults =
        results.where((r) => r.status == 'failed').toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Score header
          if (gradedResults.isNotEmpty)
            ScoreHeader(results: results),

          const SizedBox(height: 16),

          // Scanned page thumbnails
          _ScannedPageThumbnails(submissionId: submissionId),

          const SizedBox(height: 16),

          // Question accordion (graded + failed)
          if (results.isNotEmpty)
            QuestionAccordion(
              results: results,
              submissionId: submissionId,
              onOverrideChanged: () {
                ref.invalidate(
                    studentGradingResultsProvider(submissionId));
              },
            ),

          // Failed-only state with no graded results
          if (gradedResults.isEmpty && failedResults.isNotEmpty)
            _AllFailedState(failedResults: failedResults),

          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

/// State shown when a student has no submission yet.
class _NoSubmissionState extends StatelessWidget {
  const _NoSubmissionState({required this.student});

  final StudentDto student;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.assignment_outlined,
            size: 64,
            color: AppColors.onSurfaceVariant.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          const Text(
            'No scans submitted yet',
            style: TextStyle(
              color: AppColors.onSurfaceVariant,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Scan ${student.name}\'s answer sheet to begin grading',
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
}

/// Processing state showing spinner and current grading step.
class _ProcessingState extends ConsumerWidget {
  const _ProcessingState({
    required this.submissionId,
    this.currentStep,
  });

  final String submissionId;
  final String? currentStep;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Scanned page thumbnails
          _ScannedPageThumbnails(submissionId: submissionId),

          const SizedBox(height: 32),

          // Grading in progress indicator
          Center(
            child: Column(
              children: [
                const CircularProgressIndicator(
                  color: AppColors.primary,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Grading in progress...',
                  style: TextStyle(
                    color: AppColors.onBackground,
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (currentStep != null &&
                    currentStep != 'pending' &&
                    currentStep != 'error') ...[
                  const SizedBox(height: 8),
                  Text(
                    _formatStep(currentStep!),
                    style: const TextStyle(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 13,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Formats a pipeline step string for display.
  String _formatStep(String step) {
    return switch (step) {
      'ocr_processing' => 'Extracting text from scans...',
      'triplet_forming' => 'Preparing answer triplets...',
      'grading' => 'AI grading in progress...',
      'uploading' => 'Uploading documents...',
      _ => step.replaceAll('_', ' '),
    };
  }
}

/// Horizontal row of scanned page thumbnails.
class _ScannedPageThumbnails extends ConsumerWidget {
  const _ScannedPageThumbnails({required this.submissionId});

  final String submissionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scanRepo = ref.watch(scanRepositoryProvider);

    return FutureBuilder(
      future: scanRepo.getPages(submissionId),
      builder: (context, snapshot) {
        final pages = snapshot.data ?? [];
        if (pages.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'SCANNED PAGES',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.0,
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 80,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: pages.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final page = pages[index];
                  return ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      width: 60,
                      height: 80,
                      color: AppColors.surfaceContainer,
                      child: Image.file(
                        File(page.localPath),
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.broken_image_outlined,
                          color: AppColors.onSurfaceVariant,
                          size: 24,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

/// State shown when all grading results failed.
class _AllFailedState extends StatelessWidget {
  const _AllFailedState({required this.failedResults});

  final List<GradingResultDto> failedResults;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.error_outline,
            color: AppColors.error,
            size: 32,
          ),
          const SizedBox(height: 8),
          const Text(
            'Unable to grade',
            style: TextStyle(
              color: AppColors.error,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${failedResults.length} question(s) could not be graded',
            style: TextStyle(
              color: AppColors.error.withValues(alpha: 0.8),
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

/// Circular avatar with student initials and deterministic color.
class _StudentAvatar extends StatelessWidget {
  const _StudentAvatar({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final colors = [
      const Color(0xFF8B5CF6),
      AppColors.success,
      const Color(0xFFF97316),
      AppColors.primary,
      const Color(0xFFEC4899),
    ];
    final colorIndex = name.hashCode.abs() % colors.length;
    final color = colors[colorIndex];

    final initials = _extractInitials(name);

    return CircleAvatar(
      radius: 22,
      backgroundColor: color,
      child: Text(
        initials,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 15,
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
