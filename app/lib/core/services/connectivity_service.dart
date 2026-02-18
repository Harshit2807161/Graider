import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Streams `true` when any network connectivity is available, `false` when none.
///
/// NOTE: This detects network interface status, NOT actual internet reachability.
/// Upload success/failure is the ground truth for actual connectivity.
final connectivityProvider = StreamProvider<bool>((ref) {
  return Connectivity().onConnectivityChanged.map(
    (List<ConnectivityResult> results) =>
        !results.contains(ConnectivityResult.none),
  );
});
