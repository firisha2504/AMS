# Afosha Management System - Mobile App

Flutter mobile application for AMS members.

## Prerequisites

- Flutter SDK 3.16+
- Android Studio / Xcode for device emulators
- Backend API running (see root README)

## Setup

```bash
cd mobile
flutter pub get
flutter gen-l10n
```

## Run

```bash
# Android emulator (API at 10.0.2.2)
flutter run

# With custom API URL
flutter run --dart-define=API_URL=http://192.168.1.100:5000/api
```

## Features

- Member login (phone + password)
- Personal dashboard (savings, outstanding balance, attendance)
- Contribution history
- Savings records
- Notifications
- Profile management
- Bilingual UI (Afan Oromo / English)
- Push notifications via FCM (configure Firebase)

## Firebase Setup

1. Create a Firebase project
2. Add Android/iOS apps
3. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
4. Place in respective platform folders
5. Set `FCM_SERVER_KEY` in backend `.env`
