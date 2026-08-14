---
name: mobile-offline-first
description: Offline-first Flutter development principles for low-connectivity environments. Use when writing Flutter state management, local storage, QR scanning, or GPS/location sync logic.
---
# Mobile & Low-Connectivity First (Flutter)

## Core Rule
Mobile drivers operate on unreliable highway networks. Every Flutter feature must assume the network **may not be available** and handle data locally first.

## Instructions

### Offline-First Architecture
- Use **Hive** (preferred for structured objects) or **SQLite** (`sqflite`) as the local cache layer.
- Never make a direct Supabase call without first writing to local storage.
- Queue all pending sync operations locally; retry when connectivity resumes.
- Use `connectivity_plus` package to detect network state changes.

### State Management Pattern
- Use **Riverpod** (preferred) or **BLoC** for state management.
- Keep `offline` and `syncing` as explicit states in every data provider.
- Expose a `SyncStatus` indicator in the UI so drivers know their data is queued.

```dart
// Example: Offline-first scan provider
enum SyncStatus { pending, syncing, synced, failed }

@HiveType(typeId: 0)
class QrScanRecord extends HiveObject {
  @HiveField(0) late String scanId;
  @HiveField(1) late String lorryReceiptId;
  @HiveField(2) late DateTime scannedAt;
  @HiveField(3) late double latitude;
  @HiveField(4) late double longitude;
  @HiveField(5) late SyncStatus syncStatus;
}
```

### Location Coordinates (GPS Pings)
- Capture GPS coordinates using `geolocator` package.
- Store each location ping to Hive immediately on capture.
- Batch and sync to Supabase `location_pings` table when network is available.
- Include `accuracy` and `timestamp` fields — reject readings with accuracy > 50 meters.

### QR Scan Sync
- Save every QR scan result to local Hive box instantly.
- Tag each scan with `syncStatus: SyncStatus.pending`.
- On connectivity restored, iterate the pending box and upsert to Supabase.
- On successful sync, update local record to `SyncStatus.synced`.

### Sync Service Pattern
```dart
class SyncService {
  final ConnectivityResult connectivity;

  Future<void> syncPendingScans() async {
    final box = Hive.box<QrScanRecord>('scans');
    final pending = box.values.where(
      (r) => r.syncStatus == SyncStatus.pending,
    );

    for (final record in pending) {
      try {
        record.syncStatus = SyncStatus.syncing;
        await record.save();

        await supabase.from('qr_scans').upsert(record.toJson());

        record.syncStatus = SyncStatus.synced;
        await record.save();
      } catch (_) {
        record.syncStatus = SyncStatus.failed;
        await record.save();
      }
    }
  }
}
```

### UI Requirements
- Always show a persistent sync status badge (e.g., "3 scans pending sync").
- Never block the driver's workflow on a network call — all captures must succeed offline.
- Display a subtle connectivity banner when offline (not a blocking dialog).
