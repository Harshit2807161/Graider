import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/repositories/scan_repository.dart';
import '../../../core/theme/app_colors.dart';
import 'document_viewer_sheet.dart';

/// FutureProvider that reads the question paper path for a course from the DB.
final questionPaperPathProvider =
    FutureProvider.family<String?, String>((ref, courseId) {
  return ref.watch(scanRepositoryProvider).getQuestionPaperPath(courseId);
});

/// FutureProvider that reads the answer key path for a course from the DB.
final answerKeyPathProvider =
    FutureProvider.family<String?, String>((ref, courseId) {
  return ref.watch(scanRepositoryProvider).getAnswerKeyPath(courseId);
});

/// A tappable chip representing a document slot (Question Paper or Answer Key).
///
/// Shows an empty state with a "+" indicator when no document is set, or a
/// filled state with a green checkmark when a document exists. Tapping opens
/// the [DocumentViewerSheet] for scan/upload or preview.
class DocumentSlot extends ConsumerWidget {
  const DocumentSlot({
    super.key,
    required this.courseId,
    required this.label,
    required this.icon,
    required this.documentType,
  });

  /// The course this document slot belongs to.
  final String courseId;

  /// Display label ("Question Paper" or "Answer Key").
  final String label;

  /// Leading icon for the chip.
  final IconData icon;

  /// Document type identifier: "question_paper" or "answer_key".
  final String documentType;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pathAsync = documentType == 'question_paper'
        ? ref.watch(questionPaperPathProvider(courseId))
        : ref.watch(answerKeyPathProvider(courseId));

    final existingPath = pathAsync.maybeWhen(
      data: (path) => path,
      orElse: () => null,
    );

    final hasDocument = existingPath != null && existingPath.isNotEmpty;

    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => DocumentViewerScreen(
              courseId: courseId,
              documentType: documentType,
              existingPath: hasDocument ? existingPath : null,
            ),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: hasDocument
              ? AppColors.success.withValues(alpha: 0.1)
              : AppColors.surfaceContainer,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: hasDocument
                ? AppColors.success.withValues(alpha: 0.4)
                : AppColors.outline,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: hasDocument
                  ? AppColors.success
                  : AppColors.onSurfaceVariant,
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  color: hasDocument
                      ? AppColors.onSurface
                      : AppColors.onSurfaceVariant,
                  fontSize: 13,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 4),
            if (hasDocument)
              const Icon(
                Icons.check_circle,
                size: 14,
                color: AppColors.success,
              )
            else
              Icon(
                Icons.add_circle_outline,
                size: 14,
                color: AppColors.onSurfaceVariant.withValues(alpha: 0.6),
              ),
          ],
        ),
      ),
    );
  }
}
