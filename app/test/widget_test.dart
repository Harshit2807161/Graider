import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:graider/main.dart';

void main() {
  testWidgets('App renders splash screen with Graider text', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(child: GraiderApp()),
    );

    // Pump past the delayed fade-in and navigation timers.
    await tester.pumpAndSettle(const Duration(seconds: 3));

    expect(find.text('Graider'), findsOneWidget);
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
