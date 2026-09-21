import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/repositories/history_repository.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/empty_history.dart';
import 'widgets/session_card.dart';

/// History screen showing past grading sessions with filter chips.
///
/// Replaces the Phase 1 placeholder. Professors see completed grading sessions
/// as cards with course name, date, and average score. Sessions are filterable
/// by exam type: All Sessions, Midterms, Quizzes.
///
/// Data flow: [historyListProvider] -> AsyncValue.when pattern with loading
/// skeleton, error state, empty state, and session card list.
class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  /// Filter chip labels and their corresponding filter values.
  static const _filters = [
    ('All Sessions', 'All Sessions'),
    ('Midterms', 'Midterm'),
    ('Quizzes', 'Quiz'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionsAsync = ref.watch(historyListProvider);
    final currentFilter = ref.watch(historyFilterProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('History'),
      ),
      body: Column(
        children: [
          // Filter chips row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                for (final (label, value) in _filters) ...[
                  _FilterChipButton(
                    label: label,
                    selected: currentFilter == value,
                    onSelected: () {
                      ref.read(historyFilterProvider.notifier).state = value;
                    },
                  ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),

          // Session list
          Expanded(
            child: sessionsAsync.when(
              loading: () => const _LoadingSkeleton(),
              error: (error, _) => _ErrorState(
                onRetry: () => ref.invalidate(historyListProvider),
              ),
              data: (sessions) {
                if (sessions.isEmpty) {
                  return const EmptyHistory();
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(historyListProvider);
                    await ref.read(historyListProvider.future);
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: sessions.length,
                    itemBuilder: (context, index) {
                      final session = sessions[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: SessionCard(
                          session: session,
                          onTap: () {
                            context.go(
                              '/course/${session.id}/results?studentId=${session.studentId}',
                            );
                          },
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// A styled filter chip matching the app's dark theme.
///
/// Selected state: AppColors.primary background with white text.
/// Unselected state: AppColors.surfaceContainer background with onSurface text.
class _FilterChipButton extends StatelessWidget {
  const _FilterChipButton({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onSelected,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surfaceContainer,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.onSurface,
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

/// Loading skeleton showing 3 placeholder cards while data loads.
class _LoadingSkeleton extends StatelessWidget {
  const _LoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        for (var i = 0; i < 3; i++) ...[
          Container(
            height: 100,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: AppColors.surfaceContainer,
            ),
          ),
          const SizedBox(height: 12),
        ],
      ],
    );
  }
}

/// Error state with retry button.
class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: AppColors.onSurfaceVariant.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          const Text(
            'Something went wrong',
            style: TextStyle(
              color: AppColors.onBackground,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Could not load grading history',
            style: TextStyle(
              color: AppColors.onSurfaceVariant,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Try Again'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(28),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
