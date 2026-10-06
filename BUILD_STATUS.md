# Build status — 2026-10-06

## Implemented

- React Native 0.86.3 / React 19.2.3 / Expo SDK 57.0.27 / TypeScript 6 app, Expo Router navigation, compatible npm lockfile, centralized temporary branding, and an original leaf app icon.
- Ivory/forest/sage/clay journal interface, safe areas, scalable text, large touch targets, single-column collection at large text sizes, and no animated navigation/decorative motion.
- Empty real collection, accurate sighting count, conditional stable-taxon species count, category filters, name/place search, and detail/evidence views.
- Camera/system photo import with on-demand permissions, cancellation, progress, duplicate-processing guards, bounded normalized full-frame original photos, and honest unavailable/failed-processing fallback.
- Review with original/cutout toggle and foreground subject selection when available, optional unverified names, unknown category defaults, manual observed date/place/country/notes, and explicitly requested private coordinates with provenance/accuracy. Imports do not inherit today's observed date or current location.
- SQLite observations and separate species records; two schema migrations; persistent app-document photos; serialized save/update/export/restore operations; rollback/orphan recovery; deletion tombstones with retryable file cleanup; drafts retained on failed saves.
- Portable record-and-image JSON export/restore with confirmation, duplicate UUID skip, strict schema/path/encoding/dimension checks, native image decode validation, and transaction rollback.
- Optional local iOS Expo module using real Apple Vision masking/classification on a background queue. Orientation-normalized bounded ImageIO decode, selectable transparent PNGs, cancellation, no-subject/error handling, and original-photo fallback. General labels are possible clues, never automatic species identification or guaranteed accuracy.
- EAS development/internal preview/production profiles, Windows beginner instructions, signing requirements, architecture notes, and a physical iPhone acceptance checklist.
- No accounts, app servers, analytics, paid APIs, social features, fake observations, generated replacement wildlife, or app secrets. No cloud iOS build, purchase, signing, submission, or app publication was initiated.

## Checks actually performed

| Check | Result | Scope |
| --- | --- | --- |
| `bash scripts/setup-cloud.sh` | Passed | Clean `npm ci` from lockfile, app checks, installed-SDK dependency check, public config evaluation. |
| `npm run typecheck` | Passed | App, local-module JS adapter, core, and tests. |
| `npm run lint` | Passed | All project JS/TS source. |
| `npm test` | **22 passed, 0 failed, 0 skipped** | Real SQLite, close/reopen, real disk photo copy after source-cache deletion, real copy failure, migrations, separate species records, unknown/unverified handling, file/DB failures, retry/recovery, deletion, editing, duplicates, export/restore, malicious paths, corrupt headers, oversized dimensions. |
| `npm run doctor -- --verbose` with cloud proxy routing | **21/21 passed** | Expo schema, peer/dependency compatibility, native package discovery/configuration, React Native Directory, and project setup. |
| `npx expo install --check` with `EXPO_OFFLINE=1` | Passed | Matches installed SDK 57's shipped compatibility manifest. The CLI explicitly warns this is local/offline validation; online Doctor passed separately. |
| `npx expo config --type public --json` | Passed | SDK config and plugins resolve. |
| `npx expo config --type introspect --json` | Passed | Camera, photo library, and when-in-use location usage descriptions are present; microphone permission is absent. No native build performed. |
| `npx expo-modules-autolinking resolve --platform apple --json` | Passed | Finds `WildfolioVisionModule` and its local podspec. Does not compile Swift. |
| `npx expo export --platform ios --max-workers 2` | Passed | Production iOS JS/Hermes bundle and assets; approximately 2.7 MB bundle. This is not an iOS binary. |
| Headless Metro startup and local requests | Passed | Status response and HTTP 200 iOS development bundle containing the journal, review UI, optional native adapter, and final backup validation. File watching enabled; no public preview/tunnel created. |

TypeScript/lint/tests were rerun after the final storage validation change. The clean installation used the same final dependency lockfile; subsequent additions were tests/docs and app validation code. The production bundle was rebuilt after dependency/UI changes; the final backup header validation also compiled through the served development bundle.

Tests use real Node SQLite/disk adapters and injected file failures. They **do not** establish that Expo's file/picker/location APIs or SQLite adapter passed physical-iPhone testing. No test fixtures enter the app collection.

## Environment troubleshooting completed

- Kept npm/Expo caches in writable `/tmp` locations; no system HOME or credentials were changed.
- Resolved npm optional-peer drift by explicitly matching React DOM, Reanimated, Worklets, and related packages to Expo SDK metadata/template versions. No `--force` or `--legacy-peer-deps` bypass was used.
- Doctor exposed a broad native-folder ignore rule, missing `expo-font`, and direct `expo-modules-core` installation. Root-only ignores, the font peer, and current `expo` native-module exports corrected these.
- Documentation/metadata network domains were added to the cloud configuration draft. Official Expo/RN GitHub and SDK/template sources, Apple Vision declarations, Apple memberships, and Expo EAS signing instructions were checked. Initial network-only Doctor failures cleared after policy propagation and Node's supported environment-proxy routing (`NODE_USE_ENV_PROXY=1`).
- The optional desktop React Native DevTools shell cannot run in this headless Linux sandbox. The supported CLI headless mode (`EXPO_UNSTABLE_HEADLESS=1`) avoids its startup. The final headless server/bundle checks passed without relaxing Chromium sandboxing or artifact/TLS verification.
- Reusable cloud installation and headless Metro startup instructions saved for environment review. Draft saving does not execute/publish a new snapshot. Processes must be restarted in future tasks. Fresh-task restoration/publication was not tested.

## Still untested / limitations

- **No Xcode, macOS, Apple signing account, simulator, or physical iPhone was available.** Swift/iOS compilation, actual transparent mask output, mask quality, multiple subjects, Vision cancellation, permission dialogs, orientation, and native integration are untested. These remain acceptance work, not claimed successes.
- Expo Go cannot load this custom module. It uses real original-photo artwork with an explanation. The matching SDK 57 Expo Go version is needed. General Vision clues depend on the custom build; there is no exact species identification provider in this milestone.
- EAS physical-iPhone development/preview builds require paid Apple signing membership. Expo Go journal testing requires no Apple membership. Apple's free Personal Team path requires Xcode on a Mac and expires after seven days. EAS configuration is provided; builds have not been started.
- Expo Go/development clients normally load JS from Metro. Reliable fully offline **cold startup** needs the packaged preview/release app. Offline journal operations after loading are implemented, but physical Airplane Mode/save/reopen tests are pending.
- Original evidence is full-frame, normalized JPEG up to 4096px, not untouched HEIC/RAW bytes. Photo metadata is not read. Place/date are manual for imports. Very large/unsupported images may fail before review and require a smaller readable image.
- Backups use in-memory, unencrypted JSON (96 MB maximum, 24 MB/image, 5,000 sightings). No segmented/streaming/partial export exists yet. Share-sheet return does not prove external storage; verify the destination file. Large-collection memory behavior and native corrupt-image decoding still need device tests.
- Drafts survive save failures within the review session, not force-quitting. Startup cleans stale processing drafts. Uninstalling/clearing app data removes the local journal; keep external exports.
- Accessibility styles and error paths are implemented; VoiceOver, large-text layout, reduced-motion, rotation, storage-pressure, and all real-device behaviors need the [manual checklist](docs/IPHONE_TESTING.md).
- Rarity remains **Not assessed**. Reviewed taxonomy, regional rarity, and community features are future work.

Start testing using [README.md](README.md), then record actual device results in [docs/IPHONE_TESTING.md](docs/IPHONE_TESTING.md). Do not treat this report as iOS/device certification.
