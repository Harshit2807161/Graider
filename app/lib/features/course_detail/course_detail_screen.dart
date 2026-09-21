import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/scan_session.dart';
import '../../core/models/student_dto.dart';
import '../../core/models/submission_dto.dart';
import '../../core/repositories/course_repository.dart';
import '../../core/repositories/grading_repository.dart';
import '../../core/repositories/scan_repository.dart';
import '../../core/repositories/student_repository.dart';
import '../../core/services/upload_queue_service.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/add_student_sheet.dart';
import 'widgets/document_slot.dart';
import 'widgets/student_card.dart';
import 'widgets/submit_actions.dart';
import 'widgets/summary_chips.dart';

/// Course detail screen matching the Figma `cs101_midterm_details` mockup.
///
/// Displays: app bar with course name, interactive document chips (Question
/// Paper / Answer Key), summary chips (Graded/Processing/Pending counts),
/// search bar, student list with cards, and a "New Scan" FAB.
///
/// Data flow: [studentListProvider] fetches from API (with Drift fallback)
/// keyed by [courseId]. Search filters in real-time by name or roll number.
class CourseDetailScreen extends ConsumerStatefulWidget {
  const CourseDetailScreen({super.key, required this.courseId});

  final String courseId;

  @override
  ConsumerState<CourseDetailScreen> createState() =>
      _CourseDetailScreenState();
}

class _CourseDetailScreenState extends ConsumerState<CourseDetailScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  /// Tracks student IDs for which a grading completion snackbar has already
  /// been shown, preventing duplicate notifications.
  final Set<String> _notifiedStudentIds = {};

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showAddStudentSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => AddStudentSheet(courseId: widget.courseId),
    );
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
        return course?.name ?? 'Course';
      },
      orElse: () => 'Course',
    );

    // Extract submissions map (null-safe -- empty map if loading/error)
    final submissions = submissionsAsync.valueOrNull ?? {};

    // Extract the student list for name lookups (null-safe)
    final students = studentsAsync.valueOrNull ?? [];

    // Register polling listeners for submissions that need grading status
    // monitoring. Uses ref.listen (safe in build) to fire snackbars on
    // grading completion without creating reactive dependencies in a loop.
    for (final submission in submissions.values) {
      if (submission.gradingRequested && submission.status == 'synced') {
        final student = students
            .where((s) => s.id == submission.studentId)
            .firstOrNull;
        final studentName = student?.name ?? 'Student';
        final studentId = submission.studentId;

        ref.listen<AsyncValue<String>>(
          gradingStatusPollerProvider(submission.id),
          (previous, next) {
            if (_notifiedStudentIds.contains(studentId)) return;
            if (previous?.value != 'graded' && next.value == 'graded') {
              _notifiedStudentIds.add(studentId);

              // Invalidate student list to refresh grading status
              ref.invalidate(studentListProvider(widget.courseId));

              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Grading complete for $studentName'),
                  backgroundColor: AppColors.success,
                  action: SnackBarAction(
                    label: 'View Results',
                    textColor: Colors.white,
                    onPressed: () {
                      context.push(
                        '/course/${widget.courseId}/results?studentId=$studentId',
                      );
                    },
                  ),
                ),
              );
            }
          },
        );
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          courseName,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            color: AppColors.surface,
            onSelected: (value) {
              if (value == 'add_student') {
                _showAddStudentSheet();
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'add_student',
                child: Row(
                  children: [
                    Icon(Icons.person_add_outlined,
                        size: 20, color: AppColors.onSurface),
                    SizedBox(width: 8),
                    Text('Add Student',
                        style: TextStyle(color: AppColors.onSurface)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: studentsAsync.when(
        loading: () => const _LoadingSkeleton(),
        error: (error, _) => _ErrorState(
          onRetry: () =>
              ref.invalidate(studentListProvider(widget.courseId)),
        ),
        data: (students) => _CourseDetailContent(
          courseId: widget.courseId,
          students: students,
          submissions: submissions,
          searchQuery: _searchQuery,
          searchController: _searchController,
          onSearchChanged: (query) {
            setState(() => _searchQuery = query);
          },
          onClearSearch: () {
            _searchController.clear();
            setState(() => _searchQuery = '');
          },
          onAddStudent: _showAddStudentSheet,
          onRetrySubmission: (submissionId) {
            ref.read(uploadQueueServiceProvider).retrySubmission(submissionId);
          },
        ),
      ),

      // New Scan FAB -- starts the scanning flow for this course
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          ref.read(scanSessionProvider.notifier).startSession(widget.courseId);
          context.push('/course/${widget.courseId}/scan');
        },
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.document_scanner),
        label: const Text(
          'New Scan',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      ),

      // Submit All bar at the bottom
      bottomNavigationBar: submissions.isNotEmpty
          ? SubmitAllBar(
              courseId: widget.courseId,
              submissions: submissions.values.toList(),
            )
          : null,
    );
  }
}

/// Main scrollable content for the course detail screen.
class _CourseDetailContent extends StatelessWidget {
  const _CourseDetailContent({
    required this.courseId,
    required this.students,
    required this.submissions,
    required this.searchQuery,
    required this.searchController,
    required this.onSearchChanged,
    required this.onClearSearch,
    required this.onAddStudent,
    required this.onRetrySubmission,
  });

  final String courseId;
  final List<StudentDto> students;
  final Map<String, SubmissionDto> submissions;
  final String searchQuery;
  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onClearSearch;
  final VoidCallback onAddStudent;
  final ValueChanged<String> onRetrySubmission;

  @override
  Widget build(BuildContext context) {
    // Compute summary counts
    final gradedCount =
        students.where((s) => s.gradingStatus == 'graded').length;
    final processingCount =
        students.where((s) => s.gradingStatus == 'processing').length;
    final pendingCount =
        students.where((s) => s.gradingStatus == 'pending').length;

    // Filter by search query
    final filteredStudents =
        StudentRepository.filterStudents(students, searchQuery);

    return CustomScrollView(
      slivers: [
        const SliverToBoxAdapter(child: SizedBox(height: 16)),

        // Document chips row -- interactive document slots
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: DocumentSlot(
                    courseId: courseId,
                    label: 'Question Paper',
                    icon: Icons.description_outlined,
                    documentType: 'question_paper',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: DocumentSlot(
                    courseId: courseId,
                    label: 'Answer Key',
                    icon: Icons.key_outlined,
                    documentType: 'answer_key',
                  ),
                ),
              ],
            ),
          ),
        ),

        const SliverToBoxAdapter(child: SizedBox(height: 16)),

        // Summary chips
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SummaryChips(
              gradedCount: gradedCount,
              processingCount: processingCount,
              pendingCount: pendingCount,
            ),
          ),
        ),

        const SliverToBoxAdapter(child: SizedBox(height: 16)),

        // Search bar
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: searchController,
              style: const TextStyle(color: AppColors.onBackground),
              onChanged: onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Search by name or roll no...',
                hintStyle: TextStyle(
                  color: AppColors.onSurfaceVariant.withValues(alpha: 0.6),
                ),
                prefixIcon: const Icon(
                  Icons.search,
                  color: AppColors.onSurfaceVariant,
                ),
                suffixIcon: searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(
                          Icons.close,
                          color: AppColors.onSurfaceVariant,
                        ),
                        onPressed: onClearSearch,
                      )
                    : null,
                filled: true,
                fillColor: AppColors.surfaceContainer,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
        ),

        const SliverToBoxAdapter(child: SizedBox(height: 12)),

        // Students header
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                const Text(
                  'STUDENTS',
                  style: TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.0,
                  ),
                ),
                const Spacer(),
                Text(
                  'SORTED BY ROLL NO',
                  style: TextStyle(
                    color: AppColors.onSurfaceVariant.withValues(alpha: 0.6),
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
        ),

        const SliverToBoxAdapter(child: SizedBox(height: 8)),

        // Student list or empty state
        if (students.isEmpty)
          SliverFillRemaining(
            hasScrollBody: false,
            child: _EmptyStudentsState(onAddStudent: onAddStudent),
          )
        else if (filteredStudents.isEmpty)
          const SliverFillRemaining(
            hasScrollBody: false,
            child: _NoSearchResultsState(),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList.separated(
              itemCount: filteredStudents.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final student = filteredStudents[index];
                final submission = submissions[student.id];
                return StudentCard(
                  student: student,
                  syncStatus: submission?.status,
                  onRetryTap: submission?.status == 'failed'
                      ? () => onRetrySubmission(submission!.id)
                      : null,
                  submission: submission,
                  courseId: courseId,
                );
              },
            ),
          ),

        // Bottom padding for FAB clearance
        const SliverToBoxAdapter(child: SizedBox(height: 80)),
      ],
    );
  }
}

/// Empty state when no students exist in the course.
class _EmptyStudentsState extends StatelessWidget {
  const _EmptyStudentsState({required this.onAddStudent});

  final VoidCallback onAddStudent;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.people_outline,
            size: 64,
            color: AppColors.onSurfaceVariant.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          const Text(
            'No students in this course yet',
            style: TextStyle(
              color: AppColors.onSurfaceVariant,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onAddStudent,
            icon: const Icon(Icons.person_add_outlined),
            label: const Text('Add Student'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(28),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Shown when search yields no matching students.
class _NoSearchResultsState extends StatelessWidget {
  const _NoSearchResultsState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off,
            size: 48,
            color: AppColors.onSurfaceVariant.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 12),
          const Text(
            'No students match your search',
            style: TextStyle(
              color: AppColors.onSurfaceVariant,
              fontSize: 15,
            ),
          ),
        ],
      ),
    );
  }
}

/// Loading skeleton showing placeholder cards while student data loads.
class _LoadingSkeleton extends StatelessWidget {
  const _LoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Document chips placeholder
        Row(
          children: [
            Container(
              width: 140,
              height: 36,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                color: AppColors.surfaceContainer,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              width: 120,
              height: 36,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                color: AppColors.surfaceContainer,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Summary chips placeholder
        Row(
          children: [
            for (var i = 0; i < 3; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              Expanded(
                child: Container(
                  height: 72,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: AppColors.surfaceContainer,
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 16),

        // Search bar placeholder
        Container(
          height: 48,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: AppColors.surfaceContainer,
          ),
        ),
        const SizedBox(height: 16),

        // Student card placeholders
        for (var i = 0; i < 4; i++) ...[
          Container(
            height: 64,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: AppColors.surfaceContainer,
            ),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}

/// Error state shown when student fetch fails with no cached data.
class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: AppColors.onSurfaceVariant.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          const Text(
            'Failed to load students',
            style: TextStyle(
              color: AppColors.onBackground,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Please check your connection and try again',
            style: TextStyle(
              color: AppColors.onSurfaceVariant,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Try Again'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(28),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
