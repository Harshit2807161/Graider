import 'package:flutter_riverpod/flutter_riverpod.dart';

/// In-memory state model tracking the active scanning flow.
///
/// This is NOT persisted to Drift -- it only lives while a scan session is
/// in progress. The flow is: start session -> capture cover page -> confirm
/// student identity -> capture answer pages -> complete.
class ScanSession {
  const ScanSession({
    required this.courseId,
    this.coverPagePath,
    this.coverPageCaptured = false,
    this.matchedStudentId,
    this.matchedStudentName,
    this.matchedRollNumber,
    this.answerPages = const [],
    this.isComplete = false,
  });

  /// The course this scan session belongs to.
  final String courseId;

  /// Local path to the captured cover page image.
  final String? coverPagePath;

  /// Whether the cover page has been captured.
  final bool coverPageCaptured;

  /// Student ID confirmed after identity verification.
  final String? matchedStudentId;

  /// Confirmed student name after identity verification.
  final String? matchedStudentName;

  /// Confirmed roll number after identity verification.
  final String? matchedRollNumber;

  /// Captured answer pages in order.
  final List<ScannedPageInfo> answerPages;

  /// Whether the scanning flow is complete.
  final bool isComplete;

  /// Creates a copy with the given fields replaced.
  ScanSession copyWith({
    String? courseId,
    String? coverPagePath,
    bool? coverPageCaptured,
    String? matchedStudentId,
    String? matchedStudentName,
    String? matchedRollNumber,
    List<ScannedPageInfo>? answerPages,
    bool? isComplete,
  }) {
    return ScanSession(
      courseId: courseId ?? this.courseId,
      coverPagePath: coverPagePath ?? this.coverPagePath,
      coverPageCaptured: coverPageCaptured ?? this.coverPageCaptured,
      matchedStudentId: matchedStudentId ?? this.matchedStudentId,
      matchedStudentName: matchedStudentName ?? this.matchedStudentName,
      matchedRollNumber: matchedRollNumber ?? this.matchedRollNumber,
      answerPages: answerPages ?? this.answerPages,
      isComplete: isComplete ?? this.isComplete,
    );
  }
}

/// Information about a single scanned answer page.
class ScannedPageInfo {
  const ScannedPageInfo({
    required this.path,
    required this.isBlurry,
    required this.blurVariance,
  });

  /// Local file path to the scanned page image.
  final String path;

  /// Whether blur detection flagged this page as blurry.
  final bool isBlurry;

  /// Laplacian variance score from blur detection.
  final double blurVariance;
}

/// Manages the active [ScanSession] state.
///
/// State is `null` when no session is active. Call [startSession] to begin
/// and [clearSession] to reset after persistence is complete.
class ScanSessionNotifier extends StateNotifier<ScanSession?> {
  ScanSessionNotifier() : super(null);

  /// Initializes a new scan session for the given course.
  void startSession(String courseId) {
    state = ScanSession(courseId: courseId);
  }

  /// Stores the cover page path and marks it as captured.
  void setCoverPage(String path) {
    if (state == null) return;
    state = state!.copyWith(
      coverPagePath: path,
      coverPageCaptured: true,
    );
  }

  /// Confirms the matched student after identity verification.
  void confirmStudent({
    required String studentId,
    required String name,
    required String rollNumber,
  }) {
    if (state == null) return;
    state = state!.copyWith(
      matchedStudentId: studentId,
      matchedStudentName: name,
      matchedRollNumber: rollNumber,
    );
  }

  /// Adds a page to the answer pages list during continuous capture.
  void addAnswerPage(ScannedPageInfo page) {
    if (state == null) return;
    state = state!.copyWith(
      answerPages: [...state!.answerPages, page],
    );
  }

  /// Removes a page by index from the answer pages list.
  void removePage(int index) {
    if (state == null) return;
    if (index < 0 || index >= state!.answerPages.length) return;
    final pages = List<ScannedPageInfo>.from(state!.answerPages)
      ..removeAt(index);
    state = state!.copyWith(answerPages: pages);
  }

  /// Reorders a page from [oldIndex] to [newIndex].
  void reorderPages(int oldIndex, int newIndex) {
    if (state == null) return;
    final pages = List<ScannedPageInfo>.from(state!.answerPages);
    if (oldIndex < 0 || oldIndex >= pages.length) return;
    if (newIndex < 0 || newIndex > pages.length) return;

    final item = pages.removeAt(oldIndex);
    // Adjust newIndex if the removal shifted it.
    final adjustedIndex = newIndex > oldIndex ? newIndex - 1 : newIndex;
    pages.insert(adjustedIndex, item);
    state = state!.copyWith(answerPages: pages);
  }

  /// Replaces a page at [index] with a new page (retake).
  void replacePage(int index, ScannedPageInfo newPage) {
    if (state == null) return;
    if (index < 0 || index >= state!.answerPages.length) return;
    final pages = List<ScannedPageInfo>.from(state!.answerPages);
    pages[index] = newPage;
    state = state!.copyWith(answerPages: pages);
  }

  /// Marks the session as complete.
  void completeSession() {
    if (state == null) return;
    state = state!.copyWith(isComplete: true);
  }

  /// Resets the session to null (no active session).
  void clearSession() {
    state = null;
  }
}

/// Provides the active [ScanSession] state.
///
/// State is `null` when no scan session is in progress. UI listens to this
/// provider to drive the scanning flow screens.
final scanSessionProvider =
    StateNotifierProvider<ScanSessionNotifier, ScanSession?>((ref) {
  return ScanSessionNotifier();
});
