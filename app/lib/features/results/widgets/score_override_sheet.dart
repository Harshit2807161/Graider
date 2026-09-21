import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/grading_result_dto.dart';
import '../../../core/repositories/grading_repository.dart';
import '../../../core/theme/app_colors.dart';

/// Bottom sheet for manually overriding an AI-assigned score.
///
/// Allows the professor to enter a new score and an optional note.
/// If the result is already overridden, shows a "Revert to AI Score" button
/// that restores the original AI score.
class ScoreOverrideSheet extends ConsumerStatefulWidget {
  const ScoreOverrideSheet({
    super.key,
    required this.result,
    required this.onSaved,
  });

  /// The grading result to override.
  final GradingResultDto result;

  /// Called after a successful save or revert to trigger refresh.
  final VoidCallback onSaved;

  @override
  ConsumerState<ScoreOverrideSheet> createState() =>
      _ScoreOverrideSheetState();
}

class _ScoreOverrideSheetState extends ConsumerState<ScoreOverrideSheet> {
  late final TextEditingController _scoreController;
  late final TextEditingController _noteController;
  final _formKey = GlobalKey<FormState>();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _scoreController = TextEditingController(
      text: widget.result.effectiveScore.toStringAsFixed(
          widget.result.effectiveScore.truncateToDouble() ==
                  widget.result.effectiveScore
              ? 0
              : 1),
    );
    _noteController = TextEditingController(
      text: widget.result.overrideNote ?? '',
    );
  }

  @override
  void dispose() {
    _scoreController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _saveOverride() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final newScore = double.parse(_scoreController.text.trim());
      final note = _noteController.text.trim();

      await ref.read(gradingRepositoryProvider).saveOverride(
            widget.result.id,
            newScore,
            note.isEmpty ? null : note,
          );

      if (!mounted) return;
      Navigator.of(context).pop();
      widget.onSaved();
    } catch (_) {
      setState(() => _isSaving = false);
    }
  }

  Future<void> _revertOverride() async {
    setState(() => _isSaving = true);

    try {
      await ref
          .read(gradingRepositoryProvider)
          .revertOverride(widget.result.id);

      if (!mounted) return;
      Navigator.of(context).pop();
      widget.onSaved();
    } catch (_) {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 16,
        bottom: 24 + bottomInset,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.onSurfaceVariant.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Title
            Text(
              'Override Score for ${widget.result.questionId}',
              style: const TextStyle(
                color: AppColors.onBackground,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),

            // Current AI score
            Text(
              'AI Score: ${widget.result.score.toStringAsFixed(widget.result.score.truncateToDouble() == widget.result.score ? 0 : 1)} / ${widget.result.maxScore.toStringAsFixed(widget.result.maxScore.truncateToDouble() == widget.result.maxScore ? 0 : 1)}',
              style: const TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 14,
              ),
            ),

            // Current override info
            if (widget.result.isOverridden) ...[
              const SizedBox(height: 4),
              Text(
                'Current override: ${widget.result.overrideScore?.toStringAsFixed(widget.result.overrideScore!.truncateToDouble() == widget.result.overrideScore ? 0 : 1)}',
                style: const TextStyle(
                  color: AppColors.warning,
                  fontSize: 13,
                ),
              ),
            ],

            const SizedBox(height: 20),

            // Score text field
            TextFormField(
              controller: _scoreController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(color: AppColors.onBackground),
              decoration: InputDecoration(
                labelText: 'New Score',
                labelStyle: const TextStyle(color: AppColors.onSurfaceVariant),
                filled: true,
                fillColor: AppColors.surfaceContainer,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Score is required';
                }
                final score = double.tryParse(value.trim());
                if (score == null) {
                  return 'Enter a valid number';
                }
                if (score < 0) {
                  return 'Score cannot be negative';
                }
                if (score > widget.result.maxScore) {
                  return 'Score cannot exceed ${widget.result.maxScore.toStringAsFixed(widget.result.maxScore.truncateToDouble() == widget.result.maxScore ? 0 : 1)}';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),

            // Note text field
            TextFormField(
              controller: _noteController,
              maxLines: 3,
              style: const TextStyle(color: AppColors.onBackground),
              decoration: InputDecoration(
                labelText: 'Reason (optional)',
                labelStyle: const TextStyle(color: AppColors.onSurfaceVariant),
                filled: true,
                fillColor: AppColors.surfaceContainer,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Save Override button
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _isSaving ? null : _saveOverride,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(28),
                  ),
                ),
                child: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Save Override',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),

            // Revert button (only if already overridden)
            if (widget.result.isOverridden) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: _isSaving ? null : _revertOverride,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.onSurfaceVariant,
                    side: const BorderSide(color: AppColors.outline),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                  child: Text(
                    'Revert to AI Score (${widget.result.score.toStringAsFixed(widget.result.score.truncateToDouble() == widget.result.score ? 0 : 1)})',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
