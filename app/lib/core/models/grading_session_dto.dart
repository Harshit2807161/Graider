/// Data transfer object representing a completed grading session for the
/// History screen.
///
/// A "grading session" is a [Course] that has at least one student with
/// `gradingStatus='graded'`. Aggregates course metadata, student counts,
/// average scores, and derives an exam type category from the course examTitle.
class GradingSessionDto {
  const GradingSessionDto({
    required this.id,
    required this.courseName,
    required this.examType,
    required this.date,
    required this.averageScore,
    required this.totalStudents,
    required this.studentId,
  });

  /// Course ID (used for navigation to results).
  final String id;

  /// Display name combining course name and exam title (e.g., "CS101 Midterm").
  final String courseName;

  /// Categorized exam type: "Midterm", "Quiz", or "Other".
  ///
  /// Derived from the course examTitle using keyword matching.
  final String examType;

  /// Date of the most recent grading activity (from submission createdAt).
  final DateTime date;

  /// Average score as a percentage (0-100) across all graded students.
  final double averageScore;

  /// Number of graded students in this session.
  final int totalStudents;

  /// ID of the first graded student (used for navigation to results screen).
  final String studentId;

  /// Categorizes an exam title into "Midterm", "Quiz", or "Other".
  ///
  /// Case-insensitive keyword matching:
  /// - Contains "midterm", "mid-term", or "mid term" -> "Midterm"
  /// - Contains "quiz" -> "Quiz"
  /// - Everything else -> "Other"
  static String categorizeExamType(String examTitle) {
    final lower = examTitle.toLowerCase();
    if (lower.contains('midterm') ||
        lower.contains('mid-term') ||
        lower.contains('mid term')) {
      return 'Midterm';
    }
    if (lower.contains('quiz')) {
      return 'Quiz';
    }
    return 'Other';
  }
}
