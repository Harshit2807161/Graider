import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/routing/app_router.dart';
import 'core/services/upload_queue_service.dart';
import 'core/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: GraiderApp()));
}

/// Root widget for the Graider application.
///
/// Uses [ProviderScope] for Riverpod state management,
/// applies the Material 3 dark theme globally, and wires
/// go_router for declarative navigation (splash -> tabs).
///
/// Also initializes the upload queue service for startup recovery
/// and wires connectivity changes to automatic queue processing.
class GraiderApp extends ConsumerWidget {
  const GraiderApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(goRouterProvider);

    // Initialize upload queue service (startup recovery: resets orphaned
    // uploads and begins processing pending submissions)
    ref.watch(uploadQueueInitProvider);

    // Wire connectivity changes to automatic upload queue processing
    ref.watch(syncTriggerProvider);

    return MaterialApp.router(
      title: 'Graider',
      theme: AppTheme.darkTheme,
      debugShowCheckedModeBanner: false,
      routerConfig: router,
    );
  }
}
