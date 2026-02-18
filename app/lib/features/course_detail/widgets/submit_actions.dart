import 'dart:developer' as developer;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/submission_dto.dart';
import '../../../core/repositories/scan_repository.dart';
import '../../../core/repositories/upload_repository.dart';
import '../../../core/services/upload_queue_service.dart';
import '../../../core/theme/app_colors.dart';

/// Per-student submit button for triggering grading on a single submission.
///
/// Behavior depends on the submission's sync status:
/// - **synced** (syncStatus == 0): Directly submits for grading via backend API
/// - **pending** (syncStatus == 1): Sets gradingRequested flag; upload queue
///   will auto-submit after upload completes
/// - Other states: Button is disabled
class SubmitButton extends ConsumerStatefulWidget {
  const SubmitButton({
    super.key,
    required this.submission,
    required this.courseId,
  });

  final SubmissionDto submission;
  final String courseId;

  @override
  ConsumerState<SubmitButton> createState() => _SubmitButtonState();
}

class _SubmitButtonState extends ConsumerState<SubmitButton> {
  bool _isSubmitting = false;

  bool get _canSubmit {
    final sub = widget.submission;
    // Can submit if synced and not already grading-requested,
    // or if pending and not already grading-requested
    if (sub.gradingRequested) return false;
    return sub.status == 'synced' || sub.status == 'pending';
  }

  Future<void> _submit() async {
    if (_isSubmitting || !_canSubmit) return;
    setState(() => _isSubmitting = true);

    try {
      final scanRepo = ref.read(scanRepositoryProvider);
      final sub = widget.submission;

      if (sub.status == 'synced' && sub.serverId != null) {
        // Already uploaded -- upload Q-paper/Answer Key if present, then grade
        await _uploadCourseDocumentsIfNeeded(sub.serverId!);

        final uploadRepo = ref.read(uploadRepositoryProvider);
        await uploadRepo.submitForGrading(sessionId: sub.serverId!);
        await scanRepo.setGradingRequested(sub.id, true);

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Submitted for grading'),
            backgroundColor: AppColors.success,
          ),
        );
      } else if (sub.status == 'pending') {
        // Not yet uploaded -- mark for auto-submit after upload
        await scanRepo.setGradingRequested(sub.id, true);
        ref.read(uploadQueueServiceProvider).processQueue();

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Will submit after upload completes'),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      developer.log('Submit failed: $e', name: 'SubmitButton', level: 1000);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to submit: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  /// Uploads Q-paper and Answer Key to the backend session if they exist
  /// locally on the course. These are separate from the sync queue.
  ///
  /// Handles multi-page documents stored as semicolon-separated paths.
  Future<void> _uploadCourseDocumentsIfNeeded(String sessionId) async {
    final scanRepo = ref.read(scanRepositoryProvider);
    final uploadRepo = ref.read(uploadRepositoryProvider);

    final qPaperPath = await scanRepo.getQuestionPaperPath(widget.courseId);
    if (qPaperPath != null && qPaperPath.isNotEmpty) {
      try {
        final paths = qPaperPath.split(';').where((s) => s.isNotEmpty).toList();
        await uploadRepo.uploadQuestionPaper(filePaths: paths);
      } catch (e) {
        developer.log(
          'Q-paper upload failed (non-fatal): $e',
          name: 'SubmitButton',
          level: 900,
        );
      }
    }

    final answerKeyPath = await scanRepo.getAnswerKeyPath(widget.courseId);
    if (answerKeyPath != null && answerKeyPath.isNotEmpty) {
      try {
        final paths =
            answerKeyPath.split(';').where((s) => s.isNotEmpty).toList();
        await uploadRepo.uploadAnswerKey(filePaths: paths);
      } catch (e) {
        developer.log(
          'Answer key upload failed (non-fatal): $e',
          name: 'SubmitButton',
          level: 900,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.submission.gradingRequested) {
      return const Text(
        'Submitted',
        style: TextStyle(
          color: AppColors.success,
          fontSize: 13,
          fontWeight: FontWeight.w500,
        ),
      );
    }

    return SizedBox(
      height: 32,
      child: OutlinedButton(
        onPressed: _canSubmit && !_isSubmitting ? _submit : null,
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary, width: 1),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: _isSubmitting
            ? const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 1.5,
                  color: AppColors.primary,
                ),
              )
            : const Text(
                'Submit',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              ),
      ),
    );
  }
}

/// Bottom bar for batch-submitting all synced submissions for grading.
///
/// Only visible when there are synced submissions with `gradingRequested == false`.
/// Shows a confirmation dialog before processing to prevent accidental batch submits.
class SubmitAllBar extends ConsumerStatefulWidget {
  const SubmitAllBar({
    super.key,
    required this.courseId,
    required this.submissions,
  });

  final String courseId;
  final List<SubmissionDto> submissions;

  @override
  ConsumerState<SubmitAllBar> createState() => _SubmitAllBarState();
}

class _SubmitAllBarState extends ConsumerState<SubmitAllBar> {
  bool _isSubmitting = false;

  /// Submissions that are synced and not yet submitted for grading.
  List<SubmissionDto> get _eligibleSubmissions {
    return widget.submissions
        .where((s) =>
            s.status == 'synced' &&
            !s.gradingRequested &&
            s.serverId != null)
        .toList();
  }

  Future<void> _submitAll() async {
    final eligible = _eligibleSubmissions;
    if (eligible.isEmpty) return;

    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text(
          'Submit All for Grading',
          style: TextStyle(color: AppColors.onBackground),
        ),
        content: Text(
          'Submit all synced submissions for grading? '
          'This will grade ${eligible.length} student submission${eligible.length == 1 ? '' : 's'}.',
          style: const TextStyle(color: AppColors.onSurfaceVariant),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Submit'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _isSubmitting = true);

    try {
      final scanRepo = ref.read(scanRepositoryProvider);
      final uploadRepo = ref.read(uploadRepositoryProvider);

      // Upload Q-paper/Answer Key once for the course (if present)
      await _uploadCourseDocumentsOnce();

      int successCount = 0;
      for (final sub in eligible) {
        try {
          await scanRepo.setGradingRequested(sub.id, true);
          await uploadRepo.submitForGrading(sessionId: sub.serverId!);
          successCount++;
        } catch (e) {
          developer.log(
            'Batch submit failed for ${sub.id}: $e',
            name: 'SubmitAllBar',
            level: 900,
          );
        }
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Submitted $successCount/${eligible.length} for grading'),
          backgroundColor:
              successCount == eligible.length ? AppColors.success : AppColors.warning,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  /// Uploads Q-paper and Answer Key once for the course before grading.
  ///
  /// Handles multi-page documents stored as semicolon-separated paths.
  Future<void> _uploadCourseDocumentsOnce() async {
    final scanRepo = ref.read(scanRepositoryProvider);
    final uploadRepo = ref.read(uploadRepositoryProvider);

    final qPaperPath = await scanRepo.getQuestionPaperPath(widget.courseId);
    if (qPaperPath != null && qPaperPath.isNotEmpty) {
      try {
        final paths = qPaperPath.split(';').where((s) => s.isNotEmpty).toList();
        await uploadRepo.uploadQuestionPaper(filePaths: paths);
      } catch (e) {
        developer.log(
          'Q-paper upload failed (non-fatal): $e',
          name: 'SubmitAllBar',
          level: 900,
        );
      }
    }

    final answerKeyPath = await scanRepo.getAnswerKeyPath(widget.courseId);
    if (answerKeyPath != null && answerKeyPath.isNotEmpty) {
      try {
        final paths =
            answerKeyPath.split(';').where((s) => s.isNotEmpty).toList();
        await uploadRepo.uploadAnswerKey(filePaths: paths);
      } catch (e) {
        developer.log(
          'Answer key upload failed (non-fatal): $e',
          name: 'SubmitAllBar',
          level: 900,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final eligible = _eligibleSubmissions;
    if (eligible.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(
          top: BorderSide(color: AppColors.outline, width: 0.5),
        ),
      ),
      child: SafeArea(
        top: false,
        child: FilledButton(
          onPressed: _isSubmitting ? null : _submitAll,
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.4),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(28),
            ),
          ),
          child: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Text(
                  'Submit All (${eligible.length})',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
        ),
      ),
    );
  }
}
