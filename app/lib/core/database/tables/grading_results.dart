import 'package:drift/drift.dart';

/// GradingResults table -- per-question grading data with override support.
///
/// Stores AI-assigned scores, reasoning, feedback, and grader info for each
/// question in a submission. Supports professor overrides via isOverridden,
/// overrideScore, and overrideNote columns.
///
/// Important: The [score] column holds the ORIGINAL AI score and is NEVER
/// mutated by overrides. When a professor overrides, only [overrideScore]
/// and [isOverridden] change. The UI uses `score` to display
/// "Manually adjusted from X" text.
class GradingResults extends Table {
  /// Client-generated UUID primary key.
  TextColumn get id => text()();

  /// Foreign key to submissions table.
  TextColumn get submissionId => text()();

  /// Foreign key to students table for quick lookups.
  TextColumn get studentId => text()();

  /// Foreign key to courses table for course-level queries.
  TextColumn get courseId => text()();

  /// Question identifier from the backend (e.g., "Q1", "Q2a").
  TextColumn get questionId => text()();

  /// AI-assigned score -- this is the ORIGINAL AI score and is NEVER mutated.
  RealColumn get score => real()();

  /// Maximum possible score for this question.
  RealColumn get maxScore => real()();

  /// Score as a percentage (0-100).
  RealColumn get percentage => real()();

  /// AI reasoning text explaining the score.
  TextColumn get reasoning => text()();

  /// Constructive feedback for the student.
  TextColumn get feedback => text()();

  /// Which grader agent evaluated this question (e.g., "math", "english").
  TextColumn get grader => text()();

  /// Grader confidence level (0.0 - 1.0).
  RealColumn get confidence => real()();

  /// Result status: 'graded' or 'failed' (for partial results where some
  /// questions could not be graded).
  TextColumn get status =>
      text().withDefault(const Constant('graded'))();

  /// Reason for failure if the question could not be graded. Null on success.
  TextColumn get failureReason => text().nullable()();

  /// Whether a professor has overridden the AI score.
  BoolColumn get isOverridden =>
      boolean().withDefault(const Constant(false))();

  /// Professor's manual score. Null unless overridden.
  RealColumn get overrideScore => real().nullable()();

  /// Optional reason for the override. Null unless overridden.
  TextColumn get overrideNote => text().nullable()();

  /// Sync status: 0=synced, 1=pending_create, 2=pending_update,
  /// 3=pending_delete, 4=conflict.
  IntColumn get syncStatus => integer().withDefault(const Constant(0))();

  /// Row creation timestamp.
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();

  /// Row last-updated timestamp.
  DateTimeColumn get updatedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
