import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Three colored stat chips showing GRADED / PROCESSING / PENDING counts.
///
/// Matches the Figma `cs101_midterm_details` mockup: each chip has a
/// tinted background and border with a bold label and large count number.
class SummaryChips extends StatelessWidget {
  const SummaryChips({
    super.key,
    required this.gradedCount,
    required this.processingCount,
    required this.pendingCount,
  });

  final int gradedCount;
  final int processingCount;
  final int pendingCount;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _Chip(
            label: 'GRADED',
            count: gradedCount,
            color: AppColors.success,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _Chip(
            label: 'PROCESSING',
            count: processingCount,
            color: AppColors.warning,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _Chip(
            label: 'PENDING',
            count: pendingCount,
            color: AppColors.error,
          ),
        ),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.count,
    required this.color,
  });

  final String label;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: color.withValues(alpha: 0.15),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            count.toString().padLeft(2, '0'),
            style: const TextStyle(
              color: AppColors.onBackground,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
