# iPhone acceptance checklist

These are manual tests to run on a physical device. None have been marked passed in this workspace. Use your own real nature photographs; automated fixtures never appear in the app.

For exact standalone Windows build, installation, and Expo Go backup migration steps, follow [STANDALONE_IPHONE.md](STANDALONE_IPHONE.md) first. Keep the original journal until the installed preview's restored records and images pass the checks below.

## Choose the right app

- **Expo Go:** free journal testing from Windows. Original photos work; the custom Vision module is absent. Confirm the fallback message is shown. The installed Expo Go version must support SDK 57.
- **Development build:** your signed app including the local Vision module. Native behavior needs an iPhone, iOS 17+ for masking, and a rebuilt client. JavaScript is normally loaded from your Windows development server.
- **Preview build:** signed internal build with the JavaScript packaged into the app. Use this for reliable cold-launch testing with all networking disabled. It is not an App Store release.

Expo Go and development/preview apps use separate storage. Export and restore to move a journal between them. Expo Go/development-client cached bundles are development conveniences, not a guarantee of offline cold startup.

## Capture and permissions

- [ ] First launch has an empty collection, 0 sightings, and no invented species count or observations.
- [ ] Tap Take a photograph. Allow Camera; take a real photograph. Save and verify the full-frame original on the detail screen.
- [ ] Deny Camera. Verify a clear message and that Import remains usable. Enable Camera in iPhone Settings and retry.
- [ ] Cancel camera and photo picker. No empty sighting or stuck progress indicator is created.
- [ ] System photo picker works with selected/limited photos and without broad access. If a photo is only in iCloud, download it first; try again in Airplane Mode with an on-device photo.
- [ ] Import an older photo. Date starts blank; place and coordinates are absent. It must not imply that it was photographed today. Creation date is separate.
- [ ] Test portrait, landscape, mirrored/front-camera, HEIC, JPEG, PNG, a screenshot, and a large camera photo. Preview orientation should match the selected photograph.
- [ ] Invalid/unreadable file or missing camera produces an actionable error, not a record. Extremely large files may fail to decode; choose a smaller photo.

## Native Vision (development/preview build only)

- [ ] On iOS 17+ with a supported device, a real foreground subject produces an actual transparent PNG; ivory/sage shows through the background. No replacement image is generated.
- [ ] A photo with several clearly separated subjects offers numbered cutouts. Select different subjects; the preview changes. Maximum eight subjects are offered.
- [ ] Toggle original/cutout. Save original artwork when a mask is poor; the selected cutout is still retained if available.
- [ ] No-subject photo, unsupported device/OS, or failed mask shows an explanation and still saves the original.
- [ ] Classification, when available, shows **Possible image clues** with no accuracy percentage, verified species name, or invented scientific facts.
- [ ] Cancel while preparing and while Vision runs. Wait for cancellation; no sighting is saved and a new discovery can be started.
- [ ] Rebuild after changing Swift source or native configuration. JavaScript hot reload alone cannot update a native module.

## Review, save, and reopen

- [ ] Save an unknown Animal, Flower, and Tree with no display name. Defaults use the chosen category.
- [ ] Enter a personal name. It is labelled unverified and does not count as an identified species.
- [ ] Enter date/place/country/notes. Invalid dates (for example 2026-02-30) are rejected; blank dates remain unknown.
- [ ] Deny Location and disable device Location Services. Manual places still work.
- [ ] Explicitly attach the device's current private location. Inspect provenance/accuracy. For an imported photo, confirm it is described as current device location, not photo metadata. Remove it again.
- [ ] Try saving while location is pending; saving waits until the request finishes or times out.
- [ ] Tap Save repeatedly while saving. Only one sighting is created.
- [ ] Simulate low storage if possible. A failed save keeps the review form and photo for retry; no broken collection entry appears. Drafts do not survive force-quitting.
- [ ] After a successful save, force-quit and reopen **the same project/app**. The saved sighting and photo remain. Reopen through Metro if Expo Go needs its bundle again.
- [ ] Search by name and place, switch All/Animals/Flowers/Trees, and check sighting totals.

## Offline, editing, and deletion

- [ ] Open the app first, enable Airplane Mode, turn Wi-Fi off, then view saved images, import an already-downloaded photo, save, search, and edit. No account or remote API is required.
- [ ] In an installed **preview build**, stop Metro, force-quit, enable Airplane Mode/Wi-Fi off, and cold-launch. Sightings reopen and remain editable. This check requires an actual packaged build.
- [ ] Edit date, category, name, place, country, location, and notes. Save, force-quit, and verify changes persisted.
- [ ] Back out of a changed edit or unsaved review. Keep/discard confirmation works; cancelling keeps the form.
- [ ] Cancel Delete confirmation; nothing changes. Confirm Delete; the record and image files are removed. If cleanup fails, the record stays hidden and Settings can retry cleanup.

## Backup and restore

- [ ] Export to Files, including original photos and any cutouts/locations. **Check that the file actually exists**; cancelling the share sheet is not a completed external backup.
- [ ] Restore into a second app/project with separate storage. Compare counts, notes, dates, original photographs, selected artwork, and coordinates.
- [ ] Restore the same backup twice. Second restore skips existing UUIDs. Edit a restored sighting, restore again, and verify your edit was not overwritten.
- [ ] Cancel restore confirmation. The journal stays unchanged.
- [ ] Try malformed JSON, a future backup version, missing images, duplicate UUIDs, invalid dates, traversal paths (`../`), absolute paths, and corrupt image data. Restore refuses the backup without adding records.
- [ ] Test a large backup near the 96 MB limit. Over-limit backups fail clearly. Segmented/streaming exports are not implemented in this milestone.
- [ ] Keep backups in a private destination: they are unencrypted and contain any exact coordinates. Never uninstall the only copy of an important journal.

## Accessibility and layout

- [ ] Enable large accessibility text sizes. Collection switches to one column; labels/buttons remain readable and forms scroll without clipping.
- [ ] Enable VoiceOver. Buttons, fields, selected filters, artwork, permission/error messages, and save states are understandable.
- [ ] Enable Reduce Motion. Screens have no animated navigation transitions or decorative motion.
- [ ] Rotate the phone; safe areas and bottom controls remain usable. Test keyboard opening on long notes.
- [ ] Check portrait/landscape image preview, multiple cutouts, empty collection, filtered-empty collection, and long names/places.

Record device model, iOS version, Expo Go or build version, test date, and failures before calling the app device-validated.
