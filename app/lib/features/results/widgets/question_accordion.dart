import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/grading_result_dto.dart';
import '../../../core/models/scanned_page_dto.dart';
import '../../../core/repositories/scan_repository.dart';
import '../../../core/theme/app_colors.dart';
import 'score_override_sheet.dart';

/// Expandable accordion widget for per-question grading results.
///
/// Renders collapsed rows showing "Q1: 7/10" with an EDITED badge for
/// overrides. Tapping a row expands it to show AI reasoning, feedback,
/// scan thumbnail, and edit button. Only one item can be expanded at a time.
///
/// Failed questions show "Unable to grade" with the failure reason.
class QuestionAccordion extends StatefulWidget {
  const QuestionAccordion({
    super.key,
    required this.results,
    required this.submissionId,
    required this.onOverrideChanged,
  });

  /// All grading results (graded + failed) for display.
  final List<GradingResultDto> results;

  /// Submission ID for fetching scanned page thumbnails.
  final String submissionId;

  /// Called after an override is saved or reverted to trigger re-fetch.
  final VoidCallback onOverrideChanged;

  @override
  State<QuestionAccordion> createState() => _QuestionAccordionState();
}

class _QuestionAccordionState extends State<QuestionAccordion> {
  /// Index of the currently expanded item, or -1 if none.
  int _expandedIndex = -1;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: widget.results.length,
      itemBuilder: (context, index) {
        final result = widget.results[index];
        final isExpanded = _expandedIndex == index;

        return _QuestionRow(
          result: result,
          isExpanded: isExpanded,
          submissionId: widget.submissionId,
          onTap: () {
            setState(() {
              _expandedIndex = isExpanded ? -1 : index;
            });
          },
          onOverrideChanged: widget.onOverrideChanged,
        );
      },
    );
  }
}

/// A single question row: collapsed shows score, expanded shows details.
class _QuestionRow extends StatelessWidget {
  const _QuestionRow({
    required this.result,
    required this.isExpanded,
    required this.submissionId,
    required this.onTap,
    required this.onOverrideChanged,
  });

  final GradingResultDto result;
  final bool isExpanded;
  final String submissionId;
  final VoidCallback onTap;
  final VoidCallback onOverrideChanged;

  @override
  Widget build(BuildContext context) {
    final isFailed = result.status == 'failed';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          // --- Collapsed row (always visible) ---
          InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  // Question label
                  Text(
                    result.questionId,
                    style: const TextStyle(
                      color: AppColors.onBackground,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),

                  const Spacer(),

                  // Score or "Unable to grade"
                  if (isFailed)
                    const Text(
                      'Unable to grade',
                      style: TextStyle(
                        color: AppColors.error,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    )
                  else ...[
                    // EDITED badge
                    if (result.isOverridden) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppColors.warning.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'EDITED',
                          style: TextStyle(
                            color: AppColors.warning,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                    ],

                    // Score text
                    Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: result.effectiveScore
                                .toStringAsFixed(
                                    result.effectiveScore.truncateToDouble() ==
                                            result.effectiveScore
                                        ? 0
                                        : 1),
                            style: const TextStyle(
                              color: AppColors.onBackground,
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          TextSpan(
                            text: '/${result.maxScore.toStringAsFixed(result.maxScore.truncateToDouble() == result.maxScore ? 0 : 1)}',
                            style: const TextStyle(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(width: 8),

                  // Expand/collapse chevron
                  Icon(
                    isExpanded
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                    color: AppColors.onSurfaceVariant,
                    size: 20,
                  ),
                ],
              ),
            ),
          ),

          // --- Expanded content ---
          if (isExpanded) _ExpandedContent(
            result: result,
            submissionId: submissionId,
            onOverrideChanged: onOverrideChanged,
          ),
        ],
      ),
    );
  }
}

/// The expanded content area showing reasoning, feedback, thumbnail, and edit.
class _ExpandedContent extends ConsumerWidget {
  const _ExpandedContent({
    required this.result,
    required this.submissionId,
    required this.onOverrideChanged,
  });

  final GradingResultDto result;
  final String submissionId;
  final VoidCallback onOverrideChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isFailed = result.status == 'failed';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: const BoxDecoration(
        color: AppColors.surfaceContainer,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(10),
          bottomRight: Radius.circular(10),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Failure reason for failed questions
          if (isFailed && result.failureReason != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                result.failureReason!,
                style: TextStyle(
                  color: AppColors.error.withValues(alpha: 0.9),
                  fontSize: 13,
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],

          // AI Reasoning section
          if (!isFailed && result.reasoning.isNotEmpty) ...[
            const Text(
              'AI Reasoning',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              result.reasoning,
              style: const TextStyle(
                color: AppColors.onSurface,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Feedback section
          if (!isFailed && result.feedback.isNotEmpty) ...[
            const Text(
              'Feedback',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              result.feedback,
              style: const TextStyle(
                color: AppColors.onSurface,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Scanned page thumbnail
          _AnswerPageThumbnail(submissionId: submissionId),

          // Override info (if overridden)
          if (result.isOverridden) ...[
            const SizedBox(height: 8),
            Text(
              'Manually adjusted from ${result.score.toStringAsFixed(result.score.truncateToDouble() == result.score ? 0 : 1)}',
              style: const TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 12,
              ),
            ),
            if (result.overrideNote != null &&
                result.overrideNote!.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                'Note: ${result.overrideNote}',
                style: const TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
          ],

          // Edit button (not shown for failed questions)
          if (!isFailed) ...[
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerRight,
              child: IconButton(
                icon: const Icon(
                  Icons.edit_outlined,
                  color: AppColors.onSurfaceVariant,
                  size: 20,
                ),
                onPressed: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: AppColors.surface,
                    shape: const RoundedRectangleBorder(
                      borderRadius:
                          BorderRadius.vertical(top: Radius.circular(20)),
                    ),
                    builder: (_) => ScoreOverrideSheet(
                      result: result,
                      onSaved: onOverrideChanged,
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Displays the first answer page thumbnail for context.
class _AnswerPageThumbnail extends ConsumerWidget {
  const _AnswerPageThumbnail({required this.submissionId});

  final String submissionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scanRepo = ref.watch(scanRepositoryProvider);

    return FutureBuilder<List<ScannedPageDto>>(
      future: scanRepo.getPages(submissionId),
      builder: (context, snapshot) {
        final pages = snapshot.data ?? [];
        // Find the first answer page
        final answerPage = pages
            .where((p) => p.type == 'answer' && p.pageNumber == 1)
            .firstOrNull;
        if (answerPage == null) return const SizedBox.shrink();

        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: 120,
              height: 160,
              color: AppColors.surface,
              child: Image.file(
                File(answerPage.localPath),
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const Center(
                  child: Icon(
                    Icons.broken_image_outlined,
                    color: AppColors.onSurfaceVariant,
                    size: 32,
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
