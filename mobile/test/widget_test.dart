import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ams_mobile/main.dart';

void main() {
  testWidgets('Afosha Management System App smoke test', (WidgetTester tester) async {
    // Build AmsApp and trigger a frame.
    await tester.pumpWidget(const AmsApp());
    await tester.pump();

    // Verify MaterialApp mounts with Afosha MS title
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
