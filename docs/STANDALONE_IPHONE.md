# Wildfolio for everyday iPhone travel

The `preview` EAS profile is a **standalone, internally distributed iOS Release app**. Its JavaScript/Hermes bundle, app icon, fonts, and static navigation artwork are packaged into the installed binary. It is not an Expo Go project or a development client, and normal launch does not need Metro, your laptop, or a QR code. App update checks are disabled; software changes require another signed build installed over the existing app.

The local Apple Vision module is part of the native project through Expo autolinking. Foreground cutouts require iOS 17+ and compatible hardware. On unsupported devices or failed processing, you can still save the original photograph. General image labels remain **Possible image clues**, not species identification. Native compilation/output is not yet verified.

## Before changing anything on your iPhone: back up

These configuration changes do not rename the database, image folders, app scheme, bundle identifier, or journal schema. No journal reset or deletion command is part of this setup. Your existing iPhone data cannot be accessed or backed up from this workspace, so perform the following on the phone:

1. Open your **existing Wildfolio project in Expo Go**. Finish saving any draft you want to keep.
2. Open **Journal care → Export journal with photographs**. The export includes originals, selected cutouts, notes, dates, and optional exact coordinates.
3. In the share sheet, choose **Save to Files**. Save outside Expo Go, such as a private iCloud Drive folder or an appropriate folder in On My iPhone. Keep an additional private copy if possible. The file is **unencrypted**.
4. Open Files and verify `wildfolio-journal.json` exists and has a nonzero size. Cancelling the share sheet does not save a backup. Rename the external copy with a date to keep older exports.
5. Note your sighting count and inspect several important observations. **Keep Expo Go and its data until the installed app's restored journal is verified.**

Backups are limited to 96 MB, 24 MB per image, and 5,000 sightings. If export fails or exceeds the limit, do not uninstall or delete anything. This version cannot split oversized journals; a successful external backup is a prerequisite to removing the only copy.

## Signing and build prerequisites

- A Windows ASUS laptop with **Node.js 24 LTS**, the complete source/lockfile, and internet for dependency installation/build submission.
- Your own Expo account and access to an EAS project. No project ID or credentials have been invented in the source.
- For EAS installation onto your **physical iPhone**, access to a paid **Apple Developer Program** membership and permission to create certificates/profiles/register the device. Apple's advertised standard membership is US$99/year; local charges/eligibility can differ. A free Apple account/Personal Team uses Xcode on a Mac with seven-day provisioning and does not provide this Windows/EAS ad hoc signing route.
- Register the iPhone before the build so its UDID is in the ad hoc provisioning profile. Newly registered devices can take Apple processing time (sometimes 24–72 hours on new/renewed memberships).
- Choose a bundle identifier you own **before the first standalone installation**. Once you have a journal in an installed Wildfolio app, retain that app's identifier and signing team for updates. Changing identity creates a separate storage container; uninstalling deletes data.
- EAS has free/paid plans and quotas independent of Apple membership. Review current account terms yourself before submitting. No build, purchase, signing operation, or app publication was initiated here.

## Exact Windows steps

Use the latest completed workspace source, including the updated `eas.json`, `app.config.ts`, `modules/`, and `package-lock.json`. The original GitHub `main` may still be the starter project; download this completed source or use a branch containing these follow-up changes. Do not copy `node_modules`, `.expo`, generated `ios/`, or `dist/` between machines.

Unzip/copy to `C:\Projects\testing-nature`, open **PowerShell**, and run:

```powershell
cd C:\Projects\testing-nature
node --version
npm.cmd ci
npm.cmd run check
npm.cmd run doctor
npx.cmd expo install --check
npx.cmd expo export --platform ios --max-workers 2
```

The `.cmd` suffix avoids PowerShell script execution-policy issues. The export command verifies the JS/assets bundle; it is **not** an iOS compiler and does not create an installable IPA. Network-dependent Doctor checks may need permitted network access.

Open `app.config.ts` in your editor. If this is your **first** standalone installation, change the temporary `ios.bundleIdentifier` (`com.wildfolio.journal`) to an identifier available to your Apple team, for example `com.yourname.wildfolio`. Replace the example with your own identifier. If you already installed Wildfolio with a journal, keep its existing identifier instead. Do not change storage constants or run reset scripts.

When you independently choose to proceed with cloud building, run:

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest init
npx.cmd eas-cli@latest device:create
npx.cmd eas-cli@latest build --platform ios --profile preview
```

1. **Login:** authenticate to your own Expo account through its terminal/browser flow. Never put passwords/tokens in app source or chat.
2. **Init:** create/link your EAS project; the CLI records its real project ID. If already linked, use that project. `eas.json` is already provided; do not replace its preview profile with a development profile.
3. **Device registration:** select Website when offered, open the generated registration URL on your iPhone, and follow the profile/registration instructions. Only trust your own EAS/Apple registration flow. Select this registered device during signing/build prompts.
4. **Build:** use **`--profile preview`**, not `development`. It explicitly sets `developmentClient: false`, `distribution: internal`, `ios.simulator: false`, and `ios.buildConfiguration: Release`. Follow EAS's Apple signing prompts using your authorized account/team. The compilation happens on cloud macOS/Xcode; Windows cannot locally compile this iOS app.
5. Check that no EAS account/project environment setting or custom hook defines `SKIP_BUNDLING` or overrides Release. React Native treats **any nonempty `SKIP_BUNDLING` value, including `0`, as “skip”**; remove it. This project does not set that variable or custom build hooks.
6. In the build logs, confirm the Release JS/assets bundling phase and the local `WildfolioVision` pod/module compilation succeed. A failed Swift/CocoaPods build needs diagnosis; a JS export success is not a substitute.

No Metro/start command is needed for the installed preview. `expo-dev-client` remains a dependency for the separate development profile; `developmentClient: false` plus Release means the preview is not the development launcher. `expo-updates` is not installed and app configuration explicitly disables update checks. Do not add remote fonts or online image dependencies to replace bundled assets.

## Install the preview on your iPhone

1. When EAS reports a **successful iOS build**, open its build-details **Install** link in Safari on the registered iPhone. You can copy the CLI link or find it in your own EAS project dashboard.
2. Tap Install and follow iOS prompts. You may need internet to download/validate the signed app initially. A simulator IPA cannot be installed on a physical iPhone; this profile requests a device build.
3. If iOS says the device is not registered or the provisioning profile excludes it, register it and build/re-sign through the supported EAS flow. A new device is not automatically added to an old IPA's profile.
4. Enable Developer Mode **only if iOS asks for it for the installed artifact**; it is generally required for development-signed clients and not normally required for an ad hoc Release preview. Follow the actual iOS prompt; do not install unrelated profiles or disable security settings.
5. Launch **Wildfolio directly from the Home Screen**. It should open the collection, not an Expo/Metro launcher. If it asks for Metro, you installed the development profile; keep/export any data and install the preview over the matching app identity.

An internal preview is not an App Store/TestFlight release. Ad hoc certificates and provisioning profiles expire; check the actual signing/profile expiration before a long trip and install a freshly signed build over the existing matching app when needed. Do not assume an internal build is permanently usable offline. Keep external backups and avoid deleting the app to fix an expired build.

## Restore your Expo Go journal into the installed app

Expo Go and the standalone app have separate sandboxes. A new installed app starts empty; an automatic/shared database migration is not possible.

1. Ensure your backup file is downloaded locally in Files before leaving internet coverage. An iCloud placeholder needs a download first.
2. Open the installed app: **Journal care → Restore journal backup**. Choose the saved JSON.
3. Review the confirmation and choose Restore. Records/images are validated, copied into the installed app's permanent documents, and committed locally.
4. Compare sighting counts and open several records. Check original photographs, cutouts where present, dates, notes, country/place, and optional location. A restore without errors is not enough if you selected the wrong backup.
5. Force-quit and reopen the installed app. Confirm the same journal remains. Export a **new backup from the installed app**, verify it in Files, and keep it separately from the old Expo Go backup.
6. Keep the original Expo Go journal until this verification passes. Never uninstall your only valid journal copy during migration.

Restore **adds missing UUIDs and skips existing UUIDs**, preserving current edits; it does not overwrite or synchronize records. Re-importing an older backup is safe but is not a way to update an already-restored sighting. To move observations back to Expo Go, export from the installed app and restore into the original Expo Go project; the same duplicate policy applies. Both backups include image files, not sandbox-specific absolute paths.

## Prove the app is ready before travelling

Run these on the actual installed preview; none can be certified from this Linux workspace:

- Stop Metro and shut down the laptop. Force-quit Wildfolio. Enable Airplane Mode, turn Wi-Fi off, then cold-launch the app from its Home Screen. No launcher, connection prompt, or remote asset download should be needed.
- Inspect saved photographs and notes; search/filter and edit an existing sighting. Force-quit/reopen and verify the edit.
- Take a real nature photograph and save a new sighting offline. Also import a photo already downloaded on the phone. Verify persistence after another force-quit.
- On supported iOS 17+ hardware, test one subject, multiple subjects, transparent edges, portrait/landscape orientation, cancellation, and no-subject failure. Original-photo saving must continue when Vision fails. Do not rely on masks until this passes.
- Export to a local Files destination, confirm the file exists, restore it, and confirm duplicate UUIDs are skipped. Keep cloud and offline backups as appropriate for your trip; exact coordinates are included and unencrypted.
- Check Camera and Location denied cases, large photos/text, VoiceOver, Reduce Motion, and low-storage behavior using [IPHONE_TESTING.md](IPHONE_TESTING.md).

Current storage uses `wildfolio.db` and permanent `wildfolio/images/<uuid>/` files. Save commits only after image copies finish; DB/file failures keep the review draft, and interrupted files/deletions have startup recovery. Cleanup removes only stale drafts, unreferenced image folders, or explicitly deleted sightings. No backend is needed. GPS can work without internet, but an unavailable fix may time out; manual places always work. Imported images never silently inherit your current position or today's observed date.

## What has and has not been verified

See [BUILD_STATUS.md](../BUILD_STATUS.md) for fresh configuration, autolinking, prebuild, bundle, and storage checks. The Linux workspace cannot compile Swift with Xcode, sign an IPA, install it on an iPhone, inspect your phone's journal, verify ad hoc expiration, or perform Airplane Mode/Apple Vision device tests. Source/configuration preparation is complete only to the extent listed there; actual travel readiness needs the physical checklist above.

Official references reviewed on 2026-10-07: [EAS profiles](https://docs.expo.dev/build/eas-json/), [iOS build process](https://docs.expo.dev/build-reference/ios-builds/), [physical iPhone signing](https://github.com/expo/expo/blob/main/docs/scenes/develop/development-builds/instructions/eas.mdx), [device registration](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/), and [Apple memberships](https://developer.apple.com/support/compare-memberships/). Blocked Expo pages were read from the official Expo GitHub source.
