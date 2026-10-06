# Wildfolio implementation notes

## Layers

- `app/`: Expo Router screens. Tabs contain Collection and Journal care. Capture, review, detail, and editing are stack screens.
- `src/branding.json`: the temporary product name and main copy. `app.config.ts` reads JSON directly because Expo config evaluation does not automatically transpile nested TypeScript imports.
- `src/core/`: platform-independent observation model, real SQL schema/migrations, serialized journal operations, and portable backup validation.
- `src/platform/`: Expo SQLite/file/image/picker adapters and the replaceable identification provider.
- `src/ui/`: shared palette, accessible controls/forms, and journal/draft session state.
- `modules/wildfolio-vision/`: auto-linked local Expo iOS module. It is not loaded from a server and is optional at runtime.
- `tests/`: test-only fixtures, real Node SQLite and disk persistence tests, and failure-injecting image adapters. Never seeded into app data.

## Data and durable saves

SQLite `observations` stores one JSON payload per UUID with a deletion marker. Species are separate records in `species`, keyed by provider-qualified stable taxon ID; observations can reference a taxon. In this milestone no provider supplies species IDs or scientific names, so these remain null. A manually entered display name is unverified. General Vision classification cannot assign a species.

`PRAGMA user_version` controls migrations: v1 creates the observation/species tables; v2 adds the active/deleted index. A future schema is refused, rather than downgraded. Parameters are bound, not interpolated into SQL. Transactions protect multi-record restore and migrations.

Files live in the app document directory:

```text
wildfolio/
  images/<uuid>/original.jpg
  images/<uuid>/cutout.png       (optional)
  drafts/<uuid>/...              (temporary, persistent-directory processing staging)
  wildfolio-journal.json         (latest locally prepared export)
```

Original photographs retain the full frame but are orientation-normalized/re-encoded as JPEG at up to 4096 pixels on the longest side, quality 0.88. This is not a byte-for-byte copy of a HEIC/RAW original. No metadata is used to infer date or place. The device's photo library is not modified. Masking works on a bounded 2048-pixel decode.

Images are copied into the final UUID folder and checked before the database insert. If copying or insertion fails, the folder is removed; the review draft remains for retry. Failed rollback cleanup and force-quit gaps produce unreferenced folders, which recovery removes on startup. A successful DB commit is never reported failed merely because draft cleanup failed.

Deletion first commits a tombstone, so partially deleted files cannot leave a visible broken sighting. Image removal is then retried until complete; only then is the tombstone removed. The operation queue prevents saves, export/restore, updates, and recovery from racing each other. Maintenance never follows user-controlled archive paths.

Drafts are session state, not saved journal records. Save failures preserve form values and draft images while reviewing. Discard is confirmed. On a fresh launch stale draft folders are removed. Force-quitting an unsaved draft loses it; force-quitting a saved record does not.

## Portable backups

The `.json` file has `format: "wildfolio-journal"`, version `1`, `exportedAt`, `observations`, and an `images` dictionary of base64 JPEG/PNG bytes. It is a portable container, not a filesystem zip archive. No archive paths are extracted. Image keys must exactly match `<valid-uuid>/original.jpg` or `<valid-uuid>/cutout.png` and the owning record. Absolute paths, extra entries, traversal, mismatched references, duplicate UUIDs, unknown format versions, invalid dates/coordinates, excessive lengths, and invalid encodings/header types are rejected before any writes. Bounded JPEG/PNG header inspection rejects missing or oversized image dimensions before native decoding. The native adapter then actually decodes staged images before committing records.

Limits: 96 MB backup file, 24 MB per image, 4096 pixels per restored dimension, 5,000 records. The export uses an in-memory JSON representation; very large journals need future streaming/segmented backups. A backup beyond the limit is refused rather than silently truncated. There is no partial export selector in this version.

Duplicate policy: skip UUIDs already in the journal (including pending deletion tombstones). Preserve current edits and existing files. New UUIDs stage images first; one database transaction inserts all new records. Failed file/decode/DB work cleans staged folders; startup recovery handles any interrupted cleanup. Restore confirmation happens before staging.

Backups are **not encrypted**. They include photographs, notes, and exact optional coordinates. Export uses the system share sheet; its successful return does not prove the user saved externally. Settings explicitly asks users to verify their destination file. A canceled restore removes its picker cache copy. The latest prepared export in app documents is overwritten by the next export.

## Native Vision and uncertainty

The JavaScript adapter calls `requireOptionalNativeModule` via the current `expo` API. Expo Go and Android get an honest original-photo fallback. iOS capability reports whether APIs are present; actual hardware/processing errors still produce fallback warnings.

`VNClassifyImageRequest` returns up to five general labels above a model-score threshold, ordered by score. These are possible image clues only. Scores remain in provenance data but the UI does not express them as accuracy percentages. `IdentificationProvider` can be replaced with a dedicated species model later; no API keys belong in this mobile app.

On iOS 17+, `VNGenerateForegroundInstanceMaskRequest` and `VNInstanceMaskObservation.generateMaskedImage` isolate each foreground instance, render a real transparent PNG, and offer at most eight subjects. ImageIO applies orientation during bounded thumbnail decode. Work runs on a serial native queue, not the UI thread, with per-instance autorelease pools. A lock-protected active request can be cancelled, and cancellation is checked between expensive stages and writes. Partial PNG outputs are removed. Classification and masking fail independently. The original photo always remains available if either fails.

No Swift compilation, native-device test, mask-quality test, or physical permission test has been performed on this Linux host. Native changes require a new signed build, not a Metro reload.

## Privacy and future sharing

There is no app account/backend/analytics/API dependency. Location is requested only on explicit attachment, has device-at-user-request provenance/accuracy, and is never automatically attached to imported photos. System photo picking does not request broad library access. Device OS backups and user-selected export destinations are outside this app's private-journal boundary.

Future social sharing must obscure exact personal/sensitive-species locations by default and separate regional encounter rarity, conservation status, and endemic status. All current rarity is “Not assessed”; low observation counts are not evidence of rarity.
