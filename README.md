# Wildfolio

A private nature-discovery journal built with React Native, Expo SDK 57, Expo Router, and TypeScript. Photograph/import a real image, review clues and cutouts when available, add travel notes, save locally, and reopen later. The journal starts empty. No account, backend, analytics, paid API, or API key is required.

The design uses ivory, forest green, sage cards, and restrained clay accents. Change the temporary name and main copy in `src/branding.json`.

## Choose your testing mode

| Mode | Journal | Apple Vision cutouts/clues | Apple membership | Laptop normally needed to load JS? |
| --- | --- | --- | --- | --- |
| Expo Go | Yes, matching SDK 57 | No; original-photo fallback | No | Yes |
| iOS development build | Yes | Source included; needs compilation/device tests | Paid for EAS physical-iPhone signing | Yes |
| Internal preview build | Yes | Source included; needs compilation/device tests | Paid for EAS physical-iPhone signing | No; JS packaged |
| App Store release | Profile provided; not published | Needs native validation first | Paid, signing, and Apple review | No |

**Start with Expo Go. You do not need to buy anything to test the journal.** A custom native module cannot run inside Expo Go. Foreground masking requires iOS 17+ and supported hardware; the SDK/native app baseline is iOS 16.4. Android uses original-photo journal mode. Web is not a supported journal runtime.

Expo Go/development clients may cache JavaScript, but reliable disconnected cold startup needs a packaged preview/release build. After loading, journal operations themselves require no internet. Each app/mode has separate storage; use export/restore to move data between them.

## Windows: install and run

1. Install **Node.js 24 LTS** for Windows from [nodejs.org](https://nodejs.org/). Keep the option to add it to PATH.
2. Download/copy this completed project from the workspace into `C:\Projects\testing-nature`. Include `package-lock.json`, `app`, `src`, `modules`, `assets`, and configuration files. Exclude `node_modules`, `.expo`, and `dist`.
3. Open **PowerShell**, then run:

```powershell
cd C:\Projects\testing-nature
node --version
npm.cmd --version
npm.cmd ci
npm.cmd run check
npm.cmd run doctor
npx.cmd expo install --check
npm.cmd run start:go
```

`.cmd` avoids common PowerShell execution-policy errors without changing your security policy. Change the `cd` path if you chose a different folder. `npm ci` installs the exact lockfile. `check` runs TypeScript, lint, and storage/backup tests. Doctor needs internet for Expo schema and React Native Directory metadata; a network failure is different from a dependency defect.

The implementation is local to this workspace and is not automatically pushed to GitHub. Cloning the old remote before you save/push these changes will still give you the starter README.

## Open on your iPhone with Expo Go

1. Install/update **Expo Go** from the App Store. It must support **SDK 57**; Expo Go supports one SDK per version. If versions mismatch, use the matching supported version or a development build.
2. Put your ASUS laptop and iPhone on the same Wi-Fi. Allow Node through Windows Firewall for your private network if prompted.
3. Leave `npm.cmd run start:go` running. It explicitly selects Expo Go even though `expo-dev-client` is installed.
4. Scan the terminal QR code with the iPhone Camera and open the Expo Go link. Do not press `i` on Windows; that expects an iOS simulator on a Mac.
5. Tap **Add discovery**, import a real nature photo, review it, add date/place if known, and **Save a sighting**.
6. Force-quit Expo Go, reopen the same project while Metro is available, and verify your photo and notes remain.

If your Wi-Fi blocks device-to-device traffic, an optional internet-based tunnel can help:

```powershell
npx.cmd expo start --go --tunnel
```

Expo may offer to install a tunnel helper. The LAN route does not need it. A tunnel is not offline and does not enable native Vision in Expo Go. No tunnel/public preview was created here.

Camera access is requested only when chosen. The system photo picker shares only your selected photo, without requesting broad library access. Location is requested only when you explicitly attach it. Imported photos start with **unknown observed date and no coordinates**; metadata is not used to infer date/place. Creation date is separate.

## Test the first milestone

**Camera/import → review image and possible clues → travel information → save → force-quit → reopen the same app/project.**

- Save an unknown Animal, Flower, and Tree. A personal name is **unverified**, not an exact species identification.
- Search name/place, switch categories, open evidence photos, edit, and delete with confirmation.
- In Journal care, export to Files and verify the file exists. Restore; existing UUIDs are skipped without overwriting your edits.
- After loading the app, enable Airplane Mode and turn Wi-Fi off. Saved sightings and downloaded photos work without an app service. Use a preview build for a fully disconnected cold launch without Metro.
- Follow the full [physical iPhone checklist](docs/IPHONE_TESTING.md) for permissions, orientation, masking, file failures, Airplane Mode, accessibility, and backups.

Original photographs retain the full frame, normalized as JPEG up to 4096 pixels on the longest side. They are not byte-for-byte HEIC/RAW originals; the device photo library is untouched. Cutouts are transparent PNGs. SQLite records reference permanent app-document image paths, never permanent cache URLs.

## Optional: custom iOS cloud build from Windows

**Only run these build commands after you choose to use EAS and have the required signing access.** No build, purchase, account registration, credentials upload, or publication was initiated here.

Official Expo documentation requires a **paid Apple Developer Program account** for EAS builds installed on a physical iPhone. Apple's free Personal Team route uses **Xcode on a Mac** and seven-day provisioning; it does not provide the Windows/EAS route. Apple currently advertises **US$99/year** (local currency/taxes and eligibility can differ). EAS has free and paid plans; review your current quota and terms independently. The app never starts builds or purchases services.

When you choose to proceed, run in the project folder:

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest init
npx.cmd eas-cli@latest device:create
npx.cmd eas-cli@latest build --platform ios --profile development
```

1. `login` signs in to your Expo account through its terminal/browser flow. Do not paste passwords or keys into this chat or source.
2. `init` links your own EAS project and adds its project ID. No ID or signing credentials were invented here.
3. `device:create`: choose the Website route, open the generated link on your iPhone, and follow registration/profile instructions using your own Apple account or authorized team.
4. Before building, change `ios.bundleIdentifier` in `app.config.ts` to an identifier you own, such as `com.yourname.wildfolio`. The temporary `com.wildfolio.journal` is not a claim of availability.
5. EAS builds on cloud macOS/Xcode. Follow its signing prompts only in the supported interface. New devices may require Apple processing time before provisioning.
6. Install the build from the EAS link on the registered iPhone. If required, enable **Settings → Privacy & Security → Developer Mode**, reboot, and confirm.
7. Start Metro for the installed development client:

```powershell
npm.cmd run start:dev
```

For a signed internal app with JS packaged, you may later choose:

```powershell
npx.cmd eas-cli@latest build --platform ios --profile preview
```

This enables reliable cold-launch offline testing and still requires signing. It is not an App Store release. `production` prepares a store build; actual publication separately needs your decision, App Store Connect/privacy setup, and Apple review. No submit command is run here.

`modules/wildfolio-vision` is a supported local Expo module with autolinking. EAS prebuild generates native projects; no hand-generated root `ios/` folder is included. **Swift, module config, permissions, or native dependency changes require a new development build.** Metro reload only updates JS. Native source has **not been compiled or device-tested** on this Linux host.

## Local storage, privacy, and backups

The portable JSON includes records and base64 original/cutout files. Restore validates schema, paths, UUIDs, dates, coordinates, and encodings, then decodes images before a transaction adds new records. No arbitrary archive paths are extracted. Duplicate UUIDs, including pending deletion IDs, are skipped; existing sightings are preserved.

Backups are **unencrypted** and include exact optional coordinates. Choose private destinations. The latest prepared export remains inside app documents; cancelling the share sheet does not prove an external backup was saved. Verify the destination file. Uninstalling/removing app data removes its local journal.

Limits: **96 MB per backup, 24 MB per image, 5,000 sightings**. Large exports are refused rather than silently truncated. In-memory JSON is used; streaming/segmented/partial exports are not implemented. Test large journals on your device. Drafts survive save failures while reviewing but not app termination. Journal care can retry pending deletion/orphan cleanup.

No social network, public maps, chat, push notifications, leaderboards, subscriptions, reviewed species model, or rarity model is included. Rarity is **Not assessed**. Future sharing must obscure sensitive personal/wildlife locations and distinguish encounter rarity, conservation status, and endemism.

## Validation and project notes

See [BUILD_STATUS.md](BUILD_STATUS.md) for exact results and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for data/recovery/backup/native design.

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npx.cmd expo config --type public
npm.cmd run doctor
npx.cmd expo install --check
npx.cmd expo export --platform ios --max-workers 2
```

`expo export` builds the iOS **JavaScript/Hermes bundle**, not an iOS binary. Generated native projects, build outputs, and dependencies are ignored; local module source is included. No environment example is needed: the app has no environment-variable or secret requirements.

## Official references checked

Checked on 2026-10-06. Blocked Expo web docs were read via official GitHub sources, plus SDK 57 manifests/templates/API source on npm. Apple documentation was retrieved directly.

- [Expo setup](https://docs.expo.dev/get-started/create-a-project/) · [official source](https://github.com/expo/expo/blob/main/docs/pages/get-started/create-a-project.mdx)
- [Expo local modules](https://docs.expo.dev/modules/get-started/) · [Module API](https://docs.expo.dev/modules/module-api/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/) · [official EAS signing instructions](https://github.com/expo/expo/blob/main/docs/scenes/develop/development-builds/instructions/eas.mdx)
- [Physical iOS device tutorial](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/) · [official source](https://github.com/expo/expo/blob/main/docs/pages/tutorial/eas/ios-development-build-for-devices.mdx)
- [React Native environment support](https://reactnative.dev/docs/set-up-your-environment)
- [Apple membership comparison](https://developer.apple.com/support/compare-memberships/) · [Apple Developer Program](https://developer.apple.com/programs/)
- [Apple foreground masking](https://developer.apple.com/documentation/vision/vngenerateforegroundinstancemaskrequest) · [instance mask rendering](https://developer.apple.com/documentation/vision/vninstancemaskobservation/generatemaskedimage(ofinstances:from:croppedtoinstancesextent:))
- [Apple general classification](https://developer.apple.com/documentation/vision/vnclassifyimagerequest)
