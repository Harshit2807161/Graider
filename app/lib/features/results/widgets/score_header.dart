import 'package:flutter/material.dart';

import '../../../core/models/grading_result_dto.dart';
import '../../../core/theme/app_colors.dart';

/// Total score summary header with percentage, progress bar, and question count.
///
/// Displays the effective total score (reflecting overrides), overall percentage
/// as a large prominent number, a thin horizontal progress bar, and a count of
/// graded questions. When any score is overridden, shows a small
/// "Includes manual adjustments" text.
class ScoreHeader extends StatelessWidget {
  const ScoreHeader({super.key, required this.results});

  /// The full list of grading results (graded + failed).
  /// Totals are computed internally from this list.
  final List<GradingResultDto> results;

  @override
  Widget build(BuildContext context) {
    // Compute totals from graded results only
    final gradedResults =
        results.where((r) => r.status == 'graded').toList();
    final totalEffective = gradedResults.fold<double>(
      0,
      (sum, r) => sum + r.effectiveScore,
    );
    final totalMax = gradedResults.fold<double>(
      0,
      (sum, r) => sum + r.maxScore,
    );
    final percentage = totalMax > 0 ? (totalEffective / totalMax) * 100 : 0;
    final hasOverrides = results.any((r) => r.isOverridden);
    final allGraded = results.every((r) => r.status == 'graded');
    final gradedCount = gradedResults.length;
    final totalCount = results.length;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          // Percentage large number
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '${percentage.round()}',
                style: const TextStyle(
                  color: AppColors.onBackground,
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                  height: 1.0,
                ),
              ),
              const Text(
                '%',
                style: TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 24,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              // Score fraction
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: totalEffective.toStringAsFixed(totalEffective.truncateToDouble() == totalEffective ? 0 : 1),
                          style: const TextStyle(
                            color: AppColors.onBackground,
                            fontSize: 22,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        TextSpan(
                          text: ' / ${totalMax.toStringAsFixed(totalMax.truncateToDouble() == totalMax ? 0 : 1)}',
                          style: const TextStyle(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: totalMax > 0 ? totalEffective / totalMax : 0,
              backgroundColor: AppColors.surfaceContainer,
              color: AppColors.primary,
              minHeight: 6,
            ),
          ),

          const SizedBox(height: 10),

          // Bottom row: question count + override indicator
          Row(
            children: [
              Text(
                allGraded
                    ? '$gradedCount questions graded'
                    : '$gradedCount of $totalCount questions graded',
                style: const TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 13,
                ),
              ),
              const Spacer(),
              if (hasOverrides)
                const Text(
                  'Includes manual adjustments',
                  style: TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 11,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
