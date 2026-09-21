import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../database/app_database.dart';

/// Data transfer object for per-question grading results with override support.
///
/// Bridges the backend results API JSON response and the Drift [GradingResults]
/// table. Supports professor overrides: the [score] field always holds the
/// original AI score (never mutated), while [overrideScore] holds the
/// professor's manual score when [isOverridden] is true.
class GradingResultDto {
  const GradingResultDto({
    required this.id,
    required this.submissionId,
    required this.studentId,
    required this.courseId,
    required this.questionId,
    required this.score,
    required this.maxScore,
    required this.percentage,
    required this.reasoning,
    required this.feedback,
    required this.grader,
    required this.confidence,
    this.status = 'graded',
    this.failureReason,
    this.isOverridden = false,
    this.overrideScore,
    this.overrideNote,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Client-generated UUID.
  final String id;

  /// Foreign key to the submission this result belongs to.
  final String submissionId;

  /// Foreign key to the student for quick lookups.
  final String studentId;

  /// Foreign key to the course for course-level queries.
  final String courseId;

  /// Question identifier from the backend (e.g., "Q1", "Q2a").
  final String questionId;

  /// AI-assigned score -- the ORIGINAL AI score, never mutated by overrides.
  final double score;

  /// Maximum possible score for this question.
  final double maxScore;

  /// Score as a percentage (0-100).
  final double percentage;

  /// AI reasoning text explaining the score.
  final String reasoning;

  /// Constructive feedback for the student.
  final String feedback;

  /// Which grader agent evaluated this question (e.g., "math", "english").
  final String grader;

  /// Grader confidence level (0.0 - 1.0).
  final double confidence;

  /// Result status: 'graded' or 'failed'.
  final String status;

  /// Reason for failure if the question could not be graded.
  final String? failureReason;

  /// Whether a professor has overridden the AI score.
  final bool isOverridden;

  /// Professor's manual score. Null unless overridden.
  final double? overrideScore;

  /// Optional reason for the override. Null unless overridden.
  final String? overrideNote;

  /// Row creation timestamp.
  final DateTime createdAt;

  /// Row last-updated timestamp.
  final DateTime updatedAt;

  /// The effective score for display: [overrideScore] if overridden,
  /// otherwise the original AI [score].
  double get effectiveScore => isOverridden ? (overrideScore ?? score) : score;

  /// The effective percentage: effectiveScore / maxScore * 100.
  double get effectivePercentage =>
      maxScore > 0 ? (effectiveScore / maxScore) * 100 : 0;

  /// Maps from the backend ResultsResponse.results[i] JSON.
  ///
  /// The backend returns per-question results with fields:
  /// question_id, score, max_score, percentage, reasoning, feedback,
  /// grader, confidence.
  ///
  /// Override fields are initialized to defaults (not overridden).
  factory GradingResultDto.fromJson(
    Map<String, dynamic> json, {
    required String submissionId,
    required String studentId,
    required String courseId,
  }) {
    final now = DateTime.now();
    return GradingResultDto(
      id: const Uuid().v4(),
      submissionId: submissionId,
      studentId: studentId,
      courseId: courseId,
      questionId: json['question_id'] as String? ?? '',
      score: (json['score'] as num?)?.toDouble() ?? 0,
      maxScore: (json['max_score'] as num?)?.toDouble() ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0,
      reasoning: json['reasoning'] as String? ?? '',
      feedback: json['feedback'] as String? ?? '',
      grader: json['grader'] as String? ?? 'unknown',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0,
      status: json['status'] as String? ?? 'graded',
      failureReason: json['failure_reason'] as String?,
      isOverridden: false,
      overrideScore: null,
      overrideNote: null,
      createdAt: now,
      updatedAt: now,
    );
  }

  /// Maps from a Drift-generated [GradingResult] data class.
  ///
  /// Fields map 1:1 from the GradingResults table columns.
  factory GradingResultDto.fromDrift(GradingResult row) {
    return GradingResultDto(
      id: row.id,
      submissionId: row.submissionId,
      studentId: row.studentId,
      courseId: row.courseId,
      questionId: row.questionId,
      score: row.score,
      maxScore: row.maxScore,
      percentage: row.percentage,
      reasoning: row.reasoning,
      feedback: row.feedback,
      grader: row.grader,
      confidence: row.confidence,
      status: row.status,
      failureReason: row.failureReason,
      isOverridden: row.isOverridden,
      overrideScore: row.overrideScore,
      overrideNote: row.overrideNote,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    );
  }

  /// Converts to a Drift [GradingResultsCompanion] for database inserts.
  ///
  /// Uses the existing [id] field. Sets [syncStatus] to the provided value
  /// (default 0 for synced API data).
  GradingResultsCompanion toDriftCompanion({int syncStatus = 0}) {
    return GradingResultsCompanion(
      id: Value(id),
      submissionId: Value(submissionId),
      studentId: Value(studentId),
      courseId: Value(courseId),
      questionId: Value(questionId),
      score: Value(score),
      maxScore: Value(maxScore),
      percentage: Value(percentage),
      reasoning: Value(reasoning),
      feedback: Value(feedback),
      grader: Value(grader),
      confidence: Value(confidence),
      status: Value(status),
      failureReason: Value(failureReason),
      isOverridden: Value(isOverridden),
      overrideScore: Value(overrideScore),
      overrideNote: Value(overrideNote),
      syncStatus: Value(syncStatus),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }
}
