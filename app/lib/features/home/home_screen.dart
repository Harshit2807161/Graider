import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/course_dto.dart';
import '../../core/providers/user_profile_provider.dart';
import '../../core/repositories/course_repository.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/course_card.dart';
import 'widgets/create_course_sheet.dart';
import 'widgets/empty_dashboard.dart';
import 'widgets/pending_banner.dart';

/// Professor dashboard screen -- the main home tab.
///
/// Displays a pending grading banner, course cards with status badges and
/// progress bars, and a FAB for creating new courses. Handles all states:
/// loading, error, empty (new user), offline with no cache, and data.
///
/// Data flow: [courseListProvider] fetches from API (with Drift cache fallback)
/// on first watch. Pull-to-refresh triggers re-fetch via provider invalidation.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coursesAsync = ref.watch(courseListProvider);
    final profileAsync = ref.watch(userProfileProvider);

    return Scaffold(
      appBar: AppBar(
        centerTitle: false,
        title: const Text(
          'Dashboard',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: _ProfileAvatar(profileAsync: profileAsync),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(courseListProvider);
          // Wait for the refresh to complete
          await ref.read(courseListProvider.future);
        },
        child: coursesAsync.when(
          loading: () => const _LoadingSkeleton(),
          error: (error, _) => _ErrorState(
            onRetry: () => ref.invalidate(courseListProvider),
          ),
          data: (courses) {
            // Distinguish between empty-new-user and offline-no-cache
            final profile = profileAsync.valueOrNull;
            final isOfflineNoCache =
                courses.isEmpty && profile == null;

            if (isOfflineNoCache) {
              return _OfflineNoCacheState(
                onRetry: () => ref.invalidate(courseListProvider),
              );
            }

            if (courses.isEmpty) {
              return EmptyDashboard(
                onCreateCourse: () => _showCreateSheet(context),
              );
            }

            return _DashboardContent(
              courses: courses,
              onCreateSheet: () => _showCreateSheet(context),
            );
          },
        ),
      ),
      floatingActionButton: coursesAsync.maybeWhen(
        data: (courses) => courses.isNotEmpty
            ? FloatingActionButton.extended(
                onPressed: () => _showCreateSheet(context),
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                icon: const Icon(Icons.add),
                label: const Text(
                  'Add Course',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              )
            : null,
        orElse: () => null,
      ),
    );
  }

  void _showCreateSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const CreateCourseSheet(),
    );
  }
}

/// Profile avatar in the app bar showing user initials.
class _ProfileAvatar extends StatelessWidget {
  const _ProfileAvatar({required this.profileAsync});

  final AsyncValue profileAsync;

  @override
  Widget build(BuildContext context) {
    final profile = profileAsync.valueOrNull;
    final initials = profile?.initials ?? '?';

    return CircleAvatar(
      radius: 18,
      backgroundColor: AppColors.primaryContainer,
      child: Text(
        initials,
        style: const TextStyle(
          color: AppColors.primary,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// Loading skeleton showing placeholder cards while data loads.
class _LoadingSkeleton extends StatelessWidget {
  const _LoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Banner placeholder
        Container(
          height: 90,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: AppColors.surfaceContainer,
          ),
        ),
        const SizedBox(height: 24),
        // Section header placeholder
        Container(
          width: 120,
          height: 12,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(4),
            color: AppColors.surfaceContainer,
          ),
        ),
        const SizedBox(height: 12),
        // Card placeholders
        for (var i = 0; i < 3; i++) ...[
          Container(
            height: 120,
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

/// Error state shown when API fails and there is no cached data.
class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.6,
          child: Center(
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
                  'Please check your connection and try again',
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
          ),
        ),
      ],
    );
  }
}

/// Offline state with no cached data.
///
/// Distinct from the empty-new-user state: shows "Connect to the internet"
/// message with retry (per locked decision).
class _OfflineNoCacheState extends StatelessWidget {
  const _OfflineNoCacheState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.6,
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.wifi_off_rounded,
                  size: 64,
                  color: AppColors.onSurfaceVariant.withValues(alpha: 0.5),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Connect to the internet',
                  style: TextStyle(
                    color: AppColors.onBackground,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Connect to the internet to load your courses',
                  style: TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
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
          ),
        ),
      ],
    );
  }
}

/// Main dashboard content with pending banner and course cards.
class _DashboardContent extends ConsumerWidget {
  const _DashboardContent({
    required this.courses,
    required this.onCreateSheet,
  });

  final List<CourseDto> courses;
  final VoidCallback onCreateSheet;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pendingAsync = ref.watch(pendingGradingCountProvider);
    final pendingCount = pendingAsync.valueOrNull ?? 0;

    return CustomScrollView(
      slivers: [
        // Top padding
        const SliverToBoxAdapter(child: SizedBox(height: 16)),

        // Pending grading banner (hidden when count is zero)
        if (pendingCount > 0) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: PendingBanner(count: pendingCount),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],

        // "RECENT COURSES" section header
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'RECENT COURSES',
              style: TextStyle(
                color: AppColors.onSurfaceVariant,
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.0,
              ),
            ),
          ),
        ),

        const SliverToBoxAdapter(child: SizedBox(height: 12)),

        // Course cards
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final course = courses[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: CourseCard(
                    course: course,
                    onTap: () => context.push('/course/${course.id}'),
                  ),
                );
              },
              childCount: courses.length,
            ),
          ),
        ),

        // Bottom padding for FAB clearance
        const SliverToBoxAdapter(child: SizedBox(height: 80)),
      ],
    );
  }
}
