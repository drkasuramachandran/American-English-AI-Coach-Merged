# Native mobile plan (React Native + Expo)

This repository is a web app/PWA foundation, not a native mobile application.

1. Create an Expo TypeScript app and share domain types, mode metadata, and API client logic; do not reuse browser WebRTC code blindly.
2. Add Android/iOS microphone permission declarations and pre-permission rationale. Handle denial and OS-level revocation gracefully.
3. Implement native realtime audio transport using a provider-supported SDK/WebRTC package; keep API keys on the server and request ephemeral credentials.
4. Configure audio sessions, echo cancellation, Bluetooth headset routing, audio focus, phone/Siri interruptions, app backgrounding, screen lock, network changes, and session cleanup.
5. Test physical devices across supported Android/iOS versions, wired/Bluetooth headsets, cellular/Wi-Fi handoff, denied permissions, low bandwidth, and expired credentials.
6. Add secure token storage only for short-lived access tokens; provide sign-out and account/history deletion.
7. Build Android with EAS Build or local Gradle; test an internal APK/AAB, signing, privacy disclosures, microphone permission declarations, Play Console listing, and staged rollout.
8. Build iOS with EAS Build/Xcode on macOS; configure signing, App Store Connect, privacy nutrition labels, microphone usage description, TestFlight, review, and phased release.
9. Publish the PWA separately via HTTPS hosting. A responsive website or PWA is not a native app.
