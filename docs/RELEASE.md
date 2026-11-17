# Release process

Releases are created only by `.github/workflows/release.yml` through a manual GitHub Actions dispatch. The version input must be semantic `X.Y.Z`; the workflow creates `vX.Y.Z`, an APK, a SHA-256 file, release notes, and `version.json` for Pages.

When all four Android signing secrets exist, the workflow signs the APK with the release keystore and removes the temporary keystore from the runner. When they do not exist, it may publish only a clearly labelled debug-signed test APK. Android does not allow a differently signed APK to update an installed release, so the debug fallback is not a production update path.

The workflow must fail cleanly if the tag already exists. It must not commit generated files back to `main`. A published test release is not considered a completed sprint until Paul verifies the APK on a phone.
