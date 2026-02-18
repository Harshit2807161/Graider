import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../database/app_database.dart';
import '../models/grading_session_dto.dart';

/// Repository providing aggregated grading session data for the History screen.
///
/// A "grading session" = a Course that has at least one Student with
/// `gradingStatus='graded'`. For each such course, aggregates: graded student
/// count, average score percentage, most recent submission date, exam type
/// category, and the first graded student's ID for navigation.
class HistoryRepository {
  HistoryRepository({required AppDatabase db}) : _db = db;

  final AppDatabase _db;

  /// Returns completed grading sessions, optionally filtered by exam type.
  ///
  /// Query approach:
  /// 1. Select all courses that have at least one graded student.
  /// 2. For each course: count graded students, compute average score
  ///    (totalScore/maxScore as percentage), get the first graded student's
  ///    ID, derive examType from course examTitle.
  /// 3. If [typeFilter] is not null and not "All Sessions", filter results
  ///    by matching examType.
  /// 4. Order by most recent submission date (descending).
  Future<List<GradingSessionDto>> getGradingSessions({
    String? typeFilter,
  }) async {
    // Get all courses
    final courses = await (_db.select(_db.courses)
          ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)]))
        .get();

    final sessions = <GradingSessionDto>[];

    for (final course in courses) {
      // Find graded students for this course
      final gradedStudents = await (_db.select(_db.students)
            ..where((t) =>
                t.courseId.equals(course.id) &
                t.gradingStatus.equals('graded'))
            ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
          .get();

      if (gradedStudents.isEmpty) continue;

      // Compute average score percentage across graded students
      double totalPercentage = 0;
      int scoredCount = 0;
      for (final student in gradedStudents) {
        if (student.totalScore != null &&
            student.maxScore != null &&
            student.maxScore! > 0) {
          totalPercentage += (student.totalScore! / student.maxScore!) * 100;
          scoredCount++;
        }
      }
      final averageScore =
          scoredCount > 0 ? totalPercentage / scoredCount : 0.0;

      // Get the most recent submission date for this course
      final latestSubmission = await (_db.select(_db.submissions)
            ..where((t) => t.courseId.equals(course.id))
            ..orderBy([(t) => OrderingTerm.desc(t.createdAt)])
            ..limit(1))
          .getSingleOrNull();

      final sessionDate = latestSubmission?.createdAt ?? course.updatedAt;

      // Derive exam type
      final examType = GradingSessionDto.categorizeExamType(course.examTitle);

      // Build the display name
      final displayName = course.examTitle.isNotEmpty
          ? '${course.name} ${course.examTitle}'
          : course.name;

      sessions.add(GradingSessionDto(
        id: course.id,
        courseName: displayName,
        examType: examType,
        date: sessionDate,
        averageScore: averageScore,
        totalStudents: gradedStudents.length,
        studentId: gradedStudents.first.id,
      ));
    }

    // Apply type filter
    final filtered = (typeFilter != null && typeFilter != 'All Sessions')
        ? sessions.where((s) => s.examType == typeFilter).toList()
        : sessions;

    // Sort by date descending (newest first)
    filtered.sort((a, b) => b.date.compareTo(a.date));

    return filtered;
  }
}

// ---------------------------------------------------------------------------
// Riverpod providers
// ---------------------------------------------------------------------------

/// Provides a singleton [HistoryRepository] wired to the app's database.
final historyRepositoryProvider = Provider<HistoryRepository>((ref) {
  return HistoryRepository(db: ref.watch(appDatabaseProvider));
});

/// Tracks the currently selected filter chip on the History screen.
///
/// Possible values: "All Sessions", "Midterms", "Quizzes".
final historyFilterProvider = StateProvider<String>((ref) => 'All Sessions');

/// Provides the list of grading sessions as an [AsyncValue], filtered by
/// the current [historyFilterProvider] selection.
///
/// Auto-refreshes when the filter changes or when invalidated (pull-to-refresh).
final historyListProvider =
    FutureProvider<List<GradingSessionDto>>((ref) async {
  final repo = ref.watch(historyRepositoryProvider);
  final filter = ref.watch(historyFilterProvider);
  return repo.getGradingSessions(typeFilter: filter);
});
