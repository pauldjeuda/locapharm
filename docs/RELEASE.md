# Release process

Releases are created only by `.github/workflows/release.yml` through a manual GitHub Actions dispatch from `main`. The version input must be semantic `X.Y.Z`, and the workflow requires a successful `ci.yml` run for the exact commit. It updates the app version module and package metadata in the runner, sets Android `versionCode`/`versionName`, then creates `vX.Y.Z`, an APK, a SHA-256 file, and release notes. `.github/workflows/pages.yml` is the only Pages publisher: it assembles the reviewed data pack, attribution page, and latest release `version.json` together so one deploy cannot overwrite another's files.

When all four Android signing secrets exist, the workflow signs the APK with the release keystore and removes the temporary keystore from the runner. When they do not exist, it may publish only a clearly labelled debug-signed test APK. Android does not allow a differently signed APK to update an installed release, so the debug fallback is not a production update path.

The workflow must fail cleanly if the tag already exists. It must not commit generated files back to `main`. A published test release is not considered a completed sprint until Paul verifies the APK on a phone.
