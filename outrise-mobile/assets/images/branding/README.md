# Outrise branding

- `app-icon.png`: approved summit icon, opaque square artwork used by iOS, Android, and the web favicon.
- `splash.png`: matching summit and OUTRISE wordmark on the dark launch background.
- `outrise-icon-concept-v2.png`: the approved original, retained without edits.

The assets were generated with the built-in image-generation tool. Prompts are saved alongside them. Expo creates the platform-specific image sizes during prebuild. Configure the icon and splash through `app.json`; do not edit generated iOS asset catalogs directly.

The splash fades out when the existing font loader is ready, without an artificial loading delay. Android uses the icon-only version for its native splash layout. A native rebuild is required after changing these assets or their configuration. Check final launch appearance in a release/preview build; Expo Go does not reproduce the native splash accurately.
